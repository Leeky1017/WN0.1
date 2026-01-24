## 1. Implementation
- [x] 1.1 Extend Theia RPC protocol: add AIService + SkillsService interfaces, request/response types, error codes.
- [x] 1.2 Migrate backend modules: `ai-service.ts`, `skills-service.ts`, `context-service.ts` (ContextAssembler + RAG integration wiring).
- [x] 1.3 Implement streaming bridge (WebSocket): start/stop stream, push deltas, handle timeout/cancel/error without leaking stack traces.
- [x] 1.4 Implement AI Panel frontend: ReactWidget + contribution, message history, SKILL picker, stream rendering, stop button.
- [x] 1.5 Integrate with editor: selection capture, diff preview, apply/discard, commands + keybindings (Cmd/Ctrl+K, Esc).

## 2. Testing
- [ ] 2.1 Add E2E: skills list loads, streaming request works, stop works, editor selection rewrite + apply works.
- [x] 2.2 Run full checks (lint/build/e2e + openspec validate) and record evidence in RUN_LOG.

## 3. Documentation
- [ ] 3.1 Update task card acceptance + completion metadata for Task 012.
- [x] 3.2 Update `writenow-spec` status/roadmap sync for Phase 3 progress.
