import assert from 'node:assert/strict';
import test from 'node:test';
import { maxPictureBytes, validatePictureFile, prepareProfilePicture } from './profilePicture.js';
import { getProfileStorageKey, hasProfileChanges, loadProfile } from './profile.js';

test('a picture-only change is detected even when the original profile has no picture field', () => {
  const original = { name: 'Alex', email: 'alex@example.com' };
  const draft = { ...original, picture: 'data:image/jpeg;base64,new' };
  assert.equal(hasProfileChanges(original, draft), true);
  assert.equal(hasProfileChanges(draft, draft), false);
  assert.equal(hasProfileChanges(original, { ...original }), false);
  assert.equal(hasProfileChanges(original, { ...original, picture: '' }), false);
});

test('replacing and removing a saved picture count as changes', () => {
  const original = { name: 'Alex', picture: 'data:image/jpeg;base64,old' };
  assert.equal(hasProfileChanges(original, { ...original, picture: 'data:image/jpeg;base64,new' }), true);
  assert.equal(hasProfileChanges(original, { ...original, picture: '' }), true);
  assert.equal(hasProfileChanges(original, { ...original }), false);
});

test('picture uploads accept supported formats and enforce size limits', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validatePictureFile({ type, size: maxPictureBytes }), '');
  }
  for (const file of [
    { type: 'image/svg+xml', size: 100 },
    { type: 'text/plain', size: 100 },
    { type: '', size: 100 },
    { type: 'image/png', size: 0 },
    { type: 'image/jpeg', size: maxPictureBytes + 1 },
  ]) assert.ok(validatePictureFile(file));
});

test('invalid files are rejected before image decoding', async () => {
  await assert.rejects(prepareProfilePicture({ type: 'text/plain', size: 10 }), /JPG, PNG, or WebP/);
  await assert.rejects(prepareProfilePicture({ type: 'image/png', size: maxPictureBytes + 1 }), /5 MB/);
});

test('saved pictures reload only for their account and old profiles default to initials', () => {
  const originalWindow = globalThis.window;
  const picture = 'data:image/jpeg;base64,example';
  const records = new Map([
    [getProfileStorageKey('alex@example.com'), JSON.stringify({ name: 'Alex', picture })],
    [getProfileStorageKey('sam@example.com'), JSON.stringify({ name: 'Sam' })],
  ]);
  globalThis.window = { localStorage: { getItem: (key) => records.get(key) ?? null } };
  try {
    assert.equal(loadProfile('alex@example.com').picture, picture);
    assert.equal(loadProfile('sam@example.com').picture, '');
    assert.equal(loadProfile('new@example.com').picture, '');
    records.set(getProfileStorageKey('alex@example.com'), JSON.stringify({ picture: '' }));
    assert.equal(loadProfile('alex@example.com').picture, '');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
