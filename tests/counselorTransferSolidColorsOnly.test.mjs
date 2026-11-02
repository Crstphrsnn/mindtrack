import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/pages/counselor/CounselorTransfers.css', import.meta.url), 'utf8');
const jsx = readFileSync(new URL('../src/pages/counselor/CounselorTransfers.jsx', import.meta.url), 'utf8');
const start = '/* Transfer overview: MindTrack blue, warm amber, and teal status colors. */';
const end = '/* End transfer overview status colors. */';
const block = css.slice(css.indexOf(start), css.indexOf(end) + end.length);

test('overview contains exactly three cards and preserves labels', () => {
  assert.equal((jsx.match(/className="mt-transfer-stat"/g) || []).length, 3);
  for (const label of ['Incoming pending', 'Outgoing pending', 'Resolved records']) assert.ok(jsx.includes(label));
});
test('cards have full solid blue, amber and teal backgrounds', () => {
  assert.ok(css.includes(start) && css.includes(end));
  for (const color of ['#2057ad', '#f1b34b', '#0c756b']) {
    assert.ok(block.includes(`background: ${color};`), `Missing solid ${color}`);
  }
  assert.doesNotMatch(block, /linear-gradient|radial-gradient/);
});
test('labels, numbers, and icons use contrasting foreground colors', () => {
  assert.match(block, /span:not\(\.mt-transfer-stat-icon\)/);
  assert.match(block, /strong\s*\{\s*color: var\(--mt-transfer-stat-ink\)/);
  assert.match(block, /\.mt-transfer-stat \.mt-transfer-stat-icon/);
  assert.match(block, /--mt-transfer-stat-ink: #ffffff/);
  assert.match(block, /--mt-transfer-stat-ink: #362305/);
});
test('only Transfers-scoped styles are introduced', () => {
  assert.ok(block.includes('.mt-transfers .mt-transfer-stat:nth-child(1)'));
  assert.ok(block.includes('.mt-transfers .mt-transfer-stat:nth-child(2)'));
  assert.ok(block.includes('.mt-transfers .mt-transfer-stat:nth-child(3)'));
  assert.doesNotMatch(block, /(?:^|\n)\s*(?:body|html|button|\.dashboard)\s*\{/);
});
