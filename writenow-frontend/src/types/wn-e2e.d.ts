import type { AiSkillRunRequest, IpcChannel, IpcResponse } from './ipc-generated';

declare global {
  interface Window {
    __WN_E2E__?: {
      invoke: (channel: IpcChannel, payload: unknown) => Promise<IpcResponse<unknown>>;
      assembleForSkill: (args: {
        skillId: string;
        text: string;
        instruction?: string;
        projectId?: string;
        articleId?: string;
      }) => Promise<IpcResponse<AiSkillRunRequest>>;
    };
  }
}

export {};

