# SQLite 图模拟 PoC（P2-002）

## Why
该 PoC 用 WriteNow 现有 SQLite 知识图谱表（`kg_entities/kg_relations`）模拟“关系检索 / 时序事实 / 一致性检查”，为 Graphiti（Zep）评估提供可复现基准，避免在评估前引入 Neo4j 等重依赖。

## How to run
1) 安装依赖（确保 `better-sqlite3` 可用）：

```bash
npm run theia:install
```

2) 运行 PoC（会创建临时 SQLite DB 并输出结果与基准指标）：

```bash
node writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs
```

3) 可选参数：

```bash
node writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs --iterations 2000 --warmup 200
```

## Dataset
- 默认数据集：`writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.dataset.json`
- 本目录下也包含一份同内容镜像：`dataset.json`（用于在评估报告中可追溯引用）。

