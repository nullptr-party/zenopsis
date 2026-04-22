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
    expect(result).toContain("<b>Action Items:</b>");
    expect(result).toContain("Deploy by Friday");
    expect(result).toContain("Write tests");
  });

  test("omits action items section when empty", () => {
    const result = formatSummary(createSummary({ actionItems: [] }));
    expect(result).not.toContain("<b>Action Items:</b>");
  });

  test("includes html formatting", () => {
    const result = formatSummary(createSummary());
    expect(result).toContain("📋 <b>Conversation Summary</b>");
    expect(result).toContain("<b>Main Topics:</b>");
    expect(result).toContain("<b>Summary:</b>");
    expect(result).toContain("<b>Key Participants:</b>");
    expect(result).toContain("<b>Overall Sentiment:</b>");
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

  test("escapes html-sensitive characters in dynamic content", () => {
    const result = formatSummary(
      createSummary({
        mainTopics: [{ name: "A&B <test>", relevance: 0.9 }],
        summary: "Use <b>tag</b> & keep it literal.",
        keyParticipants: ["staring_misaka", "alice<dev>"],
        actionItems: ["Ship <today> & verify"],
      }),
    );

    expect(result).toContain("A&amp;B &lt;test&gt;");
    expect(result).toContain("Use &lt;b&gt;tag&lt;/b&gt; &amp; keep it literal.");
    expect(result).toContain("staring_misaka");
    expect(result).toContain("alice&lt;dev&gt;");
    expect(result).toContain("Ship &lt;today&gt; &amp; verify");
  });
});
