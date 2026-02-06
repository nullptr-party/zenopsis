import { describe, test, expect } from "bun:test";
import { formatSummary } from "@/llm/scheduler";
import type { Summary } from "@/llm/client";

function createSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    title: "Test Summary",
    sections: [],
    mainTopics: [{ name: "Testing", relevance: 0.9 }],
    summary: "A test conversation about testing.",
    keyParticipants: ["Alice", "Bob"],
    actionItems: [],
    sentiment: "neutral",
    ...overrides,
  };
}

describe("formatSummary", () => {
  test("uses positive emoji for positive sentiment", () => {
    const result = formatSummary(createSummary({ sentiment: "positive" }));
    expect(result).toContain("😊");
  });

  test("uses neutral emoji for neutral sentiment", () => {
    const result = formatSummary(createSummary({ sentiment: "neutral" }));
    expect(result).toContain("😐");
  });

  test("uses negative emoji for negative sentiment", () => {
    const result = formatSummary(createSummary({ sentiment: "negative" }));
    expect(result).toContain("😕");
  });

  test("includes action items when present", () => {
    const result = formatSummary(
      createSummary({ actionItems: ["Deploy by Friday", "Write tests"] }),
    );
    expect(result).toContain("*Action Items:*");
    expect(result).toContain("Deploy by Friday");
    expect(result).toContain("Write tests");
  });

  test("omits action items section when empty", () => {
    const result = formatSummary(createSummary({ actionItems: [] }));
    expect(result).not.toContain("*Action Items:*");
  });

  test("omits action items section when undefined", () => {
    const result = formatSummary(createSummary({ actionItems: undefined }));
    expect(result).not.toContain("*Action Items:*");
  });

  test("includes markdown formatting", () => {
    const result = formatSummary(createSummary());
    expect(result).toContain("📋 *Conversation Summary*");
    expect(result).toContain("*Main Topics:*");
    expect(result).toContain("*Summary:*");
    expect(result).toContain("*Key Participants:*");
    expect(result).toContain("*Overall Sentiment:*");
  });

  test("lists all main topics as bullet points", () => {
    const result = formatSummary(
      createSummary({
        mainTopics: [
          { name: "AI", relevance: 0.9 },
          { name: "Web Dev", relevance: 0.7 },
        ],
      }),
    );
    expect(result).toContain("• AI");
    expect(result).toContain("• Web Dev");
  });

  test("lists all key participants as bullet points", () => {
    const result = formatSummary(
      createSummary({ keyParticipants: ["Alice", "Bob", "Charlie"] }),
    );
    expect(result).toContain("• Alice");
    expect(result).toContain("• Bob");
    expect(result).toContain("• Charlie");
  });
});
