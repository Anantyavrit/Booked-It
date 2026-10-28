import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Film, X } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../api/adminApi.js';
import DataTable from '../../components/admin/DataTable.jsx';
import AdminPagination from '../../components/admin/Pagination.jsx';
import SearchInput from '../../components/admin/SearchInput.jsx';
import StatusBadge from '../../components/admin/StatusBadge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import FormModal from '../../components/admin/FormModal.jsx';
import FormField, { inputCls, selectCls } from '../../components/admin/FormField.jsx';
import { formatDuration, formatToYYYYMMDD } from '../../utils/format.js';

function TagInput({ tags, onChange, placeholder, error }) {
  const [inputVal, setInputVal] = useState('');

  const addTag = (val) => {
    const trimmed = val.replace(/,/g, '').trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-neutral-800 border ${error ? 'border-rose-500' : 'border-neutral-700'}`}>
      {tags.map((tag, idx) => (
        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-700 text-neutral-200 text-xs">
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(idx)}
            className="text-neutral-400 hover:text-white"
            aria-label={`Remove ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputVal)}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[100px] bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
      />
    </div>
  );
}

const INITIAL_FORM = {
  title: '',
  description: '',
  genres: [],
  languages: [],
  duration: '',
  certificate: 'UA',
  cast: '',
  director: '',
  tagline: '',
  backdrop: '',
  formats: ['2D'],
  rating: '',
  tmdbId: '',
  status: 'now_showing',
  releaseDate: '',
  trailerUrl: '',
  posterType: 'url', // 'url' | 'file'
  posterUrl: '',
  posterFile: null,
  isActive: true,
};

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerErr, setFormServerErr] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getMoviesAdmin({ page, limit: 10, search });
      setMovies(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const openCreateModal = () => {
    setEditingMovie(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setFormServerErr(null);
    setModalOpen(true);
  };

  const openEditModal = (movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title || '',
      description: movie.description || '',
      genres: movie.genres || [],
      languages: movie.languages || [],
      duration: movie.duration ? String(movie.duration) : '',
      certificate: movie.certificate || '',
      cast: (movie.cast || []).join(', '),
      director: movie.director || '',
      tagline: movie.tagline || '',
      backdrop: movie.backdrop || '',
      formats: movie.formats && movie.formats.length > 0 ? movie.formats : ['2D'],
      rating: movie.rating !== null && movie.rating !== undefined ? String(movie.rating) : '',
      tmdbId: movie.tmdbId ? String(movie.tmdbId) : '',
      status: movie.status || 'now_showing',
      releaseDate: movie.releaseDate ? formatToYYYYMMDD(movie.releaseDate) : '',
      trailerUrl: movie.trailerUrl || '',
      posterType: 'url',
      posterUrl: movie.poster && movie.poster.startsWith('http') ? movie.poster : '',
      posterFile: null,
      isActive: movie.isActive !== false,
    });
    setFormErrors({});
    setFormServerErr(null);
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.genres.length) errors.genres = 'At least one genre is required';
    if (!formData.languages.length) errors.languages = 'At least one language is required';
    const dur = Number(formData.duration);
    if (!formData.duration || isNaN(dur)) {
      errors.duration = 'Duration is required';
    } else if (dur < 30 || dur > 300) {
      errors.duration = 'Duration must be between 30 and 300 minutes';
    }
    if (formData.certificate && !['U', 'UA', 'A'].includes(formData.certificate)) {
      errors.certificate = 'Certificate must be U, UA, or A';
    }
    if (formData.rating !== '' && formData.rating !== null && formData.rating !== undefined) {
      const r = Number(formData.rating);
      if (isNaN(r) || r < 0 || r > 10) {
        errors.rating = 'Rating must be between 0 and 10';
      }
    }
    if (formData.trailerUrl?.trim()) {
      try {
        const u = new URL(formData.trailerUrl.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          errors.trailerUrl = 'Must be a valid HTTP or HTTPS URL';
        }
      } catch {
        errors.trailerUrl = 'Must be a valid URL';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormServerErr(null);

    const body = new FormData();
    body.append('title', formData.title.trim());
    body.append('description', formData.description.trim());
    body.append('genres', formData.genres.join(','));
    body.append('languages', formData.languages.join(','));
    body.append('duration', formData.duration);
    if (formData.certificate) body.append('certificate', formData.certificate);
    if (formData.releaseDate) body.append('releaseDate', formData.releaseDate);
    if (formData.cast.trim()) body.append('cast', formData.cast);
    body.append('trailerUrl', formData.trailerUrl.trim());
    body.append('status', formData.status || 'now_showing');
    if (formData.director.trim()) body.append('director', formData.director.trim());
    if (formData.tagline.trim()) body.append('tagline', formData.tagline.trim());
    if (formData.backdrop.trim()) body.append('backdrop', formData.backdrop.trim());
    body.append('formats', (formData.formats || ['2D']).join(','));
    if (formData.rating !== '') body.append('rating', formData.rating);
    if (formData.tmdbId !== '') body.append('tmdbId', formData.tmdbId);

    if (editingMovie) {
      body.append('isActive', formData.isActive ? 'true' : 'false');
    }

    if (formData.posterType === 'file' && formData.posterFile) {
      body.append('poster', formData.posterFile);
    } else if (formData.posterType === 'url' && formData.posterUrl.trim()) {
      body.append('poster', formData.posterUrl.trim());
    }

    try {
      if (editingMovie) {
        await adminApi.updateMovie(editingMovie._id, body);
      } else {
        await adminApi.createMovie(body);
      }
      setModalOpen(false);
      fetchMovies();
    } catch (err) {
      setFormServerErr(getErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteMovie(deleteTarget._id);
      setDeleteTarget(null);
      fetchMovies();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'poster',
      label: 'Poster',
      render: (m) => (
        <div className="w-10 h-14 rounded overflow-hidden bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-neutral-700/50">
          {m.poster ? (
            <img
              src={m.poster}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.innerHTML = '<span class="text-neutral-500 text-xs">N/A</span>';
              }}
            />
          ) : (
            <Film className="w-4 h-4 text-neutral-600" />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (m) => (
        <div>
          <p className="font-medium text-white">{m.title}</p>
          {m.releaseDate && (
            <p className="text-xs text-neutral-500">
              {new Date(m.releaseDate).getFullYear()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'genres',
      label: 'Genres',
      render: (m) => (
        <span className="text-xs text-neutral-400">
          {(m.genres || []).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'certificate',
      label: 'Cert',
      render: (m) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-neutral-800 border border-neutral-700 text-neutral-300">
          {m.certificate || '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (m) => (
        <span className="text-neutral-300">{formatDuration(m.duration)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status / Visibility',
      render: (m) => (
        <div className="flex flex-col gap-1 items-start">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
              m.status === 'coming_soon'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : m.status === 'archived'
                ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {m.status ? m.status.replace('_', ' ') : 'now showing'}
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <StatusBadge
              status={m.isActive !== false ? 'active' : 'inactive'}
              label={m.isActive !== false ? 'Active' : 'Inactive'}
            />
            {m.rating ? (
              <span className="text-amber-400 font-medium">★ {m.rating}</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (m) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditModal(m)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Edit movie"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteTarget(m);
              setDeleteError(null);
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
            title="Delete movie"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <title>Movies — Admin | IMovies</title>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Movies</h1>
          <p className="text-xs text-neutral-500">Manage titles, classifications, posters, and status</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm font-semibold text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Movie
        </button>
      </div>

      {/* Search and Filters */}
      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search movies by title…"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={movies}
        loading={loading}
        error={error}
        onRetry={fetchMovies}
        emptyMessage={search ? `No movies matching "${search}".` : 'No movies found.'}
      />

      {/* Pagination */}
      <AdminPagination
        pagination={pagination}
        onPage={(p) => setPage(p)}
      />

      {/* Add / Edit Modal */}
      <FormModal
        open={modalOpen}
        title={editingMovie ? 'Edit Movie' : 'Add New Movie'}
        onClose={() => !formSubmitting && setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formServerErr && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
              {formServerErr}
            </div>
          )}

          <FormField label="Title" error={formErrors.title} required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Interstellar"
              className={inputCls(formErrors.title)}
            />
          </FormField>

          <FormField label="Description" error={formErrors.description} required>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Movie synopsis…"
              className={inputCls(formErrors.description)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Genres"
              error={formErrors.genres}
              required
              hint="Press Enter or comma to add each genre"
            >
              <TagInput
                tags={formData.genres}
                onChange={(genres) => setFormData({ ...formData, genres })}
                placeholder="Action, Sci-Fi…"
                error={formErrors.genres}
              />
            </FormField>

            <FormField
              label="Languages"
              error={formErrors.languages}
              required
              hint="Press Enter or comma to add each language"
            >
              <TagInput
                tags={formData.languages}
                onChange={(languages) => setFormData({ ...formData, languages })}
                placeholder="English, Hindi…"
                error={formErrors.languages}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Duration (minutes)" error={formErrors.duration} required>
              <input
                type="number"
                min={30}
                max={300}
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 148"
                className={inputCls(formErrors.duration)}
              />
            </FormField>

            <FormField label="Certificate" error={formErrors.certificate}>
              <select
                value={formData.certificate}
                onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                className={selectCls(formErrors.certificate)}
              >
                <option value="">Select Certificate</option>
                <option value="U">U (Universal)</option>
                <option value="UA">UA (Parental Guidance)</option>
                <option value="A">A (Adults Only)</option>
              </select>
            </FormField>

            <FormField label="Release Date">
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                className={inputCls()}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Status">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={selectCls()}
              >
                <option value="now_showing">Now Showing</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>

            <FormField label="Rating (0 - 10)" error={formErrors.rating} hint="e.g. 8.4">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                placeholder="e.g. 8.4"
                className={inputCls(formErrors.rating)}
              />
            </FormField>

            <FormField label="TMDB ID" hint="Optional, for sync">
              <input
                type="number"
                value={formData.tmdbId}
                onChange={(e) => setFormData({ ...formData, tmdbId: e.target.value })}
                placeholder="e.g. 157336"
                className={inputCls()}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Director" hint="Director's full name">
              <input
                type="text"
                value={formData.director}
                onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                placeholder="e.g. Christopher Nolan"
                className={inputCls()}
              />
            </FormField>

            <FormField label="Tagline" hint="Short promotional catchphrase">
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Mankind was born on Earth…"
                className={inputCls()}
              />
            </FormField>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider block mb-1.5">
              Available Formats
            </label>
            <div className="flex flex-wrap gap-2">
              {['2D', '3D', 'IMAX', '4DX'].map((fmt) => {
                const isSelected = formData.formats?.includes(fmt);
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      const cur = formData.formats || [];
                      const next = isSelected ? cur.filter((f) => f !== fmt) : [...cur, fmt];
                      setFormData({ ...formData, formats: next.length > 0 ? next : ['2D'] });
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          <FormField label="Backdrop Image URL" hint="Landscape banner image link">
            <input
              type="url"
              value={formData.backdrop}
              onChange={(e) => setFormData({ ...formData, backdrop: e.target.value })}
              placeholder="https://image.tmdb.org/t/p/w1280/…"
              className={inputCls()}
            />
          </FormField>

          <FormField label="Cast" hint="Comma-separated actor names">
            <input
              type="text"
              value={formData.cast}
              onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
              placeholder="e.g. Matthew McConaughey, Anne Hathaway"
              className={inputCls()}
            />
          </FormField>

          <FormField label="Trailer URL" error={formErrors.trailerUrl} hint="YouTube or external trailer link">
            <input
              type="url"
              value={formData.trailerUrl}
              onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              className={inputCls(formErrors.trailerUrl)}
            />
          </FormField>

          {/* Poster input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
              Poster Image
            </label>
            <div className="flex gap-4 text-xs mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, posterType: 'url' })}
                className={`pb-1 border-b-2 font-medium transition-colors ${
                  formData.posterType === 'url'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                External URL
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, posterType: 'file' })}
                className={`pb-1 border-b-2 font-medium transition-colors ${
                  formData.posterType === 'file'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Upload File
              </button>
            </div>

            {formData.posterType === 'url' ? (
              <input
                type="url"
                value={formData.posterUrl}
                onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                placeholder="https://images.unsplash.com/…"
                className={inputCls()}
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, posterFile: e.target.files?.[0] || null })}
                className="w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700"
              />
            )}

            {/* Preview */}
            {(formData.posterUrl || formData.posterFile || editingMovie?.poster) && (
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-16 rounded overflow-hidden bg-neutral-800 border border-neutral-700">
                  <img
                    src={
                      formData.posterType === 'file' && formData.posterFile
                        ? URL.createObjectURL(formData.posterFile)
                        : formData.posterUrl || editingMovie?.poster
                    }
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <span className="text-xs text-neutral-500">Poster preview</span>
              </div>
            )}
          </div>

          {/* Active status for editing */}
          {editingMovie && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="movie-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500/50 bg-neutral-800"
              />
              <label htmlFor="movie-isActive" className="text-sm text-neutral-300 cursor-pointer">
                Movie is active (visible in public listings)
              </label>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={formSubmitting}
              className="px-4 py-2 rounded-lg text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {formSubmitting ? 'Saving…' : editingMovie ? 'Save Changes' : 'Create Movie'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Movie"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete "${deleteTarget?.title}"? Movies with upcoming scheduled shows cannot be deleted.`
        }
        confirmLabel="Delete"
        danger={true}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
