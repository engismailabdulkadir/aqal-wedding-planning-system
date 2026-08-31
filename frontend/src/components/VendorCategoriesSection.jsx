import { FiCamera, FiCoffee, FiMapPin, FiScissors, FiTruck } from 'react-icons/fi';
import { GiFlowerPot } from 'react-icons/gi';
import SectionHeading from './common/SectionHeading.jsx';

const categories = [
  { icon: FiMapPin, name: 'Venues', tone: 'bg-rose-50 text-rose-700' },
  { icon: FiCamera, name: 'Photography', tone: 'bg-amber-50 text-amber-700' },
  { icon: FiCoffee, name: 'Catering', tone: 'bg-emerald-50 text-emerald-700' },
  { icon: GiFlowerPot, name: 'Decoration', tone: 'bg-violet-50 text-violet-700' },
  { icon: FiScissors, name: 'Makeup', tone: 'bg-pink-50 text-pink-700' },
  { icon: FiTruck, name: 'Transportation', tone: 'bg-sky-50 text-sky-700' },
];

function VendorCategoriesSection() {
  return (
    <section id="vendors" className="py-20 sm:py-24"><div className="section-shell"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><SectionHeading eyebrow="Vendor marketplace" title="Find the right team for your day" description="Explore the services that turn a beautiful idea into an unforgettable celebration." /><a href="#vendors" className="text-sm font-semibold text-brand-700 hover:text-brand-900">View all categories →</a></div><div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">{categories.map(({ icon: Icon, name, tone }) => <article key={name} className="group rounded-2xl border border-stone-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-soft"><div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${tone}`}><Icon /></div><h3 className="mt-4 text-sm font-semibold text-stone-900">{name}</h3><p className="mt-1 text-xs text-stone-500">Explore vendors</p></article>)}</div></div></section>
  );
}

export default VendorCategoriesSection;
