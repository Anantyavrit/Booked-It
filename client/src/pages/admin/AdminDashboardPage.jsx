import React, { useState, useEffect, useCallback } from 'react';
import { Film, Building2, Calendar, Ticket, Users, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../api/adminApi.js';
import StatCard from '../../components/admin/StatCard.jsx';
import { formatPrice } from '../../utils/format.js';

function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const H = 120;
  const W = 600;
  const BAR_W = Math.floor(W / data.length) - 2;

  return (
    <div className="overflow-x-auto" role="img" aria-label="14-day revenue bar chart">
      <svg
        viewBox={`0 0 ${W} ${H + 32}`}
        width={W}
        height={H + 32}
        className="min-w-full"
        aria-hidden="true"
      >
        {data.map((d, i) => {
          const barH = max > 0 ? Math.max((d.revenue / max) * H, d.revenue > 0 ? 4 : 0) : 0;
          const x = i * (W / data.length) + 1;
          const y = H - barH;
          const label = d.date.slice(5); // MM-DD
          return (
            <g key={d.date}>
              <title>{d.date}: {formatPrice(d.revenue)} ({d.bookings} booking{d.bookings !== 1 ? 's' : ''})</title>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={3}
                fill={d.revenue > 0 ? '#f5b301' : '#262626'}
                opacity={d.revenue > 0 ? 0.85 : 1}
              />
              <text
                x={x + BAR_W / 2}
                y={H + 18}
                textAnchor="middle"
                fontSize={9}
                fill="#737373"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Screen-reader table */}
      <table className="sr-only">
        <caption>14-day revenue</caption>
        <thead><tr><th>Date</th><th>Revenue</th><th>Bookings</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{formatPrice(d.revenue)}</td>
              <td>{d.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = stats?.totals;
  const r = stats?.revenue;

  return (
    <div className="space-y-6">
      <title>Dashboard — Admin | IMovies</title>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && !loading && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300 flex gap-3 items-center">
          <span>{error}</span>
          <button type="button" onClick={() => load()} className="ml-auto underline text-rose-400 hover:text-rose-200">Retry</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Movies"      value={t?.movies ?? '—'}           icon={Film}       loading={loading} />
        <StatCard label="Theatres"    value={t?.theatres ?? '—'}         icon={Building2}  loading={loading} />
        <StatCard label="Upcoming Shows" value={t?.upcomingShows ?? '—'} icon={Calendar}   loading={loading} />
        <StatCard label="Confirmed"   value={t?.confirmedBookings ?? '—'} icon={Ticket}    loading={loading} />
        <StatCard label="Users"       value={t?.users ?? '—'}            icon={Users}      loading={loading} />
        <StatCard label="Total Revenue" value={r ? formatPrice(r.total) : '—'} icon={DollarSign} loading={loading}
          sub={r ? `Last 7d: ${formatPrice(r.last7Days)}` : undefined} />
      </div>

      {/* Revenue chart */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Revenue — Last 14 Days
        </h2>
        {loading ? (
          <div className="h-32 bg-neutral-800 rounded animate-pulse" />
        ) : (
          <RevenueChart data={stats?.revenueByDay} />
        )}
      </section>

      {/* Top movies + Occupancy */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Top Movies</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-8 bg-neutral-800 rounded animate-pulse"/>)}</div>
          ) : !stats?.topMovies?.length ? (
            <p className="text-sm text-neutral-500">No confirmed bookings yet.</p>
          ) : (
            <ol className="space-y-2">
              {stats.topMovies.map((m, i) => (
                <li key={m.movieId} className="flex items-center gap-3 text-sm">
                  <span className="text-neutral-600 w-4 text-right font-mono">{i + 1}</span>
                  <span className="flex-1 text-neutral-200 truncate">{m.title}</span>
                  <span className="text-neutral-400 text-xs whitespace-nowrap">{m.bookings} bk</span>
                  <span className="text-amber-400 text-xs whitespace-nowrap font-medium">{formatPrice(m.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Upcoming Shows — Occupancy</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-10 bg-neutral-800 rounded animate-pulse"/>)}</div>
          ) : !stats?.occupancy?.length ? (
            <p className="text-sm text-neutral-500">No upcoming shows.</p>
          ) : (
            <ul className="space-y-3">
              {stats.occupancy.map((s) => {
                const pct = s.total > 0 ? Math.round((s.booked / s.total) * 100) : 0;
                const startDate = new Date(s.startTime);
                return (
                  <li key={s.showId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-200 truncate max-w-[60%]">{s.movieTitle}</span>
                      <span className="text-neutral-500">{s.booked}/{s.total > 0 ? s.total : '?'} seats ({pct}%)</span>
                    </div>
                    <div className="text-xs text-neutral-500 mb-1">
                      {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% full`}>
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
