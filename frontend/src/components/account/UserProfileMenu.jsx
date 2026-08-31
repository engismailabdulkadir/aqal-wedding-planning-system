import { useEffect, useId, useRef, useState } from 'react';
import { FiLogOut, FiShield, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { getFullName, getProfilePath, getRoleLabel } from '../../utils/userDisplay.js';
import ChangePasswordModal from './ChangePasswordModal.jsx';

export default function UserProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const username = user.username || getRoleLabel(user.role);
  const displayName = getFullName(user) || username;
  const roleLabel = getRoleLabel(user.role);

  function goProfile() {
    setOpen(false);
    navigate(getProfilePath(user.role));
  }

  function openPassword() {
    setOpen(false);
    setPasswordOpen(true);
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true, state: { fromLogout: true } });
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex max-w-[11rem] items-center gap-2 rounded-full border border-brand-100 bg-app-surface px-2.5 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:max-w-[14rem] sm:px-3 sm:py-2"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
            <FiUser className="text-sm" />
          </span>
          <span className="hidden min-w-0 truncate sm:inline">{username}</span>
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-50 mt-2 w-[min(16.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-soft"
          >
            <div className="border-b border-app-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-app-text">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-app-muted">@{username}</p>
              <p className="mt-0.5 text-xs text-app-muted">Role: {roleLabel}</p>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={goProfile}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-app-text hover:bg-brand-50"
              >
                <FiUser className="text-base text-brand-600" />
                My Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={openPassword}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-app-text hover:bg-brand-50"
              >
                <FiShield className="text-base text-brand-600" />
                Change Password
              </button>
            </div>

            <div className="border-t border-app-border p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <FiLogOut className="text-base" />
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
