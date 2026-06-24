import { io, Socket } from "socket.io-client";
import { API_URL } from "./api-client";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    if (socket.connected || socket.active) {
      // Re-auth in place rather than tearing down — handshake auth is read fresh on (re)connect.
      socket.auth = { token };
      return socket;
    }
    socket.disconnect();
  }
  socket = io(`${API_URL}/chat`, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
