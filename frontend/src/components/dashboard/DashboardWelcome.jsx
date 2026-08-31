import { FiArrowRight, FiLogOut, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

function DashboardWelcome({ title, description }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true, state: { fromLogout: true } });
  }
  return (
    <section className="min-h-[calc(100vh-72px)] bg-stone-50 py-12 sm:py-16"><div className="section-shell"><div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white shadow-soft sm:p-12"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-200">Wedding Planning System</p><h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">{title}</h1><p className="mt-4 max-w-xl leading-7 text-brand-100">{description}</p></div><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]"><div className="rounded-2xl border bg-white p-7 shadow-sm"><p className="text-sm text-stone-500">Signed in as</p><h2 className="mt-2 text-2xl font-semibold text-stone-900">{user.firstName} {user.lastName}</h2><span className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">{user.role}</span><div className="mt-8 rounded-xl bg-stone-50 p-5 text-sm leading-6 text-stone-600">Your personalized planning tools will appear here in the next phase. Your account and secure session are ready.</div></div><aside className="rounded-2xl border bg-white p-7 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><FiUser /></div><h2 className="mt-4 font-semibold text-stone-900">Account</h2><p className="mt-1 break-all text-sm text-stone-500">{user.email}</p><button onClick={handleLogout} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"><FiLogOut /> Logout <FiArrowRight className="ml-auto" /></button></aside></div></div></section>
  );
}

export default DashboardWelcome;
