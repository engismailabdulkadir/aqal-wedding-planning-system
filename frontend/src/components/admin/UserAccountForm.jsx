import PasswordField from '../common/PasswordField.jsx';
import { FieldError, fieldClass } from '../common/FormModal.jsx';
import {
  isValidEmailOptional,
  isValidPersonName,
  isValidPassword,
  isValidPhone,
  isValidUsername,
} from '../../utils/validation.js';
import { getRoleLabel, isCoupleRole } from '../../utils/roles.js';

export const USER_ROLES = ['admin', 'groom', 'bride', 'wedding_planner', 'vendor'];
export const ACCOUNT_STATUSES = ['active', 'inactive', 'blocked'];

export const emptyUserForm = {
  fullName: '',
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'groom',
  accountStatus: 'active',
  isActive: true,
};

export function splitFullName(fullName) {
  const trimmed = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function joinFullName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function userToForm(user, fallbackRole = 'groom') {
  if (!user) return { ...emptyUserForm, role: fallbackRole };
  const accountStatus = user.accountStatus || (user.isActive ? 'active' : 'blocked');
  return {
    _id: user._id,
    fullName: joinFullName(user),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    password: '',
    confirmPassword: '',
    role: user.role || fallbackRole,
    accountStatus,
    isActive: accountStatus === 'active',
  };
}

export function validateUserForm(form, { isEdit = false, requireConfirmPassword = false, useFullName = false } = {}) {
  const errors = {};
  if (useFullName) {
    const trimmed = String(form.fullName || '').trim();
    if (!trimmed) errors.fullName = 'Full name is required.';
    else {
      const { firstName, lastName } = splitFullName(trimmed);
      const firstNameError = isValidPersonName(firstName);
      const lastNameError = isValidPersonName(lastName);
      if (firstNameError) errors.fullName = 'Enter a valid full name.';
      if (lastNameError && !firstNameError) errors.fullName = 'Enter a valid full name.';
    }
  } else {
    const firstNameError = isValidPersonName(form.firstName);
    if (firstNameError) errors.firstName = firstNameError === 'This field is required.' ? 'First name is required.' : firstNameError;
    const lastNameError = isValidPersonName(form.lastName);
    if (lastNameError) errors.lastName = lastNameError === 'This field is required.' ? 'Last name is required.' : lastNameError;
  }

  const usernameError = isValidUsername(form.username);
  if (usernameError) errors.username = usernameError;

  const emailError = isValidEmailOptional(form.email);
  if (emailError) errors.email = emailError;

  const phoneError = isValidPhone(form.phone, { required: isCoupleRole(form.role) });
  if (phoneError) errors.phone = phoneError;

  if (!isEdit) {
    const passwordError = isValidPassword(form.password);
    if (passwordError) errors.password = passwordError;
    if (requireConfirmPassword && !form.confirmPassword) {
      errors.confirmPassword = 'Please confirm the password.';
    } else if (requireConfirmPassword && form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  } else if (form.password) {
    const passwordError = isValidPassword(form.password, { required: false });
    if (passwordError) errors.password = passwordError;
  }

  if (!isEdit && !form.role) errors.role = 'Role is required.';
  if (form.accountStatus && !ACCOUNT_STATUSES.includes(form.accountStatus)) {
    errors.accountStatus = 'Invalid status.';
  }
  return errors;
}

function statusLabel(status) {
  if (status === 'inactive') return 'Inactive';
  if (status === 'blocked') return 'Blocked';
  return 'Active';
}

export default function UserAccountFormFields({
  form,
  onChange,
  errors = {},
  roleLocked = false,
  showStatus = false,
  showConfirmPassword = false,
  allowRoleEdit = false,
  statusLocked = false,
  useFullName = false,
  useActiveCheckbox = false,
}) {
  const isEdit = Boolean(form._id);
  const update = (key, value) => {
    const next = { ...form, [key]: value };
    if (key === 'accountStatus') next.isActive = value === 'active';
    if (key === 'isActive') {
      next.accountStatus = value ? 'active' : 'inactive';
      next.isActive = value;
    }
    if (useFullName && key === 'fullName') {
      const { firstName, lastName } = splitFullName(value);
      next.firstName = firstName;
      next.lastName = lastName;
    }
    onChange(next);
  };
  const phoneRequired = isCoupleRole(form.role);

  return (
    <div className="grid gap-4 sm:grid-cols-1">
      {useFullName ? (
        <label className="text-sm font-medium text-stone-700">
          Full Name *
          <input
            data-field="fullName"
            required
            value={form.fullName || ''}
            onChange={(e) => update('fullName', e.target.value)}
            className={fieldClass}
            placeholder="First and last name"
          />
          <FieldError message={errors.fullName} />
        </label>
      ) : (
        <>
          <label className="text-sm font-medium text-stone-700">
            First Name *
            <input data-field="firstName" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={fieldClass} />
            <FieldError message={errors.firstName} />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Last Name *
            <input data-field="lastName" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={fieldClass} />
            <FieldError message={errors.lastName} />
          </label>
        </>
      )}
      <label className="text-sm font-medium text-stone-700">
        Username *
        <input data-field="username" required value={form.username} onChange={(e) => update('username', e.target.value)} className={fieldClass} autoComplete="off" />
        <FieldError message={errors.username} />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Phone {phoneRequired ? '*' : ''}
        <input data-field="phone" required={phoneRequired} type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={fieldClass} />
        <FieldError message={errors.phone} />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Email
        <input data-field="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={fieldClass} />
        <FieldError message={errors.email} />
      </label>
      {!isEdit ? (
        <>
          <PasswordField
            label="Password *"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
          />
          {showConfirmPassword ? (
            <PasswordField
              label="Confirm Password *"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
            />
          ) : null}
        </>
      ) : null}
      <label className="text-sm font-medium text-stone-700">
        Role *
        <select
          disabled={roleLocked || (isEdit && !allowRoleEdit)}
          value={form.role}
          onChange={(e) => update('role', e.target.value)}
          className={`${fieldClass} disabled:bg-stone-50`}
        >
          {USER_ROLES.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
        </select>
        <FieldError message={errors.role} />
      </label>
      {showStatus && isEdit ? (
        <label className="text-sm font-medium text-stone-700">
          Status
          <select
            disabled={statusLocked}
            value={form.accountStatus || 'active'}
            onChange={(e) => update('accountStatus', e.target.value)}
            className={`${fieldClass} disabled:bg-stone-50`}
          >
            {ACCOUNT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <FieldError message={errors.accountStatus} />
        </label>
      ) : null}
      {!isEdit && useActiveCheckbox ? (
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            checked={form.isActive !== false}
            onChange={(e) => update('isActive', e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 accent-brand-600"
          />
          Active User
        </label>
      ) : null}
    </div>
  );
}
