import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const queryString = require('query-string');

describe('Expo Router query-string decoder compatibility', () => {
  it('preserves Arabic, repeated parameters, plus signs and malformed escapes', () => {
    expect({ ...queryString.parse('q=%D8%B9%D8%B1%D8%A8%D9%8A&item=1&item=2&space=a+b&bad=%zz') })
      .toEqual({ q: 'عربي', item: ['1', '2'], space: 'a b', bad: '%zz' });
    const params = { title: 'عربي', url: 'https://youtu.be/abcdefghijk?t=12&x=1' };
    expect({ ...queryString.parse(queryString.stringify(params)) }).toEqual(params);
  });

  it('bounds both advisory payloads through the actual CommonJS consumer', () => {
    // A child timeout prevents a vulnerable decoder from hanging the test runner.
    const result = spawnSync(process.execPath, ['-e', `
      const qs = require('query-string');
      qs.parse('q=' + '%EA'.repeat(100));
      let payload = '';
      for (let i = 0; i < 32000; i++) {
        payload += '%' + Math.floor(i / 256).toString(16).padStart(2, '0')
          + '%' + (i % 256).toString(16).padStart(2, '0') + 'x';
      }
      qs.parse('q=' + payload + '%zz');
    `], { cwd: process.cwd(), timeout: 5000, encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  });
});
