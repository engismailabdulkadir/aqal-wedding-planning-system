export default function ModalFooter({ children }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-app-border px-6 py-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function ModalCancelButton({ onClick, disabled, children = 'Cancel' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-app-border bg-app-surface px-6 py-2.5 text-sm font-semibold text-app-muted hover:bg-app-inset disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ModalSubmitButton({ loading, disabled, children, form }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={disabled || loading}
      className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Saving...' : children}
    </button>
  );
}
