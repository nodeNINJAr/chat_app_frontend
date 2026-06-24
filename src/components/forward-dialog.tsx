"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversationDisplay } from "@/hooks/use-conversation-display";
import { getConversations } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { ChatMessage, ConversationSummary } from "@/lib/types";

function ConversationCheckRow({
  conversation,
  checked,
  onToggle,
}: {
  conversation: ConversationSummary;
  checked: boolean;
  onToggle: () => void;
}) {
  const { name } = useConversationDisplay(conversation);
  return (
    <label className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="text-sm">{name}</span>
    </label>
  );
}

export function ForwardDialog({
  message,
  onOpenChange,
}: {
  message: ChatMessage | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (!message || selected.size === 0) return;
    getSocket()?.emit("message:forward", {
      messageId: message.id,
      targetConversationIds: [...selected],
    });
    toast.success(`Forwarded to ${selected.size} conversation(s)`);
    setSelected(new Set());
    onOpenChange(false);
  }

  return (
    <Dialog open={!!message} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-1">
            {conversations?.map((c) => (
              <ConversationCheckRow
                key={c.id}
                conversation={c}
                checked={selected.has(c.id)}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={submit} disabled={selected.size === 0}>
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
