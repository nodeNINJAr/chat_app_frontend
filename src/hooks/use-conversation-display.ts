import { useUserProfile } from "@/hooks/use-user-profile";
import { useGroup } from "@/hooks/use-group";
import type { ConversationSummary } from "@/lib/types";

export function useConversationDisplay(conversation: ConversationSummary | undefined) {
  const peerId = conversation?.type === "direct" ? conversation.otherParticipantIds[0] : undefined;
  const { data: peer } = useUserProfile(peerId);
  const { data: group } = useGroup(
    conversation?.type === "group" ? conversation.groupId : undefined,
  );

  if (conversation?.type === "group") {
    return {
      isGroup: true as const,
      name: group?.name ?? "…",
      avatarUrl: group?.avatarUrl ?? null,
      group,
      peer: undefined,
      peerId: undefined,
    };
  }

  return {
    isGroup: false as const,
    name: peer?.displayName ?? "…",
    avatarUrl: peer?.avatarUrl ?? null,
    group: undefined,
    peer,
    peerId,
  };
}
