import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../index';
import { adminGroupLinks, linkingTokens } from '../schema';
import { randomUUID } from 'crypto';

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export class AdminGroupLinksRepository {
  async createLink(
    adminChatId: number,
    controlledChatId: number,
    linkedByUserId: number,
    controlledChatTitle?: string,
  ) {
    const [created] = await db.insert(adminGroupLinks).values({
      adminChatId,
      controlledChatId,
      linkedByUserId,
      controlledChatTitle,
    }).returning();
    return created;
  }

  async getByAdminChatId(adminChatId: number) {
    return await db.query.adminGroupLinks.findFirst({
      where: eq(adminGroupLinks.adminChatId, adminChatId),
    });
  }

  async getByControlledChatId(controlledChatId: number) {
    return await db.query.adminGroupLinks.findFirst({
      where: eq(adminGroupLinks.controlledChatId, controlledChatId),
    });
  }

  async isAdminGroup(chatId: number): Promise<boolean> {
    const link = await this.getByAdminChatId(chatId);
    return !!link;
  }

  async isControlledGroup(chatId: number): Promise<boolean> {
    const link = await this.getByControlledChatId(chatId);
    return !!link;
  }

  async removeLink(adminChatId: number) {
    return await db.delete(adminGroupLinks)
      .where(eq(adminGroupLinks.adminChatId, adminChatId));
  }

  async createLinkingToken(adminChatId: number, createdByUserId: number): Promise<string> {
    const token = randomUUID();
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
    await db.insert(linkingTokens).values({
      token,
      adminChatId,
      createdByUserId,
      expiresAt,
    });
    return token;
  }

  async consumeToken(token: string): Promise<{ adminChatId: number } | null> {
    const now = Date.now();
    const record = await db.query.linkingTokens.findFirst({
      where: and(
        eq(linkingTokens.token, token),
        isNull(linkingTokens.usedAt),
        sql`${linkingTokens.expiresAt} > ${now}`,
      ),
    });

    if (!record) return null;

    await db.update(linkingTokens)
      .set({ usedAt: new Date() })
      .where(eq(linkingTokens.id, record.id));

    return { adminChatId: record.adminChatId };
  }

  async cleanExpiredTokens() {
    const now = Date.now();
    return await db.delete(linkingTokens)
      .where(sql`${linkingTokens.expiresAt} <= ${now} OR ${linkingTokens.usedAt} IS NOT NULL`);
  }
}
