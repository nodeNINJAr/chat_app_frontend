"use client";

import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserProfile } from "@/hooks/use-user-profile";
import { removeGroupMember, updateGroupRole } from "@/lib/api";
import { initials } from "@/lib/format";
import type { GroupMember } from "@/lib/types";

export function GroupMemberRow({
  groupId,
  member,
  viewerRole,
  isSelf,
  onChanged,
}: {
  groupId: string;
  member: GroupMember;
  viewerRole: "owner" | "admin" | "member" | undefined;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const { data: profile } = useUserProfile(member.userId);
  const isOwner = member.role === "owner";
  const canRemove = (viewerRole === "owner" || viewerRole === "admin") && !isOwner;
  const canChangeRole = viewerRole === "owner" && !isOwner && !isSelf;
  const canLeaveSelf = isSelf && !isOwner;
  const showMenu = (canRemove && !isSelf) || canChangeRole || canLeaveSelf;

  async function handleRoleChange(role: "admin" | "member") {
    try {
      await updateGroupRole(groupId, member.userId, role);
      onChanged();
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function handleRemove() {
    try {
      await removeGroupMember(groupId, member.userId);
      onChanged();
      toast.success(isSelf ? "Left group" : "Member removed");
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <Avatar className="size-8">
        <AvatarFallback>{initials(profile?.displayName ?? "?")}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm">
          {profile?.displayName ?? "…"} {isSelf && <span className="text-muted-foreground">(you)</span>}
        </p>
      </div>
      <Badge variant={isOwner ? "default" : "secondary"} className="capitalize">
        {member.role}
      </Badge>
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canChangeRole && member.role === "member" && (
              <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
                Make admin
              </DropdownMenuItem>
            )}
            {canChangeRole && member.role === "admin" && (
              <DropdownMenuItem onClick={() => handleRoleChange("member")}>
                Remove admin
              </DropdownMenuItem>
            )}
            {(canRemove || canLeaveSelf) && (
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                {isSelf ? "Leave group" : "Remove from group"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
