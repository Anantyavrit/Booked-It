import { useState, useEffect, useCallback, useRef } from 'react';
import api, { getErrorMessage } from '../api/axios.js';
import { connectSocket, disconnectSocket } from '../utils/socket.js';

/**
 * useSeatMap(showId)
 * Connects socket, emits show:join, fetches initial seat map with server offset,
 * listens for real-time seats:updated events and merges them safely.
 */
export function useSeatMap(showId) {
  const [layout, setLayout] = useState({ rows: 0, seatsPerRow: 0 });
  const [price, setPrice] = useState(0);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Keep a ref of seats to safely merge real-time socket events
  const seatsRef = useRef([]);
  seatsRef.current = seats;

  // Fetch initial REST seat map
  const fetchSeatMap = useCallback(async () => {
    if (!showId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/shows/${showId}/seats`);

      // Compute server time offset from response 'Date' header
      const dateHeader = res.headers?.date;
      if (dateHeader) {
        const serverTime = new Date(dateHeader).getTime();
        const clientTime = Date.now();
        setServerOffsetMs(serverTime - clientTime);
      }

      if (res.data?.success) {
        const { layout: l, price: p, seats: s } = res.data.data;
        setLayout(l || { rows: 0, seatsPerRow: 0 });
        setPrice(p || 0);
        setSeats(s || []);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    if (!showId) return;

    const socket = connectSocket();

    const joinRoomAndFetch = () => {
      socket.emit('show:join', { showId }, (ack) => {
        if (ack?.ok) {
          fetchSeatMap();
        } else {
          setError(ack?.message || 'Failed to join show room');
          setLoading(false);
        }
      });
    };

    const handleConnect = () => {
      setConnected(true);
      joinRoomAndFetch();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleReconnect = () => {
      joinRoomAndFetch();
    };

    const handleSeatsUpdated = (payload) => {
      // Ignore events for other shows
      if (!payload || String(payload.showId) !== String(showId)) return;

      const updatedMap = new Map();
      (payload.seats || []).forEach((item) => {
        updatedMap.set(item.label, item.status);
      });

      setSeats((prevSeats) =>
        prevSeats.map((seat) => {
          if (updatedMap.has(seat.label)) {
            const newStatus = updatedMap.get(seat.label);
            return {
              ...seat,
              status: newStatus,
              // If seat turns available or booked, clear isMine
              isMine: newStatus === 'available' ? false : seat.isMine,
            };
          }
          return seat;
        })
      );
    };

    if (socket.connected) {
      setConnected(true);
      joinRoomAndFetch();
    } else {
      socket.on('connect', handleConnect);
    }

    socket.on('disconnect', handleDisconnect);
    socket.io?.on('reconnect', handleReconnect);
    socket.on('seats:updated', handleSeatsUpdated);

    return () => {
      socket.emit('show:leave', { showId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io?.off('reconnect', handleReconnect);
      socket.off('seats:updated', handleSeatsUpdated);
      disconnectSocket();
    };
  }, [showId, fetchSeatMap]);

  return {
    layout,
    price,
    seats,
    setSeats,
    loading,
    error,
    refetch: fetchSeatMap,
    connected,
    serverOffsetMs,
  };
}
