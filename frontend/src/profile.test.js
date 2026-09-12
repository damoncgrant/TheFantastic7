import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContactField } from './profile.js';

test('contact details remain optional and allow surrounding whitespace', () => {
  for (const field of ['email', 'phone']) {
    assert.equal(validateContactField(field, ''), '');
    assert.equal(validateContactField(field, '   '), '');
  }
  assert.equal(validateContactField('email', '  alex@example.com  '), '');
  assert.equal(validateContactField('phone', '  +1 780 555 0123  '), '');
});

test('email accepts common addresses and rejects malformed local parts and domains', () => {
  for (const email of ['alex@example.com', 'alex.chen+jobs@sub.example.co.uk', "o'connor@example.ca"]) {
    assert.equal(validateContactField('email', email), '', email);
  }
  for (const email of ['alex', 'alex@', '@example.com', 'alex@example', 'alex@@example.com',
    'alex chen@example.com', '.alex@example.com', 'alex..chen@example.com', 'alex.@example.com',
    'alex@-example.com', 'alex@example-.com', 'alex@exam_ple.com', 'alex@example..com',
    'alex@example.com.', `${'a'.repeat(65)}@example.com`, `alex@${'a'.repeat(64)}.com`]) {
    assert.ok(validateContactField('email', email), email);
  }
});

test('phone accepts local and international formats with 7–15 digits', () => {
  for (const phone of ['5550123', '7805550123', '(780) 555-0123', '+1 780 555 0123',
    '+44 20 7946 0958', '780.555.0123', '+123456789012345']) {
    assert.equal(validateContactField('phone', phone), '', phone);
  }
  for (const phone of ['123456', '1234567890123456', 'call me', '+1 780 ABC 0123',
    '++17805550123', '780+5550123', '(780 555-0123', '780) 555-0123', '()7805550123',
    '780--555-0123', '7805550123-', '+']) {
    assert.ok(validateContactField('phone', phone), phone);
  }
});
