import { FiAlertTriangle, FiCheck, FiEdit2, FiShield } from 'react-icons/fi';

const toneStyles = {
  activate: 'bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200',
  edit: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
  block: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
  disabled: 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed',
};

function ActionIconButton({ label, onClick, disabled, tone = 'activate', icon: Icon }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${disabled ? toneStyles.disabled : toneStyles[tone]}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export default function AdminUserActionButtons({
  user,
  onActivate,
  onEdit,
  onSetInactive,
  onBlock,
  canChangeStatus: statusChangeAllowed,
}) {
  const status = user.accountStatus || (user.isActive ? 'active' : 'blocked');
  const protectedUser = !statusChangeAllowed;

  const activateEnabled = !protectedUser && status !== 'active';
  const inactiveEnabled = !protectedUser && (status === 'active' || status === 'blocked');
  const blockEnabled = !protectedUser && status !== 'blocked';

  const activateLabel = status === 'blocked' ? 'Unblock / Activate' : 'Activate';

  return (
    <div className="flex items-center justify-end gap-2">
      <ActionIconButton
        label={activateLabel}
        icon={FiCheck}
        tone="activate"
        disabled={!activateEnabled}
        onClick={() => onActivate(user)}
      />
      <ActionIconButton
        label="Edit"
        icon={FiEdit2}
        tone="edit"
        disabled={false}
        onClick={() => onEdit(user)}
      />
      <ActionIconButton
        label="Set Inactive"
        icon={FiShield}
        tone="inactive"
        disabled={!inactiveEnabled}
        onClick={() => onSetInactive(user)}
      />
      <ActionIconButton
        label="Block"
        icon={FiAlertTriangle}
        tone="block"
        disabled={!blockEnabled}
        onClick={() => onBlock(user)}
      />
    </div>
  );
}
