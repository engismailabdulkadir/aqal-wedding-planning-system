const TONES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-amber-800',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-brand-50 text-brand-700',
  neutral: 'bg-app-inset text-app-muted',
};

const STATUS_TONE = {
  completed: 'success',
  confirmed: 'success',
  paid: 'success',
  active: 'success',
  available: 'success',
  verified: 'success',
  featured: 'info',
  in_progress: 'warning',
  held: 'warning',
  pending: 'warning',
  pending_payment: 'warning',
  overdue: 'danger',
  booked: 'danger',
  cancelled: 'neutral',
  inactive: 'neutral',
  unclaimed: 'warning',
  claimed: 'success',
  upcoming: 'neutral',
  unpaid: 'neutral',
};

export default function StatusBadge({ value, tone, children }) {
  if (!value && !children) return null;
  const label = children || String(value).replaceAll('_', ' ');
  const resolved = tone || STATUS_TONE[value] || 'neutral';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONES[resolved] || TONES.neutral}`}>
      {label}
    </span>
  );
}
