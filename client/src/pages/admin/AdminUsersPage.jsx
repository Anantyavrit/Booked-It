import React from 'react';
import { Users } from 'lucide-react';

// NOTE: GET /api/admin/users was NOT included in Phase 13 server work.
// Only GET /api/admin/stats was added. This page is a placeholder.
// Missing from server: GET /api/admin/users (paginated, with search on name/email, returning bookingsCount)

export default function AdminUsersPage() {
  return (
    <div className="space-y-5">
      <title>Users — Admin | IMovies</title>
      <h1 className="text-xl font-bold text-white">Users</h1>
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <h2 className="text-base font-semibold text-amber-300">Endpoint not yet implemented</h2>
        </div>
        <p className="text-sm text-neutral-400">
          User management requires a dedicated server endpoint:{' '}
          <code className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300 text-xs">GET /api/admin/users</code>
          {' '}which was not included in Phase 13 (only{' '}
          <code className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300 text-xs">GET /api/admin/stats</code>
          {' '}was added).
        </p>
        <p className="text-sm text-neutral-500">
          To implement: add a paginated users route to <code className="text-xs text-neutral-400">server/routes/adminRoutes.js</code> that
          returns <code className="text-xs text-neutral-400">{'{ users[], total, page, pages }'}</code> with a <code className="text-xs text-neutral-400">bookingsCount</code> via aggregation.
        </p>
      </div>
    </div>
  );
}
