import { useCallback, useRef, useState } from 'react';
import { FiImage, FiUpload, FiX } from 'react-icons/fi';
import { resolveMediaUrl } from '../../utils/media.js';
import { listingUploadErrorMessage } from '../../utils/uploadErrors.js';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

function extractUploadedPaths(result) {
  if (Array.isArray(result?.paths) && result.paths.length) return result.paths;
  if (Array.isArray(result?.images)) {
    return result.images
      .map((item) => (typeof item === 'string' ? item : item?.path || item?.url))
      .filter(Boolean);
  }
  return [];
}

function validateFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Only JPG, PNG and WebP images are allowed.';
  }
  if (file.size > MAX_BYTES) {
    return 'Each image must be smaller than 5 MB.';
  }
  return '';
}

/**
 * Drag & drop listing image upload with preview (max 5 images).
 */
export default function ListingImageUpload({
  images = [],
  onChange,
  onUpload,
  disabled = false,
  error: externalError = '',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const atLimit = images.length >= MAX_IMAGES;

  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setError('');

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const batch = files.slice(0, remaining);
    for (const file of batch) {
      const validation = validateFile(file);
      if (validation) {
        setError(validation);
        return;
      }
    }

    setUploading(true);
    try {
      const result = await onUpload(batch);
      const paths = extractUploadedPaths(result);
      if (!paths.length) {
        setError('Could not upload image. Please try again.');
        return;
      }
      onChange([...images, ...paths].slice(0, MAX_IMAGES));
    } catch (uploadError) {
      setError(listingUploadErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }, [images, onChange, onUpload]);

  function onInputChange(event) {
    processFiles(event.target.files);
    event.target.value = '';
  }

  function onDragOver(event) {
    event.preventDefault();
    if (!disabled && !atLimit) setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (disabled || atLimit) return;
    processFiles(event.dataTransfer.files);
  }

  function removeAt(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  const displayError = externalError || error;

  return (
    <div className="space-y-3">
      {images.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((src, index) => (
            <li key={`${src}-${index}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <img
                src={resolveMediaUrl(src)}
                alt=""
                className="h-32 w-full rounded-lg object-cover"
              />
              <p className="mt-2 truncate text-xs text-stone-500">{src.split('/').pop()}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => inputRef.current?.click()}
                  className="text-xs font-semibold text-brand-700"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => removeAt(index)}
                  className="text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!atLimit ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragging ? 'border-brand-400 bg-brand-50' : 'border-stone-200 bg-stone-50'
          } ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-brand-300'}`}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
            {uploading ? <FiUpload className="animate-pulse" /> : <FiImage />}
          </div>
          <p className="mt-3 text-sm font-semibold text-stone-800">
            {uploading ? 'Uploading…' : 'Drag & Drop or Choose Image'}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            JPG, PNG, WebP · max 5 MB · up to {MAX_IMAGES} images
          </p>
          {images.length === 0 ? (
            <p className="mt-2 text-xs text-stone-400">No image selected</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-stone-500">Maximum {MAX_IMAGES} images reached.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={disabled || uploading || atLimit}
        onChange={onInputChange}
      />

      {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}
    </div>
  );
}
