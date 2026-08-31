import { useState } from 'react';
import { FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import AqalLogo from '../branding/AqalLogo.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPath } from '../../utils/dashboardPath.js';
import ThemeSettingsPopover from '../settings/ThemeSettingsPopover.jsx';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Venues', to: '/venues' },
  { label: 'Halls', to: '/halls' },
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const navLinkClass =
  'rounded-lg px-3.5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-white/60 hover:text-brand-700';

function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true, state: { fromLogout: true } });
  }

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/50 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/40"
    >
      <nav className="section-shell flex h-[72px] items-center justify-between gap-3" aria-label="Main navigation">
        <Link to="/" className="shrink-0" onClick={() => setOpen(false)} aria-label="AQAL home">
          <AqalLogo
            plate
            plateClassName="h-12 w-12 rounded-[14px] p-2 shadow-md ring-1 ring-white/90 sm:h-[3.25rem] sm:w-[3.25rem]"
            imageClassName="h-full w-full object-contain"
          />
        </Link>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeSettingsPopover />
          <button
            type="button"
            className="rounded-lg p-2 text-2xl text-stone-700 hover:bg-white/60"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>

        <div
          className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-[72px] flex-col gap-1 border-b border-white/30 bg-white/90 p-5 shadow-lg backdrop-blur-xl lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={navLinkClass}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 hidden border-t border-white/30 pt-4 lg:ml-2 lg:mt-0 lg:flex lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            <ThemeSettingsPopover />
          </div>

          {isAuthenticated ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/30 pt-4 lg:ml-3 lg:mt-0 lg:flex-row lg:items-center lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
              <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/85 p-2 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:rounded-full lg:px-2 lg:py-1">
                <Link
                  to={getDashboardPath(user.role)}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700"
                >
                  Dashboard
                </Link>
                <span className="flex items-center justify-center gap-2 px-2 py-2 text-sm font-medium text-stone-800">
                  <FiUser className="text-brand-600" />
                  {user.firstName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-white/70 hover:text-brand-700"
                >
                  <FiLogOut />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/30 pt-4 lg:ml-3 lg:mt-0 lg:flex-row lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
              <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/85 p-2 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:gap-1 lg:rounded-full lg:px-2.5 lg:py-1.5">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-stone-800 transition hover:bg-white/80 hover:text-brand-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-brand-600/25 ring-1 ring-white/50 transition hover:bg-brand-700"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
