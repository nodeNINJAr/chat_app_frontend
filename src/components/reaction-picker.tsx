"use client";

import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
        <SmilePlus className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-1 p-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="rounded-md p-1.5 text-lg hover:bg-accent"
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
