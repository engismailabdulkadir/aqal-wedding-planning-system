function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl lg:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg">{description}</p>}
    </div>
  );
}

export default SectionHeading;
