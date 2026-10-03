import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requested = String(process.argv[2] || '').toUpperCase();
const environments = {
  DEV: {
    entry: 'index.html',
    config: 'config.js',
    manifest: 'manifest.webmanifest',
    output: 'dev'
  },
  RECETTE: {
    entry: 'test.html',
    config: 'config-test.js',
    manifest: 'manifest-test.webmanifest',
    output: 'recette'
  }
};

const selected = environments[requested];
if (!selected) {
  console.error('Usage: node scripts/build-cloudflare.mjs DEV|RECETTE');
  process.exit(1);
}

const output = path.join(root, '.cloudflare', selected.output);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const copy = (sourceName, targetName = sourceName) => {
  const source = path.join(root, sourceName);
  const target = path.join(output, targetName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

let html = fs.readFileSync(path.join(root, selected.entry), 'utf8');
html = html
  .replaceAll(selected.config, 'config.js')
  .replaceAll(selected.manifest, 'manifest.webmanifest');
fs.writeFileSync(path.join(output, 'index.html'), html);

copy(selected.config, 'config.js');

const manifest = JSON.parse(fs.readFileSync(path.join(root, selected.manifest), 'utf8'));
manifest.start_url = './';
manifest.scope = './';
fs.writeFileSync(path.join(output, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

// Only copy local files referenced by the selected entry page. Query strings
// provide cache busting in HTML and are not part of the filesystem path.
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => match[1].split('?')[0])
  .filter(reference => reference && !reference.startsWith('http') && !reference.startsWith('data:'));

for (const reference of new Set(references)) {
  if (reference === 'config.js' || reference === 'manifest.webmanifest' || reference.startsWith('assets/')) continue;
  copy(reference);
}

copy('service-worker.js');
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });

// Cloudflare builds expose canonical filenames. GitHub Pages keeps its legacy
// test.html layout during the transition, so the service worker is told which
// layout it is caching through a deployment-only query parameter.
const pwaPath = path.join(output, 'pwa.js');
const pwa = fs.readFileSync(pwaPath, 'utf8').replace('&v=8', '&layout=canonical&v=8');
fs.writeFileSync(pwaPath, pwa);

const forbidden = requested === 'DEV'
  ? ['test.html', 'config-test.js', 'manifest-test.webmanifest']
  : ['test.html', 'config-test.js', 'manifest-test.webmanifest', 'config-prod.js'];
for (const file of forbidden) {
  if (fs.existsSync(path.join(output, file))) throw new Error(`Unexpected deployment file: ${file}`);
}

const builtConfig = fs.readFileSync(path.join(output, 'config.js'), 'utf8');
if (!builtConfig.includes(`environment:'${requested}'`)) {
  throw new Error(`The generated configuration is not ${requested}`);
}

for (const reference of new Set(references)) {
  const normalized = reference === selected.config
    ? 'config.js'
    : reference === selected.manifest
      ? 'manifest.webmanifest'
      : reference;
  if (!normalized.startsWith('assets/') && !fs.existsSync(path.join(output, normalized))) {
    throw new Error(`Missing generated asset: ${normalized}`);
  }
}

console.log(`${requested} Cloudflare build ready: ${path.relative(root, output)}`);
