import type {
  IpcChannel,
  IpcError as IpcErrorShape,
  IpcErrorCode,
  IpcInvokeDataMap,
  IpcInvokePayloadMap,
  IpcInvokeResponseMap,
} from '../types/ipc';

export class IpcError extends Error {
  code: IpcErrorCode;
  details?: unknown;
  retryable?: boolean;

  constructor(error: IpcErrorShape) {
    super(error.message);
    this.name = 'IpcError';
    this.code = error.code;
    this.details = error.details;
    this.retryable = error.retryable;
  }
}

function getWriteNowApi() {
  const api = window.writenow;
  if (!api) {
    throw new Error('WriteNow API is not available (are you running in Electron?)');
  }
  return api;
}

export async function invoke<T extends IpcChannel>(channel: T, payload: IpcInvokePayloadMap[T]): Promise<IpcInvokeDataMap[T]> {
  const response: IpcInvokeResponseMap[T] = await getWriteNowApi().invoke(channel, payload);
  if (!response.ok) {
    throw new IpcError(response.error);
  }
  return response.data;
}

export const fileOps = {
  list: (options?: { projectId?: string }) =>
    invoke('file:list', typeof options?.projectId === 'string' ? { projectId: options.projectId } : {}),
  read: (path: string) => invoke('file:read', { path }),
  write: (path: string, content: string, options?: { projectId?: string }) =>
    invoke('file:write', typeof options?.projectId === 'string' ? { path, content, projectId: options.projectId } : { path, content }),
  create: (name: string, options?: { projectId?: string }) =>
    invoke('file:create', typeof options?.projectId === 'string' ? { name, projectId: options.projectId } : { name }),
  delete: (path: string) => invoke('file:delete', { path }),
  sessionStatus: () => invoke('file:session:status', {}),
  snapshotWrite: (path: string, content: string, reason: 'auto' | 'manual' = 'auto') =>
    invoke('file:snapshot:write', { path, content, reason }),
  snapshotLatest: (path?: string) => invoke('file:snapshot:latest', path ? { path } : {}),
};

export const projectOps = {
  bootstrap: () => invoke('project:bootstrap', {}),
  list: () => invoke('project:list', {}),
  getCurrent: () => invoke('project:getCurrent', {}),
  setCurrent: (projectId: string) => invoke('project:setCurrent', { projectId }),
  create: (payload: { name: string; description?: string; styleGuide?: string }) => invoke('project:create', payload),
  update: (payload: { id: string; name?: string; description?: string; styleGuide?: string }) => invoke('project:update', payload),
  delete: (payload: { id: string; reassignProjectId?: string }) => invoke('project:delete', payload),
};

export const characterOps = {
  list: (projectId: string) => invoke('character:list', { projectId }),
  create: (payload: IpcInvokePayloadMap['character:create']) => invoke('character:create', payload),
  update: (payload: IpcInvokePayloadMap['character:update']) => invoke('character:update', payload),
  delete: (payload: IpcInvokePayloadMap['character:delete']) => invoke('character:delete', payload),
};

export const outlineOps = {
  get: (payload: IpcInvokePayloadMap['outline:get']) => invoke('outline:get', payload),
  save: (payload: IpcInvokePayloadMap['outline:save']) => invoke('outline:save', payload),
};

export const knowledgeGraphOps = {
  getGraph: (payload: IpcInvokePayloadMap['kg:graph:get']) => invoke('kg:graph:get', payload),
  listEntities: (payload: IpcInvokePayloadMap['kg:entity:list']) => invoke('kg:entity:list', payload),
  createEntity: (payload: IpcInvokePayloadMap['kg:entity:create']) => invoke('kg:entity:create', payload),
  updateEntity: (payload: IpcInvokePayloadMap['kg:entity:update']) => invoke('kg:entity:update', payload),
  deleteEntity: (payload: IpcInvokePayloadMap['kg:entity:delete']) => invoke('kg:entity:delete', payload),
  listRelations: (payload: IpcInvokePayloadMap['kg:relation:list']) => invoke('kg:relation:list', payload),
  createRelation: (payload: IpcInvokePayloadMap['kg:relation:create']) => invoke('kg:relation:create', payload),
  deleteRelation: (payload: IpcInvokePayloadMap['kg:relation:delete']) => invoke('kg:relation:delete', payload),
};

export const aiOps = {
  runSkill: (payload: IpcInvokePayloadMap['ai:skill:run']) => invoke('ai:skill:run', payload),
  cancelSkill: (runId: string) => invoke('ai:skill:cancel', { runId }),
};

export const versionOps = {
  list: (payload: IpcInvokePayloadMap['version:list']) => invoke('version:list', payload),
  create: (payload: IpcInvokePayloadMap['version:create']) => invoke('version:create', payload),
  restore: (snapshotId: string) => invoke('version:restore', { snapshotId }),
  diff: (payload: IpcInvokePayloadMap['version:diff']) => invoke('version:diff', payload),
};

export const updateOps = {
  getState: () => invoke('update:getState', {}),
  check: (payload: IpcInvokePayloadMap['update:check']) => invoke('update:check', payload),
  download: (version: string) => invoke('update:download', { version }),
  install: (downloadId: string) => invoke('update:install', { downloadId }),
  skipVersion: (version: string) => invoke('update:skipVersion', { version }),
  clearSkipped: () => invoke('update:clearSkipped', {}),
};

export const exportOps = {
  markdown: (title: string, content: string) => invoke('export:markdown', { title, content }),
  docx: (title: string, content: string) => invoke('export:docx', { title, content }),
  pdf: (title: string, content: string) => invoke('export:pdf', { title, content }),
};

export const clipboardOps = {
  writeText: (text: string) => invoke('clipboard:writeText', { text }),
  writeHtml: (html: string, text?: string) => invoke('clipboard:writeHtml', typeof text === 'string' ? { html, text } : { html }),
};
