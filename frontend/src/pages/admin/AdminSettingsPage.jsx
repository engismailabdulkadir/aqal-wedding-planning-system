import { FiSettings } from 'react-icons/fi';

/**
 * Admin business configuration is managed via environment variables on the API.
 * Appearance and About live in the header Settings gear (ThemeSettingsPopover).
 * This route is kept so old bookmarks do not 404.
 */
export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold text-brand-600">Workspace</p>
      <h1 className="font-display text-4xl font-semibold text-stone-900 dark:text-stone-50">Settings</h1>
      <div className="mt-8 rounded-2xl border border-stone-100 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          <FiSettings className="text-xl" />
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Appearance preferences and About information are available from the Settings gear
          in the top header. Payment and server configuration stay on the API environment —
          they are not shown in the admin UI.
        </p>
      </div>
    </div>
  );
}
