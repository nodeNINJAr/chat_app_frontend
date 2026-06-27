import { getAvatarPublicUrl, requestUploadUrl } from "./api";
import type { MessageType, UploadKind } from "./types";

export function kindFromMime(mimeType: string): UploadKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function messageTypeFromKind(kind: UploadKind): MessageType {
  return kind === "document" ? "file" : kind;
}

export async function uploadFile(file: File): Promise<{ key: string; kind: UploadKind }> {
  const mimeType = file.type || "application/octet-stream";
  const kind = kindFromMime(mimeType);
  const target = await requestUploadUrl({
    fileName: file.name,
    mimeType,
    fileSize: file.size,
    kind,
  });
  const res = await fetch(target.uploadUrl, {
    method: target.uploadMethod,
    body: file,
    // Explicit, rather than relying on fetch's implicit Blob-type inference —
    // must exactly match what S3 presigned for, and the local-disk driver
    // ignores it anyway (it streams raw bytes regardless of declared type).
    headers: { "Content-Type": mimeType },
  });
  if (!res.ok) {
    throw new Error(`upload failed with status ${res.status}`);
  }
  return { key: target.key, kind };
}

export async function uploadAvatar(file: File): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  const target = await requestUploadUrl({
    fileName: file.name,
    mimeType,
    fileSize: file.size,
    kind: "avatar",
  });
  const res = await fetch(target.uploadUrl, {
    method: target.uploadMethod,
    body: file,
    headers: { "Content-Type": mimeType },
  });
  if (!res.ok) {
    throw new Error(`avatar upload failed with status ${res.status}`);
  }
  return getAvatarPublicUrl(target.key);
}
