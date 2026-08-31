import { FiArrowRight, FiCalendar, FiCheck, FiHeart, FiUsers } from 'react-icons/fi';

function HeroSection() {
  return (
    <section id="home" className="relative isolate overflow-hidden bg-[#fffaf3]">
      <div className="absolute -left-32 top-20 -z-10 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="absolute -right-24 bottom-0 -z-10 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="section-shell grid min-h-[calc(100vh-72px)] gap-14 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700"><FiHeart /> Your dream day, thoughtfully planned</div>
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.06] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">Plan Your Perfect <span className="text-brand-600">Wedding</span> in One Place</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">Manage your wedding, budget, vendors, guests, bookings, and tasks from one smart platform.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#get-started" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-200 transition hover:bg-brand-700">Start Planning <FiArrowRight /></a><a href="#vendors" className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-3.5 font-semibold text-stone-700 transition hover:border-brand-300 hover:text-brand-700">Explore Vendors</a></div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">{['Simple to use', 'All-in-one planning', 'Trusted vendors'].map((item) => <span key={item} className="flex items-center gap-2"><FiCheck className="text-brand-600" />{item}</span>)}</div>
        </div>
        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
          <div className="absolute -inset-5 rotate-3 rounded-[2.5rem] bg-brand-100/80" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-soft sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Our wedding</p><h2 className="mt-1 font-display text-2xl text-stone-900">Amara &amp; Noah</h2></div><div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-xl text-brand-600"><FiHeart /></div></div>
            <div className="mt-7 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white"><div className="flex items-center gap-3 text-brand-100"><FiCalendar /><span className="text-sm">Saturday, 18 October</span></div><p className="mt-5 font-display text-4xl">128 days</p><p className="text-sm text-brand-100">until we say “I do”</p></div>
            <div className="mt-5 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-stone-50 p-4"><FiUsers className="text-brand-600" /><p className="mt-3 text-2xl font-semibold text-stone-900">86</p><p className="text-xs text-stone-500">Guests confirmed</p></div><div className="rounded-2xl bg-stone-50 p-4"><FiCheck className="text-brand-600" /><p className="mt-3 text-2xl font-semibold text-stone-900">18/24</p><p className="text-xs text-stone-500">Tasks completed</p></div></div>
            <div className="mt-5"><div className="flex justify-between text-xs font-medium text-stone-600"><span>Planning progress</span><span>75%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100"><div className="h-full w-3/4 rounded-full bg-brand-500" /></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
