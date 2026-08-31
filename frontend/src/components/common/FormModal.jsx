import { useRef } from 'react';
import { confirmDiscard } from '../../utils/alerts.js';
import Modal from './Modal.jsx';
import ModalFooter, { ModalCancelButton, ModalSubmitButton } from './ModalFooter.jsx';

export default function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  loading = false,
  dirty = false,
  error = '',
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
}) {
  const locked = useRef(false);

  async function requestClose() {
    if (loading || locked.current) return;
    if (dirty) {
      const discard = await confirmDiscard();
      if (!discard) return;
    }
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || locked.current) return;
    locked.current = true;
    try {
      await onSubmit?.(event);
    } finally {
      locked.current = false;
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      isOpen={isOpen}
      onClose={requestClose}
      title={title}
      subtitle={subtitle}
      size={size}
      loading={loading}
      footer={(
        <ModalFooter>
          <ModalCancelButton onClick={requestClose} disabled={loading}>{cancelLabel}</ModalCancelButton>
          <ModalSubmitButton loading={loading}>{submitLabel}</ModalSubmitButton>
        </ModalFooter>
      )}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </Modal>
  );
}

export const fieldClass = 'mt-1 w-full rounded-xl border border-app-border bg-app-inset px-4 py-3 text-sm text-app-text outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}
