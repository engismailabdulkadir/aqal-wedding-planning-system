export default function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <table className="w-full text-left text-sm text-app-text">
        <thead className="bg-app-surface-2">
          <tr>{headers.map((header) => <th key={header} className="px-5 py-4 font-semibold text-app-muted">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-app-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text disabled:opacity-40">Previous</button>
      <span className="text-sm text-app-muted">{page} / {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text disabled:opacity-40">Next</button>
    </div>
  );
}
