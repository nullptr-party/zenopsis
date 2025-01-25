import { Context, NextFunction } from "grammy";

interface RateLimit {
  count: number;
  timestamp: number;
}

const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 5;

export const rateLimiter = () => {
  const limits = new Map<string, RateLimit>();

  return async (ctx: Context, next: NextFunction) => {
    const now = Date.now();
    const key = `${ctx.chat?.id}:${ctx.from?.id}`;
    
    // Clean up old entries
    for (const [storedKey, limit] of limits.entries()) {
      if (now - limit.timestamp > WINDOW_MS) {
        limits.delete(storedKey);
      }
    }

    const currentLimit = limits.get(key) || { count: 0, timestamp: now };
    
    if (now - currentLimit.timestamp > WINDOW_MS) {
      // Reset if window expired
      currentLimit.count = 1;
      currentLimit.timestamp = now;
    } else if (currentLimit.count >= MAX_REQUESTS) {
      await ctx.reply("Rate limit exceeded. Please wait a minute before sending more messages.");
      return;
    } else {
      currentLimit.count++;
    }
    
    limits.set(key, currentLimit);
    await next();
  };
};
