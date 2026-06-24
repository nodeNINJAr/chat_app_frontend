import type { TurnCredentials } from "./types";

export function buildIceServers(creds: TurnCredentials): RTCIceServer[] {
  return creds.urls.map((url) => ({
    urls: url,
    username: creds.username,
    credential: creds.password,
  }));
}
