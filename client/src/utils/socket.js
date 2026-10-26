import { io } from 'socket.io-client';

let socket = null;
let activeSubscribers = 0;

/**
 * getSocket()
 * Creates and returns the shared socket instance connecting to same origin
 * (Vite proxy forwards WebSocket traffic to backend).
 */
export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * connectSocket()
 * Increments active subscribers and connects socket if disconnected.
 */
export function connectSocket() {
  activeSubscribers++;
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * disconnectSocket()
 * Decrements active subscribers and disconnects socket when nobody uses it.
 */
export function disconnectSocket() {
  activeSubscribers = Math.max(0, activeSubscribers - 1);
  if (activeSubscribers === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
