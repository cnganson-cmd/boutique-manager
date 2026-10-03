const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const runBuild = environment => execFileSync(
  process.execPath,
  ['scripts/build-cloudflare.mjs', environment],
  { cwd: root, encoding: 'utf8' }
);

runBuild('DEV');
runBuild('RECETTE');

const inspect = (folder, environment) => {
  const output = path.join(root, '.cloudflare', folder);
  const config = fs.readFileSync(path.join(output, 'config.js'), 'utf8');
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.webmanifest'), 'utf8'));
  const pwa = fs.readFileSync(path.join(output, 'pwa.js'), 'utf8');

  assert.match(config, new RegExp(`environment:'${environment}'`));
  assert.doesNotMatch(html, /config-test\.js|manifest-test\.webmanifest/);
  assert.strictEqual(manifest.start_url, './');
  assert.match(pwa, /layout=canonical/);
  assert.ok(!fs.existsSync(path.join(output, '.git')));
  assert.ok(!fs.existsSync(path.join(output, 'tests')));
  assert.ok(!fs.existsSync(path.join(output, 'database')));
};

inspect('dev', 'DEV');
inspect('recette', 'RECETTE');

console.log('Cloudflare build outputs: OK');
