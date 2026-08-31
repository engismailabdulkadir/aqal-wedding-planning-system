import { useState } from 'react';
import { FiDownload, FiUpload, FiX } from 'react-icons/fi';
import { downloadGuestTemplate, importGuests, previewGuestImport } from '../../services/guestService.js';
import { getApiError } from '../../utils/apiError.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';

export default function GuestImportPanel({ weddingId, onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownloadTemplate() {
    try {
      const blob = await downloadGuestTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'guest_template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      await showApiError(requestError, 'Could not download template');
    }
  }

  async function handlePreview(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setLoading(true);
    try {
      const data = await previewGuestImport(selectedFile, weddingId);
      setPreview(data.preview);
      setOpen(true);
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Could not parse Excel file');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview?.valid?.length) return;
    setLoading(true);
    setError('');
    try {
      const guests = preview.valid.map((item) => item.guest);
      await importGuests(guests, weddingId);
      await showSuccess('Guests Imported', `${guests.length} guest(s) added to your wedding list.`);
      setOpen(false);
      setPreview(null);
      setFile(null);
      onImported?.();
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-600"
      >
        <FiDownload /> Download Template
      </button>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-600">
        <FiUpload /> {loading ? 'Processing…' : 'Import Excel'}
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => handlePreview(event.target.files?.[0])}
        />
      </label>

      {open && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Import Guests from Excel</h3>
                <p className="mt-1 text-sm text-stone-500">{file?.name}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-stone-400"><FiX /></button>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-700">Valid</p>
                <p className="text-2xl font-bold">{preview.validCount}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-700">Duplicates</p>
                <p className="text-2xl font-bold">{preview.duplicateCount}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
                <p className="font-semibold text-red-700">Errors</p>
                <p className="text-2xl font-bold">{preview.errorCount}</p>
              </div>
            </div>

            {preview.previewRows?.length ? (
              <ul className="mt-4 space-y-2 text-sm text-stone-600">
                {preview.previewRows.slice(0, 5).map((guest, index) => (
                  <li key={index}>{guest.firstName} {guest.lastName} · {guest.phone || 'no phone'}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-stone-200 px-5 py-2 text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || !preview.validCount}
                onClick={handleImport}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Import {preview.validCount} Guests
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
