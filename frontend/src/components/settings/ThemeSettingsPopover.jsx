import { useEffect, useId, useRef, useState } from 'react';
import { FiInfo, FiMonitor, FiMoon, FiSettings, FiSun, FiUsers } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import AboutAppModal from './AboutAppModal.jsx';
import AboutTeamModal from './AboutTeamModal.jsx';
import ThemeOption from './ThemeOption.jsx';

export default function ThemeSettingsPopover({ className = '' }) {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const [aboutAppOpen, setAboutAppOpen] = useState(false);
  const [aboutTeamOpen, setAboutTeamOpen] = useState(false);
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

  return (
    <>
      <div ref={rootRef} className={`relative ${className}`}>
        <button
          type="button"
          aria-label="Open settings"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-full border border-app-border text-brand-700 transition hover:bg-brand-50"
        >
          <FiSettings className="text-lg" />
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-app-border bg-app-surface p-2 shadow-soft"
          >
            <div className="px-3 pb-2 pt-2">
              <p className="text-sm font-semibold text-app-text">Settings</p>
              <p className="mt-0.5 text-xs text-app-muted">Choose how the system looks.</p>
            </div>

            <div role="group" aria-label="Appearance" className="space-y-1 px-1">
              <ThemeOption
                label="Light Mode"
                icon={FiSun}
                active={preference === 'light'}
                onSelect={() => setPreference('light')}
              />
              <ThemeOption
                label="Dark Mode"
                icon={FiMoon}
                active={preference === 'dark'}
                onSelect={() => setPreference('dark')}
              />
              <ThemeOption
                label="System Default"
                description="Match your device theme"
                icon={FiMonitor}
                active={preference === 'system'}
                onSelect={() => setPreference('system')}
              />
            </div>

            <div className="my-2 border-t border-app-border" />

            <div className="space-y-1 px-1 pb-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setAboutAppOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-app-text transition hover:bg-app-inset"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-app-inset text-app-muted">
                  <FiInfo />
                </span>
                About AQAL
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setAboutTeamOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-app-text transition hover:bg-app-inset"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-app-inset text-app-muted">
                  <FiUsers />
                </span>
                About Team
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AboutAppModal isOpen={aboutAppOpen} onClose={() => setAboutAppOpen(false)} />
      <AboutTeamModal isOpen={aboutTeamOpen} onClose={() => setAboutTeamOpen(false)} />
    </>
  );
}
