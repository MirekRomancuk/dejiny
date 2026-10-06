import assert from 'node:assert/strict';
import test from 'node:test';
import { adminLoginEmail, adminLoginName } from './adminAuth';

test('a username is normalized into the hidden Supabase email identity', () => {
  assert.equal(adminLoginEmail('  RomanCuk  '), 'romancuk@admin.dejinykorunyceske.cz');
  assert.equal(adminLoginEmail('roman cuk'), null);
});

test('existing email accounts remain valid login identities', () => {
  assert.equal(adminLoginEmail(' Existing.Admin@Example.cz '), 'existing.admin@example.cz');
});

test('a hidden admin email is displayed as its username', () => {
  assert.equal(adminLoginName('romancuk@admin.dejinykorunyceske.cz'), 'romancuk');
  assert.equal(adminLoginName('existing.admin@example.cz'), 'existing.admin@example.cz');
});
