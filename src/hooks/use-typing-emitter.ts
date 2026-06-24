import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

const STOP_DELAY_MS = 2000;

export function useTypingEmitter(conversationId: string) {
  const isTypingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket()?.emit("typing:stop", { conversationId });
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket()?.emit("typing:start", { conversationId });
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(stop, STOP_DELAY_MS);
  }, [conversationId, stop]);

  useEffect(() => stop, [stop]);

  return { notifyTyping, stop };
}
