export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-brand-600">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-3xl font-semibold text-app-text sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-app-muted sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
