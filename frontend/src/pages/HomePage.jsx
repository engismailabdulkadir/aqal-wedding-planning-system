import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import AqalLogo from '../components/branding/AqalLogo.jsx';
import { EmptyState, LoadingSkeleton, SectionHeader, ServiceCard } from '../components/ui/index.js';
import { getListings } from '../services/planningService.js';
import { getApiError } from '../utils/apiError.js';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80';

const STEPS = [
  { title: 'Create Wedding', text: 'Start a wedding workspace with date, guests, and budget.' },
  { title: 'Find Venue', text: 'Compare Mogadishu halls by location, capacity, and photos.' },
  { title: 'Check Availability', text: 'See morning, evening, and full-day slots on your date.' },
  { title: 'Book', text: 'Reserve a hall when a vendor has published a bookable price.' },
  { title: 'Select Services', text: 'Add dress, photography, catering, and more to the same plan.' },
  { title: 'Pay', text: 'Pay deposits and balances through the wedding workspace.' },
  { title: 'Plan Wedding', text: 'Guests, tasks, timeline, and invitations stay in one place.' },
];

const REASONS = [
  { title: 'Compare Halls', text: 'See real Mogadishu venues side by side, with capacity and location.' },
  { title: 'Check Availability', text: 'Morning, evening, and full-day rules stay independent per hall.' },
  { title: 'Transparent Pricing', text: 'Published prices are shown. If none is verified, we ask you to request a quote.' },
  { title: 'Manage Vendors', text: 'Keep hall, bride, groom, and marketplace services on one wedding.' },
  { title: 'Track Budget', text: 'Every booking is checked against remaining wedding budget.' },
  { title: 'Manage Guests', text: 'Build the list, track RSVPs, and seat guests from the workspace.' },
  { title: 'Digital Invitations', text: 'Send invitations and collect RSVPs without leaving the platform.' },
  { title: 'Planner Coordination', text: 'Assigned planners coordinate tasks, vendors, and the timeline.' },
];

export default function HomePage() {
  const [halls, setHalls] = useState([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [hallsError, setHallsError] = useState('');

  useEffect(() => {
    getListings({ category: 'venue' })
      .then((data) => {
        setHalls(data.listings || []);
        setHallsError('');
      })
      .catch((requestError) => {
        setHalls([]);
        setHallsError(getApiError(requestError));
      })
      .finally(() => setLoadingHalls(false));
  }, []);

  return (
    <div className="overflow-x-hidden bg-white">
      <section className="relative isolate -mt-[72px] min-h-screen">
        <img src={HERO_IMAGE} alt="Wedding celebration" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/75 via-stone-950/45 to-stone-950/20" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-4 py-16 sm:px-6 lg:justify-center lg:px-8">
          <AqalLogo plate plateClassName="h-20 w-20 rounded-[20px] p-2.5 sm:h-24 sm:w-24" />
          <h1 className="mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">Plan your Mogadishu wedding from the first hall to the last guest.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">Compare real wedding halls, check availability, and keep vendors, budget, and guests in one workspace.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/services?category=venue" className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Find a Hall</Link>
            <Link to="/register" className="rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">Start Planning</Link>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-20">
        <div className="section-shell">
          <SectionHeader
            centered
            eyebrow="Marketplace"
            title="Wedding Halls"
            description="Browse available wedding halls from registered vendors."
            action={
              halls.length > 0 ? (
                <Link to="/services?category=venue" className="text-sm font-semibold text-brand-700">
                  View all halls →
                </Link>
              ) : null
            }
          />
          {hallsError ? <p className="mt-6 rounded-xl bg-red-50 p-3 text-red-700">{hallsError}</p> : null}
          {loadingHalls ? (
            <LoadingSkeleton count={3} />
          ) : halls.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {halls.map((listing) => <ServiceCard key={listing._id} listing={listing} />)}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState title="No wedding halls available yet." description="Vendor halls appear here once they are published and active." />
            </div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="section-shell">
          <SectionHeader centered eyebrow="How it works" title="From the first hall to the wedding day" />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-display text-lg text-white">{index + 1}</span>
                <h3 className="mt-4 font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-stone-50 py-20">
        <div className="section-shell">
          <SectionHeader centered eyebrow="Why this platform" title="Built for Mogadishu wedding planning" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((reason) => (
              <article key={reason.title} className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><FiCheck /></span>
                <h3 className="mt-4 font-semibold text-stone-900">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">{reason.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center px-6 py-16 text-center sm:px-12">
          <div className="absolute inset-0 bg-stone-950/55" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">Ready to plan your wedding?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">Create a wedding workspace, find a Mogadishu hall, and keep every vendor in one place.</p>
            <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-semibold text-white hover:bg-brand-700">
              Create Your Wedding <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
