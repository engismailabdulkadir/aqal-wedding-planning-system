import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function CustomerPlaceholder({ title, description }) {
  return <div className="mx-auto max-w-[1500px]"><p className="text-sm font-medium text-brand-600">Customer Dashboard</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">{title}</h1><p className="mt-2 text-stone-500">{description}</p><div className="mt-8 rounded-[2rem] border border-dashed border-brand-200 bg-white p-10 text-center shadow-sm sm:p-16"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-2xl text-brand-600"><FiClock /></span><h2 className="mt-5 font-display text-2xl font-semibold text-stone-900">Coming in the next phase</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-500">This area is ready in your dashboard. Its planning tools and data will be added in a future phase.</p><Link to="/dashboard" className="mt-7 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Back to Dashboard</Link></div></div>;
}
export default CustomerPlaceholder;
