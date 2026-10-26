import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../api/adminApi.js';
import DataTable from '../../components/admin/DataTable.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import FormModal from '../../components/admin/FormModal.jsx';
import AdminPagination from '../../components/admin/Pagination.jsx';
import SearchInput from '../../components/admin/SearchInput.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import FormField, { inputCls } from '../../components/admin/FormField.jsx';

const EMPTY_SCREEN = { name: '', rows: '', seatsPerRow: '' };

function buildFormState(t) {
  return t
    ? {
        name: t.name || '',
        city: t.city || '',
        address: t.address || '',
        isActive: t.isActive !== false,
        screens: t.screens?.length
          ? t.screens.map((s) => ({ name: s.name, rows: String(s.rows), seatsPerRow: String(s.seatsPerRow) }))
          : [{ ...EMPTY_SCREEN }],
      }
    : { name: '', city: '', address: '', isActive: true, screens: [{ ...EMPTY_SCREEN }] };
}

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Name is required';
  if (!form.city.trim()) errs.city = 'City is required';
  if (!form.address.trim()) errs.address = 'Address is required';
  if (!form.screens.length) {
    errs.screens = 'At least one screen is required';
  } else {
    const names = form.screens.map((s) => s.name.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) errs.screens = 'Screen names must be unique';
    form.screens.forEach((s, i) => {
      if (!s.name.trim()) errs[`screen_name_${i}`] = 'Screen name required';
      const r = Number(s.rows);
      if (!s.rows || isNaN(r) || r < 1 || r > 26) errs[`screen_rows_${i}`] = 'Rows: 1–26';
      const sp = Number(s.seatsPerRow);
      if (!s.seatsPerRow || isNaN(sp) || sp < 1 || sp > 40) errs[`screen_spr_${i}`] = 'Seats/row: 1–40';
    });
  }
  return errs;
}

export default function AdminTheatresPage() {
  const [theatres, setTheatres] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(buildFormState(null));
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = { page, limit: 20, includeInactive: 'true' };
    if (search.trim()) params.search = search.trim();
    try {
      const res = await adminApi.getTheatresAdmin(params);
      setTheatres(res.data || []);
      setPagination(res.pagination || null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(buildFormState(null));
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm(buildFormState(t));
    setFormErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setScreen = (i, key, val) =>
    setForm((f) => {
      const screens = [...f.screens];
      screens[i] = { ...screens[i], [key]: val };
      return { ...f, screens };
    });

  const addScreen = () =>
    setForm((f) => ({ ...f, screens: [...f.screens, { ...EMPTY_SCREEN }] }));

  const removeScreen = (i) =>
    setForm((f) => ({ ...f, screens: f.screens.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitError('');
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      screens: form.screens.map((s) => ({
        name: s.name.trim(),
        rows: Number(s.rows),
        seatsPerRow: Number(s.seatsPerRow),
      })),
      ...(editing ? { isActive: form.isActive } : {}),
    };
    try {
      if (editing) {
        await adminApi.updateTheatre(editing._id, payload);
      } else {
        await adminApi.createTheatre(payload);
      }
      setModalOpen(false);
      setPage(1);
      load();
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteTheatre(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'city', label: 'City', render: (r) => r.city },
    { key: 'address', label: 'Address', render: (r) => <span className="text-neutral-400 text-xs max-w-xs block truncate">{r.address}</span> },
    {
      key: 'screens', label: 'Screens',
      render: (r) => (
        <div className="text-xs text-neutral-400 space-y-0.5">
          <div className="font-medium text-neutral-300">{r.screens?.length || 0} screen(s)</div>
          {r.screens?.map((s) => (
            <div key={s.name}>{s.name}: {s.rows}×{s.seatsPerRow} ({s.rows * s.seatsPerRow} seats)</div>
          ))}
        </div>
      ),
    },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} label={r.isActive ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" aria-label="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => { setDeleteTarget(r); setDeleteError(''); setDeleting(false); }} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors" aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <title>Theatres — Admin | IMovies</title>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-white">Theatres</h1>
        <div className="flex gap-3">
          <button type="button" onClick={load} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 transition-colors">
            <Plus className="w-4 h-4" /> Add Theatre
          </button>
        </div>
      </div>

      <SearchInput value={search} onChange={handleSearchChange} placeholder="Search theatres by name or city…" />

      <DataTable columns={columns} data={theatres} loading={loading} error={error} onRetry={load} emptyMessage="No theatres found." />
      <AdminPagination pagination={pagination} onPage={(p) => setPage(p)} />

      {/* Create / Edit Modal */}
      <FormModal open={modalOpen} title={editing ? 'Edit Theatre' : 'Add Theatre'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name" required error={formErrors.name}>
              <input className={inputCls(formErrors.name)} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="PVR Cinemas" />
            </FormField>
            <FormField label="City" required error={formErrors.city}>
              <input className={inputCls(formErrors.city)} value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Mumbai" />
            </FormField>
          </div>
          <FormField label="Address" required error={formErrors.address}>
            <input className={inputCls(formErrors.address)} value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="123 Main Street, Mumbai" />
          </FormField>

          {editing && (
            <FormField label="Status">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-amber-500" />
                <span className="text-sm text-neutral-300">Active</span>
              </label>
            </FormField>
          )}

          {/* Screens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Screens</span>
              <button type="button" onClick={addScreen} className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Screen
              </button>
            </div>
            {formErrors.screens && <p className="text-xs text-rose-400 mb-2">{formErrors.screens}</p>}
            <div className="space-y-3">
              {form.screens.map((s, i) => {
                const totalSeats = (Number(s.rows) || 0) * (Number(s.seatsPerRow) || 0);
                return (
                  <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <FormField label={`Screen ${i + 1} Name`} required error={formErrors[`screen_name_${i}`]}>
                        <input className={inputCls(formErrors[`screen_name_${i}`])} value={s.name} onChange={(e) => setScreen(i, 'name', e.target.value)} placeholder="Screen 1" />
                      </FormField>
                      <FormField label="Rows (1–26)" required error={formErrors[`screen_rows_${i}`]}>
                        <input type="number" min="1" max="26" className={inputCls(formErrors[`screen_rows_${i}`])} value={s.rows} onChange={(e) => setScreen(i, 'rows', e.target.value)} />
                      </FormField>
                      <FormField label="Seats/row (1–40)" required error={formErrors[`screen_spr_${i}`]}>
                        <input type="number" min="1" max="40" className={inputCls(formErrors[`screen_spr_${i}`])} value={s.seatsPerRow} onChange={(e) => setScreen(i, 'seatsPerRow', e.target.value)} />
                      </FormField>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">
                        Total seats: <span className="text-amber-400 font-medium">{totalSeats > 0 ? totalSeats : '—'}</span>
                      </span>
                      {form.screens.length > 1 && (
                        <button type="button" onClick={() => removeScreen(i)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Changing screen layout (rows or seatsPerRow) is only allowed when no upcoming shows are scheduled for that screen.</p>
          </div>

          {submitError && <p className="text-sm text-rose-400 rounded-lg bg-rose-950/30 border border-rose-800 px-3 py-2">{submitError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} className="px-4 py-2 rounded-lg text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50">
              {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Theatre'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message={deleteError || 'This will permanently delete the theatre. If it has upcoming shows, the server will refuse.'}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
