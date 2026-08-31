export default function LoadingSkeleton({ count = 6, className = 'h-64' }) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`animate-pulse rounded-2xl border border-stone-100 bg-white shadow-sm ${className}`}>
          <div className="h-40 rounded-t-2xl bg-stone-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 rounded bg-stone-100" />
            <div className="h-3 w-1/2 rounded bg-stone-100" />
            <div className="h-3 w-1/3 rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton({ count = 4 }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-24 rounded bg-stone-100" />
          <div className="mt-4 h-7 w-32 rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}
