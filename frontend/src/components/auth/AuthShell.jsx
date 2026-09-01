import { Link } from 'react-router-dom';
import AqalLogo from '../branding/AqalLogo.jsx';

// Layout-ka guud ee Login iyo Register pages
function AuthShell({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-72px)] items-center overflow-hidden bg-app-bg px-4 py-12 sm:px-6">

      {/* Background decoration-ka bidix */}
      <div className="absolute -left-28 top-16 -z-10 h-80 w-80 rounded-full bg-brand-100 blur-3xl" />

      {/* Background decoration-ka midig */}
      <div className="absolute -right-28 bottom-10 -z-10 h-96 w-96 rounded-full bg-brand-50 blur-3xl" />

      <div className="mx-auto w-full max-w-lg">

        {/* Logo */}
        <div className="mb-6 text-center">
          <Link
            to="/"
            className="inline-block"
            aria-label="AQAL home"
          >
            <AqalLogo
              plate
              plateClassName="mx-auto h-16 w-16 rounded-[16px] p-2 sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          </Link>
        </div>

        {/* Main authentication card */}
        <div className="rounded-[2rem] border border-app-border bg-white p-6 shadow-soft sm:p-9">

          {/* Qoraalka yar ee kore */}
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            {eyebrow}
          </p>

          {/* Title */}
          <h1 className="mt-3 text-center font-display text-3xl font-semibold text-app-text sm:text-4xl">
            {title}
          </h1>

          {/* Description */}
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-app-muted">
            {description}
          </p>

          {/* Login/Register form-ka */}
          {children}

        </div>
      </div>
    </section>
  );
}

export default AuthShell;