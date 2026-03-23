import { describe, it, expect } from 'vitest';
import { trimTrailingSlash } from './env';

describe('trimTrailingSlash', () => {
  it('strips trailing slash', () => {
    expect(trimTrailingSlash('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('returns empty string when url is undefined', () => {
    expect(trimTrailingSlash(undefined)).toBe('');
  });
});
