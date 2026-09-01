import {
  FiArrowRight,
  FiHeart,
} from 'react-icons/fi';

// CTA section-ka ugu dambeeya ee homepage-ka
function CallToActionSection() {
  return (
    <section
      id="get-started"
      className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >

      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-50 via-[#fffaf3] to-brand-100 px-6 py-16 text-center sm:px-12">

        {/* Decorative heart bidix */}
        <FiHeart className="absolute -left-8 -top-8 text-[10rem] text-white/60" />

        {/* Decorative heart midig */}
        <FiHeart className="absolute -bottom-10 -right-6 text-[9rem] text-white/60" />

        <div className="relative">

          {/* Small eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
            Your celebration starts here
          </p>

          {/* Main heading */}
          <h2 className="mt-4 font-display text-4xl font-semibold text-stone-900 sm:text-5xl">
            Ready to Plan Your Wedding?
          </h2>

          {/* Description */}
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-stone-600">
            Bring your plans, people, and possibilities together in one beautifully simple place.
          </p>

          {/* Get started button */}
          <a
            href="#home"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-200 transition hover:bg-brand-700"
          >
            Get Started Today
            <FiArrowRight />
          </a>

        </div>
      </div>
    </section>
  );
}

export default CallToActionSection;