import { GENERIC_VENUE_IMAGE, isPlaceholderImage, thumbnailUrl } from '../../utils/media.js';

export default function VenueImage({
  src,
  alt,
  placeholder = false,
  entity,
  className = 'h-52 w-full object-cover',
  width = 800,
}) {
  const showPlaceholder = placeholder || isPlaceholderImage(entity);
  const image = thumbnailUrl(src || GENERIC_VENUE_IMAGE, width);
  return (
    <div className="relative overflow-hidden bg-stone-100">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
        onError={(event) => {
          event.currentTarget.src = GENERIC_VENUE_IMAGE;
        }}
      />
      {showPlaceholder ? (
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
          Generic venue photograph
        </span>
      ) : null}
    </div>
  );
}
