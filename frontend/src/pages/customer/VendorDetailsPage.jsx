import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCheckCircle, FiMapPin, FiMessageCircle } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BookingForm from '../../components/forms/BookingForm.jsx';
import { ErrorState, LoadingState } from '../../components/customer/PageState.jsx';
import { createConversation, getVendor } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

export default function VendorDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVendor(id)
      .then((data) => setVendor(data.vendor))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const message = async () => {
    try {
      const data = await createConversation({ vendorProfile: id });
      navigate('/messages', { state: { conversationId: data.conversation._id } });
    } catch (err) {
      setNotice(getApiError(err));
    }
  };

  if (loading) return <LoadingState />;
  if (error && !vendor) return <ErrorState message={error} />;

  const v = vendor;

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/vendors" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
        <FiArrowLeft /> Back to vendors
      </Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <main className="rounded-2xl bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">
              {v.category}
            </span>
            {v.verified && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <FiCheckCircle /> Verified
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold">{v.businessName}</h1>
          <p className="mt-2 flex items-center gap-2 text-stone-500">
            <FiMapPin />
            {v.city}{v.address ? ` • ${v.address}` : ''}
          </p>
          <p className="mt-6 whitespace-pre-line leading-7 text-stone-600">
            {v.description || 'No description provided.'}
          </p>
          <h2 className="mt-8 text-lg font-semibold">Services</h2>
          <div className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-100">
            {v.services.length ? (
              v.services.map((service) => (
                <div key={service._id} className="flex justify-between gap-5 p-4">
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{service.description}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-brand-700">{formatBudget(service.price)}</p>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-stone-500">
                Contact this vendor for available services.
              </p>
            )}
          </div>
          <div className="mt-7 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
            <p><strong>Phone:</strong> {v.phone || 'Not provided'}</p>
            <p className="mt-2"><strong>Email:</strong> {v.email || 'Not provided'}</p>
          </div>
        </main>
        <aside className="rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <BookingForm
            vendorProfileId={id}
            services={v.services}
            startingPrice={v.startingPrice}
          />
          <button
            type="button"
            onClick={message}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 py-3 text-sm font-semibold text-brand-700"
          >
            <FiMessageCircle /> Message Vendor
          </button>
          {notice ? <p className="mt-3 text-sm text-red-600">{notice}</p> : null}
        </aside>
      </div>
    </div>
  );
}
