import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Film, AlertCircle } from 'lucide-react';
import { registerUser } from '../redux/authSlice.js';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const redirectPath = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (name.trim().length < 2) return setLocalError('Name must be at least 2 characters');
    if (password.length < 6) return setLocalError('Password must be at least 6 characters');
    const result = await dispatch(registerUser({ name: name.trim(), email, password }));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate(redirectPath, { replace: true });
    }
  };

  const shownError = localError || error;

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 mx-auto flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
          <p className="text-xs text-neutral-400">Sign up to book seats and manage your tickets</p>
        </div>

        {shownError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{shownError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-neutral-300 mb-1">Name</label>
            <input id="reg-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
            <input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold text-neutral-300 mb-1">Password (min 6 characters)</label>
            <input id="reg-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-all shadow-lg shadow-rose-950/30 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-400">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="text-rose-400 hover:text-rose-300 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
