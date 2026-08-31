import { Link } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import AqalLogo from '../branding/AqalLogo.jsx';

/**
 * Shared AQAL branding block for all role sidebars.
 * @param {{ homeTo?: string, collapsed?: boolean, searchValue?: string, onSearchChange?: (value: string) => void, onCloseMobile?: () => void }} props
 */
export default function SidebarBrand({
  homeTo = '/dashboard',
  collapsed = false,
  searchValue = '',
  onSearchChange,
  onCloseMobile,
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-b border-white/15 px-2 py-4">
        <Link to={homeTo} aria-label="AQAL home">
          <AqalLogo plate plateClassName="h-12 w-12 rounded-[14px]" />
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-white/15 px-4 pb-4 pt-5">
      <div className="relative">
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute -right-1 -top-1 z-10 rounded-lg p-2 text-lg text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        ) : null}

        <Link to={homeTo} className="mx-auto flex w-full max-w-[11.5rem] flex-col items-center text-center" aria-label="AQAL home">
          <AqalLogo plate plateClassName="h-[92px] w-[92px] rounded-[20px] p-2.5" />
          <span className="mt-3 font-display text-[1.75rem] font-bold leading-none tracking-wide text-white">
            AQAL
          </span>
          <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Wedding Planning System
          </span>
        </Link>
      </div>

      <div className="mx-auto mt-4 h-px w-full max-w-[12rem] bg-white/20" aria-hidden />

      {typeof onSearchChange === 'function' ? (
        <label className="relative mt-4 block">
          <span className="sr-only">Search menu</span>
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/65" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-white/15 bg-white/12 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/30 focus:bg-white/16"
          />
        </label>
      ) : null}
    </div>
  );
}
