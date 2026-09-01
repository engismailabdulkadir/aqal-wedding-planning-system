import { FiArrowRight } from 'react-icons/fi';
import SectionHeading from './common/SectionHeading.jsx';

// Tallaabooyinka user-ku raacayo
const steps = [
  'Create your wedding',
  'Set your budget',
  'Find vendors',
  'Manage your wedding',
];

// Section-ka How It Works
function HowItWorksSection() {
  return (
    <section
      id="about"
      className="bg-stone-50 py-20 sm:py-24"
    >
      <div className="section-shell">

        {/* Section heading */}
        <SectionHeading
          centered
          eyebrow="How it works"
          title="A simpler path to your perfect day"
          description="Start with your vision, then move confidently through every planning stage."
        />

        {/* Steps */}
        <div className="mt-14 grid gap-5 md:grid-cols-4">

          {steps.map((step, index) => (
            <div
              key={step}
              className="relative rounded-2xl bg-white p-6 text-center shadow-sm"
            >

              {/* Step number */}
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-600 font-display text-xl text-white">
                {index + 1}
              </span>

              {/* Step text */}
              <p className="mt-5 font-semibold text-stone-900">
                {step}
              </p>

              {/* Arrow u dhexeeya steps-ka */}
              {index < steps.length - 1 && (
                <FiArrowRight
                  className="absolute -right-4 top-10 z-10 hidden text-brand-300 md:block"
                />
              )}

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;