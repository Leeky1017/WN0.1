# ISSUE-186

- Issue: #186
- Branch: task/186-i18n-notification
- PR: <fill-after-created>

## Plan

- Set up Theia nls.localize() infrastructure for i18n
- Integrate NotificationService with AI Panel for task completion notifications
- Add desktop notification support via Notification API

## Runs

### 2026-01-25 Issue created and worktree setup

- Command: `gh issue create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/186`

- Command: `git worktree add -b "task/186-i18n-notification" ...`
- Key output: `HEAD is now at 89923e8`

### 2026-01-25 Implemented i18n and AI notification

1. **AI task completion notification** (`ai-panel-widget.tsx`, `ai-panel-contribution.ts`)
   - Injected NotificationService into AiPanelWidget
   - When AI streaming completes (`event.type === 'done'`), adds notification via NotificationService
   - Sends desktop notification via Notification API when user has switched away

2. **i18n infrastructure** (`i18n/nls.ts`)
   - Created nls wrapper using Theia's @theia/core/lib/common/nls
   - Added WN_STRINGS centralized string definitions
   - All UI strings can now use nls() for translation

3. **Language switch with reload** (`settings-widget.tsx`)
   - Stores language preference in localStorage as `nls.locale` (Theia standard)
   - Added "立即重启" button to reload app after language change

- Command: `npm run lint`
- Key output: `Done in 4.81s.` (all checks passed)
- Evidence: `writenow-theia/writenow-core/src/browser/i18n/nls.ts` (new), `ai-panel-widget.tsx` (modified), `settings-widget.tsx` (modified)
