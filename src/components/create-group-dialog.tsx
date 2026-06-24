"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createGroup, searchUsers } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { initials } from "@/lib/format";

export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

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
    if (!name.trim() || selected.size === 0) return;
    setCreating(true);
    try {
      const group = await createGroup({ name: name.trim(), memberIds: [...selected] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setName("");
      setSelected(new Set());
      setQuery("");
      onOpenChange(false);
      router.push(`/chat/${group.conversationId}`);
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  const candidates = results?.filter((u) => u.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Members</Label>
          <Input
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="max-h-56">
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
          <Button onClick={submit} disabled={!name.trim() || selected.size === 0 || creating}>
            {creating ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
