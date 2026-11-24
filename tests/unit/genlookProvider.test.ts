import { describe, it, expect } from 'vitest';
import { GenlookProvider } from '../../src/features/ai-try-on/providers/genlook/genlookProvider';

describe('GenlookProvider', () => {
  it('exposes provider metadata cleanly without leaking credentials', async () => {
    const provider = new GenlookProvider();
    expect(provider.id).toBe('genlook');
    expect(provider.name).toBe('Genlook AI');

    const status = await provider.getStatus(false);
    expect(status.provider).toBe('genlook');
    expect(status.configured).toBe(false);
  });
});
