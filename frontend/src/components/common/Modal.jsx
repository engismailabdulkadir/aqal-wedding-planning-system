import { useEffect, useId, useRef } from 'react';
import { confirmDiscard } from '../../utils/alerts.js';
import ModalHeader from './ModalHeader.jsx';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  loading = false,
  dirty = false,
  children,
  footer,
  labelledBy,
  as: Panel = 'div',
  onSubmit,
}) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const titleId = useId();
  const dirtyRef = useRef(dirty);
  const loadingRef = useRef(loading);
  const onCloseRef = useRef(onClose);

  dirtyRef.current = dirty;
  loadingRef.current = loading;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () => [...(panel?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])]
      .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');

    const first = focusables()[0];
    if (first && !panel?.contains(document.activeElement)) {
      first.focus();
    }

    async function requestClose() {
      if (loadingRef.current) return;
      if (dirtyRef.current) {
        const discard = await confirmDiscard();
        if (!discard) return;
      }
      onCloseRef.current?.();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current?.focus) previousFocus.current.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleOverlayClose() {
    if (loadingRef.current) return;
    if (dirtyRef.current) {
      const discard = await confirmDiscard();
      if (!discard) return;
    }
    onCloseRef.current?.();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-stone-950/45"
        onClick={handleOverlayClose}
      />
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        tabIndex={-1}
        onSubmit={onSubmit}
        className={`relative m-3 flex max-h-[min(92vh,44rem)] w-full flex-col overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-soft ${SIZE_CLASS[size] || SIZE_CLASS.md}`}
      >
        {(title || onClose) ? (
          <ModalHeader
            title={title}
            subtitle={subtitle}
            titleId={labelledBy || titleId}
            loading={loading}
            onClose={handleOverlayClose}
          />
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer}
      </Panel>
    </div>
  );
}
