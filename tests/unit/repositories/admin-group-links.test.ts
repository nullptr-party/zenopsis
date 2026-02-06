import { expect, test, describe, beforeEach } from "bun:test";
import { AdminGroupLinksRepository } from "@/db/repositories/admin-group-links";
import { db } from "@/db";
import { adminGroupLinks, linkingTokens } from "@/db/schema";
import { cleanDatabase, createTestAdminGroupLink, createTestLinkingToken } from "../../helpers/test-utils";

describe("AdminGroupLinksRepository", () => {
  let repo: AdminGroupLinksRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new AdminGroupLinksRepository();
  });

  describe("createLink / getByAdminChatId / getByControlledChatId", () => {
    test("creates and retrieves a link by admin chat ID", async () => {
      const data = createTestAdminGroupLink();
      const link = await repo.createLink(
        data.adminChatId,
        data.controlledChatId,
        data.linkedByUserId,
        data.controlledChatTitle,
      );

      expect(link.id).toBeDefined();
      expect(link.adminChatId).toBe(data.adminChatId);
      expect(link.controlledChatId).toBe(data.controlledChatId);
      expect(link.controlledChatTitle).toBe(data.controlledChatTitle);

      const found = await repo.getByAdminChatId(data.adminChatId);
      expect(found).toBeTruthy();
      expect(found!.controlledChatId).toBe(data.controlledChatId);
    });

    test("retrieves a link by controlled chat ID", async () => {
      const data = createTestAdminGroupLink();
      await repo.createLink(
        data.adminChatId,
        data.controlledChatId,
        data.linkedByUserId,
      );

      const found = await repo.getByControlledChatId(data.controlledChatId);
      expect(found).toBeTruthy();
      expect(found!.adminChatId).toBe(data.adminChatId);
    });

    test("returns undefined for non-existent admin chat ID", async () => {
      const found = await repo.getByAdminChatId(-99999);
      expect(found).toBeUndefined();
    });
  });

  describe("isAdminGroup / isControlledGroup", () => {
    test("isAdminGroup returns true for linked admin groups", async () => {
      const data = createTestAdminGroupLink();
      await repo.createLink(data.adminChatId, data.controlledChatId, data.linkedByUserId);

      expect(await repo.isAdminGroup(data.adminChatId)).toBe(true);
      expect(await repo.isAdminGroup(data.controlledChatId)).toBe(false);
    });

    test("isControlledGroup returns true for linked controlled groups", async () => {
      const data = createTestAdminGroupLink();
      await repo.createLink(data.adminChatId, data.controlledChatId, data.linkedByUserId);

      expect(await repo.isControlledGroup(data.controlledChatId)).toBe(true);
      expect(await repo.isControlledGroup(data.adminChatId)).toBe(false);
    });
  });

  describe("removeLink", () => {
    test("removes an existing link", async () => {
      const data = createTestAdminGroupLink();
      await repo.createLink(data.adminChatId, data.controlledChatId, data.linkedByUserId);

      await repo.removeLink(data.adminChatId);

      expect(await repo.isAdminGroup(data.adminChatId)).toBe(false);
      expect(await repo.isControlledGroup(data.controlledChatId)).toBe(false);
    });
  });

  describe("createLinkingToken / consumeToken", () => {
    test("creates a token and consumes it successfully", async () => {
      const token = await repo.createLinkingToken(-1009999999999, 123456789);
      expect(token).toBeTruthy();
      expect(token.length).toBe(36); // UUID format

      const result = await repo.consumeToken(token);
      expect(result).toBeTruthy();
      expect(result!.adminChatId).toBe(-1009999999999);
    });

    test("cannot consume the same token twice", async () => {
      const token = await repo.createLinkingToken(-1009999999999, 123456789);

      const first = await repo.consumeToken(token);
      expect(first).toBeTruthy();

      const second = await repo.consumeToken(token);
      expect(second).toBeNull();
    });

    test("cannot consume an expired token", async () => {
      // Insert a token that's already expired
      const tokenData = createTestLinkingToken({
        expiresAt: Date.now() - 1000, // expired 1 second ago
      });
      await db.insert(linkingTokens).values(tokenData);

      const result = await repo.consumeToken(tokenData.token);
      expect(result).toBeNull();
    });

    test("returns null for non-existent token", async () => {
      const result = await repo.consumeToken("00000000-0000-0000-0000-000000000000");
      expect(result).toBeNull();
    });
  });

  describe("cleanExpiredTokens", () => {
    test("removes expired and used tokens", async () => {
      // Create an expired token
      const expiredToken = createTestLinkingToken({
        expiresAt: Date.now() - 1000,
      });
      await db.insert(linkingTokens).values(expiredToken);

      // Create a valid token and consume it
      const usedTokenValue = await repo.createLinkingToken(-1009999999998, 123456789);
      await repo.consumeToken(usedTokenValue);

      // Create a still-valid token
      const validToken = createTestLinkingToken({
        token: crypto.randomUUID(),
        adminChatId: -1009999999997,
      });
      await db.insert(linkingTokens).values(validToken);

      await repo.cleanExpiredTokens();

      // The valid unconsumed token should still exist
      const remaining = await db.select().from(linkingTokens);
      expect(remaining.length).toBe(1);
      expect(remaining[0].token).toBe(validToken.token);
    });
  });
});
