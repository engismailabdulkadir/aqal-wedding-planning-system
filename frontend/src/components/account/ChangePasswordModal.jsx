import { useId, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Modal from '../common/Modal.jsx';
import ModalFooter, {
  ModalCancelButton,
  ModalSubmitButton,
} from '../common/ModalFooter.jsx';
import { changePassword } from '../../services/planningService.js';
import {
  showApiError,
  showSuccess,
} from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

// Form-ka change password-ka
const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

// Styling-ka input-yada
const inputClass =
  'mt-1 w-full rounded-xl border border-app-border bg-app-inset px-4 py-3 pr-11 text-sm text-app-text outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100';

// Component loogu talagalay password input
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
          minLength={
            name === 'currentPassword'
              ? undefined
              : 4
          }
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className={inputClass}
        />

        {/* Show/Hide password */}
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-app-muted hover:text-brand-700"
          aria-label={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
        >
          {visible
            ? <FiEyeOff />
            : <FiEye />}
        </button>
      </span>

      {/* Haddii hint jiro muuji */}
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-app-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

// Change Password Modal
export default function ChangePasswordModal({
  isOpen,
  onClose,
}) {
  // ID gaar ah
  const titleId = useId();

  // Form state
  const [form, setForm] = useState(emptyForm);

  // Loading state
  const [saving, setSaving] = useState(false);

  // Error state
  const [error, setError] = useState('');

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hubi haddii user-ku wax ku qoray form-ka
  const dirty = Boolean(
    form.currentPassword ||
    form.newPassword ||
    form.confirmPassword
  );

  // Cusboonaysii field
  function update(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError('');
  }

  // Reset password visibility
  function resetVisibility() {
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  // Xir modal-ka oo nadiifi form-ka
  function handleClose() {
    if (saving) return;

    setForm(emptyForm);
    setError('');
    resetVisibility();

    onClose?.();
  }

  // Submit change password
  async function handleSubmit(event) {
    event.preventDefault();

    // Haddii request horey u socdo wax kale ha sameyn
    if (saving) return;

    setError('');

    // Hubi password-ka cusub
    if (form.newPassword.length < 4) {
      setError(
        'Password must be at least 4 characters.'
      );
      return;
    }

    // Hubi password confirmation
    if (form.newPassword !== form.confirmPassword) {
      setError(
        'New passwords must match.'
      );
      return;
    }

    // Password cusub waa inuu ka duwan yahay kii hore
    if (form.currentPassword === form.newPassword) {
      setError(
        'New password must be different from the current password.'
      );
      return;
    }

    setSaving(true);

    try {
      // Backend-ka u dir change password request
      await changePassword(form);

      // Haddii successful noqoto, form nadiifi
      setForm(emptyForm);
      resetVisibility();

      onClose?.();

      // Success notification
      await showSuccess(
        'Password Changed Successfully'
      );
    } catch (err) {
      // Hel error message
      const message = getApiError(err);

      setError(message);

      // Show API error notification
      await showApiError(
        err,
        'Unable to change password'
      );
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

          {/* Cancel */}
          <ModalCancelButton
            onClick={handleClose}
            disabled={saving}
          />

          {/* Submit */}
          <ModalSubmitButton loading={saving}>
            Change Password
          </ModalSubmitButton>

        </ModalFooter>
      )}
    >
      <div className="space-y-4">

        {/* Error message */}
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        {/* Current password */}
        <PasswordField
          label="Current Password *"
          name="currentPassword"
          value={form.currentPassword}
          onChange={update}
          autoComplete="current-password"
          visible={showCurrent}
          onToggleVisible={() =>
            setShowCurrent((v) => !v)
          }
        />

        {/* New password */}
        <PasswordField
          label="New Password *"
          name="newPassword"
          value={form.newPassword}
          onChange={update}
          autoComplete="new-password"
          visible={showNew}
          onToggleVisible={() =>
            setShowNew((v) => !v)
          }
          hint="Minimum 4 characters."
        />

        {/* Confirm password */}
        <PasswordField
          label="Confirm New Password *"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={update}
          autoComplete="new-password"
          visible={showConfirm}
          onToggleVisible={() =>
            setShowConfirm((v) => !v)
          }
        />
      </div>
    </Modal>
  );
}