import {
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi';
import SectionHeading from './common/SectionHeading.jsx';

// Features-ka ugu muhiimsan ee Wedding Platform-ka
const features = [
  {
    icon: FiBookOpen,
    title: 'Wedding Planning',
    text: 'Organize your timeline, ideas, and important details in one calm workspace.',
  },
  {
    icon: FiShoppingBag,
    title: 'Vendor Marketplace',
    text: 'Discover trusted professionals who match your style, needs, and location.',
  },
  {
    icon: FiCreditCard,
    title: 'Budget Management',
    text: 'Plan spending, track payments, and stay confident about every decision.',
  },
  {
    icon: FiUsers,
    title: 'Guest Management',
    text: 'Manage invitations, RSVPs, preferences, and your final guest list with ease.',
  },
  {
    icon: FiCalendar,
    title: 'Booking System',
    text: 'Keep vendor bookings, dates, and key commitments clear and organized.',
  },
  {
    icon: FiCheckSquare,
    title: 'Task Management',
    text: 'Turn your plan into simple, achievable tasks and never miss a milestone.',
  },
];

// Section-ka features
function FeaturesSection() {
  return (
    <section
      id="services"
      className="py-20 sm:py-24"
    >
      <div className="section-shell">

        {/* Section heading */}
        <SectionHeading
          centered
          eyebrow="Everything you need"
          title="Plan beautifully, from yes to I do"
          description="Six thoughtfully designed tools bring every moving part of your celebration together."
        />

        {/* Features cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {features.map(
            ({
              icon: Icon,
              title,
              text,
            }) => (
              <article
                key={title}
                className="group rounded-2xl border border-stone-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-brand-100 hover:shadow-soft"
              >

                {/* Feature icon */}
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-xl text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon />
                </div>

                {/* Feature title */}
                <h3 className="mt-5 text-lg font-semibold text-stone-900">
                  {title}
                </h3>

                {/* Feature description */}
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {text}
                </p>

              </article>
            )
          )}

        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;