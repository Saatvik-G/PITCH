import { NextRequest } from 'next/server';

const tracker = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Basic in-memory rate limiter per IP address.
 * 
 * @param req NextRequest
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds (default 60000ms / 1 minute)
 */
export function rateLimit(req: NextRequest, limit = 15, windowMs = 60000): RateLimitResult {
  // Extract true client IP (handling proxy chains)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || 
             req.headers.get('x-real-ip')?.trim() || 
             '127.0.0.1';
  
  const now = Date.now();
  const record = tracker.get(ip);

  // No record or expired window
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    tracker.set(ip, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt
    };
  }

  // Rate limit exceeded
  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetAt
    };
  }

  // Increment requests count
  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetAt
  };
}
