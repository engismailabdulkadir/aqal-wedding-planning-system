import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateWedding } from '../../hooks/useCreateWedding.js';

/**
 * Legacy /weddings/new route: open the Create Wedding modal.
 * After create: Wedding Summary → customer chooses Start Booking separately.
 */
export default function CreateWeddingPage() {
  const navigate = useNavigate();
  const { openCreateWedding } = useCreateWedding();

  useEffect(() => {
    openCreateWedding();
    navigate('/weddings', { replace: true });
  }, [navigate, openCreateWedding]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm text-stone-500">Opening Create Wedding…</p>
    </div>
  );
}
