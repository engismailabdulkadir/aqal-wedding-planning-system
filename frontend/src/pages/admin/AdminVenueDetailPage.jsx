/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormModal, fieldClass as modalField, FieldError } from '../../components/common/index.js';
import { DataCard, PageHeader, StatusBadge, fieldClass } from '../../components/ui/index.js';
import { createAdminHall, getAdminVendors, linkAdminVenueVendor, updateAdminHall, updateAdminVenue, getAdminVenue } from '../../services/roleService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

const AMENITIES = ['Parking', 'Air Conditioning', 'Stage', 'Sound System', 'Security', 'Catering'];

export default function AdminVenueDetailPage() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [halls, setHalls] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hallForm, setHallForm] = useState(null);
  const [hallErrors, setHallErrors] = useState({});
  const [hallLoading, setHallLoading] = useState(false);

  async function load() {
    const data = await getAdminVenue(id);
    setVenue(data.venue);
    setHalls(data.halls || []);
    setVendorId(data.venue.vendor?._id || data.venue.vendor || '');
  }

  useEffect(() => {
    load().catch((requestError) => setError(getApiError(requestError)));
    getAdminVendors().then((data) => setVendors(data.vendors || data || [])).catch(() => setVendors([]));
  }, [id]);

  function updateField(key, value) {
    setVenue((current) => ({ ...current, [key]: value }));
  }

  async function saveVenue(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateAdminVenue(id, {
        name: venue.name,
        description: venue.description,
        city: venue.city,
        district: venue.district,
        address: venue.address,
        location: venue.location,
        phone: venue.phone,
        email: venue.email,
        coverImage: venue.coverImage,
        galleryImages: Array.isArray(venue.galleryImages) ? venue.galleryImages : String(venue.galleryImages || '').split('\n').filter(Boolean),
        amenities: venue.amenities,
        parking: venue.parking,
        airConditioning: venue.airConditioning,
        stage: venue.stage,
        soundSystem: venue.soundSystem,
        security: venue.security,
        catering: venue.catering,
        capacityMin: venue.capacityMin || null,
        capacityMax: venue.capacityMax || null,
        priceStatus: 'quote_required',
        priceFrom: null,
        pricePerPerson: null,
        morningPrice: null,
        eveningPrice: null,
        fullDayPrice: null,
        deposit: null,
        featured: venue.featured,
        featuredOrder: venue.featuredOrder,
        verified: venue.verified,
        status: venue.status,
        imageIsPlaceholder: venue.imageIsPlaceholder,
        imageSource: venue.imageSource,
      });
      await showSuccess('Venue saved', 'Venue details were saved successfully.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function saveHall(hall) {
    setBusy(true);
    try {
      await updateAdminHall(hall._id, {
        hallName: hall.hallName,
        capacity: hall.capacity,
        description: hall.description,
        status: hall.status,
        priceStatus: hall.priceStatus,
      });
      await showSuccess('Hall updated', 'Hall details were saved successfully.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function addHall() {
    const nextErrors = {};
    if (!hallForm?.hallName?.trim()) nextErrors.hallName = 'Hall name is required.';
    if (!hallForm?.capacity || Number(hallForm.capacity) <= 0) nextErrors.capacity = 'Capacity must be greater than zero.';
    setHallErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setHallLoading(true);
    try {
      await createAdminHall(id, {
        hallName: hallForm.hallName,
        capacity: Number(hallForm.capacity),
        description: hallForm.description,
      });
      await showSuccess('Hall created', 'The hall was added successfully.');
      setHallForm(null);
      await load();
    } catch (requestError) {
      await showApiError(requestError);
    } finally {
      setHallLoading(false);
    }
  }

  async function linkVendor() {
    const confirmed = await confirmAction({
      title: vendorId ? 'Link this vendor to the venue?' : 'Unlink the current vendor?',
      text: vendorId ? 'The vendor will own this venue and its halls.' : 'The venue will become unclaimed. History is kept.',
      confirmButtonText: vendorId ? 'Save owner' : 'Unlink vendor',
      danger: !vendorId,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const data = await linkAdminVenueVendor(id, vendorId || null);
      await showSuccess(data.message || 'Vendor updated.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError);
    } finally {
      setBusy(false);
    }
  }

  if (!venue) return <p className="p-8 text-stone-400">{error || 'Loading venue…'}</p>;

  const vendorOptions = Array.isArray(vendors) ? vendors : [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/venues" className="text-sm font-semibold text-brand-700">← Venues</Link>
      <PageHeader title={venue.name} description="Verify, feature, manage images, and link a vendor. Hall pricing is set per booking quote — not on the venue master record." />
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <form onSubmit={saveVenue} className="mt-8 space-y-6">
        <DataCard title="Listing">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Name<input className={`mt-1 ${fieldClass}`} value={venue.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label>
            <label className="text-sm">District<input className={`mt-1 ${fieldClass}`} value={venue.district || ''} onChange={(event) => updateField('district', event.target.value)} /></label>
            <label className="text-sm sm:col-span-2">Location<input className={`mt-1 ${fieldClass}`} value={venue.location || ''} onChange={(event) => updateField('location', event.target.value)} /></label>
            <label className="text-sm sm:col-span-2">Description<textarea rows="4" className={`mt-1 ${fieldClass}`} value={venue.description || ''} onChange={(event) => updateField('description', event.target.value)} /></label>
            <label className="text-sm">Cover image URL<input className={`mt-1 ${fieldClass}`} value={venue.coverImage || ''} onChange={(event) => updateField('coverImage', event.target.value)} /></label>
            <label className="text-sm">Image source
              <select className={`mt-1 ${fieldClass}`} value={venue.imageSource || 'placeholder'} onChange={(event) => updateField('imageSource', event.target.value)}>
                <option value="placeholder">Placeholder</option>
                <option value="official">Official</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={Boolean(venue.imageIsPlaceholder)} onChange={(event) => updateField('imageIsPlaceholder', event.target.checked)} />
              Show “Generic venue photograph” label
            </label>
          </div>
        </DataCard>

        <DataCard title="Capacity and listing">
          <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            Hall booking uses a professional quote workflow. Total price and deposit are set when a customer requests a quote — not when creating the venue or hall.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Capacity min<input type="number" className={`mt-1 ${fieldClass}`} value={venue.capacityMin || ''} onChange={(event) => updateField('capacityMin', event.target.value)} /></label>
            <label className="text-sm">Capacity max<input type="number" className={`mt-1 ${fieldClass}`} value={venue.capacityMax || ''} onChange={(event) => updateField('capacityMax', event.target.value)} /></label>
            <label className="text-sm">Status
              <select className={`mt-1 ${fieldClass}`} value={venue.status || 'active'} onChange={(event) => updateField('status', event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="text-sm">Featured order<input type="number" className={`mt-1 ${fieldClass}`} value={venue.featuredOrder || 0} onChange={(event) => updateField('featuredOrder', Number(event.target.value))} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(venue.verified)} onChange={(event) => updateField('verified', event.target.checked)} /> Verified</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(venue.featured)} onChange={(event) => updateField('featured', event.target.checked)} /> Feature on homepage</label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {AMENITIES.map((item) => {
              const key = item === 'Air Conditioning' ? 'airConditioning' : item === 'Sound System' ? 'soundSystem' : item.toLowerCase();
              return (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(venue[key])} onChange={(event) => updateField(key, event.target.checked)} />
                  {item}
                </label>
              );
            })}
          </div>
          <button disabled={busy} className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Save venue</button>
        </DataCard>
      </form>

      <DataCard title="Vendor ownership" className="mt-6">
        <p className="text-sm text-stone-500">Imported venues stay unclaimed until Admin links a registered vendor.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select className={fieldClass} value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
            <option value="">Unclaimed</option>
            {vendorOptions.map((vendor) => {
              const optionId = vendor.user?._id || vendor._id;
              const name = vendor.businessName || `${vendor.user?.firstName || ''} ${vendor.user?.lastName || ''}`.trim();
              return <option key={optionId} value={optionId}>{name}</option>;
            })}
          </select>
          <button type="button" disabled={busy} onClick={linkVendor} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Save owner</button>
        </div>
        <div className="mt-3"><StatusBadge value={venue.ownershipStatus} /></div>
      </DataCard>

      <DataCard title="Halls" className="mt-6">
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => { setHallForm({ hallName: '', capacity: '', description: '' }); setHallErrors({}); }} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add Hall</button>
        </div>
        <div className="space-y-4">
          {halls.map((hall, index) => (
            <div key={hall._id} className="grid gap-3 rounded-xl border border-stone-100 p-4 sm:grid-cols-2">
              <label className="text-sm">Hall name<input className={`mt-1 ${fieldClass}`} value={hall.hallName} onChange={(event) => setHalls((current) => current.map((item, i) => i === index ? { ...item, hallName: event.target.value } : item))} /></label>
              <label className="text-sm">Capacity<input type="number" className={`mt-1 ${fieldClass}`} value={hall.capacity} onChange={(event) => setHalls((current) => current.map((item, i) => i === index ? { ...item, capacity: Number(event.target.value) } : item))} /></label>
              <label className="text-sm sm:col-span-2">Description<textarea className={`mt-1 ${fieldClass}`} value={hall.description || ''} onChange={(event) => setHalls((current) => current.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} /></label>
              <button type="button" onClick={() => saveHall(halls[index])} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">Save hall</button>
            </div>
          ))}
          {!halls.length ? <p className="text-sm text-stone-400">No bookable halls yet — capacity was unpublished, so none were invented.</p> : null}
        </div>
      </DataCard>

      <FormModal
        isOpen={Boolean(hallForm)}
        onClose={() => setHallForm(null)}
        title="Add Hall"
        loading={hallLoading}
        onSubmit={addHall}
        submitLabel="Save Hall"
      >
        {hallForm ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Hall name
              <input value={hallForm.hallName} onChange={(e) => setHallForm({ ...hallForm, hallName: e.target.value })} className={modalField} />
              <FieldError message={hallErrors.hallName} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Capacity
              <input type="number" min="1" value={hallForm.capacity} onChange={(e) => setHallForm({ ...hallForm, capacity: e.target.value })} className={modalField} />
              <FieldError message={hallErrors.capacity} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Description
              <textarea rows={3} value={hallForm.description} onChange={(e) => setHallForm({ ...hallForm, description: e.target.value })} className={modalField} />
            </label>
          </>
        ) : null}
      </FormModal>
    </div>
  );
}
