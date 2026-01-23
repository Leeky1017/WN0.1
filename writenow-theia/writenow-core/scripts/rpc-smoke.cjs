/* eslint-disable no-console */

const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { ForwardingChannel, ChannelMultiplexer } = require('@theia/core/lib/common/message-rpc/channel');
const { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } = require('@theia/core/lib/common/message-rpc/uint8-array-message-buffer');
const { RpcProxyFactory } = require('@theia/core/lib/common/messaging/proxy-factory');

const { WritenowBackendService } = require('../lib/node/writenow-backend-service');
const { WRITENOW_RPC_PATH } = require('../lib/common/writenow-protocol');

class ChannelPipe {
  constructor() {
    this.left = new ForwardingChannel(
      'left',
      () => this.right.onCloseEmitter.fire({ reason: 'Left channel has been closed' }),
      () => {
        const leftWrite = new Uint8ArrayWriteBuffer();
        leftWrite.onCommit((buffer) => {
          this.right.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(buffer));
        });
        return leftWrite;
      }
    );

    this.right = new ForwardingChannel(
      'right',
      () => this.left.onCloseEmitter.fire({ reason: 'Right channel has been closed' }),
      () => {
        const rightWrite = new Uint8ArrayWriteBuffer();
        rightWrite.onCommit((buffer) => {
          this.left.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(buffer));
        });
        return rightWrite;
      }
    );
  }
}

function createLogger() {
  return {
    error: (message) => console.error(message),
    warn: (message) => console.warn(message),
    info: (message) => console.info(message),
    debug: (_message) => undefined,
  };
}

async function main() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-rpc-smoke-'));

  const backend = new WritenowBackendService(createLogger(), dataDir);

  const pipe = new ChannelPipe();
  const clientMultiplexer = new ChannelMultiplexer(pipe.left);
  const serverMultiplexer = new ChannelMultiplexer(pipe.right);

  const serverFactory = new RpcProxyFactory(backend);
  serverMultiplexer.onDidOpenChannel(({ id, channel }) => {
    if (id === WRITENOW_RPC_PATH) {
      serverFactory.listen(channel);
    }
  });

  const rpcChannel = await clientMultiplexer.open(WRITENOW_RPC_PATH);
  const clientFactory = new RpcProxyFactory();
  clientFactory.listen(rpcChannel);
  const proxy = clientFactory.createProxy();

  const bootstrap = await proxy.invoke('project:bootstrap', {});
  assert.equal(bootstrap.ok, true);
  assert.ok(bootstrap.data.currentProjectId);

  const created = await proxy.invoke('file:create', { name: 'RPC Smoke' });
  assert.equal(created.ok, true);
  assert.ok(created.data.path.endsWith('.md'));

  const content = '# RPC Smoke\n\nHello from rpc-smoke.';
  const write = await proxy.invoke('file:write', { path: created.data.path, content });
  assert.equal(write.ok, true);

  const read = await proxy.invoke('file:read', { path: created.data.path });
  assert.equal(read.ok, true);
  assert.equal(read.data.content, content);

  const snapshotWrite = await proxy.invoke('file:snapshot:write', {
    path: created.data.path,
    content,
    reason: 'manual',
  });
  assert.equal(snapshotWrite.ok, true);
  assert.ok(snapshotWrite.data.snapshotId);

  const snapshotLatest = await proxy.invoke('file:snapshot:latest', { path: created.data.path });
  assert.equal(snapshotLatest.ok, true);
  assert.ok(snapshotLatest.data.snapshot);

  const invalidRead = await proxy.invoke('file:read', { path: '../escape.md' });
  assert.equal(invalidRead.ok, false);
  assert.equal(invalidRead.error.code, 'INVALID_ARGUMENT');

  console.info('[rpc-smoke] ok', {
    dataDir,
    projectId: bootstrap.data.currentProjectId,
    file: created.data.path,
    snapshotId: snapshotWrite.data.snapshotId,
  });
}

main().catch((error) => {
  console.error('[rpc-smoke] failed', error);
  process.exitCode = 1;
});
