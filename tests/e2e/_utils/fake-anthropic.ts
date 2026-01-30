import http from 'node:http';

type FakeAnthropicMode = 'success' | 'delay' | 'timeout' | 'upstream-error';

export type FakeAnthropicServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function detectMode(userContent: string): FakeAnthropicMode {
  if (userContent.includes('E2E_TIMEOUT')) return 'timeout';
  if (userContent.includes('E2E_UPSTREAM_ERROR')) return 'upstream-error';
  if (userContent.includes('E2E_DELAY')) return 'delay';
  return 'success';
}

function writeSse(res: http.ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function createMessageStart(model: string) {
  return {
    type: 'message_start',
    message: {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 0 },
    },
  };
}

function createContentBlockStart() {
  return {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  };
}

function createContentDelta(text: string) {
  return {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text },
  };
}

function createContentStop() {
  return { type: 'content_block_stop', index: 0 };
}

function createMessageDelta() {
  return {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: 8 },
  };
}

function createMessageStop() {
  return { type: 'message_stop' };
}

export async function startFakeAnthropicServer(): Promise<FakeAnthropicServer> {
  const server = http.createServer((req, res) => {
    if (!req.url || req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/v1/messages') {
      res.writeHead(404);
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('error', () => {
      res.writeHead(400);
      res.end();
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = null;
      }

      const record = parsed as { stream?: unknown; model?: unknown; messages?: unknown[] } | null;
      const stream = Boolean(record && typeof record === 'object' && (record as { stream?: unknown }).stream === true);
      const model = coerceString(record?.model) || 'claude-3-5-sonnet-latest';

      const firstMessage = Array.isArray(record?.messages) ? record!.messages[0] : undefined;
      const firstContent = firstMessage && typeof firstMessage === 'object' ? (firstMessage as { content?: unknown }).content : '';
      const userContent = coerceString(firstContent);
      const mode = detectMode(userContent);

      if (mode === 'upstream-error') {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { type: 'internal_server_error', message: 'E2E upstream error' } }));
        return;
      }

      if (!stream) {
        const text = mode === 'success' ? 'E2E_RESULT_OK' : 'E2E_RESULT';
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: `msg_${Date.now()}`,
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text }],
            model,
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 8 },
          }),
        );
        return;
      }

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });

      const timeouts: Array<NodeJS.Timeout> = [];
      const cleanup = () => {
        while (timeouts.length > 0) {
          const t = timeouts.pop();
          if (t) clearTimeout(t);
        }
      };

      req.on('close', cleanup);
      res.on('close', cleanup);

      if (mode === 'timeout') {
        // Intentionally do not send any data before the client timeout elapses.
        timeouts.push(
          setTimeout(() => {
            try {
              res.end();
            } catch {
              // ignore
            }
          }, 10_000),
        );
        return;
      }

      writeSse(res, 'message_start', createMessageStart(model));
      writeSse(res, 'content_block_start', createContentBlockStart());

      const text =
        mode === 'success'
          ? 'E2E_RESULT: This is a deterministic fake completion used for Playwright.'
          : 'E2E_RESULT_DELAY: streaming...';

      writeSse(res, 'content_block_delta', createContentDelta(text.slice(0, 24)));

      if (mode === 'delay') {
        timeouts.push(
          setTimeout(() => {
            writeSse(res, 'content_block_delta', createContentDelta(text.slice(24)));
            writeSse(res, 'content_block_stop', createContentStop());
            writeSse(res, 'message_delta', createMessageDelta());
            writeSse(res, 'message_stop', createMessageStop());
            res.end();
          }, 10_000),
        );
        return;
      }

      writeSse(res, 'content_block_delta', createContentDelta(text.slice(24)));
      writeSse(res, 'content_block_stop', createContentStop());
      writeSse(res, 'message_delta', createMessageDelta());
      writeSse(res, 'message_stop', createMessageStop());
      res.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind fake server');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: async () =>
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
