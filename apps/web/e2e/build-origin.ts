import { test } from '@playwright/test';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface BuildOrigin {
  url: string;
  useBuild(directory: string): void;
  disconnect(): void;
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
};

export const testWithOrigin = test.extend<{ buildOrigin: BuildOrigin }>({
  buildOrigin: async ({ baseURL }, use) => {
    let directory = fileURLToPath(new URL('../dist/', import.meta.url));
    let online = true;
    const server = createServer((request, response) => {
      if (!online) {
        request.socket.destroy();
        return;
      }
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      const filename = extname(pathname) ? pathname : '/index.html';
      void readFile(join(directory, filename)).then(
        (bytes) => {
          response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type':
              contentTypes[extname(filename)] ?? 'application/octet-stream',
          });
          response.end(bytes);
        },
        () => response.writeHead(404).end(),
      );
    });
    const listening = once(server, 'listening');
    const host = new URL(baseURL ?? 'http://127.0.0.1').hostname;
    server.listen(0, host);

    try {
      await listening;
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Fixture server unavailable.');
      await use({
        url: 'http://' + host + ':' + address.port,
        useBuild(nextDirectory) {
          directory = nextDirectory;
        },
        disconnect() {
          // Drop network connections without disabling the browser's service worker.
          online = false;
          server.closeAllConnections();
        },
      });
    } finally {
      server.close();
      server.closeAllConnections();
    }
  },
});
