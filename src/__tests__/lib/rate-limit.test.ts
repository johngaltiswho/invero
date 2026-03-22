import {
  rateLimit,
  RateLimitPresets,
  getRateLimitStatus,
  clearRateLimit,
  clearAllRateLimits,
} from '@/lib/rate-limit';
import { createMockNextRequest } from '../utils/test-helpers';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('rateLimit basic functionality', () => {
    it('should allow requests under the limit', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const result = await rateLimit(request, { max: 5, windowMs: 60000 });
      expect(result).toBeNull();
    });

    it('should block requests over the limit', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 3, windowMs: 60000 };

      // Make 3 requests (should all succeed)
      for (let i = 0; i < 3; i++) {
        const result = await rateLimit(request, config);
        expect(result).toBeNull();
      }

      // 4th request should be blocked
      const blockedResult = await rateLimit(request, config);
      expect(blockedResult).not.toBeNull();
      expect(blockedResult?.status).toBe(429);
    });

    it('should return null when under limit', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const result = await rateLimit(request, { max: 100 });
      expect(result).toBeNull();
    });

    it('should return 429 response when over limit', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1, windowMs: 60000 };

      await rateLimit(request, config);
      const blockedResult = await rateLimit(request, config);

      expect(blockedResult).not.toBeNull();
      if (blockedResult) {
        expect(blockedResult.status).toBe(429);
        const body = await blockedResult.json();
        expect(body.error).toBeDefined();
        expect(body.retryAfter).toBeDefined();
      }
    });

    it('should track different clients separately', async () => {
      const request1 = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const request2 = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      const config = { max: 1, windowMs: 60000 };

      // First request from client 1
      await rateLimit(request1, config);
      const blocked1 = await rateLimit(request1, config);
      expect(blocked1).not.toBeNull();

      // First request from client 2 should succeed
      const result2 = await rateLimit(request2, config);
      expect(result2).toBeNull();
    });

    it('should track different endpoints separately', async () => {
      const request1 = createMockNextRequest({
        url: 'http://localhost:3000/api/endpoint1',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const request2 = createMockNextRequest({
        url: 'http://localhost:3000/api/endpoint2',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1, windowMs: 60000 };

      // First request to endpoint 1
      await rateLimit(request1, config);
      const blocked1 = await rateLimit(request1, config);
      expect(blocked1).not.toBeNull();

      // First request to endpoint 2 should succeed (different endpoint)
      const result2 = await rateLimit(request2, config);
      expect(result2).toBeNull();
    });
  });

  describe('Rate limit configuration', () => {
    it('should use default config (100 req/min)', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Make 99 requests (should all succeed with default config)
      for (let i = 0; i < 99; i++) {
        const result = await rateLimit(request);
        expect(result).toBeNull();
      }

      // 100th request should still succeed
      const result100 = await rateLimit(request);
      expect(result100).toBeNull();

      // 101st request should be blocked
      const result101 = await rateLimit(request);
      expect(result101).not.toBeNull();
    });

    it('should respect custom windowMs', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1, windowMs: 1000 };

      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should respect custom max', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 5 };

      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(request, config);
        expect(result).toBeNull();
      }

      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should use custom message', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const customMessage = 'Custom rate limit message';
      const config = { max: 1, message: customMessage };

      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);

      expect(blocked).not.toBeNull();
      if (blocked) {
        const body = await blocked.json();
        expect(body.error).toBe(customMessage);
      }
    });

    it('should use custom statusCode', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1, statusCode: 503 };

      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);

      expect(blocked).not.toBeNull();
      if (blocked) {
        expect(blocked.status).toBe(503);
      }
    });
  });

  describe('Client identifier extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-real-ip': '192.168.1.200' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should extract IP from cf-connecting-ip header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'cf-connecting-ip': '192.168.1.300' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should handle multiple IPs in x-forwarded-for (take first)', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1, 192.168.1.2, 192.168.1.3' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });

    it('should fallback to "unknown" when no headers present', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: {},
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });
  });

  describe('Response headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 10 };
      await rateLimit(request, config);
      await rateLimit(request, config);

      const blocked = await rateLimit(request, { max: 2 });
      expect(blocked).not.toBeNull();
      if (blocked) {
        expect(blocked.headers.get('X-RateLimit-Limit')).toBe('2');
      }
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 5 };
      await rateLimit(request, config);

      const result = await rateLimit(request, { max: 1 });
      expect(result).not.toBeNull();
      if (result) {
        expect(result.headers.get('X-RateLimit-Remaining')).toBe('0');
      }
    });

    it('should include X-RateLimit-Reset header', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);

      expect(blocked).not.toBeNull();
      if (blocked) {
        const resetHeader = blocked.headers.get('X-RateLimit-Reset');
        expect(resetHeader).toBeDefined();
        expect(resetHeader).not.toBeNull();
      }
    });

    it('should include Retry-After header when blocked', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { max: 1 };
      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);

      expect(blocked).not.toBeNull();
      if (blocked) {
        const retryAfter = blocked.headers.get('Retry-After');
        expect(retryAfter).toBeDefined();
        expect(retryAfter).not.toBeNull();
      }
    });
  });

  describe('Skip functionality', () => {
    it('should skip rate limiting when skip function returns true', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = {
        max: 1,
        skip: () => true,
      };

      // Make multiple requests, all should succeed
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(request, config);
        expect(result).toBeNull();
      }
    });

    it('should apply rate limiting when skip function returns false', async () => {
      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = {
        max: 1,
        skip: () => false,
      };

      await rateLimit(request, config);
      const blocked = await rateLimit(request, config);
      expect(blocked).not.toBeNull();
    });
  });

  describe('RateLimitPresets', () => {
    it('should have AUTH preset (5 req/15 min)', () => {
      expect(RateLimitPresets.AUTH).toEqual({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
      });
    });

    it('should have STANDARD preset (100 req/min)', () => {
      expect(RateLimitPresets.STANDARD).toEqual({
        windowMs: 60 * 1000,
        max: 100,
        message: 'Too many requests. Please slow down.',
      });
    });

    it('should have MUTATION preset (30 req/min)', () => {
      expect(RateLimitPresets.MUTATION).toEqual({
        windowMs: 60 * 1000,
        max: 30,
        message: 'Too many write operations. Please slow down.',
      });
    });

    it('should have READ_ONLY preset (300 req/min)', () => {
      expect(RateLimitPresets.READ_ONLY).toEqual({
        windowMs: 60 * 1000,
        max: 300,
      });
    });

    it('should have EXPENSIVE preset (10 req/hour)', () => {
      expect(RateLimitPresets.EXPENSIVE).toEqual({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: 'This operation is rate-limited. Please try again later.',
      });
    });
  });

  describe('Utility functions', () => {
    describe('clearRateLimit', () => {
      it('should clear specific client/endpoint', async () => {
        const request = createMockNextRequest({
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const config = { max: 1 };

        // Hit rate limit
        await rateLimit(request, config);
        const blocked = await rateLimit(request, config);
        expect(blocked).not.toBeNull();

        // Clear rate limit
        clearRateLimit('192.168.1.1', '/api/test');

        // Should be able to make request again
        const result = await rateLimit(request, config);
        expect(result).toBeNull();
      });

      it('should not affect other clients', async () => {
        const request1 = createMockNextRequest({
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const request2 = createMockNextRequest({
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': '192.168.1.2' },
        });

        const config = { max: 1 };

        // Hit rate limits for both clients
        await rateLimit(request1, config);
        await rateLimit(request1, config);
        await rateLimit(request2, config);
        await rateLimit(request2, config);

        // Clear only client 1
        clearRateLimit('192.168.1.1', '/api/test');

        // Client 1 should be able to make request
        const result1 = await rateLimit(request1, config);
        expect(result1).toBeNull();

        // Client 2 should still be blocked
        const result2 = await rateLimit(request2, config);
        expect(result2).not.toBeNull();
      });
    });

    describe('clearAllRateLimits', () => {
      it('should clear all tracked clients', async () => {
        const request1 = createMockNextRequest({
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });

        const request2 = createMockNextRequest({
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': '192.168.1.2' },
        });

        const config = { max: 1 };

        // Hit rate limits for both clients
        await rateLimit(request1, config);
        await rateLimit(request1, config);
        await rateLimit(request2, config);
        await rateLimit(request2, config);

        // Clear all rate limits
        clearAllRateLimits();

        // Both clients should be able to make requests
        const result1 = await rateLimit(request1, config);
        expect(result1).toBeNull();

        const result2 = await rateLimit(request2, config);
        expect(result2).toBeNull();
      });
    });
  });
});
