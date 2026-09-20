const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('sam-theme.css');
const money = read('money-ux.js');
const shell = read('ux-shell.js');
const admin = read('admin-console.js');
const anomalies = read('patron-anomalies.js');
const index = read('index.html');

assert.match(css, /button:focus-visible/);
assert.match(css, /button \{ min-height: 44px; \}/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /@media \(min-width: 700px\)/);
assert.match(css, /@media \(min-width: 1100px\)/);
assert.match(css, /@media \(min-width: 1500px\)/);
assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /nav \{ left: 28px; top: 28px; bottom: 28px;/);
assert.match(shell, /aria-live="polite"/);
assert.match(money, /function readMoneyFields\(\)/);
assert.match(money, /Indiquez un montant en cash ou Mobile Money/);
assert.match(money, /label for="m-reason"/);
assert.match(money, /label for="m-source"/);
assert.match(admin, /code==='DESTOCKEUR'/);
assert.doesNotMatch(anomalies, /Expédié par Joel|reçu par Georges|Observation Joel/);
assert.match(index, /money-ux\.js\?v=8/);
assert.match(index, /sam-theme\.css\?v=4/);

console.log('Audit UI/accessibilité: OK');
