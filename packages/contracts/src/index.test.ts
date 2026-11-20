import { expect, test } from 'vitest';
import * as contracts from './index.js';

test('loads the contracts entry point in a Node environment', () => {
  expect(typeof contracts).toBe('object');
  expect(globalThis).not.toHaveProperty('document');
  expect(globalThis).not.toHaveProperty('indexedDB');
});
