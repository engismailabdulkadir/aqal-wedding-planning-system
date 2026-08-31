export { PageHeader } from '../ui/index.js';
export { default as LoadingState } from '../ui/LoadingSkeleton.jsx';
import { EmptyState } from '../ui/index.js';

export function ErrorState({ message, retry }) {
  return (
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-sm">{message}</p>
      {retry ? <button type="button" onClick={retry} className="mt-4 rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white">Try again</button> : null}
    </div>
  );
}

export function NoWedding() {
  return (
    <EmptyState
      title="You haven't created a wedding yet."
      description="This workspace connects everything to your wedding."
      action="Create Wedding"
      to="/weddings/new"
    />
  );
}
