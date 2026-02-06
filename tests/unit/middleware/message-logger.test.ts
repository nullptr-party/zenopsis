import { describe, test, expect } from "bun:test";
import type { Message as TgMessage } from "@grammyjs/types";
import {
  detectMessageType,
  extractContent,
  extractFileInfos,
} from "@/bot/middleware/message-logger";

// Minimal TgMessage factory — only include fields under test
function createTgMessage(overrides: Partial<TgMessage> = {}): TgMessage {
  return {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: -100, type: "supergroup", title: "Test" },
    ...overrides,
  } as TgMessage;
}

// ── detectMessageType ──────────────────────────────────────────────

describe("detectMessageType", () => {
  test("detects text message", () => {
    expect(detectMessageType(createTgMessage({ text: "hello" }))).toBe("text");
  });

  test("detects photo message", () => {
    const msg = createTgMessage({
      photo: [
        { file_id: "a", file_unique_id: "b", width: 100, height: 100 },
      ],
    });
    expect(detectMessageType(msg)).toBe("photo");
  });

  test("detects document message", () => {
    const msg = createTgMessage({
      document: { file_id: "a", file_unique_id: "b" },
    } as any);
    expect(detectMessageType(msg)).toBe("document");
  });

  test("detects voice message", () => {
    const msg = createTgMessage({
      voice: { file_id: "a", file_unique_id: "b", duration: 5 },
    } as any);
    expect(detectMessageType(msg)).toBe("voice");
  });

  test("detects video message", () => {
    const msg = createTgMessage({
      video: { file_id: "a", file_unique_id: "b", width: 640, height: 480, duration: 10 },
    } as any);
    expect(detectMessageType(msg)).toBe("video");
  });

  test("detects video_note message", () => {
    const msg = createTgMessage({
      video_note: { file_id: "a", file_unique_id: "b", length: 240, duration: 5 },
    } as any);
    expect(detectMessageType(msg)).toBe("video_note");
  });

  test("detects audio message", () => {
    const msg = createTgMessage({
      audio: { file_id: "a", file_unique_id: "b", duration: 180 },
    } as any);
    expect(detectMessageType(msg)).toBe("audio");
  });

  test("detects sticker message", () => {
    const msg = createTgMessage({
      sticker: { file_id: "a", file_unique_id: "b", width: 512, height: 512, type: "regular", is_animated: false, is_video: false },
    } as any);
    expect(detectMessageType(msg)).toBe("sticker");
  });

  test("detects animation message", () => {
    const msg = createTgMessage({
      animation: { file_id: "a", file_unique_id: "b", width: 320, height: 240, duration: 3 },
    } as any);
    expect(detectMessageType(msg)).toBe("animation");
  });

  test("detects poll message", () => {
    const msg = createTgMessage({
      poll: { id: "1", question: "Yes?", options: [], is_anonymous: true, type: "regular", allows_multiple_answers: false, total_voter_count: 0 },
    } as any);
    expect(detectMessageType(msg)).toBe("poll");
  });

  test("detects location message", () => {
    const msg = createTgMessage({
      location: { latitude: 51.5, longitude: -0.1 },
    } as any);
    expect(detectMessageType(msg)).toBe("location");
  });

  test("detects contact message", () => {
    const msg = createTgMessage({
      contact: { phone_number: "+1234", first_name: "John" },
    } as any);
    expect(detectMessageType(msg)).toBe("contact");
  });

  test("detects venue message", () => {
    const msg = createTgMessage({
      venue: { location: { latitude: 0, longitude: 0 }, title: "Cafe", address: "123 St" },
    } as any);
    expect(detectMessageType(msg)).toBe("venue");
  });

  test("detects dice message", () => {
    const msg = createTgMessage({
      dice: { emoji: "🎲", value: 4 },
    } as any);
    expect(detectMessageType(msg)).toBe("dice");
  });

  test("returns unknown for empty message", () => {
    expect(detectMessageType(createTgMessage())).toBe("unknown");
  });
});

// ── extractContent ─────────────────────────────────────────────────

describe("extractContent", () => {
  test("returns text for text message", () => {
    const msg = createTgMessage({ text: "Hello world" });
    expect(extractContent(msg, "text")).toBe("Hello world");
  });

  test("returns caption for photo with caption", () => {
    const msg = createTgMessage({
      photo: [{ file_id: "a", file_unique_id: "b", width: 100, height: 100 }],
      caption: "Nice photo",
    });
    expect(extractContent(msg, "photo")).toBe("Nice photo");
  });

  test("returns sticker format for sticker", () => {
    const msg = createTgMessage({
      sticker: { file_id: "a", file_unique_id: "b", width: 512, height: 512, emoji: "👍", type: "regular", is_animated: false, is_video: false },
    } as any);
    expect(extractContent(msg, "sticker")).toBe("[sticker: 👍]");
  });

  test("returns document format with filename", () => {
    const msg = createTgMessage({
      document: { file_id: "a", file_unique_id: "b", file_name: "report.pdf" },
    } as any);
    expect(extractContent(msg, "document")).toBe("[document: report.pdf]");
  });

  test("returns voice format with duration", () => {
    const msg = createTgMessage({
      voice: { file_id: "a", file_unique_id: "b", duration: 12 },
    } as any);
    expect(extractContent(msg, "voice")).toBe("[voice: 12s]");
  });

  test("returns poll format with question", () => {
    const msg = createTgMessage({
      poll: { id: "1", question: "Favorite color?", options: [], is_anonymous: true, type: "regular", allows_multiple_answers: false, total_voter_count: 0 },
    } as any);
    expect(extractContent(msg, "poll")).toBe("[poll: Favorite color?]");
  });

  test("returns location format with coordinates", () => {
    const msg = createTgMessage({
      location: { latitude: 51.5074, longitude: -0.1278 },
    } as any);
    expect(extractContent(msg, "location")).toBe("[location: 51.5074, -0.1278]");
  });

  test("returns undefined for unknown type", () => {
    const msg = createTgMessage();
    expect(extractContent(msg, "unknown")).toBeUndefined();
  });
});

// ── extractFileInfos ───────────────────────────────────────────────

describe("extractFileInfos", () => {
  test("extracts largest photo size", () => {
    const msg = createTgMessage({
      photo: [
        { file_id: "small", file_unique_id: "s", width: 100, height: 100, file_size: 1000 },
        { file_id: "large", file_unique_id: "l", width: 800, height: 600, file_size: 50000 },
      ],
    });
    const infos = extractFileInfos(msg);
    expect(infos).toHaveLength(1);
    expect(infos[0].fileId).toBe("large");
    expect(infos[0].attachmentType).toBe("photo");
    expect(infos[0].width).toBe(800);
  });

  test("extracts document with mimeType and fileName", () => {
    const msg = createTgMessage({
      document: {
        file_id: "doc1",
        file_unique_id: "du1",
        file_size: 12345,
        mime_type: "application/pdf",
        file_name: "report.pdf",
      },
    } as any);
    const infos = extractFileInfos(msg);
    expect(infos).toHaveLength(1);
    expect(infos[0].attachmentType).toBe("document");
    expect(infos[0].mimeType).toBe("application/pdf");
    expect(infos[0].fileName).toBe("report.pdf");
  });

  test("extracts voice with duration", () => {
    const msg = createTgMessage({
      voice: {
        file_id: "v1",
        file_unique_id: "vu1",
        duration: 7,
        file_size: 8000,
        mime_type: "audio/ogg",
      },
    } as any);
    const infos = extractFileInfos(msg);
    expect(infos).toHaveLength(1);
    expect(infos[0].attachmentType).toBe("voice");
    expect(infos[0].duration).toBe(7);
  });

  test("returns empty array for message without attachments", () => {
    const msg = createTgMessage({ text: "just text" });
    const infos = extractFileInfos(msg);
    expect(infos).toEqual([]);
  });

  test("extracts multiple file types from one message", () => {
    const msg = createTgMessage({
      animation: {
        file_id: "anim1",
        file_unique_id: "au1",
        width: 320,
        height: 240,
        duration: 3,
        file_size: 50000,
        mime_type: "video/mp4",
        file_name: "gif.mp4",
      },
      document: {
        file_id: "doc1",
        file_unique_id: "du1",
        file_size: 10000,
        mime_type: "video/mp4",
        file_name: "gif.mp4",
      },
    } as any);
    const infos = extractFileInfos(msg);
    expect(infos.length).toBeGreaterThanOrEqual(2);
    const types = infos.map((i) => i.attachmentType);
    expect(types).toContain("animation");
    expect(types).toContain("document");
  });
});
