"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addGroupMembers, searchUsers } from "@/lib/api";
import { initials } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export function AddMembersDialog({
  groupId,
  open,
  onOpenChange,
  existingMemberIds,
  onAdded,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberIds: string[];
  onAdded: () => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results } = useQuery({
    queryKey: ["user-search", debounced],
    queryFn: () => searchUsers(debounced),
    enabled: debounced.length > 0,
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    try {
      await addGroupMembers(groupId, [...selected]);
      toast.success("Members added");
      setSelected(new Set());
      setQuery("");
      onAdded();
      onOpenChange(false);
    } catch {
      toast.error("Failed to add members");
    }
  }

  const candidates = results?.filter(
    (u) => u.id !== currentUserId && !existingMemberIds.includes(u.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ScrollArea className="max-h-64">
          <div className="flex flex-col gap-1">
            {candidates?.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                <Avatar className="size-8">
                  <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{u.displayName}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={submit} disabled={selected.size === 0}>
            Add {selected.size > 0 ? selected.size : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
