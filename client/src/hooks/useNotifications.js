import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { notificationApi } from '../api/notificationApi.js';

export function useNotifications() {
  const { user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await notificationApi.getNotifications({ page: 1, limit: 10 });
      if (res?.success) {
        setItems(res.data || []);
      }
    } catch {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  // Initial fetch and 60-second periodic poll
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 60 * 1000);

    // Refresh when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  // Optimistic markRead
  const markRead = async (id) => {
    const prevItems = [...items];
    setItems((curr) => curr.map((n) => (n._id === id ? { ...n, read: true } : n)));

    try {
      await notificationApi.markRead(id);
    } catch {
      // Roll back on failure
      setItems(prevItems);
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markRead,
  };
}
