import { useEffect, useRef, useState } from 'react';
import { FiMoreVertical } from 'react-icons/fi';

export default function ActionMenu({ items = [], label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  const visible = items.filter(Boolean);

  return (
    <div ref={rootRef} className="relative inline-flex justify-end">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="grid h-9 w-9 place-items-center rounded-full text-app-muted transition hover:bg-app-inset"
      >
        <FiMoreVertical />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-1 min-w-40 overflow-hidden rounded-2xl border border-app-border bg-app-surface py-1 shadow-soft">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm ${
                item.tone === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : item.tone === 'warning'
                    ? 'text-amber-800 hover:bg-amber-50'
                    : 'text-stone-700 hover:bg-stone-50'
              } disabled:opacity-40`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
