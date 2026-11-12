// query-string 7 is CommonJS; the security-fixed decoder exports an ESM default.
// Keep Expo Router's existing query-string API instead of upgrading the SDK.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const entry = require.resolve('query-string');
const metadata = require(path.join(path.dirname(entry), 'package.json'));
assert.equal(metadata.version, '7.1.3', 'Review decoder adapter after query-string updates');
const original = "const decodeComponent = require('decode-uri-component');";
const patched = "const decodeComponent = require('decode-uri-component').default;";
const source = fs.readFileSync(entry, 'utf8');
assert(source.includes(original) || source.includes(patched), 'Unexpected query-string decoder import');
if (source.includes(original)) fs.writeFileSync(entry, source.replace(original, patched));
// Fail installation if Node interop or the decoder's public API changes.
assert.deepEqual({ ...require(entry).parse('q=%D8%B9%D8%B1%D8%A8%D9%8A') }, { q: 'عربي' });
console.log('query-string 7.1.3: patched decoder ESM default import verified');
