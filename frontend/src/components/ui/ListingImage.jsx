import { useEffect, useState } from 'react';
import { FiImage } from 'react-icons/fi';
import { getListingImageUrl } from '../../utils/media.js';

/**
 * Listing card/detail image — uses vendor-uploaded paths via getListingImageUrl.
 * Shows a neutral placeholder when no image or load fails (no stock photo fallback).
 */
export default function ListingImage({
  listing,
  src,
  alt,
  className = 'h-[200px] w-full object-cover',
  wrapperClassName = '',
  roundedTop = false,
  placeholderLabel = 'No image',
}) {
  const [failed, setFailed] = useState(false);
  const url = src || getListingImageUrl(listing);
  const showPlaceholder = !url || failed;
  const roundedClass = roundedTop ? 'rounded-t-2xl' : '';

  useEffect(() => {
    setFailed(false);
  }, [url, listing?._id]);

  if (showPlaceholder) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400 ${roundedClass} ${wrapperClassName} ${className}`}
      >
        <FiImage className="text-2xl opacity-60" aria-hidden />
        <span className="text-sm">{placeholderLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || listing?.name || ''}
      loading="lazy"
      decoding="async"
      className={`${roundedClass} ${wrapperClassName} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
