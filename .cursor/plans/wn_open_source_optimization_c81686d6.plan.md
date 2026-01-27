---
name: WN Open Source Optimization
overview: 基于业界成熟开源方案优化 WriteNow，不造轮子，直接复用 Mem0、Graphiti、node-llama-cpp 等经过验证的解决方案；编辑器 AI 集成采用自研 TipTap Extension + 本地 LLM Tab 续写（用户可选下载模型），实现成本降低、性能提升和功能增强。
todos:
  - id: p0-prompt-caching
    content: "[P0] 启用 OpenAI/Anthropic 原生 Prompt Caching（约 20 行代码改动）"
    status: pending
  - id: p1-mem0-integration
    content: "[P1] 集成 Mem0 记忆层（可选云端/本地开源版）"
    status: pending
  - id: p1-ai-diff-extension
    content: "[P1] 自研 TipTap AI Diff/Suggestion Extension（3-5 天，零付费）"
    status: pending
  - id: p1-local-llm-tab
    content: "[P1] 本地 LLM Tab 续写（node-llama-cpp + 可选模型下载）"
    status: pending
  - id: p2-e2e-playwright
    content: "[P2] 完善 Playwright E2E 测试覆盖核心用户流程"
    status: pending
  - id: p2-graphiti-eval
    content: "[P2] 评估 Graphiti 知识图谱集成（先用 SQLite 图模拟）"
    status: pending
  - id: p3-litellm-proxy
    content: "[P3] 可选：LiteLLM Proxy 多模型统一 + 缓存"
    status: pending
isProject: false
---

# WriteNow 开源方案优化路线图

基于深度调研，为 WriteNow 匹配业界成熟的开源/第三方解决方案，不造轮子，直接复用。

---

## 一、成熟方案匹配总览

| 优化领域 | 推荐方案 | 成熟度 | 预期效果 |

|---------|---------|-------|---------|

| LLM 成本优化 | **原生 Prompt Caching**（OpenAI/Anthropic） | Production | 50-90% 成本降低 |

| Agent 记忆层 | **Mem0** | 26k+ stars | 90% Token 节省，26% 准确率提升 |

| 知识图谱 | **Graphiti (Zep)** | 22k+ stars | 100%+ 准确率提升，90% 延迟降低 |

| 编辑器 AI | **自研 TipTap Extension** | 基于已有 streaming | 零付费，完全掌控 |

| Tab 续写 | **node-llama-cpp + 本地模型** | 官方 Electron 支持 | 零 API 成本，离线可用 |

| 向量搜索 | **sqlite-vec** | 已有 | 本地优先，无需外部服务 |

| 多模型路由 | **LiteLLM Proxy** | Production | 统一 100+ LLM 接口 + 缓存 |

---

## 二、P0：LLM 成本优化（不造轮子）

### 2.1 直接使用 OpenAI/Anthropic 原生 Prompt Caching

**现状**：WriteNow 每次调用 LLM 都重新计算完整上下文

**方案**：利用 API 提供商的原生 Prompt Caching，无需自建

| 提供商 | 实现方式 | 成本节省 | 缓存时长 |

|-------|---------|---------|---------|

| OpenAI | **自动**（无需代码改动） | 50% | 5-60 分钟 |

| Anthropic | 手动设置 `cache-control` header | 90% | 5 分钟 |

**OpenAI 实现**（零代码改动）：

- 只需确保 prompt 长度 > 1024 tokens
- 保持 system prompt 前缀稳定
- 自动享受 50% 成本降低

**Anthropic 实现**：

```javascript
// electron/ipc/ai.cjs - 仅需添加 cache-control
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: [
    {
      type: 'text',
      text: STABLE_SYSTEM_PROMPT,  // 稳定前缀
      cache_control: { type: 'ephemeral' }  // 启用缓存
    }
  ],
  messages: userMessages
})
```

**改动量**：约 20 行代码

### 2.2 可选：LiteLLM Proxy（多模型统一 + 缓存）

如果 WriteNow 需要支持多个 LLM 提供商：

```yaml
# config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514

litellm_settings:
  cache: true
  cache_params:
    type: disk  # 本地缓存，适合桌面应用
```

**优势**：统一接口、自动缓存、负载均衡、fallback

---

## 三、P1：Agent 记忆层（复用 Mem0）

### 3.1 为什么选 Mem0

| 对比项 | Mem0 | Letta/MemGPT | 自研 |

|-------|------|-------------|------|

| 准确率 | 66.9% | 74% | 未知 |

| 延迟 | 1.4s p95 | - | 未知 |

| Token 效率 | 90% 节省 | - | 低 |

| 集成难度 | npm 包可用 | Python 主导 | 高 |

| 维护成本 | 零 | 低 | 高 |

### 3.2 Mem0 集成方案

```typescript
// 新增 lib/memory/mem0-client.ts
import { MemoryClient } from 'mem0ai'

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY })

// 添加记忆
await client.add([
  { role: 'user', content: userMessage },
  { role: 'assistant', content: aiResponse }
], { user_id: userId, metadata: { projectId } })

// 检索相关记忆
const memories = await client.search(query, { user_id: userId })
```

**改动模块**：

- `electron/ipc/memory.cjs` → 增加 Mem0 后端选项
- `electron/ipc/ai.cjs` → 调用前自动检索相关记忆

### 3.3 本地优先方案（可选）

如果不想依赖云端 Mem0：

- 使用 **Mem0 开源版**（MIT License）本地部署
- 或保持现有 SQLite 实现 + 阈值学习

---

## 四、P1：自研 TipTap AI Diff/Suggestion Extension

### 4.1 为什么自研而非付费

| 对比项 | TipTap AI Toolkit（付费） | 自研 Extension |

|-------|-------------------------|---------------|

| 成本 | 需联系销售，$$$ | **零** |

| Streaming | 已有 | **WriteNow 已实现**（`ai-stream.ts`） |

| Diff 显示 | 内置 | 自研 ProseMirror Plugin（3 天） |

| Accept/Reject | 内置 | 自研 Commands（1 天） |

| Suggestion | 内置 | 自研 Mark + 装饰（1 天） |

| 掌控度 | 依赖第三方 | **完全掌控** |

**结论**：WriteNow 已有 streaming 基础，只需补齐 Diff/Suggestion，自研成本远低于付费。

### 4.2 WriteNow 已有能力

```typescript
// ai-stream.ts - 已实现 streaming 订阅
export function subscribeToAiStream(
  runId: string,
  onDelta: AiStreamDeltaHandler,  // 流式增量 ✓
  onDone: AiStreamDoneHandler,    // 完成回调 ✓
  onError: AiStreamErrorHandler,  // 错误处理 ✓
)
```

### 4.3 自研 AI Diff Extension

```typescript
// 新增 writenow-frontend/src/lib/editor/extensions/ai-diff.ts
import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const AiDiffKey = new PluginKey('aiDiff')

export interface AiDiffRange {
  from: number
  to: number
  type: 'addition' | 'deletion'
}

export const AiDiffExtension = Extension.create({
  name: 'aiDiff',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AiDiffKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            const diffMeta = tr.getMeta(AiDiffKey)
            if (diffMeta?.ranges) {
              const decorations = diffMeta.ranges.map(({ from, to, type }: AiDiffRange) =>
                Decoration.inline(from, to, {
                  class: type === 'addition' ? 'ai-diff-add' : 'ai-diff-del',
                })
              )
              return DecorationSet.create(tr.doc, decorations)
            }
            if (diffMeta?.clear) {
              return DecorationSet.empty
            }
            return set.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations: (state) => AiDiffKey.getState(state),
        },
      }),
    ]
  },

  addCommands() {
    return {
      // 显示 AI 修改的 diff
      showAiDiff: (ranges: AiDiffRange[]) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(AiDiffKey, { ranges })
        }
        return true
      },
      // 接受修改（清除装饰，保留内容）
      acceptAiDiff: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(AiDiffKey, { clear: true })
        }
        return true
      },
      // 拒绝修改（撤销 + 清除装饰）
      rejectAiDiff: () => ({ editor }) => {
        editor.commands.undo()
        return true
      },
    }
  },
})
```

### 4.4 CSS 样式

```css
/* globals.css */
.ai-diff-add {
  background-color: rgba(34, 197, 94, 0.2);  /* 绿色高亮 */
  border-bottom: 2px solid rgb(34, 197, 94);
}

.ai-diff-del {
  background-color: rgba(239, 68, 68, 0.2);  /* 红色高亮 */
  text-decoration: line-through;
}
```

### 4.5 集成到 TipTapEditor

```typescript
// TipTapEditor.tsx - 添加 Extension
import { AiDiffExtension } from '@/lib/editor/extensions/ai-diff'

const extensions = useMemo(() => [
  // ... 现有 extensions
  AiDiffExtension,
], [mode])

// 使用示例
editor.commands.showAiDiff([
  { from: 10, to: 25, type: 'addition' },
  { from: 30, to: 40, type: 'deletion' },
])
```

### 4.6 改动量估算

| 文件 | 改动 | 工作量 |

|------|------|-------|

| `lib/editor/extensions/ai-diff.ts` | 新增 | 1 天 |

| `lib/editor/extensions/ai-suggestion.ts` | 新增（可选） | 1 天 |

| `components/editor/TipTapEditor.tsx` | 添加 extension | 0.5 天 |

| `styles/globals.css` | 添加样式 | 0.5 天 |

| `components/ai-panel/AIPanel.tsx` | 集成 accept/reject | 1 天 |

**总计**：3-5 天，**零付费**

---

## 五、P1：本地 LLM Tab 续写（零 API 成本）

### 5.1 功能定位

| 功能 | Tab 续写（本地 LLM） | SKILL 改写（云端 API） |

|------|---------------------|----------------------|

| 触发方式 | **停顿自动触发**（Cursor 风格） | 选区 → 选择 SKILL |

| 交互模式 | Inline 灰色预览 → Tab 接受 | diff 显示 → Accept/Reject |

| 模型 | 本地 Qwen2.5-1.5B（免费） | GPT-4o/Claude（付费） |

| 适用场景 | 轻量续写、补全句子 | 深度改写、润色、扩写 |

| 网络依赖 | **无** | 需要 |

### 5.2 技术方案：node-llama-cpp

**node-llama-cpp** 是 llama.cpp 的 Node.js 绑定，官方支持 Electron：

| 特性 | 说明 |

|------|------|

| 预编译二进制 | 无需用户安装任何东西 |

| GPU 自动检测 | Metal/CUDA/Vulkan 自动启用 |

| Electron 支持 | 官方支持，有示例项目 |

| 许可证 | MIT |

### 5.3 用户体验设计

**安装流程**：

```
┌─────────────────────────────────────────────────────┐
│ WriteNow 安装包（~200MB）                           │
│ • 主程序                                            │
│ • node-llama-cpp 运行时（预编译，~30MB）            │
│ • 不含模型                                          │
└─────────────────────────────────────────────────────┘
                    ↓
           首次启动 / 设置页
                    ↓
┌─────────────────────────────────────────────────────┐
│ 「是否启用 AI 续写功能？」                          │
│                                                     │
│ 需要下载约 1GB 的本地 AI 模型                       │
│ 下载后可离线使用，完全免费                          │
│                                                     │
│ [下载并启用]  [稍后再说]                            │
└─────────────────────────────────────────────────────┘
                    ↓
            用户同意后下载
                    ↓
┌─────────────────────────────────────────────────────┐
│ 模型存储位置：                                      │
│ ~/.writenow/models/qwen2.5-1.5b-q4.gguf            │
│                                                     │
│ Tab 续写功能已启用 ✓                                │
└─────────────────────────────────────────────────────┘
```

**使用流程（Cursor 风格）**：

```
用户输入：「今天天气很好，我决定去」
                    ↓
        停止输入 0.8 秒（Debounce）
                    ↓
        后台调用本地 LLM（~300ms）
                    ↓
灰色预览：「公园散步」
                    ↓
┌─────────────────────────────────────────────────────┐
│ Tab   → 接受建议，插入文本                          │
│ Esc   → 取消建议                                    │
│ 继续输入 → 自动取消，开始新的预测周期               │
└─────────────────────────────────────────────────────┘
```

**可配置项**（设置页）：

| 设置项 | 默认值 | 说明 |

|-------|-------|------|

| 启用 Tab 续写 | 开 | 总开关 |

| 触发延迟 | 0.8 秒 | 停止输入后多久触发预测 |

| 最大生成长度 | 50 tokens | 续写内容长度限制 |

### 5.4 推荐模型

| 模型 | 大小 | 内存占用 | 质量 | 推荐 |

|------|------|---------|------|------|

| Qwen2.5-0.5B-Q4 | 350MB | 1GB | 一般 | 低配机器 |

| **Qwen2.5-1.5B-Q4** | **1GB** | **2GB** | **好** | **默认推荐** |

| Qwen2.5-3B-Q4 | 2GB | 4GB | 很好 | 高配机器 |

### 5.5 代码实现

```typescript
// electron/services/local-llm.ts
import { getLlama, LlamaChatSession } from 'node-llama-cpp'
import path from 'path'
import { app } from 'electron'

const MODELS_DIR = path.join(app.getPath('userData'), 'models')
const DEFAULT_MODEL = 'qwen2.5-1.5b-q4.gguf'

let llamaInstance: Awaited<ReturnType<typeof getLlama>> | null = null
let modelInstance: Awaited<ReturnType<typeof llamaInstance.loadModel>> | null = null

export async function initLocalLLM(): Promise<boolean> {
  const modelPath = path.join(MODELS_DIR, DEFAULT_MODEL)
  if (!fs.existsSync(modelPath)) {
    return false  // 模型未下载
  }
  
  llamaInstance = await getLlama()
  modelInstance = await llamaInstance.loadModel({ modelPath })
  return true
}

export async function getCompletion(prompt: string): Promise<string> {
  if (!modelInstance) throw new Error('Local LLM not initialized')
  
  const context = await modelInstance.createContext()
  const session = new LlamaChatSession({ context })
  
  const completion = await session.prompt(prompt, {
    maxTokens: 50,  // Tab 续写只需要短输出
    temperature: 0.7,
  })
  
  await context.dispose()
  return completion
}
```

### 5.6 TipTap Autocomplete Extension（Cursor 风格）

```typescript
// lib/editor/extensions/ai-autocomplete.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const AutocompleteKey = new PluginKey('aiAutocomplete')

// Debounce 延迟（可配置）
const TRIGGER_DELAY_MS = 800

export const AiAutocompleteExtension = Extension.create({
  name: 'aiAutocomplete',

  addStorage() {
    return {
      debounceTimer: null as ReturnType<typeof setTimeout> | null,
      abortController: null as AbortController | null,
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    return [
      new Plugin({
        key: AutocompleteKey,
        state: {
          init: () => ({ suggestion: '', decorations: DecorationSet.empty }),
          apply: (tr, value) => {
            const meta = tr.getMeta(AutocompleteKey)
            if (meta?.suggestion) {
              // 在光标位置显示灰色建议
              const pos = tr.selection.from
              const decoration = Decoration.widget(pos, () => {
                const span = document.createElement('span')
                span.className = 'ai-suggestion-ghost'
                span.textContent = meta.suggestion
                return span
              })
              return {
                suggestion: meta.suggestion,
                decorations: DecorationSet.create(tr.doc, [decoration]),
              }
            }
            if (meta?.clear) {
              return { suggestion: '', decorations: DecorationSet.empty }
            }
            return value
          },
        },
        props: {
          decorations: (state) => AutocompleteKey.getState(state)?.decorations,
          handleKeyDown: (view, event) => {
            const state = AutocompleteKey.getState(view.state)
            
            // Tab 接受建议
            if (event.key === 'Tab' && state?.suggestion) {
              event.preventDefault()
              const tr = view.state.tr
                .insertText(state.suggestion)
                .setMeta(AutocompleteKey, { clear: true })
              view.dispatch(tr)
              return true
            }
            
            // Esc 取消建议
            if (event.key === 'Escape' && state?.suggestion) {
              event.preventDefault()
              view.dispatch(view.state.tr.setMeta(AutocompleteKey, { clear: true }))
              return true
            }
            
            // 任何其他按键 → 取消当前建议，重新开始 debounce
            if (state?.suggestion) {
              view.dispatch(view.state.tr.setMeta(AutocompleteKey, { clear: true }))
            }
            
            return false
          },
        },
      }),
    ]
  },

  onUpdate({ editor }) {
    const storage = this.storage
    
    // 取消之前的预测请求
    if (storage.abortController) {
      storage.abortController.abort()
    }
    
    // 清除之前的 debounce timer
    if (storage.debounceTimer) {
      clearTimeout(storage.debounceTimer)
    }
    
    // 清除当前显示的建议
    editor.commands.clearSuggestion()
    
    // 设置新的 debounce timer（停顿触发）
    storage.debounceTimer = setTimeout(async () => {
      const abortController = new AbortController()
      storage.abortController = abortController
      
      try {
        // 获取光标前的上下文（最多 500 字符）
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, from - 500),
          from,
          '\n'
        )
        
        if (textBefore.trim().length < 10) return  // 上下文太短，不预测
        
        // 调用本地 LLM
        const suggestion = await window.electronAPI.localLLM.getCompletion(textBefore)
        
        if (abortController.signal.aborted) return
        
        if (suggestion && suggestion.trim()) {
          editor.commands.showSuggestion(suggestion)
        }
      } catch (error) {
        // 静默失败（用户继续输入导致取消）
      }
    }, TRIGGER_DELAY_MS)
  },

  addCommands() {
    return {
      showSuggestion: (text: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(AutocompleteKey, { suggestion: text })
        }
        return true
      },
      clearSuggestion: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(AutocompleteKey, { clear: true })
        }
        return true
      },
    }
  },
})
```

### 5.7 CSS 样式

```css
/* globals.css */
.ai-suggestion-ghost {
  color: var(--fg-muted);
  opacity: 0.5;
  font-style: italic;
}
```

### 5.8 模型下载服务

```typescript
// electron/services/model-downloader.ts
import { app } from 'electron'
import https from 'https'
import fs from 'fs'
import path from 'path'

const MODEL_URLS: Record<string, string> = {
  'qwen2.5-1.5b-q4.gguf': 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
}

export async function downloadModel(
  modelName: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const url = MODEL_URLS[modelName]
  const destPath = path.join(app.getPath('userData'), 'models', modelName)
  
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (response) => {
      const total = parseInt(response.headers['content-length'] || '0', 10)
      let downloaded = 0
      
      response.on('data', (chunk) => {
        downloaded += chunk.length
        onProgress(Math.round((downloaded / total) * 100))
      })
      
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', reject)
  })
}
```

### 5.9 改动量估算

| 文件 | 改动 | 工作量 |

|------|------|-------|

| `electron/services/local-llm.ts` | 新增 | 1 天 |

| `electron/services/model-downloader.ts` | 新增 | 0.5 天 |

| `lib/editor/extensions/ai-autocomplete.ts` | 新增 | 1 天 |

| `components/settings/LocalModelSettings.tsx` | 新增 | 1 天 |

| `electron/ipc/local-llm.cjs` | 新增 IPC handlers | 0.5 天 |

| 打包配置（含 node-llama-cpp） | 修改 | 1 天 |

**总计**：5 天，**零 API 成本**

### 5.10 最低配置要求

| 组件 | 最低要求 | 推荐配置 |

|------|---------|---------|

| 内存 | 8GB RAM | 16GB RAM |

| 存储 | 2GB 可用空间 | 5GB |

| CPU | 任意 x64/ARM64 | - |

| GPU | 无（可选） | 有 GPU 更快 |

---

## 六、P2：知识图谱（复用 Graphiti）

### 5.1 Graphiti 优势

- **时序感知**：自动跟踪事实何时有效
- **混合检索**：语义 + 关键词 + 图遍历
- **MCP 支持**：可直接暴露给 Claude/Cursor

### 5.2 集成方案

```python
# 后端服务（Python）
from graphiti_core import Graphiti

graphiti = Graphiti(
    uri="bolt://localhost:7687",  # Neo4j
    user="neo4j",
    password="password"
)

# 添加人物设定
await graphiti.add_episode(
    name="character_setting",
    episode_body="张三是主角，30岁，性格内向，在第三章与李四相遇",
    source_description="人物设定卡片"
)

# 查询
results = await graphiti.search("张三和李四的关系")
```

**架构选项**：

- **A. 本地 Neo4j**：完整功能，需要额外服务
- **B. SQLite 图模拟**：轻量级，功能受限
- **C. Zep Cloud**：托管服务，零运维

**推荐**：先用方案 B（SQLite 关系表），验证需求后再升级

---

## 六、P2：测试体系完善

### 6.1 现状

WriteNow 已有：

- Vitest 4.0（单元测试）
- Playwright 1.58（E2E）
- Testing Library（组件测试）

### 6.2 待完善

| 类型 | 当前覆盖 | 目标 |

|------|---------|------|

| 单元测试 | 部分 | 核心函数 100% |

| 组件测试 | 部分 | 关键组件 80% |

| E2E 测试 | 缺失 | 核心用户流程 |

| Electron 测试 | 缺失 | IPC 通信验证 |

### 6.3 Playwright Electron 测试

```typescript
// tests/e2e/electron.spec.ts
import { _electron as electron } from 'playwright'

test('editor loads correctly', async () => {
  const app = await electron.launch({ args: ['dist-electron/main/index.cjs'] })
  const window = await app.firstWindow()
  
  await expect(window.locator('[data-testid="editor"]')).toBeVisible()
  
  await app.close()
})
```

---

## 七、P3：其他优化项

### 7.1 Novel.sh 参考（可选）

Novel.sh 是开源的 Notion 风格编辑器 + AI：

- 15.9k GitHub stars
- 基于 TipTap
- Vercel AI SDK 集成

可参考其 AI autocomplete 实现模式。

### 7.2 状态管理优化

WriteNow 已使用 Zustand 5，这是 2025 年 React 状态管理的最佳选择：

- 4KB bundle
- 无 boilerplate
- 原生 TypeScript

**无需改动**，当前选型正确。

---

## 八、实施优先级与 ROI

| 优先级 | 任务 | 工作量 | ROI |

|-------|------|-------|-----|

| **P0** | OpenAI/Anthropic 原生 Prompt Caching | 1 天 | **极高**（50-90% 成本降低） |

| **P1** | Mem0 记忆层集成 | 3-5 天 | 高（90% Token 节省 + 个性化） |

| **P1** | 自研 TipTap AI Diff Extension | 3-5 天 | 高（零付费，完全掌控） |

| **P1** | 本地 LLM Tab 续写 | 5 天 | 高（零 API 成本，离线可用） |

| **P2** | E2E 测试覆盖 | 3-5 天 | 中（质量保障） |

| **P2** | Graphiti 知识图谱 | 7-10 天 | 中（长期价值） |

| **P3** | LiteLLM 多模型支持 | 2-3 天 | 低（可选） |

---

## 九、技术风险与缓解

| 风险 | 缓解措施 |

|------|---------|

| 自研 Extension 复杂度 | 参考 Novel.sh 开源实现，已有 streaming 基础 |

| Mem0 云端依赖 | 可部署开源版或保持现有 SQLite 实现 |

| Graphiti 需要 Neo4j | 先用 SQLite 图模拟验证需求 |

| API Provider 缓存策略变化 | 关注官方文档，保持代码灵活 |

---

## 十、关键引用来源

1. LMCache: [docs.lmcache.ai](https://docs.lmcache.ai/)
2. Mem0 Benchmark: [mem0.ai/blog/ai-agent-memory-benchmark](https://mem0.ai/blog/ai-agent-memory-benchmark/)
3. Graphiti: [getzep.com/product/open-source](https://www.getzep.com/product/open-source/)
4. TipTap AI Toolkit: [tiptap.dev/docs/content-ai/capabilities/ai-toolkit](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/overview)
5. sqlite-vec: [alexgarcia.xyz/sqlite-vec](https://alexgarcia.xyz/sqlite-vec/)
6. OpenAI Prompt Caching: [openai.com/index/api-prompt-caching](https://openai.com/index/api-prompt-caching/)
7. Anthropic Prompt Caching: [docs.anthropic.com/en/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
8. LiteLLM Caching: [docs.litellm.ai/docs/proxy/caching](https://docs.litellm.ai/docs/proxy/caching)
9. Playwright Electron: [playwright.dev/docs/api/class-electron](https://playwright.dev/docs/api/class-electron)
10. Novel.sh: [novel.sh](https://novel.sh/)
11. node-llama-cpp: [withcatai.github.io/node-llama-cpp](https://withcatai.github.io/node-llama-cpp/)
12. Qwen2.5 Models: [huggingface.co/Qwen](https://huggingface.co/Qwen)
13. Cursor Tab Model: [cursor.com/blog/tab-update](https://www.cursor.com/blog/tab-update)