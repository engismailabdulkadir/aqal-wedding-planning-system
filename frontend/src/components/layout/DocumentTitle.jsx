import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BRAND_TITLE = 'AQAL Wedding Planning System';

/**
 * Locks the browser tab title to the AQAL brand.
 * UI page headings remain separate and are not used for document.title.
 */
export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = BRAND_TITLE;
  }, [pathname]);

  return null;
}
