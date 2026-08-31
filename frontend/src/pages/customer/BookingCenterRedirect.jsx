import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useCreateWedding } from '../../hooks/useCreateWedding.js';
import { LoadingState } from '../../components/customer/PageState.jsx';

/** Resolves /bookings/center to the active wedding Booking Center. */
export default function BookingCenterRedirect() {
  const navigate = useNavigate();
  const { activeWeddingId, weddings, loading } = useActiveWedding();
  const { openCreateWedding } = useCreateWedding();

  useEffect(() => {
    if (loading) return;
    if (activeWeddingId) {
      navigate(`/weddings/${activeWeddingId}/bookings`, { replace: true });
      return;
    }
    if (weddings[0]?._id) {
      navigate(`/weddings/${weddings[0]._id}/bookings`, { replace: true });
    }
  }, [activeWeddingId, weddings, loading, navigate]);

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">Booking Center</h1>
      <p className="mt-3 text-sm text-stone-600">Create a wedding profile first, then start booking venues and services.</p>
      <button type="button" onClick={openCreateWedding} className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">
        Create New Wedding
      </button>
      <Link to="/weddings" className="mt-4 block text-sm font-semibold text-brand-700">My Weddings</Link>
    </div>
  );
}
