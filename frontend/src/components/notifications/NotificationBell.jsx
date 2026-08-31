import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/planningService.js';

function badgeLabel(count) {
  if (!count) return '';
  return count > 99 ? '99+' : String(count);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });

  useEffect(() => {
    getNotifications().then(setData).catch(() => {});
    const timer = setInterval(() => {
      getNotifications().then(setData).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  async function openItem(item) {
    if (!item.read) {
      await markNotificationRead(item._id).catch(() => {});
      setData((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((n) => (n._id === item._id ? { ...n, read: true } : n)),
      }));
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  const badge = badgeLabel(data.unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2.5 text-lg text-app-muted hover:bg-brand-50 hover:text-brand-700"
        aria-label="Open notifications"
      >
        <FiBell />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-brand-600 px-1 text-center text-[10px] font-bold leading-5 text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-soft">
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <p className="text-sm font-semibold text-app-text">Notifications</p>
            <button
              type="button"
              className="text-xs font-semibold text-brand-700"
              onClick={() => markAllNotificationsRead().then(() => setData((p) => ({
                ...p,
                unreadCount: 0,
                notifications: p.notifications.map((n) => ({ ...n, read: true })),
              })))}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data.notifications.slice(0, 12).map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => openItem(item)}
                className={`block w-full border-b border-app-border px-4 py-3 text-left ${item.read ? 'bg-app-surface' : 'bg-brand-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-app-text">{item.title}</p>
                  {item.priority === 'urgent' || item.priority === 'high' ? (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase text-danger">{item.priority}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-app-muted">{item.message}</p>
              </button>
            ))}
            {!data.notifications.length && <p className="p-6 text-center text-sm text-app-muted">No notifications yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
