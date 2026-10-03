const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
const recipeWrangler = fs.readFileSync(path.join(root, 'wrangler.recette.jsonc'), 'utf8');
const ignored = fs.readFileSync(path.join(root, '.assetsignore'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'scripts/build-cloudflare.mjs'), 'utf8');

assert.match(wrangler, /"name":\s*"parfumerie-sam-dev"/);
assert.match(wrangler, /"preview_urls":\s*false/);
assert.match(wrangler, /\.cloudflare\/dev/);
assert.match(recipeWrangler, /"name":\s*"parfumerie-sam-recette"/);
assert.match(recipeWrangler, /\.cloudflare\/recette/);
assert.match(ignored, /\*\*\/\.git/);
assert.match(ignored, /^\.wrangler$/m);
assert.match(ignored, /^database$/m);
assert.match(ignored, /^tests$/m);
assert.match(ignored, /^config-test\.js$/m);
assert.match(worker, /ENVIRONMENT_SHELL/);
assert.match(worker, /ENVIRONMENT==='RECETTE'/);
assert.match(worker, /CANONICAL_LAYOUT/);
assert.match(builder, /DEV\|RECETTE/);

console.log('Cloudflare deployment smoke test: OK');
