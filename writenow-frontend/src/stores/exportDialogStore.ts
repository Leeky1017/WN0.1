/**
 * Export Dialog Store
 * Why: Manage export dialog state globally for access from command palette and shortcuts.
 */

import { create } from 'zustand';

export interface ExportDialogState {
  /** Whether the export dialog is open */
  open: boolean;
  /** Open the export dialog */
  openDialog: () => void;
  /** Close the export dialog */
  closeDialog: () => void;
}

export const useExportDialogStore = create<ExportDialogState>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
}));
