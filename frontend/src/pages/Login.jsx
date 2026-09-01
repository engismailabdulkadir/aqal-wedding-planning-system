import { useEffect, useId, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getApiError } from '../utils/apiError.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import { parseReturnTo } from '../utils/returnTo.js';
import { isCoupleRole } from '../utils/roles.js';

// Form-ka login-ka marka hore waa empty
const EMPTY_FORM = Object.freeze({
  username: '',
  password: '',
});

function Login() {
  // Ka soo qaado authentication functions iyo user-ka
  const { login, isAuthenticated, user } = useAuth();

  // Navigation-ka React Router
  const navigate = useNavigate();

  // Hel current URL/location
  const location = useLocation();

  // ID gaar ah oo form-ka loo sameeyo
  const formId = useId();

  // Login form state
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
  }));

  // Ma password-ka la arki karaa?
  const [showPassword, setShowPassword] = useState(false);

  // Remember me checkbox
  const [remember, setRemember] = useState(false);

  // Ma login request ayaa socda?
  const [submitting, setSubmitting] = useState(false);

  // Error message
  const [error, setError] = useState('');

  // Xakamee browser autofill
  const [autofillLocked, setAutofillLocked] = useState(true);

  // Key-ga form-ka si form cusub loo abuuro marka reset la sameeyo
  const [formKey, setFormKey] = useState(0);

  // Dib u celi login form-ka xaaladdiisa bilowga ah
  function resetLoginForm() {
    setForm({ ...EMPTY_FORM });
    setShowPassword(false);
    setRemember(false);
    setError('');
    setAutofillLocked(true);

    // Beddel key-ga si React u sameeyo form cusub
    setFormKey((value) => value + 1);
  }

  // Marka Login page la furto, form-ka mar walba empty ka dhig
  useEffect(() => {
    resetLoginForm();
  }, []);

  // Haddii user-ku logout ka yimid, form-ka dib u nadiifi
  useEffect(() => {
    if (!location.state?.fromLogout) return;

    resetLoginForm();

    // Ka saar state-ka fromLogout URL navigation-ka
    navigate('/login', {
      replace: true,
      state: {},
    });
  }, [location.state?.fromLogout, navigate]);

  // Haddii user horey u login yahay, dashboard-kiisa u dir
  if (isAuthenticated) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    );
  }

  // Marka login form la submit-gareeyo
  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSubmitting(true);

    // Samee credentials-ka loo dirayo backend
    const credentials = {
      username: form.username.trim(),
      password: form.password,
    };

    try {
      // Login samee
      const loggedInUser = await login(credentials);

      // Form-ka nadiifi marka login successful noqdo
      resetLoginForm();

      // Hel returnTo haddii user uu page gaar ah ka yimid
      const params = new URLSearchParams(location.search);

      const returnTo = parseReturnTo(
        params.get('returnTo') || location.state?.returnTo
      );

      // Couple user haddii uu leeyahay returnTo, halkaas ku celi
      if (returnTo && isCoupleRole(loggedInUser.role)) {
        navigate(returnTo, { replace: true });
      } else {
        // Haddii kale dashboard-kiisa u dir
        navigate(
          getDashboardPath(loggedInUser.role),
          { replace: true }
        );
      }
    } catch (requestError) {
      // Password-ka kaliya nadiifi haddii login uu fashilmo
      setForm((prev) => ({
        ...prev,
        password: '',
      }));

      // Error-ka API-ga soo bandhig
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your account"
      description="Continue planning every beautiful detail of your celebration."
    >
      <form
        key={formKey}
        id={formId}
        className="mt-8 space-y-5"
        onSubmit={handleSubmit}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
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

        {/* Username field */}
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Username
          </span>

          <span className="relative mt-2 block">
            <FiUser className="absolute left-4 top-3.5 text-stone-400" />

            <input
              required
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              readOnly={autofillLocked}
              value={form.username}
              onFocus={() => setAutofillLocked(false)}
              onChange={(event) =>
                setForm({
                  ...form,
                  username: event.target.value,
                })
              }
              className="w-full rounded-xl border bg-white py-3 pl-11 pr-4 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="yahye"
            />
          </span>
        </label>

        {/* Password field */}
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Password
          </span>

          <span className="relative mt-2 block">
            <FiLock className="absolute left-4 top-3.5 text-stone-400" />

            <input
              required
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              readOnly={autofillLocked}
              value={form.password}
              onFocus={() => setAutofillLocked(false)}
              onChange={(event) =>
                setForm({
                  ...form,
                  password: event.target.value,
                })
              }
              className="w-full rounded-xl border bg-white py-3 pl-11 pr-12 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="Enter your password"
            />

            {/* Password muuqaalka beddel */}
            <button
              type="button"
              onClick={() =>
                setShowPassword((value) => !value)
              }
              className="absolute right-4 top-3.5 text-stone-400 hover:text-brand-600"
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </span>
        </label>

        {/* Remember me iyo forgot password */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex items-center gap-2 text-stone-600">
            {/* Remember me password ma kaydiyo */}
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) =>
                setRemember(event.target.checked)
              }
              className="h-4 w-4 rounded accent-brand-600"
            />

            Remember me
          </label>

          <a
            href="#forgot-password"
            className="font-medium text-brand-700 hover:text-brand-900"
          >
            Forgot password?
          </a>
        </div>

        {/* Login button */}
        <button
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 px-6 py-3.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? 'Logging in…'
            : 'Login'}
        </button>
      </form>

      {/* Link-ka register */}
      <p className="mt-7 text-center text-sm text-stone-600">
        Don&apos;t have an account?{' '}

        <Link
          to="/register"
          className="font-semibold text-brand-700 hover:text-brand-900"
        >
          Create account
        </Link>
      </p>
    </AuthShell>
  );
}

export default Login;