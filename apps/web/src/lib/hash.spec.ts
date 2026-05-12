import { describe, expect, it } from 'vitest';
import { computeSHA256 } from './hash';

describe('computeSHA256', () => {
  it('computes the canonical SHA-256 digest for a file', async () => {
    const file = new File(['abc'], 'abc.txt', { type: 'text/plain' });
    await expect(computeSHA256(file)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});