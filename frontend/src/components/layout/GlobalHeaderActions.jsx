import { Link } from 'react-router-dom';
import { FiShoppingCart } from 'react-icons/fi';
import { useWeddingCart } from '../../context/CartContext.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import ThemeSettingsPopover from '../settings/ThemeSettingsPopover.jsx';
import UserProfileMenu from '../account/UserProfileMenu.jsx';
import FullscreenToggle from './FullscreenToggle.jsx';

/**
 * Shared top-right header controls for all authenticated roles.
 * Order: Fullscreen → Settings → Notifications → Profile
 */
export default function GlobalHeaderActions({ className = '' }) {
  const { count } = useWeddingCart();
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${className}`}>
      <Link to="/wedding-cart" className="relative rounded-xl border border-app-border p-2.5 text-app-muted hover:text-brand-700" title="Wedding Cart">
        <FiShoppingCart />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        ) : null}
      </Link>
      <FullscreenToggle />
      <ThemeSettingsPopover />
      <NotificationBell />
      <UserProfileMenu />
    </div>
  );
}
