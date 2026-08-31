import { Link } from 'react-router-dom';
import { FiShoppingCart } from 'react-icons/fi';
import MarketplaceListingsPanel from '../../components/customer/MarketplaceListingsPanel.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';

export default function MarketplacePage() {
  const { activeWeddingId, activeWedding } = useActiveWedding();

  return (    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600">Wedding Marketplace</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900">Plan Your Wedding</h1>
          <p className="mt-2 text-stone-500">
            Browse active vendor listings from the database. No sample cards — only real services vendors publish.
          </p>
        </div>
        <Link to="/wedding-cart" className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiShoppingCart /> Wedding Cart
        </Link>
      </div>

      <MarketplaceListingsPanel
        className="mt-8"
        inWorkspace
        weddingId={activeWeddingId}
        weddingDate={activeWedding?.weddingDate}
      />
    </div>
  );
}