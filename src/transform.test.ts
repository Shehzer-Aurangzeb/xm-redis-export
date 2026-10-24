import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { xmlToRedisEntries } from './transform.ts';

test('maps subdomains and cookies to redis keys', () => {
  const xml = `
    <config>
      <subdomains>
        <subdomain>http://secureline.tools.avast.com</subdomain>
        <subdomain>  http://gf.tools.avast.com  </subdomain>
      </subdomains>
      <cookies>
        <!-- avast -->
        <cookie name="dlp-avast" host="amazon">mmm_amz_dlp_777_ppc_m</cookie>
        <cookie name="dlp-avg" host="cnet">mmm_cnt_dlp_779_ppc_m</cookie>
      </cookies>
    </config>`;

  assert.deepEqual(xmlToRedisEntries(xml), {
    subdomains: '["http://secureline.tools.avast.com","http://gf.tools.avast.com"]',
    'cookie:dlp-avast:amazon': 'mmm_amz_dlp_777_ppc_m',
    'cookie:dlp-avg:cnet': 'mmm_cnt_dlp_779_ppc_m',
  });
});

test('single subdomain and single cookie are still handled as lists', () => {
  const xml = `
    <config>
      <subdomains><subdomain>http://files.avast.com</subdomain></subdomains>
      <cookies><cookie name="dlp-avast" host="chip">mmm_cip_dlp_777_ppc_m</cookie></cookies>
    </config>`;

  assert.deepEqual(xmlToRedisEntries(xml), {
    subdomains: '["http://files.avast.com"]',
    'cookie:dlp-avast:chip': 'mmm_cip_dlp_777_ppc_m',
  });
});

test('empty or missing sections give an empty subdomains list', () => {
  const expected = { subdomains: '[]' };
  assert.deepEqual(xmlToRedisEntries('<config></config>'), expected);
  assert.deepEqual(xmlToRedisEntries('<config><subdomains/><cookies/></config>'), expected);
});

test('number-like values stay strings', () => {
  const xml = `
    <config>
      <subdomains><subdomain>007</subdomain></subdomains>
      <cookies><cookie name="n" host="01net">0100</cookie></cookies>
    </config>`;

  assert.deepEqual(xmlToRedisEntries(xml), { subdomains: '["007"]', 'cookie:n:01net': '0100' });
});

test('throws on a cookie without name or host', () => {
  assert.throws(() => xmlToRedisEntries('<config><cookies><cookie host="amazon">x</cookie></cookies></config>'));
  assert.throws(() => xmlToRedisEntries('<config><cookies><cookie name="dlp">x</cookie></cookies></config>'));
});

test('throws on invalid xml or a missing <config> root', () => {
  assert.throws(() => xmlToRedisEntries('<config><subdomains>'));
  assert.throws(() => xmlToRedisEntries('<other></other>'), /Missing <config>/);
});

test('real config.xml produces the keys from the task', () => {
  const entries = xmlToRedisEntries(readFileSync(new URL('../config.xml', import.meta.url), 'utf8'));

  assert.equal(Object.keys(entries).length, 47);
  assert.equal(JSON.parse(entries.subdomains).length, 38);
  assert.deepEqual(JSON.parse(entries.subdomains).slice(0, 2), ['http://secureline.tools.avast.com', 'http://gf.tools.avast.com']);
  assert.equal(entries['cookie:dlp-avast:amazon'], 'mmm_amz_dlp_777_ppc_m');
});
