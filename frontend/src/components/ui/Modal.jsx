export { default } from '../common/Modal.jsx';
export { default as FormModal } from '../common/FormModal.jsx';
export { default as ViewModal } from '../common/ViewModal.jsx';

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-100 bg-white p-7 shadow-soft">
        <h2 className="font-display text-2xl font-semibold text-stone-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${danger ? 'bg-red-700' : 'bg-brand-600'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
