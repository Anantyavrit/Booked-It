import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Show from '../models/Show.js';

let io = null;

const ALLOWED_STATUSES = ['available', 'held', 'booked'];

/**
 * initSocket(httpServer)
 * Initializes Socket.io with CORS and sets up announce-only show room subscriptions.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    maxHttpBufferSize: 10 * 1024, // 10kb
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: false,
    },
  });

  io.on('connection', (socket) => {
    // Debug level log only
    if (process.env.DEBUG_SOCKET) {
      console.log(`[Socket debug] Connected: ${socket.id}`);
    }

    // Rate-limit tracking for joins per socket
    socket._joinTimestamps = [];

    // show:join event
    socket.on('show:join', async (payload, ack) => {
      const sendAck = typeof ack === 'function' ? ack : () => {};

      try {
        // Enforce rate limit: max 4 joins per second per socket
        const now = Date.now();
        socket._joinTimestamps = (socket._joinTimestamps || []).filter((t) => now - t < 1000);
        if (socket._joinTimestamps.length >= 4) {
          return sendAck({ ok: false, message: 'Too many join requests. Please wait a moment.' });
        }
        socket._joinTimestamps.push(now);

        const { showId } = payload || {};

        if (!showId || !mongoose.Types.ObjectId.isValid(showId)) {
          return sendAck({ ok: false, message: 'Invalid show ID' });
        }

        const showExists = await Show.exists({ _id: showId });
        if (!showExists) {
          return sendAck({ ok: false, message: 'Show not found' });
        }

        // Count how many show rooms socket is currently in
        const currentRooms = Array.from(socket.rooms).filter((r) => r.startsWith('show:'));
        if (currentRooms.length >= 3 && !currentRooms.includes(`show:${showId}`)) {
          return sendAck({ ok: false, message: 'Too many shows open' });
        }

        socket.join(`show:${showId}`);
        return sendAck({ ok: true });
      } catch (err) {
        return sendAck({ ok: false, message: 'Internal error joining room' });
      }
    });

    // show:leave event
    socket.on('show:leave', (payload, ack) => {
      const sendAck = typeof ack === 'function' ? ack : () => {};
      const { showId } = payload || {};
      if (showId) {
        socket.leave(`show:${showId}`);
      }
      return sendAck({ ok: true });
    });

    // Ignore all other client events to maintain announce-only policy

    socket.on('disconnect', () => {
      if (process.env.DEBUG_SOCKET) {
        console.log(`[Socket debug] Disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

/**
 * getIO()
 * Returns the current Socket.io instance, or null if not yet initialized.
 */
export const getIO = () => io;

/**
 * emitSeatUpdate(showId, seats)
 * Emits "seats:updated" to room `show:${showId}` with payload { showId, seats }.
 * Sanitizes seat payloads to only allow { label, status }.
 * Never throws an error.
 */
export const emitSeatUpdate = (showId, seats) => {
  if (!io) return;
  if (!showId || !Array.isArray(seats) || seats.length === 0) return;

  try {
    // Sanitize seat items: only { label, status } where status is available/held/booked
    const sanitizedSeats = seats
      .filter((s) => s && s.label && ALLOWED_STATUSES.includes(s.status))
      .map((s) => ({
        label: s.label,
        status: s.status,
      }));

    if (sanitizedSeats.length === 0) return;

    io.to(`show:${showId.toString()}`).emit('seats:updated', {
      showId: showId.toString(),
      seats: sanitizedSeats,
    });
  } catch (err) {
    console.error('[Socket emit error]:', err.message);
  }
};
