import ViewModal from '../common/ViewModal.jsx';

export default function AboutAppModal({ isOpen, onClose }) {
  return (
    <ViewModal
      isOpen={isOpen}
      onClose={onClose}
      title="AQAL Wedding Planning System"
      subtitle="About this application"
      size="sm"
    >
      <div className="space-y-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
        <p>
          A wedding planning, venue booking, and vendor management platform for couples,
          planners, vendors, and administrators.
        </p>
        <dl className="grid gap-3 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/80">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Application</dt>
            <dd className="mt-1 font-medium text-stone-800 dark:text-stone-100">AQAL Wedding Planning System</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Version</dt>
            <dd className="mt-1 font-medium text-stone-800 dark:text-stone-100">0.1.0</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Stack</dt>
            <dd className="mt-1 font-medium text-stone-800 dark:text-stone-100">React · Express · MongoDB</dd>
          </div>
        </dl>
      </div>
    </ViewModal>
  );
}
