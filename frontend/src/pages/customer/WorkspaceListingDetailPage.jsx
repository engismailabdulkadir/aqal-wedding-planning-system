import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import ServiceDetailsPage from './ServiceDetailsPage.jsx';

/** Authenticated listing detail + booking inside the couple dashboard (not public catalog). */
export default function WorkspaceListingDetailPage() {
  const { weddingId } = useParams();
  const { selectWedding } = useActiveWedding();

  useEffect(() => {
    if (weddingId) selectWedding(weddingId);
  }, [weddingId, selectWedding]);

  return <ServiceDetailsPage layout="workspace" weddingId={weddingId} />;
}
