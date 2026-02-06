import { describe, test, expect, mock, beforeEach } from "bun:test";
import { rateLimiter } from "@/bot/middleware/rate-limiter";

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    chat: { id: -100 },
    from: { id: 1 },
    message: { text: "/help" },
    reply: mock(() => Promise.resolve()),
    ...overrides,
  } as any;
}

describe("rateLimiter", () => {
  let middleware: ReturnType<typeof rateLimiter>;

  beforeEach(() => {
    // Create a fresh limiter per test to reset internal state
    middleware = rateLimiter();
  });

  test("passes through non-command messages", async () => {
    const ctx = createMockCtx({ message: { text: "hello" } });
    const next = mock(() => Promise.resolve());

    await middleware(ctx, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test("allows first 5 commands within window", async () => {
    const next = mock(() => Promise.resolve());

    for (let i = 0; i < 5; i++) {
      const ctx = createMockCtx();
      await middleware(ctx, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  test("blocks 6th command within window", async () => {
    const next = mock(() => Promise.resolve());

    for (let i = 0; i < 5; i++) {
      await middleware(createMockCtx(), next);
    }

    const ctx6 = createMockCtx();
    await middleware(ctx6, next);

    // next should still only have been called 5 times
    expect(next).toHaveBeenCalledTimes(5);
    expect(ctx6.reply).toHaveBeenCalledTimes(1);
  });

  test("resets window after 60 seconds", async () => {
    const next = mock(() => Promise.resolve());
    const originalNow = Date.now;

    let currentTime = 1000000;
    Date.now = () => currentTime;

    try {
      // Use up all 5 requests
      for (let i = 0; i < 5; i++) {
        await middleware(createMockCtx(), next);
      }
      expect(next).toHaveBeenCalledTimes(5);

      // Advance past the window
      currentTime += 61000;

      // Should be allowed again
      await middleware(createMockCtx(), next);
      expect(next).toHaveBeenCalledTimes(6);
    } finally {
      Date.now = originalNow;
    }
  });

  test("different users have separate limits", async () => {
    const next = mock(() => Promise.resolve());

    // User 1 uses all 5 requests
    for (let i = 0; i < 5; i++) {
      await middleware(createMockCtx({ from: { id: 1 } }), next);
    }

    // User 2 should still be allowed
    const ctxUser2 = createMockCtx({ from: { id: 2 } });
    await middleware(ctxUser2, next);

    expect(next).toHaveBeenCalledTimes(6);
    expect(ctxUser2.reply).not.toHaveBeenCalled();
  });

  test("messages without leading slash are not rate-limited", async () => {
    const next = mock(() => Promise.resolve());

    // Send many non-command messages
    for (let i = 0; i < 10; i++) {
      await middleware(createMockCtx({ message: { text: "just chatting" } }), next);
    }

    expect(next).toHaveBeenCalledTimes(10);
  });
});
