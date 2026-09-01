// Tirakoobka/statistics-ka lagu soo bandhigayo homepage-ka
const stats = [
  {
    value: '500+',
    label: 'Weddings',
  },
  {
    value: '200+',
    label: 'Vendors',
  },
  {
    value: '10K+',
    label: 'Guests Managed',
  },
  {
    value: '98%',
    label: 'Satisfaction',
  },
];

// Stats section
function StatsSection() {
  return (
    <section className="bg-brand-800 py-14 text-white">

      <div className="section-shell grid grid-cols-2 gap-y-10 divide-brand-600 sm:grid-cols-4 sm:divide-x">

        {/* Mid kasta oo statistics ah */}
        {stats.map(({ value, label }) => (
          <div
            key={label}
            className="text-center"
          >

            {/* Number/value */}
            <p className="font-display text-4xl font-semibold sm:text-5xl">
              {value}
            </p>

            {/* Label */}
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-brand-200 sm:text-sm">
              {label}
            </p>

          </div>
        ))}

      </div>
    </section>
  );
}

export default StatsSection;