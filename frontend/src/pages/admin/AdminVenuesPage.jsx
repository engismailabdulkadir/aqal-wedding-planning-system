/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { FormModal, fieldClass, FieldError } from '../../components/common/index.js';
import { PageHeader, SearchBar, StatusBadge, Table, VenueImage } from '../../components/ui/index.js';
import { createAdminVenue, getAdminVenues } from '../../services/roleService.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { venueCover } from '../../utils/media.js';

const emptyVenue = { name: '', city: 'Mogadishu', district: '', location: '', description: '' };

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => getAdminVenues({ search })
    .then((data) => setVenues(data.venues || []))
    .catch((requestError) => setError(getApiError(requestError)));

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search]);

  async function submit() {
    const nextErrors = {};
    if (!form.name?.trim()) nextErrors.name = 'Venue name is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setFormError('');
    try {
      await createAdminVenue(form);
      await showSuccess('Venue created', 'The venue was created successfully.');
      setForm(null);
      setDirty(false);
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Catalogue"
        title="Venues"
        description="Review imported Mogadishu halls, verify listings, feature homepage venues, and link a vendor when one claims the hall."
        action={(
          <button type="button" onClick={() => { setForm({ ...emptyVenue }); setErrors({}); setFormError(''); setDirty(false); }} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
            <FiPlus /> Add Venue
          </button>
        )}
      />
      <div className="mt-7 max-w-md"><SearchBar value={search} onChange={setSearch} placeholder="Search venue or district" /></div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <div className="mt-6">
        <Table headers={['Venue', 'Location', 'Capacity', 'Price', 'Status', '']}>
          {venues.map((venue) => (
            <tr key={venue._id}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-20 overflow-hidden rounded-xl">
                    <VenueImage src={venueCover(venue)} alt="" entity={venue} className="h-14 w-20 object-cover" width={200} />
                  </div>
                  <div>
                    <p className="font-semibold">{venue.name}</p>
                    <p className="text-xs text-stone-400">{venue.ownershipStatus}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-stone-500">{venue.district || venue.city}</td>
              <td className="px-5 py-4">{venue.capacityLabel}</td>
              <td className="px-5 py-4">{venue.priceLabel}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge value={venue.status} />
                  {venue.verified ? <StatusBadge tone="success">Verified</StatusBadge> : <StatusBadge tone="warning">Unverified</StatusBadge>}
                  {venue.featured ? <StatusBadge tone="info">Featured</StatusBadge> : null}
                </div>
              </td>
              <td className="px-5 py-4"><Link to={`/admin/venues/${venue._id}`} className="font-semibold text-brand-700">Manage</Link></td>
            </tr>
          ))}
        </Table>
      </div>

      <FormModal
        isOpen={Boolean(form)}
        onClose={() => { setForm(null); setDirty(false); }}
        title="Add Venue"
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submit}
        submitLabel="Save Venue"
      >
        {form ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Venue name
              <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setDirty(true); }} className={fieldClass} />
              <FieldError message={errors.name} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-stone-700">
                City
                <input value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); setDirty(true); }} className={fieldClass} />
              </label>
              <label className="text-sm font-medium text-stone-700">
                District
                <input value={form.district} onChange={(e) => { setForm({ ...form, district: e.target.value }); setDirty(true); }} className={fieldClass} />
              </label>
            </div>
            <label className="block text-sm font-medium text-stone-700">
              Location
              <input value={form.location} onChange={(e) => { setForm({ ...form, location: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Description
              <textarea rows={3} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
          </>
        ) : null}
      </FormModal>
    </div>
  );
}
