import { io, Socket } from "socket.io-client";
import { API_URL } from "./api-client";

let socket: Socket | null = null;

export function connectCallSocket(token: string): Socket {
  if (socket) {
    if (socket.connected || socket.active) {
      socket.auth = { token };
      return socket;
    }
    socket.disconnect();
  }
  socket = io(`${API_URL}/calls`, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

export function disconnectCallSocket() {
  socket?.disconnect();
  socket = null;
}

export function getCallSocket(): Socket | null {
  return socket;
}
