import { FiInstagram, FiMail, FiMapPin } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AqalLogo from '../branding/AqalLogo.jsx';

function Footer() {
  return (
    <footer id="contact" className="bg-stone-950 text-stone-300">
      <div className="section-shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="inline-block" aria-label="AQAL home">
            <AqalLogo plate plateClassName="h-11 w-11 rounded-[12px]" />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-stone-400">A wedding planning platform for Mogadishu — halls, vendors, guests, and payments in one workspace.</p>
          <a href="#contact" aria-label="Instagram" className="mt-5 inline-grid h-9 w-9 place-items-center rounded-full border border-stone-700 hover:border-brand-400 hover:text-brand-300"><FiInstagram /></a>
        </div>
        <div>
          <h3 className="font-semibold text-white">Quick Links</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link className="hover:text-brand-300" to="/">Home</Link></li>
            <li><Link className="hover:text-brand-300" to="/venues">Venues</Link></li>
            <li><Link className="hover:text-brand-300" to="/halls">Halls</Link></li>
            <li><Link className="hover:text-brand-300" to="/services">Services</Link></li>
            <li><Link className="hover:text-brand-300" to="/about">About</Link></li>
            <li><Link className="hover:text-brand-300" to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">Plan</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link className="hover:text-brand-300" to="/register">Create Wedding</Link></li>
            <li><Link className="hover:text-brand-300" to="/venues">Find a Hall</Link></li>
            <li><Link className="hover:text-brand-300" to="/services">Wedding Services</Link></li>
            <li><Link className="hover:text-brand-300" to="/login">Login</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">Contact</h3>
          <ul className="mt-5 space-y-3 text-sm text-stone-400">
            <li className="flex gap-3"><FiMail className="mt-0.5 text-brand-400" /> hello@weddingplanner.so</li>
            <li className="flex gap-3"><FiMapPin className="mt-0.5 text-brand-400" /> Mogadishu, Somalia</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800">
        <div className="section-shell flex flex-col gap-2 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AQAL Wedding Planning System. All rights reserved.</p>
          <p>Made for weddings in Mogadishu.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
