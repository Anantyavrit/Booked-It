/**
 * Socket.io Real-time Seat Listener Test Script
 *
 * Connects with socket.io-client to the server, joins a show's room,
 * prints the join ack, and logs all real-time "seats:updated" events with timestamps.
 * Also handles reconnection automatically and rejoins the room.
 *
 * Usage:
 *   npm run test:socket -- <showId> [serverUrl]
 */

import { io } from 'socket.io-client';

const showId = process.argv[2];
const serverUrl = process.argv[3] || process.env.SERVER_URL || 'http://localhost:5001';

if (!showId) {
  console.error('\nUsage: npm run test:socket -- <showId> [serverUrl]\nExample: npm run test:socket -- 6789abc... http://localhost:5001\n');
  process.exit(1);
}

console.log(`\nConnecting to Socket.io server at ${serverUrl}...`);
const socket = io(serverUrl, {
  reconnection: true,
  reconnectionDelay: 1000,
});

const joinRoom = (isReconnect = false) => {
  socket.emit('show:join', { showId }, (ack) => {
    const time = new Date().toISOString();
    if (isReconnect) {
      console.log(`[${time}] reconnected, rejoined room show:${showId} (ack:`, ack, ')');
    } else {
      console.log(`[${time}] Joined room show:${showId} (ack:`, ack, ')');
    }
  });
};

socket.on('connect', () => {
  const time = new Date().toISOString();
  console.log(`[${time}] Connected to server with socket id: ${socket.id}`);
  joinRoom(false);
});

socket.on('reconnect', () => {
  joinRoom(true);
});

socket.on('seats:updated', (payload) => {
  const time = new Date().toISOString();
  console.log(`\n🔔 [${time}] EVENT: seats:updated`);
  console.log(`Show ID: ${payload.showId}`);
  console.log('Seats updated:', JSON.stringify(payload.seats, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('[Connection Error]:', err.message);
});

socket.on('disconnect', (reason) => {
  const time = new Date().toISOString();
  console.log(`[${time}] Disconnected (${reason})`);
});
