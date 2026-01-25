# ISSUE-184

- Issue: #184
- Branch: task/184-p1-quality-fix
- PR: <fill-after-created>

## Plan

- Fix P1-002: Implement file tree context menu via NavigatorContextMenu
- Fix P1-001: Replace deprecated execCommand with Clipboard API
- Fix P1-003: Use public TipTap API for outline navigation
- Fix P1-007: Read version from package.json dynamically
- Fix P1-009: Use TipTap extensions for image/table/link
- Fix P1-005: Integrate language switch with i18n reload

## Runs

### 2026-01-25 Issue created and worktree setup

- Command: `gh issue create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/184`

- Command: `git worktree add -b "task/184-p1-quality-fix" ...`
- Key output: `HEAD is now at 72c64b6`

### 2026-01-25 Implemented quality fixes

1. **P1-002 File tree context menu**: Created `navigator/navigator-context-menu-contribution.ts`
   - New File, New Folder, Rename, Delete, Copy Path, Copy Relative Path
   - Registered to CommandContribution, MenuContribution, KeybindingContribution

2. **P1-001 Clipboard API**: Updated `editor-context-menu.tsx`
   - Replaced deprecated `document.execCommand` with `navigator.clipboard` API
   - Added fallback for browsers without Clipboard API support

3. **P1-003 Public navigation API**: Updated `tiptap-markdown-editor-widget.tsx` and `outline-widget.tsx`
   - Added `scrollToPosition()` public method to TipTapMarkdownEditorWidget
   - Outline widget now uses public API instead of unsafe type assertion

4. **P1-007 Dynamic version**: Updated `about-dialog.tsx`
   - Replaced hardcoded VERSION_INFO with `getVersionInfo()` function
   - Reads Electron/Node/Chrome versions from `process.versions`

5. **P1-009 TipTap extensions**: Updated `editor-toolbar.tsx`
   - LinkDialog: Uses TipTap `setLink` when available
   - ImageDialog: Uses TipTap `setImage` when available
   - TableDialog: Uses TipTap `insertTable` when available
   - All have Markdown fallback for compatibility

- Command: `npm run lint`
- Key output: `Done in 3.21s.` (all checks passed)
