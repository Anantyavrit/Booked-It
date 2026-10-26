import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, Eye, RefreshCw } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../api/adminApi.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import AdminPagination from '../../components/admin/Pagination.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import { formatPrice, formatDate, formatTime } from '../../utils/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const showId = searchParams.get('show') || '';
  const page = Number(searchParams.get('page') || '1');

  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const setPageParam = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(p));
    setSearchParams(params);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = { page, limit: 15 };
    if (status) params.status = status;
    if (showId) params.show = showId;
    try {
      const res = await adminApi.getBookingsAdmin(params);
      setBookings(res.data || []);
      setPagination(res.pagination || null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, status, showId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelResult(null);
    try {
      const res = await adminApi.cancelBookingAdmin(cancelTarget._id);
      const refund = res.refund;
      const refundMsg = refund?.refunded
        ? `Refund initiated (ID: ${refund.refundId || 'N/A'})`
        : 'No Razorpay payment found — no refund processed.';
      setCancelResult(refundMsg);
      load();
      // Keep dialog open briefly to show result, then auto-close
      setTimeout(() => {
        setCancelTarget(null);
        setCancelResult(null);
      }, 3000);
    } catch (e) {
      setCancelResult('Error: ' + getErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    {
      key: 'bookingCode', label: 'Code',
      render: (r) => (
        <span className="font-mono text-xs text-amber-400">{r.bookingCode || r._id?.slice(-8)}</span>
      ),
    },
    {
      key: 'user', label: 'User',
      render: (r) => (
        <div className="text-xs">
          <div className="text-white font-medium">{r.user?.name || '—'}</div>
          <div className="text-neutral-500">{r.user?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'movie', label: 'Movie',
      render: (r) => <span className="text-sm text-neutral-200">{r.show?.movie?.title || '—'}</span>,
    },
    {
      key: 'showTime', label: 'Show',
      render: (r) => r.show?.startTime ? (
        <span className="text-xs whitespace-nowrap">
          {formatDate(r.show.startTime)}<br />{formatTime(r.show.startTime)}
        </span>
      ) : '—',
    },
    {
      key: 'seats', label: 'Seats',
      render: (r) => <span className="text-xs text-neutral-400">{r.seats?.join(', ')}</span>,
    },
    {
      key: 'amount', label: 'Amount',
      render: (r) => <span className="text-amber-400 font-medium">{formatPrice(r.amount)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'createdAt', label: 'Created',
      render: (r) => <span className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            title="View booking"
            onClick={() => navigate(`/booking/${r._id}/confirmation`)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="View booking"
          >
            <Eye className="w-4 h-4" />
          </button>
          {r.status === 'confirmed' && (
            <button
              type="button"
              title="Cancel booking"
              onClick={() => { setCancelTarget(r); setCancelResult(null); }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
              aria-label="Cancel booking"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <title>Bookings — Admin | IMovies</title>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-white">Bookings</h1>
        <button type="button" onClick={load} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
          className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-amber-500/60"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={showId}
            onChange={(e) => setParam('show', e.target.value)}
            placeholder="Filter by Show ID…"
            className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 w-56"
          />
          <span className="text-xs text-neutral-600">Paste a Show ObjectId</span>
        </div>
        {(status || showId) && (
          <button type="button" onClick={() => { setParam('status', ''); setParam('show', ''); }} className="px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white">Clear</button>
        )}
      </div>

      <DataTable columns={columns} data={bookings} loading={loading} error={error} onRetry={load} emptyMessage="No bookings found." />
      <AdminPagination pagination={pagination} onPage={setPageParam} />

      {/* Admin cancel confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this booking?"
        message={
          cancelResult
            ? cancelResult
            : "This cancels the booking, releases the seats and refunds the customer in full, even if the show is about to start. This action cannot be undone."
        }
        confirmLabel={cancelResult ? 'Done' : 'Yes, Cancel Booking'}
        danger={!cancelResult}
        loading={cancelling}
        onConfirm={cancelResult ? () => { setCancelTarget(null); setCancelResult(null); } : handleCancel}
        onCancel={() => { setCancelTarget(null); setCancelResult(null); }}
      />
    </div>
  );
}
