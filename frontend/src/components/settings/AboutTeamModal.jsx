import ViewModal from '../common/ViewModal.jsx';

export default function AboutTeamModal({ isOpen, onClose }) {
  return (
    <ViewModal
      isOpen={isOpen}
      onClose={onClose}
      title="About Team"
      subtitle="Project roles"
      size="sm"
    >
      <div className="space-y-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
        <p>
          AQAL Wedding Planning System is built as a collaborative MERN workspace connecting the people
          who plan and deliver weddings.
        </p>
        <ul className="space-y-3">
          {[
            ['Couples / Customers', 'Create weddings, reserve halls, manage guests, and track payments.'],
            ['Wedding Planners', 'Coordinate assigned weddings, tasks, timelines, and vendor communication.'],
            ['Vendors', 'Manage listings, availability, orders, and service delivery.'],
            ['Administrators', 'Oversee users, venues, bookings, orders, and system operations.'],
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-800/80">
              <p className="font-semibold text-stone-800 dark:text-stone-100">{title}</p>
              <p className="mt-1 text-stone-500 dark:text-stone-400">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </ViewModal>
  );
}
