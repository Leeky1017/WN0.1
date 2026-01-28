/**
 * WN E2E bridge (E2E-only)
 * Why: Provide Playwright with a stable, minimal API to exercise real context assembly (context_rules gating)
 * and backend persistence, without requiring an AI API key in CI.
 */
import type { AiSkillRunRequest, IpcChannel, IpcError, IpcResponse, SkillReadResponse } from '@/types/ipc-generated';
import { rpcClient } from '@/lib/rpc';
import { skillsClient } from '@/lib/rpc/skills-client';
import { assembleSkillRunRequest, ContextAssemblerError } from '@/lib/ai/context-assembler';

export type ConfigureWnE2EArgs = {
  enabled: boolean;
};

type AssembleForSkillArgs = {
  skillId: string;
  text: string;
  instruction?: string;
  projectId?: string;
  articleId?: string;
};

function ipcOk<TData>(data: TData): IpcResponse<TData> {
  return { ok: true, data };
}

function ipcErr<TData>(error: IpcError): IpcResponse<TData> {
  return { ok: false, error };
}

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function getSkillDefinition(skillId: string): Promise<IpcResponse<SkillReadResponse>> {
  try {
    await skillsClient.connect();
    return await skillsClient.getSkill({ id: skillId });
  } catch (error) {
    return ipcErr({
      code: 'INTERNAL',
      message: 'Failed to load skill definition',
      details: { skillId, message: error instanceof Error ? error.message : String(error) },
    });
  }
}

async function assembleForSkill(args: AssembleForSkillArgs): Promise<IpcResponse<AiSkillRunRequest>> {
  const skillId = coerceString(args.skillId);
  if (!skillId) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'skillId is required' });

  const skillRes = await getSkillDefinition(skillId);
  if (!skillRes.ok) return ipcErr(skillRes.error);

  const definition = skillRes.data.skill.definition;
  if (!definition) {
    return ipcErr({ code: 'INVALID_ARGUMENT', message: 'Skill definition is missing', details: { skillId } });
  }

  try {
    const request = await assembleSkillRunRequest({
      skillId,
      definition,
      text: args.text,
      instruction: coerceString(args.instruction),
      selection: null,
      editor: null,
      ...(coerceString(args.projectId) ? { projectId: coerceString(args.projectId) } : {}),
      ...(coerceString(args.articleId) ? { articleId: coerceString(args.articleId) } : {}),
    });
    return ipcOk(request);
  } catch (error) {
    if (error instanceof ContextAssemblerError) {
      return ipcErr({ code: error.code, message: error.message, ...(typeof error.details === 'undefined' ? {} : { details: error.details }) });
    }
    return ipcErr({ code: 'INTERNAL', message: 'Failed to assemble skill request', details: { skillId } });
  }
}

async function invokeIpc(channel: IpcChannel, payload: unknown): Promise<IpcResponse<unknown>> {
  return await rpcClient.invoke(channel, payload);
}

/**
 * Why: Gate all E2E-only hooks behind an explicit flag to avoid exposing internal APIs in production runs.
 */
export function configureWnE2E(args: ConfigureWnE2EArgs): void {
  if (!args.enabled) return;
  if (typeof window === 'undefined') return;

  window.__WN_E2E__ ??= {
    invoke: invokeIpc,
    assembleForSkill,
  };
}

