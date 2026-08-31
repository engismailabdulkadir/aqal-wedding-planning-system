/**
 * Map listing image upload HTTP errors to user-facing messages.
 */
export function listingUploadErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data || {};
  const message = String(data.message || error?.message || '');

  if (import.meta.env.DEV) {
    console.error('[listing-upload]', {
      status,
      url: error?.config?.url,
      message: data.message,
      body: data,
    });
  }

  if (status === 401) {
    return 'Your session has expired. Please login again.';
  }
  if (status === 403) {
    return 'Only Vendor accounts can upload listing images.';
  }
  if (status === 413) {
    return 'Each image must be smaller than 5 MB.';
  }
  if (status === 404 || message.includes('Route not found')) {
    return 'Upload service is unavailable. Restart the backend: open a terminal, run cd backend then npm run dev, then try again.';
  }
  if (status >= 500) {
    return message || 'Image storage failed.';
  }
  if (message.includes('JPG') || message.includes('WebP')) {
    return 'Only JPG, PNG and WebP images are allowed.';
  }
  if (message.includes('5 MB')) {
    return 'Each image must be smaller than 5 MB.';
  }
  if (message) {
    return message;
  }
  return 'Could not upload image. Please try again.';
}
