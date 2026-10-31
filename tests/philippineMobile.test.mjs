import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PH_MOBILE_INPUT_PATTERN,
  sanitizePhilippineMobileInput,
  normalizePhilippineMobile,
  areSamePhilippineMobileNumbers
} from '../src/utils/philippineMobile.js';

const pattern = new RegExp(`^(?:${PH_MOBILE_INPUT_PATTERN})$`);

test('accepts valid 09 and +639 Philippine mobile numbers', () => {
  assert.equal(normalizePhilippineMobile('09123456789'), '09123456789');
  assert.equal(normalizePhilippineMobile('+639123456789'), '09123456789');
  assert.equal(normalizePhilippineMobile('+63 912-345-6789'), '09123456789');
  assert.ok(pattern.test('09123456789'));
  assert.ok(pattern.test('+639123456789'));
});

test('rejects incomplete, invalid, and unsupported numbers', () => {
  for (const invalid of ['0912345678', '08123456789', '+63912345678',
    '+6309123456789', '639123456789', '+6391234567890', '']) {
    assert.equal(normalizePhilippineMobile(invalid), '', invalid);
  }
});

test('keeps the +63 prefix while typing or pasting', () => {
  assert.equal(sanitizePhilippineMobileInput('+639123456789'), '+639123456789');
  assert.equal(sanitizePhilippineMobileInput('+63 912-345-6789'), '+639123456789');
  assert.equal(sanitizePhilippineMobileInput('09123456789'), '09123456789');
});

test('prevents identical personal and emergency numbers in different formats', () => {
  assert.equal(areSamePhilippineMobileNumbers('09123456789', '+639123456789'), true);
  assert.equal(areSamePhilippineMobileNumbers('09123456789', '09123456789'), true);
  assert.equal(areSamePhilippineMobileNumbers('09123456789', '+639123456788'), false);
  assert.equal(areSamePhilippineMobileNumbers('', ''), false);
});
