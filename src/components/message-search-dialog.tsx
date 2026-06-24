"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchMessages } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";

export function MessageSearchDialog({
  conversationId,
  open,
  onOpenChange,
  loadedMessageIds,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadedMessageIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["message-search", conversationId, debounced],
    queryFn: () => searchMessages(conversationId, debounced),
    enabled: open && debounced.length > 0,
  });

  function jumpTo(messageId: string) {
    if (!loadedMessageIds.has(messageId)) {
      toast.info("Use “Load earlier messages” to bring this result into view");
      return;
    }
    onOpenChange(false);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.classList.add("animate-pulse");
      setTimeout(() => el?.classList.remove("animate-pulse"), 1500);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search messages</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search in this conversation…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-1">
            {isFetching && (
              <p className="px-2 py-2 text-sm text-muted-foreground">Searching…</p>
            )}
            {!isFetching && debounced && results?.length === 0 && (
              <p className="px-2 py-2 text-sm text-muted-foreground">No matches.</p>
            )}
            {results?.map((m) => (
              <button
                key={m.id}
                onClick={() => jumpTo(m.id)}
                className="flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left hover:bg-accent"
              >
                <p className="line-clamp-2 text-sm">{m.content.text ?? `[${m.type}]`}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(m.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
