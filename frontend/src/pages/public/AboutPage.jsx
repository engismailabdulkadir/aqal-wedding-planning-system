import { Link } from 'react-router-dom';
import AqalLogo from '../../components/branding/AqalLogo.jsx';

export default function AboutPage() {
  return (
    <div>
      <section className="relative isolate min-h-[70vh] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80" alt="Wedding ceremony aisle" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-stone-950/45" />
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">About</p>
          <AqalLogo plate plateClassName="mt-4 h-20 w-20 rounded-[20px] p-2.5 sm:h-24 sm:w-24" />
          <p className="mt-6 max-w-xl text-lg text-white/85">A connected workspace for couples, planners, and vendors — from the first hall reservation to the last payment.</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="font-display text-3xl font-semibold">How the platform works</h2>
        <p className="mt-4 leading-7 text-stone-600">Couples create a wedding, compare Mogadishu halls, reserve a specific hall and time slot, then build bride, groom, and marketplace services. Assigned planners coordinate tasks and timelines. Vendors manage only their own listings, availability, orders, and payments.</p>
        <Link to="/register" className="mt-8 inline-block rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Start planning</Link>
      </section>
    </div>
  );
}
