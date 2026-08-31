import { useId, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Modal from '../common/Modal.jsx';
import ModalFooter, { ModalCancelButton, ModalSubmitButton } from '../common/ModalFooter.jsx';
import { changePassword } from '../../services/planningService.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const inputClass =
  'mt-1 w-full rounded-xl border border-app-border bg-app-inset px-4 py-3 pr-11 text-sm text-app-text outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100';

function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  visible,
  onToggleVisible,
  hint,
}) {
  return (
    <label className="block text-sm font-medium text-app-text">
      {label}
      <span className="relative mt-1 block">
        <input
          required
          minLength={name === 'currentPassword' ? undefined : 4}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-app-muted hover:text-brand-700"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </button>
      </span>
      {hint ? <span className="mt-1 block text-xs font-normal text-app-muted">{hint}</span> : null}
    </label>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const titleId = useId();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dirty = Boolean(form.currentPassword || form.newPassword || form.confirmPassword);

  function update(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  }

  function resetVisibility() {
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleClose() {
    if (saving) return;
    setForm(emptyForm);
    setError('');
    resetVisibility();
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (form.newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords must match.');
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from the current password.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(form);
      setForm(emptyForm);
      resetVisibility();
      onClose?.();
      await showSuccess('Password Changed Successfully');
    } catch (err) {
      const message = getApiError(err);
      setError(message);
      await showApiError(err, 'Unable to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      subtitle="Enter your current password, then choose a new one."
      size="sm"
      loading={saving}
      dirty={dirty}
      as="form"
      onSubmit={handleSubmit}
      labelledBy={titleId}
      footer={(
        <ModalFooter>
          <ModalCancelButton onClick={handleClose} disabled={saving} />
          <ModalSubmitButton loading={saving}>Change Password</ModalSubmitButton>
        </ModalFooter>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <PasswordField
          label="Current Password *"
          name="currentPassword"
          value={form.currentPassword}
          onChange={update}
          autoComplete="current-password"
          visible={showCurrent}
          onToggleVisible={() => setShowCurrent((v) => !v)}
        />
        <PasswordField
          label="New Password *"
          name="newPassword"
          value={form.newPassword}
          onChange={update}
          autoComplete="new-password"
          visible={showNew}
          onToggleVisible={() => setShowNew((v) => !v)}
          hint="Minimum 4 characters."
        />
        <PasswordField
          label="Confirm New Password *"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={update}
          autoComplete="new-password"
          visible={showConfirm}
          onToggleVisible={() => setShowConfirm((v) => !v)}
        />
      </div>
    </Modal>
  );
}
