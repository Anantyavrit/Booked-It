import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Film, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications.js';
import { formatRelativeTime } from '../utils/format.js';

export default function NotificationBell() {
  const { items, unreadCount, markRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const recentItems = items.slice(0, 5);

  const getIcon = (type) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'booking_cancelled':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'payment_failed':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'refund_issued':
        return <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Film className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Notifications
            </h4>
            <span className="text-[11px] text-neutral-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </span>
          </div>

          <div className="divide-y divide-neutral-800/80 max-h-80 overflow-y-auto">
            {recentItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                No notifications yet.
              </div>
            ) : (
              recentItems.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`p-3 text-xs flex gap-2.5 transition-colors cursor-pointer ${
                    !n.read ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className={`line-clamp-2 ${!n.read ? 'text-neutral-100 font-medium' : 'text-neutral-400'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-neutral-500 block">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 self-center shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-neutral-800 text-center bg-neutral-950/60">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              View all notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
