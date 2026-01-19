# Manus 上下文工程参考资料

本文件夹收集 Manus AI 的上下文工程方法论，为 WriteNow 的 Agent 能力建设提供参考。

---

## 一、核心文献

### 官方博客：Context Engineering for AI Agents

**来源**：https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus

**作者**：季逸超 (Yichao "Peak" Ji)，Manus 联合创始人兼首席科学家

**核心观点**：上下文工程是一门"实验科学"，需要通过反复的架构搜索、prompt 优化和实证测试（类似于 SGD）来找到局部最优解。

---

## 二、原文五大核心技术

> ⚠️ 以下 5 个技术来自 Manus 官方博客原文

### 1. Design Around the KV-Cache（围绕 KV 缓存设计）

**原理**
- LLM 推理时会缓存 Key-Value 对，相同前缀不需要重新计算
- KV 缓存命中率直接影响成本和延迟
- Agent 场景输入远大于输出，上下文优化至关重要

**实践**
- 保持稳定的 prompt 前缀
- 使用 append-only 的上下文结构（只追加不修改）
- 避免动态元素（如时间戳）破坏缓存

**WriteNow 适用**
- SKILL prompt 模板作为稳定前缀
- 项目设定/人物卡片放在 prompt 最前面
- 用户选中内容追加在后面

### 2. Mask, Don't Remove（遮蔽而非移除）

**原理**
- 不要动态增减 tools，这会破坏缓存
- 使用 logit masking 在解码时屏蔽不可用的 tools
- 保持 tool 列表稳定

**实践**
- 定义完整的 tool 列表
- 通过状态机控制当前可用的 tools
- 不可用的 tools 通过 constrained decoding 屏蔽

**WriteNow 适用**
- 始终向模型提供完整的 SKILL 列表
- 根据当前状态（有无选区、文章类型等）屏蔽不适用的 SKILL
- 保持 prompt 结构稳定

### 3. Use the File System as Context（文件系统作为上下文）

**原理**
- 文件系统是"终极上下文"——外部化的持久记忆
- 让 Agent 读写文件，突破上下文窗口限制
- 压缩策略应设计为可恢复的（如保留 URL 但丢弃网页内容）

**实践**
- Agent 可以创建、读取、更新文件
- 复杂信息存入文件而非挤进 prompt
- 文件成为 Agent 的"长期记忆"

**WriteNow 适用**
- 项目设定、人物卡片、世界观存为独立文件
- AI 可以主动读取相关设定文件
- 大纲、时间线等结构化数据存储在外部

### 4. Keep the Wrong Stuff In（保留错误历史）

**原理**
- 不要删除失败的尝试记录
- 错误历史帮助 Agent 避免重复失败
- 类似人类学习的"试错记忆"

**实践**
- 将失败尝试和错误信息保留在上下文中
- 让 Agent 知道"不要再这样做"
- 实现更好的错误恢复

**WriteNow 适用**
- 如果用户拒绝了某次 AI 建议，下次可提示"用户之前拒绝了类似改写"
- 保留用户偏好的历史信号
- 帮助 AI 更好地理解用户风格

### 5. Don't Get Few-Shotted（避免少样本偏差）

**原理**
- Agent 的历史行为会成为隐式的 few-shot examples
- 如果早期行为有偏差，后续会被强化
- 需要确保示例多样性

**实践**
- 提供多样化的示例
- 避免过度依赖历史行为模式
- 定期"刷新"上下文

**WriteNow 适用**
- 内置 SKILL 的示例要多样化
- 避免用户养成固定的交互模式
- 偶尔推荐用户尝试不同的 SKILL

---

## 三、LangChain 研讨会补充内容

> ⚠️ 以下内容来自 2025年10月 LangChain × Manus 联合研讨会，非原博客内容

### 研讨会信息
- **时间**：2025年10月14日
- **主讲人**：Lance Martin (LangChain) + 季逸超 (Manus)

### 补充技术要点

**上下文三大策略**
- 上下文缩减 (Context Reduction)：可逆"压缩" vs 不可逆"摘要"
- 上下文隔离 (Context Isolation)：通信模式 vs 共享内存模式
- 上下文卸载 (Context Offloading)：分层式行为空间

**披露的数据**
- 输入:输出 Token 比例约为 100:1
- 缓存命中成本：$0.30/百万token vs 未命中：$3.00/百万token

**Agent 架构**
- 最小化子 Agent：Planner + Knowledge Manager + Executor
- Agent-as-Tool 范式

---

## 四、开源参考项目

### OpenManus（MetaGPT 团队）

**最新 GitHub**：https://github.com/FoundationAgents/OpenManus

> 注：原仓库 mannaandpoem/OpenManus 已迁移到上述新地址

**Star 数**：34K+

**核心贡献者**
- @mannaandpoem (Xinbin Liang)
- @XiangJinyu (Jinyu Xiang)
- 来自 MetaGPT 团队

**特点**
- 开源复刻 Manus 核心功能
- 模块化设计（agent、flow、tool 核心模块）
- 支持 MCP 协议
- MIT 许可证

**运行方式**
```bash
# 基础版
python main.py

# MCP 版本
python run_mcp.py

# 多 Agent 版本
python run_flow.py
```

### OpenManus-RL

**描述**：OpenManus 的强化学习调优版本

**合作方**：UIUC 研究人员

**特点**：使用 GRPO 等 RL 方法优化 LLM Agent

---

## 五、WriteNow 实施建议

### 从 Manus 学习的优先级

| 优先级 | 技术 | 来源 | 原因 |
|-------|------|------|------|
| P0 | 稳定 prompt 前缀 | 原文 | 降低成本，提升一致性 |
| P0 | 文件系统作为上下文 | 原文 | 管理项目设定和人物卡片 |
| P1 | 保留错误历史 | 原文 | 学习用户偏好 |
| P1 | 避免少样本偏差 | 原文 | 提升建议多样性 |
| P2 | Tool 遮蔽 | 原文 | 高级优化，初期可暂缓 |
| P2 | 上下文分层 | 研讨会 | 高级优化，用户量大时再考虑 |

### 分阶段实施

**Phase 1：基础上下文**
- 实现标准化的 prompt 结构
- 项目设定和当前文章作为上下文

**Phase 2：智能上下文**
- 自动选取相关人物/设定
- 基于 SKILL 类型动态调整上下文

**Phase 3：学习与优化**
- 记录用户采纳/拒绝历史
- 优化 AI 建议的相关性

---

## 六、参考链接

### 官方资源
- Manus 官方博客：https://manus.im/blog
- Manus 产品：https://manus.im/app

### 开源项目
- OpenManus：https://github.com/FoundationAgents/OpenManus
- MetaGPT：https://github.com/geekan/MetaGPT

### 技术论文
- In-context Learning：https://arxiv.org/abs/2301.00234
- Neural Turing Machines：https://arxiv.org/abs/1410.5401
- KV-Cache 解释：https://medium.com/@joaolages/kv-caching-explained-276520203249

### 工具与框架
- LangChain：https://langchain.com
- vLLM（KV 缓存优化）：https://github.com/vllm-project/vllm
- Model Context Protocol（MCP）：https://modelcontextprotocol.io
