export default function SectionHeader({ eyebrow, title, description, action, centered = false }) {
  return (
    <div className={`flex flex-col gap-4 ${centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
      <div className={centered ? 'max-w-2xl' : ''}>
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p> : null}
        <h2 className="font-display text-3xl font-semibold text-app-text sm:text-4xl">{title}</h2>
        {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-app-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
