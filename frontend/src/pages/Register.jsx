import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { parseApiError } from '../utils/apiError.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import { parseReturnTo } from '../utils/returnTo.js';
import {
  isValidEmailOptional,
  isValidPersonName,
  isValidPassword,
  isValidPhone,
  isValidUsername,
} from '../utils/validation.js';
import { isCoupleRole } from '../utils/roles.js';

import { ROLES } from '../utils/roles.js';

// Xogta form-ka registration-ka ee bilowga
const initialForm = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: ROLES.GROOM,
};

// CSS class-ka guud ee input-yada
const inputClass =
  'mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function Register() {
  // Authentication functions
  const { register, isAuthenticated, user } = useAuth();

  // Navigation
  const navigate = useNavigate();

  // Current location
  const location = useLocation();

  // Registration form state
  const [form, setForm] = useState(initialForm);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Loading state
  const [submitting, setSubmitting] = useState(false);

  // Error message
  const [error, setError] = useState('');

  // Haddii user horey login u yahay, dashboard u dir
  if (isAuthenticated) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    );
  }

  // Cusboonaysii form field-ka la beddelay
  const update = (event) =>
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });

  // Submit registration form
  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    // Hubi dhammaan validation-yada
    const fieldErrors = [
      isValidPersonName(form.firstName),
      isValidPersonName(form.lastName),
      isValidUsername(form.username),
      isValidEmailOptional(form.email),
      isValidPhone(form.phone, {
        required: isCoupleRole(form.role),
      }),
      isValidPassword(form.password),
    ].filter(Boolean);

    // Haddii validation error jiro, kan ugu horreeya muuji
    if (fieldErrors.length) {
      setError(fieldErrors[0]);
      return;
    }

    // Hubi password confirmation
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Register user-ka
      const newUser = await register(form);

      // Hel returnTo URL haddii uu jiro
      const params = new URLSearchParams(location.search);

      const returnTo = parseReturnTo(
        params.get('returnTo') || location.state?.returnTo
      );

      // Couple user haddii uu returnTo leeyahay, halkaas ku celi
      if (returnTo && isCoupleRole(newUser.role)) {
        navigate(returnTo, { replace: true });
      } else {
        // Haddii kale dashboard-kiisa u dir
        navigate(
          getDashboardPath(newUser.role),
          { replace: true }
        );
      }
    } catch (requestError) {
      // API error parse garee
      const parsed = parseApiError(requestError);

      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Begin your journey"
      title="Create your account"
      description="Join the platform that keeps your wedding plans beautifully organized."
    >
      <form
        className="mt-8 space-y-5"
        onSubmit={handleSubmit}
      >
        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* First name iyo last name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">
            First Name *

            <input
              required
              name="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={update}
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-stone-700">
            Last Name *

            <input
              required
              name="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={update}
              className={inputClass}
            />
          </label>
        </div>

        {/* Username */}
        <label className="block text-sm font-medium text-stone-700">
          Username *

          <input
            required
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={update}
            className={inputClass}
            placeholder="yahye2026"
          />
        </label>

        {/* Phone */}
        <label className="block text-sm font-medium text-stone-700">
          Phone {isCoupleRole(form.role) ? '*' : ''}

          <input
            required={isCoupleRole(form.role)}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update}
            className={inputClass}
            placeholder="0618827482"
          />
        </label>

        {/* Email */}
        <label className="block text-sm font-medium text-stone-700">
          Email{' '}
          <span className="font-normal text-stone-400">
            (optional)
          </span>

          <input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update}
            className={inputClass}
          />
        </label>

        {/* Account Type */}
        <label className="block text-sm font-medium text-stone-700">
          Account Type

          <select
            name="role"
            value={form.role}
            onChange={update}
            className={inputClass}
          >
            <option value="groom">Groom</option>
            <option value="bride">Bride</option>
            <option value="wedding_planner">
              Wedding Planner
            </option>
            <option value="vendor">Vendor</option>
          </select>
        </label>

        {/* Password iyo Confirm Password */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">
            Password *

            <span className="relative block">
              <input
                required
                name="password"
                minLength={4}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={update}
                className={`${inputClass} pr-11`}
              />

              {/* Password visibility */}
              <button
                type="button"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                className="absolute right-4 top-5 text-stone-400"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword
                  ? <FiEyeOff />
                  : <FiEye />}
              </button>
            </span>
          </label>

          <label className="text-sm font-medium text-stone-700">
            Confirm Password *

            <input
              required
              name="confirmPassword"
              minLength={4}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update}
              className={inputClass}
            />
          </label>
        </div>

        {/* Register button */}
        <button
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 px-6 py-3.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? 'Creating account…'
            : 'Create Account'}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-7 text-center text-sm text-stone-600">
        Already have an account?{' '}

        <Link
          to="/login"
          className="font-semibold text-brand-700 hover:text-brand-900"
        >
          Login
        </Link>
      </p>

      {/* Join existing wedding */}
      <p className="mt-3 text-center text-sm text-stone-500">
        Partner already created the wedding?{' '}

        <Link
          to="/weddings/join"
          className="font-semibold text-brand-700"
        >
          Join Existing Wedding
        </Link>{' '}
        after you register.
      </p>
    </AuthShell>
  );
}

export default Register;