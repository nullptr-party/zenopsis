import { AdminGroupLinksRepository } from '@/db/repositories/admin-group-links';

const adminGroupLinksRepo = new AdminGroupLinksRepository();

export interface ResolvedTarget {
  targetChatId: number;
  isRemote: boolean;
}

export async function resolveTargetChatId(chatId: number): Promise<ResolvedTarget | null> {
  // Check if this is an admin group → return the controlled group
  const adminLink = await adminGroupLinksRepo.getByAdminChatId(chatId);
  if (adminLink) {
    return { targetChatId: adminLink.controlledChatId, isRemote: true };
  }

  // Check if this is a controlled group (has an admin group) → block commands
  const controlledLink = await adminGroupLinksRepo.getByControlledChatId(chatId);
  if (controlledLink) {
    return null;
  }

  // Normal standalone group
  return { targetChatId: chatId, isRemote: false };
}
