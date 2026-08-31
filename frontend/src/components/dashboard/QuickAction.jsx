import { FiArrowUpRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function QuickAction({ icon: Icon, label, to }) {
  return <Link to={to} className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon /></span><span className="text-sm font-semibold text-stone-700">{label}</span><FiArrowUpRight className="ml-auto text-stone-300 group-hover:text-brand-600" /></Link>;
}
export default QuickAction;
