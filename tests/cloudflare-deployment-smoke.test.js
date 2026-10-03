const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
const ignored = fs.readFileSync(path.join(root, '.assetsignore'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(wrangler, /"name":\s*"parfumerie-sam-dev"/);
assert.match(wrangler, /"preview_urls":\s*false/);
assert.match(ignored, /\*\*\/\.git/);
assert.match(ignored, /^database$/m);
assert.match(ignored, /^tests$/m);
assert.match(ignored, /^config-test\.js$/m);
assert.match(worker, /ENVIRONMENT_SHELL/);
assert.match(worker, /ENVIRONMENT==='RECETTE'/);

console.log('Cloudflare deployment smoke test: OK');
