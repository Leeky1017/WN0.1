/**
 * Skills JSON-RPC client (Theia backend)
 * Why: Standalone frontend needs skills list/definitions for slash commands and prompt construction.
 */

import type { IpcResponse, SkillListRequest, SkillListResponse, SkillReadRequest, SkillReadResponse } from '@/types/ipc-generated';

import { JsonRpcWebSocketClient, type JsonRpcConnectionStatus, type JsonRpcStatusListener } from './jsonrpc-client';
import { getRpcWsUrl } from './rpcUrl';

export class SkillsJsonRpcClient {
  private readonly client = new JsonRpcWebSocketClient();

  get status(): JsonRpcConnectionStatus {
    return this.client.status;
  }

  get isConnected(): boolean {
    return this.client.isConnected;
  }

  onStatusChange(listener: JsonRpcStatusListener): () => void {
    return this.client.onStatusChange(listener);
  }

  /**
   * 设置重连成功回调（用于刷新 skills 列表）
   */
  setOnReconnected(callback: () => void): void {
    this.client.setOnReconnected(callback);
  }

  async connect(url: string = getRpcWsUrl()): Promise<void> {
    await this.client.connect(url);
  }

  disconnect(): void {
    this.client.disconnect();
  }

  async listSkills(request: SkillListRequest): Promise<IpcResponse<SkillListResponse>> {
    return await this.client.sendRequest<IpcResponse<SkillListResponse>>('listSkills', request);
  }

  async getSkill(request: SkillReadRequest): Promise<IpcResponse<SkillReadResponse>> {
    return await this.client.sendRequest<IpcResponse<SkillReadResponse>>('getSkill', request);
  }
}

export const skillsClient = new SkillsJsonRpcClient();
