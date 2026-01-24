# ISSUE-156
- Issue: #156
- Branch: task/156-ai-panel-widget
- PR: <fill-after-created>

## Plan
- Migrate AI/Skills/Context backend services to writenow-core and extend Theia RPC protocol.
- Implement WebSocket-based streaming bridge + cancel semantics.
- Build AI Panel Widget UI + editor integration + E2E verification.

## Runs

### 2026-01-24 10:20 UTC Streaming design: Theia WebSocket JSON-RPC notifications
- Command: `rg -n "AiStreamEvent|AiServiceClient|WRITENOW_AI_RPC_PATH" writenow-theia/writenow-core/src/common/writenow-protocol.ts writenow-theia/writenow-core/src/node/writenow-core-backend-module.ts writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-service.ts`
- Key output: `AiServiceClient.onStreamEvent(...) + backend JsonRpcConnectionHandler<AiServiceClient>(..., client => server.setClient(client))`
- Evidence:
  - `writenow-theia/writenow-core/src/common/writenow-protocol.ts`
  - `writenow-theia/writenow-core/src/node/writenow-core-backend-module.ts`
  - `writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-service.ts`

### 2026-01-24 10:21 UTC Build: writenow-core (TypeScript)
- Command: `yarn --cwd writenow-theia/writenow-core build`
- Key output: `tsc (exit 0)`
- Evidence: `writenow-theia/writenow-core/lib/**`

### 2026-01-24 10:22 UTC OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed`
- Evidence: `openspec/specs/**`

### 2026-01-24 10:22 UTC IPC contract drift check
- Command: `npm run contract:check`
- Key output: `ipc-contract-sync.js check (exit 0)`
- Evidence:
  - `src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`

### 2026-01-24 10:23 UTC Lint + build (Electron app toolchain gate)
- Command: `npm run lint && npm run build`
- Key output: `lint: 0 errors; build: vite build (exit 0)`
- Evidence: `dist/**`

### 2026-01-24 10:24 UTC SKILL list verification (builtin skills indexed)
- Command: `node - <<'NODE'\nconst os=require('node:os');const path=require('node:path');const fs=require('node:fs/promises');\nconst {WritenowSqliteDb}=require('./writenow-theia/writenow-core/lib/node/database/writenow-sqlite-db');\nconst {SkillsService}=require('./writenow-theia/writenow-core/lib/node/services/skills-service');\nconst logger={error:console.error,warn:console.warn,info:console.log,debug:()=>undefined};\n(async()=>{const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'wn-skills-'));const db=new WritenowSqliteDb(logger,dataDir);db.ensureReady();\nconst svc=new SkillsService(logger,db);const res=await svc.listSkills({});\nconsole.log(res.ok,res.ok?res.data.skills.map(s=>s.id):res.error);})();\nNODE`
- Key output: `true ["builtin:expand","builtin:polish","builtin:condense", ...]`
- Evidence:
  - `electron/skills/packages/pkg.writenow.builtin/1.0.0/skills/*/SKILL.md`
  - `writenow-theia/writenow-core/src/node/services/skills-service.ts`

### 2026-01-24 10:25 UTC Stop generation verification (cancel -> CANCELED)
- Command: `node - <<'NODE'\nconst os=require('node:os');const path=require('node:path');const fs=require('node:fs/promises');\nconst {WritenowSqliteDb}=require('./writenow-theia/writenow-core/lib/node/database/writenow-sqlite-db');\nconst {SkillsService}=require('./writenow-theia/writenow-core/lib/node/services/skills-service');\nconst {AiService}=require('./writenow-theia/writenow-core/lib/node/services/ai-service');\nconst logger={error:console.error,warn:console.warn,info:console.log,debug:()=>undefined};\n(async()=>{const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'wn-ai-cancel-'));const db=new WritenowSqliteDb(logger,dataDir);db.ensureReady();\nconst skills=new SkillsService(logger,db);await skills.listSkills({});\nconst ai=new AiService(logger,db);\nlet terminal=null;const done=new Promise(r=>ai.setClient({onStreamEvent:e=>{if(e.type==='done'||e.type==='error'){terminal=e;r();}}}));\nconst start=await ai.streamResponse({skillId:'builtin:polish',input:{text:'测试取消',language:'zh-CN'},prompt:{systemPrompt:'test',userContent:'test'},stream:true,injected:{memory:[]}});\nawait ai.cancel({runId:start.data.runId});\nawait Promise.race([done,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),30000))]);\nconsole.log(terminal);\n})();\nNODE`
- Key output: `{ type: "error", error: { code: "CANCELED" } }`
- Evidence:
  - `writenow-theia/writenow-core/src/node/services/ai-service.ts`
  - `writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx`
