import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../api/adminApi.js';
import { movieApi } from '../../api/movieApi.js';
import { theatreApi } from '../../api/theatreApi.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import FormModal from '../../components/admin/FormModal.jsx';
import AdminPagination from '../../components/admin/Pagination.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import FormField, { inputCls, selectCls } from '../../components/admin/FormField.jsx';
import { formatPrice, formatDate, formatTime } from '../../utils/format.js';

const EMPTY_FORM = {
  movie: '', theatre: '', screenName: '', language: '',
  startTime: '', endTime: '', price: '',
};

function toLocalDatetimeInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function validate(form) {
  const errs = {};
  if (!form.movie) errs.movie = 'Movie is required';
  if (!form.theatre) errs.theatre = 'Theatre is required';
  if (!form.screenName.trim()) errs.screenName = 'Screen name is required';
  if (!form.language.trim()) errs.language = 'Language is required';
  if (!form.startTime) errs.startTime = 'Start time is required';
  if (!form.endTime) errs.endTime = 'End time is required';
  if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
    errs.endTime = 'End time must be after start time';
  }
  if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) {
    errs.price = 'Price must be 0 or more';
  }
  return errs;
}

export default function AdminShowsPage() {
  const [shows, setShows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filterMovie, setFilterMovie] = useState('');
  const [filterTheatre, setFilterTheatre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [theatreScreens, setTheatreScreens] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load movies & theatres for selects
  useEffect(() => {
    movieApi.getMovies({ limit: 200, includeInactive: 'true' }).then((r) => setMovies(r.data || [])).catch(() => {});
    theatreApi.getTheatres({ limit: 200 }).then((r) => setTheatres(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = { page, limit: 15, includePast: 'true' };
    if (filterMovie) params.movie = filterMovie;
    if (filterTheatre) params.theatre = filterTheatre;
    try {
      const res = await adminApi.getShowsAdmin(params);
      setShows(res.data || []);
      setPagination(res.pagination || null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, filterMovie, filterTheatre]);

  useEffect(() => { load(); }, [load]);

  // Load screens when theatre changes in form
  useEffect(() => {
    if (!form.theatre) { setTheatreScreens([]); return; }
    adminApi.getTheatreAdmin(form.theatre)
      .then((r) => setTheatreScreens(r.data?.screens || []))
      .catch(() => setTheatreScreens([]));
  }, [form.theatre]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      movie: s.movie?._id || s.movie || '',
      theatre: s.theatre?._id || s.theatre || '',
      screenName: s.screenName || '',
      language: s.language || '',
      startTime: toLocalDatetimeInput(s.startTime),
      endTime: toLocalDatetimeInput(s.endTime),
      price: String(s.price ?? ''),
    });
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitError('');
    setSubmitting(true);
    const payload = {
      movie: form.movie,
      theatre: form.theatre,
      screenName: form.screenName.trim(),
      language: form.language.trim(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      price: Number(form.price),
    };
    try {
      if (editing) {
        await adminApi.updateShow(editing._id, payload);
      } else {
        await adminApi.createShow(payload);
      }
      setModalOpen(false);
      setPage(1);
      load();
    } catch (e) {
      setSubmitError(getErrorMessage(e));
      // Keep modal open so user sees server's message
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteShow(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const now = new Date();
  const isPast = (startTime) => new Date(startTime) < now;
  const startTimeInPast = form.startTime && new Date(form.startTime) < now;

  const columns = [
    { key: 'movie', label: 'Movie', render: (r) => <span className="font-medium text-white">{r.movie?.title || '—'}</span> },
    { key: 'theatre', label: 'Theatre', render: (r) => <span className="text-sm">{r.theatre?.name || '—'}<br /><span className="text-xs text-neutral-500">{r.theatre?.city}</span></span> },
    { key: 'screenName', label: 'Screen', render: (r) => <span className="text-neutral-300">{r.screenName}</span> },
    { key: 'language', label: 'Language', render: (r) => r.language },
    { key: 'startTime', label: 'Start', render: (r) => <span className="text-xs whitespace-nowrap">{formatDate(r.startTime)}<br />{formatTime(r.startTime)}</span> },
    { key: 'price', label: 'Price', render: (r) => <span className="text-amber-400 font-medium">{formatPrice(r.price)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={isPast(r.startTime) ? 'past' : 'upcoming'} label={isPast(r.startTime) ? 'Past' : 'Upcoming'} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={() => { setDeleteTarget(r); setDeleteError(''); setDeleting(false); }} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-5">
      <title>Shows — Admin | IMovies</title>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-white">Shows</h1>
        <div className="flex gap-3">
          <button type="button" onClick={load} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 transition-colors">
            <Plus className="w-4 h-4" /> Add Show
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterMovie}
          onChange={(e) => { setFilterMovie(e.target.value); setPage(1); }}
          className={selectCls(false) + ' max-w-xs'}
        >
          <option value="">All Movies</option>
          {movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
        </select>
        <select
          value={filterTheatre}
          onChange={(e) => { setFilterTheatre(e.target.value); setPage(1); }}
          className={selectCls(false) + ' max-w-xs'}
        >
          <option value="">All Theatres</option>
          {theatres.map((t) => <option key={t._id} value={t._id}>{t.name} — {t.city}</option>)}
        </select>
        {(filterMovie || filterTheatre) && (
          <button type="button" onClick={() => { setFilterMovie(''); setFilterTheatre(''); setPage(1); }} className="px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white">Clear</button>
        )}
      </div>

      <DataTable columns={columns} data={shows} loading={loading} error={error} onRetry={load} emptyMessage="No shows found." />
      <AdminPagination pagination={pagination} onPage={(p) => setPage(p)} />

      {/* Create / Edit Modal */}
      <FormModal open={modalOpen} title={editing ? 'Edit Show' : 'Add Show'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Movie" required error={formErrors.movie}>
              <select className={selectCls(formErrors.movie)} value={form.movie} onChange={(e) => setField('movie', e.target.value)}>
                <option value="">Select movie…</option>
                {movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
              </select>
            </FormField>
            <FormField label="Theatre" required error={formErrors.theatre}>
              <select className={selectCls(formErrors.theatre)} value={form.theatre} onChange={(e) => { setField('theatre', e.target.value); setField('screenName', ''); }}>
                <option value="">Select theatre…</option>
                {theatres.map((t) => <option key={t._id} value={t._id}>{t.name} — {t.city}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Screen" required error={formErrors.screenName} hint={!form.theatre ? 'Select a theatre first' : undefined}>
              {theatreScreens.length > 0 ? (
                <select className={selectCls(formErrors.screenName)} value={form.screenName} onChange={(e) => setField('screenName', e.target.value)} disabled={!form.theatre}>
                  <option value="">Select screen…</option>
                  {theatreScreens.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.rows}×{s.seatsPerRow})</option>)}
                </select>
              ) : (
                <input className={inputCls(formErrors.screenName)} value={form.screenName} onChange={(e) => setField('screenName', e.target.value)} placeholder="Screen 1" disabled={!form.theatre} />
              )}
            </FormField>
            <FormField label="Language" required error={formErrors.language}>
              <input className={inputCls(formErrors.language)} value={form.language} onChange={(e) => setField('language', e.target.value)} placeholder="Hindi" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={`Start Time (${tz})`} required error={formErrors.startTime}>
              <input type="datetime-local" className={inputCls(formErrors.startTime)} value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} />
              {startTimeInPast && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  Show is in the past — the server may reject this
                </div>
              )}
            </FormField>
            <FormField label={`End Time (${tz})`} required error={formErrors.endTime}>
              <input type="datetime-local" className={inputCls(formErrors.endTime)} value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Price (₹)" required error={formErrors.price}>
            <input type="number" min="0" step="1" className={inputCls(formErrors.price)} value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="200" />
          </FormField>

          {submitError && <p className="text-sm text-rose-400 rounded-lg bg-rose-950/30 border border-rose-800 px-3 py-2">{submitError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50">
              {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Show'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this show?"
        message={deleteError || 'If this show has confirmed or active pending bookings, the server will refuse deletion.'}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
