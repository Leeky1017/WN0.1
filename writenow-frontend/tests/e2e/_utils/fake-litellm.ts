import http from 'node:http';

type FakeLiteLlmMode = 'success' | 'delay' | 'timeout' | 'upstream-error';

export type FakeLiteLlmServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function detectMode(prompt: string): FakeLiteLlmMode {
  if (prompt.includes('E2E_TIMEOUT')) return 'timeout';
  if (prompt.includes('E2E_UPSTREAM_ERROR')) return 'upstream-error';
  if (prompt.includes('E2E_DELAY')) return 'delay';
  return 'success';
}

function writeSse(res: http.ServerResponse, data: unknown): void {
  res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
}

function createChunk(id: string, delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'fake-litellm',
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

export async function startFakeLiteLlmServer(): Promise<FakeLiteLlmServer> {
  const server = http.createServer((req, res) => {
    if (!req.url || req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/v1/chat/completions') {
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

      const messages = Array.isArray(record?.messages) ? record!.messages : [];
      const prompt = messages
        .map((m) => (m && typeof m === 'object' ? coerceString((m as { content?: unknown }).content) : ''))
        .join('\n');

      const mode = detectMode(prompt);

      if (mode === 'upstream-error') {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'E2E upstream error (fake LiteLLM)' } }));
        return;
      }

      const completionText =
        mode === 'success'
          ? 'E2E_RESULT: This is a deterministic fake completion from LiteLLM (OpenAI-compatible).'
          : mode === 'delay'
            ? 'E2E_RESULT_DELAY: streaming...'
            : 'E2E_RESULT';

      if (!stream) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: `chatcmpl_${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: coerceString(record?.model) || 'fake-litellm',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: completionText },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 8, total_tokens: 9 },
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

      const id = `chatcmpl_${Date.now()}`;
      writeSse(res, createChunk(id, { role: 'assistant' }));
      writeSse(res, createChunk(id, { content: completionText.slice(0, 24) }));

      if (mode === 'delay') {
        timeouts.push(
          setTimeout(() => {
            writeSse(res, createChunk(id, { content: completionText.slice(24) }));
            writeSse(res, createChunk(id, {}, 'stop'));
            writeSse(res, '[DONE]');
            res.end();
          }, 10_000),
        );
        return;
      }

      writeSse(res, createChunk(id, { content: completionText.slice(24) }));
      writeSse(res, createChunk(id, {}, 'stop'));
      writeSse(res, '[DONE]');
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

