"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AddMembersDialog } from "@/components/add-members-dialog";
import { GroupMemberRow } from "@/components/group-member-row";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { useConversationDisplay } from "@/hooks/use-conversation-display";
import { useGroupMembers, useInvalidateGroup } from "@/hooks/use-group";
import { blockUser, listBlockedUsers, unblockUser } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { initials } from "@/lib/format";
import type { ConversationSummary } from "@/lib/types";

export function ConversationInfoDialog({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: ConversationSummary | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const { name, avatarUrl, isGroup, peer, peerId, group } =
    useConversationDisplay(conversation);
  const { data: members, isLoading: membersLoading } = useGroupMembers(
    isGroup ? conversation?.groupId : undefined,
  );
  const invalidateGroup = useInvalidateGroup(conversation?.groupId);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const { data: blockedUsers, refetch: refetchBlocked } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: listBlockedUsers,
    enabled: !isGroup,
  });
  const blocked = !!peerId && !!blockedUsers?.some((b) => b.blockedId === peerId);

  const myRole = members?.find((m) => m.userId === currentUserId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  async function toggleBlock() {
    if (!peerId) return;
    try {
      if (blocked) {
        await unblockUser(peerId);
        toast.success("Unblocked");
      } else {
        await blockUser(peerId);
        toast.success("Blocked");
      }
      await refetchBlocked();
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isGroup ? "Group info" : "Profile"}</DialogTitle>
          </DialogHeader>

          {isGroup && editingGroup && group ? (
            <GroupSettingsForm
              group={group}
              onCancel={() => setEditingGroup(false)}
              onSaved={() => {
                setEditingGroup(false);
                invalidateGroup();
              }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <Avatar className="size-16">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} loading="lazy" decoding="async" />
                )}
                <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
              </Avatar>
              <p className="text-lg font-medium">{name}</p>
              {!isGroup && peer && (
                <p className="text-sm text-muted-foreground">@{peer.username}</p>
              )}
              {isGroup && group?.description && (
                <p className="text-center text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
              {isGroup && canManage && (
                <Button size="sm" variant="outline" onClick={() => setEditingGroup(true)}>
                  Edit group
                </Button>
              )}
            </div>
          )}

          {!isGroup && (
            <Button variant="outline" onClick={toggleBlock}>
              {blocked ? "Unblock" : "Block"} {peer?.displayName}
            </Button>
          )}

          {isGroup && !editingGroup && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {members?.length ?? group?.memberCount ?? 0} members
                </p>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => setAddMembersOpen(true)}>
                    Add members
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-72">
                <div className="flex flex-col gap-1">
                  {membersLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-2 py-2">
                        <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                      </div>
                    ))}
                  {members?.map((m) => (
                    <GroupMemberRow
                      key={m.userId}
                      groupId={conversation!.groupId as string}
                      member={m}
                      viewerRole={myRole}
                      isSelf={m.userId === currentUserId}
                      onChanged={invalidateGroup}
                    />
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {isGroup && conversation?.groupId && (
        <AddMembersDialog
          groupId={conversation.groupId}
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
          existingMemberIds={members?.map((m) => m.userId) ?? []}
          onAdded={() => {
            invalidateGroup();
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }}
        />
      )}
    </>
  );
}
