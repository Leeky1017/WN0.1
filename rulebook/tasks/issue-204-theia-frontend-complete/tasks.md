# 任务拆解

## Phase 1: 布局调整

### T1.1: AI Panel 占据完整右侧
- [ ] 移除右侧独立的 Outline 侧边栏配置
- [ ] AI Panel 占据完整右侧空间
- [ ] 右上角添加收起/展开按钮

### T1.2: 左侧边栏整合
- [ ] 将 Outline 移到左侧 Activity Bar
- [ ] 与 Explorer/Search 同级切换

## Phase 2: 后端服务补齐

### T2.1: 创作统计服务
- [ ] 实现 stats:getToday 接口
- [ ] 实现 stats:getRange 接口
- [ ] 实现 stats:increment 接口
- [ ] 对接现有 SQLite DB

### T2.2: 文件快照服务
- [ ] 实现 file:snapshot:latest 接口
- [ ] 实现 file:snapshot:write 接口
- [ ] 支持自动保存/崩溃恢复

### T2.3: 导出服务
- [ ] 实现 export:markdown 接口
- [ ] 实现 export:docx 接口
- [ ] 实现 export:pdf 接口

## Phase 3: UI 入口补齐

### T3.1: 编辑器顶部工具栏
- [ ] Markdown / Word 模式切换
- [ ] Edit / Preview / Split 视图模式
- [ ] 字数统计 + 阅读时长

### T3.2: AI Panel 输入区增强
- [ ] 支持 / 斜杠命令
- [ ] 输入框下方快捷按钮

## 验证
- [ ] CI 通过
- [ ] E2E 测试通过
