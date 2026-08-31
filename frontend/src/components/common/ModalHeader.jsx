import { FiX } from 'react-icons/fi';

export default function ModalHeader({ title, subtitle, onClose, loading, titleId = 'modal-title' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-app-border px-6 py-5">
      <div className="min-w-0">
        {title ? <h2 id={titleId} className="font-display text-2xl font-semibold text-app-text">{title}</h2> : null}
        {subtitle ? <p className="mt-1 text-sm text-app-muted">{subtitle}</p> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-app-muted transition hover:bg-app-inset disabled:opacity-40"
        >
          <FiX className="text-lg" />
        </button>
      ) : null}
    </div>
  );
}
