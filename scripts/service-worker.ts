import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const PUBLIC_PRECACHE = /^(favicon\.(ico|svg)|icon-\d+\.png|icon-maskable-\d+\.png|apple-touch-icon\.png|manifest\.webmanifest)$/;
const BUNDLE_PRECACHE = /\.(html|js|css|woff2|svg|png)$/;

export function serviceWorker(): Plugin {
  const root = fileURLToPath(new URL('..', import.meta.url));
  return {
    name: 'panrouter-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((file) => BUNDLE_PRECACHE.test(file));
      const statics = readdirSync(`${root}public`).filter((file) => PUBLIC_PRECACHE.test(file));
      const files = ['./', ...[...built, ...statics].sort().map((file) => `./${file}`)];
      const hash = createHash('sha256');
      for (const file of built) {
        const item = bundle[file];
        hash.update(file);
        hash.update(item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : Buffer.from(item.source));
      }
      const version = hash.digest('hex').slice(0, 12);
      const source = readFileSync(`${root}scripts/sw-template.js`, 'utf8')
        .replace('__CACHE__', `panrouter-${version}`)
        .replace('__ASSETS__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
