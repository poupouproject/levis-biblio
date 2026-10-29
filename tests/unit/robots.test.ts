import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots.txt', () => {
  it('ferme tout le site aux robots, images comprises', () => {
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});
