"use client";

import { isAxiosError } from "axios";
import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { uploadAvatar } from "@/lib/upload";
import { cn } from "@/lib/utils";

// Mirrors the backend's avatar LIMITS entry (uploads.service.ts) so we can
// reject obviously-bad files instantly instead of round-tripping to the API.
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function AvatarPicker({
  name,
  avatarUrl,
  onUploaded,
  className,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image (HEIC/HEIF isn't supported)");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image is too large (max 8MB)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      onUploaded(url);
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      toast.error(message ?? "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="size-20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="text-xl">{initials(name || "?")}</AvatarFallback>
        </Avatar>
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        ) : (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Camera className="size-3.5" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
