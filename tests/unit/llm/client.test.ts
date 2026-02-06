import { describe, test, expect, mock } from "bun:test";
import { withErrorHandling } from "@/llm/client";

describe("withErrorHandling", () => {
  test("returns result on successful first attempt", async () => {
    const result = await withErrorHandling(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  test("retries on 429 rate limit error and succeeds", async () => {
    let attempt = 0;
    const result = await withErrorHandling(
      () => {
        attempt++;
        if (attempt === 1) throw new Error("429 Too Many Requests");
        return Promise.resolve("recovered");
      },
      3,
      10,
    );
    expect(result).toBe("recovered");
    expect(attempt).toBe(2);
  });

  test("retries on rate limit message and succeeds", async () => {
    let attempt = 0;
    const result = await withErrorHandling(
      () => {
        attempt++;
        if (attempt === 1) throw new Error("rate limit exceeded");
        return Promise.resolve("recovered");
      },
      3,
      10,
    );
    expect(result).toBe("recovered");
    expect(attempt).toBe(2);
  });

  test("throws last error after exhausting retries", async () => {
    const error = new Error("429 Too Many Requests");
    await expect(
      withErrorHandling(() => Promise.reject(error), 2, 10),
    ).rejects.toThrow("429 Too Many Requests");
  });

  test("throws non-retryable error after exhausting retries", async () => {
    const error = new Error("Something broke");
    await expect(
      withErrorHandling(() => Promise.reject(error), 2, 10),
    ).rejects.toThrow("Something broke");
  });

  test("respects custom retries parameter", async () => {
    let attempt = 0;
    await withErrorHandling(
      () => {
        attempt++;
        if (attempt < 5) throw new Error("429");
        return Promise.resolve("ok");
      },
      5,
      10,
    );
    expect(attempt).toBe(5);
  });
});
