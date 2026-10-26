import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, Film, Building2, Calendar, Ticket, Users,
  Menu, X, ExternalLink, LogOut,
} from 'lucide-react';
import { logout } from '../../redux/authSlice.js';

const NAV_ITEMS = [
  { to: '/admin',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/movies',    label: 'Movies',    icon: Film },
  { to: '/admin/theatres',  label: 'Theatres',  icon: Building2 },
  { to: '/admin/shows',     label: 'Shows',     icon: Calendar },
  { to: '/admin/bookings',  label: 'Bookings',  icon: Ticket },
  { to: '/admin/users',     label: 'Users',     icon: Users },
];

function SidebarContent({ onNav }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNav}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-neutral-800 bg-neutral-950 sticky top-0 h-screen overflow-y-auto flex-shrink-0 print:hidden">
        <div className="px-4 py-4 border-b border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Admin Panel</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent onNav={() => {}} />
        </div>
        <div className="px-4 py-3 border-t border-neutral-800">
          <Link to="/" className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-2">
            <ExternalLink className="w-3.5 h-3.5" /> View Site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-rose-400 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative z-10 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Admin Panel</span>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onNav={() => setDrawerOpen(false)} />
            </div>
            <div className="px-4 py-3 border-t border-neutral-800">
              <Link to="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 mb-2">
                <ExternalLink className="w-3.5 h-3.5" /> View Site
              </Link>
              <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-rose-400 w-full">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-sm print:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-neutral-400">
              {user?.name && <span className="font-medium text-neutral-200">{user.name}</span>}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
