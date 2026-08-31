import aqalLogo from '../../assets/images/aqal-logo.jpg';

/** Same AQAL logo asset used in dashboard sidebars (`src/assets/images/aqal-logo.jpg`). */
export const AQAL_LOGO_SRC = aqalLogo;

/**
 * Shared AQAL logo — reuse everywhere instead of duplicating image paths.
 * @param {{ className?: string, imageClassName?: string, alt?: string, plate?: boolean, plateClassName?: string }} props
 */
export default function AqalLogo({
  className = 'h-9 w-9',
  imageClassName = 'h-full w-full object-contain',
  alt = 'AQAL Wedding Planning System',
  plate = false,
  plateClassName = '',
}) {
  if (plate) {
    return (
      <span
        className={`grid place-items-center overflow-hidden bg-white wp-logo-plate p-1.5 shadow-sm ${plateClassName}`}
      >
        <img src={aqalLogo} alt={alt} className={imageClassName} />
      </span>
    );
  }

  return <img src={aqalLogo} alt={alt} className={`object-contain ${className}`} />;
}
