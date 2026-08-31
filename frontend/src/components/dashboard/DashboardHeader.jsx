import { FiMenu, FiPlus } from 'react-icons/fi';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useCreateWedding } from '../../hooks/useCreateWedding.js';
import GlobalHeaderActions from '../layout/GlobalHeaderActions.jsx';

function DashboardHeader({ onOpenSidebar }) {
  const { weddings, activeWeddingId, selectWedding } = useActiveWedding();
  const { openCreateWedding } = useCreateWedding();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-app-border bg-app-header px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenSidebar} className="rounded-xl border border-app-border p-2.5 text-xl text-app-muted lg:hidden" aria-label="Open sidebar"><FiMenu /></button>
        <div className="min-w-0">
          <p className="text-xs text-app-muted">Current Wedding</p>
          {weddings.length ? (
            <div className="flex min-w-0 items-center gap-2">
              <select aria-label="Current Wedding" value={activeWeddingId || ''} onChange={(event) => selectWedding(event.target.value)} className="max-w-44 truncate border-0 bg-transparent p-0 text-sm font-semibold text-app-text outline-none sm:max-w-64">
                {weddings.map((wedding) => <option key={wedding._id} value={wedding._id}>{wedding.weddingName}</option>)}
              </select>
              <button type="button" onClick={openCreateWedding} className="hidden items-center gap-1 rounded-full border border-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex" aria-label="Create New Wedding">
                <FiPlus /> New
              </button>
            </div>
          ) : (
            <button type="button" onClick={openCreateWedding} className="text-sm font-semibold text-brand-700">+ Create New Wedding</button>
          )}
        </div>
      </div>
      <GlobalHeaderActions className="ml-auto" />
    </header>
  );
}

export default DashboardHeader;
