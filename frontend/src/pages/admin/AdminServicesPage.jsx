import { useEffect, useState } from 'react';
import { ActionMenu } from '../../components/common/index.js';
import { getAdminListings, updateAdminListing } from '../../services/roleService.js';
import { confirmAction, confirmArchive, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

export default function AdminServicesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => getAdminListings().then(setData).catch((e) => setError(getApiError(e)));
  useEffect(() => { load(); }, []);

  async function archive(listing) {
    const confirmed = await confirmArchive(
      `Archive ${listing.name}?`,
      'This service already may have historical bookings. It cannot be permanently deleted. You can archive it instead.',
      'Archive Service',
    );
    if (!confirmed) return;
    try {
      await updateAdminListing(listing._id, { active: false, available: false });
      await showSuccess('Service archived successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  async function restore(listing) {
    const confirmed = await confirmAction({
      title: `Reactivate ${listing.name}?`,
      text: 'The service can appear in the marketplace again if the vendor is approved.',
      confirmButtonText: 'Reactivate',
    });
    if (!confirmed) return;
    try {
      await updateAdminListing(listing._id, { active: true, available: true });
      await showSuccess('Service reactivated successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-600">Service Marketplace</p>
      <h1 className="font-display text-4xl font-semibold">Wedding Services</h1>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{['Name', 'Category', 'Vendor', 'Price', 'Active', 'Available', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.listings?.map((listing) => (
              <tr key={listing._id}>
                <td className="px-5 py-4 font-semibold">{listing.name}</td>
                <td className="px-5 py-4 capitalize">{listing.category}</td>
                <td className="px-5 py-4">{listing.vendorProfile?.businessName || listing.vendor?.firstName}</td>
                <td className="px-5 py-4">${listing.price}</td>
                <td className="px-5 py-4">{listing.active ? 'Yes' : 'No'}</td>
                <td className="px-5 py-4">{listing.available ? 'Yes' : 'No'}</td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    items={[
                      listing.active
                        ? { label: 'Archive', tone: 'warning', onClick: () => archive(listing) }
                        : { label: 'Reactivate', onClick: () => restore(listing) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.listings?.length && !error ? <p className="p-8 text-center text-stone-400">No services listed yet.</p> : null}
      </div>
    </div>
  );
}
