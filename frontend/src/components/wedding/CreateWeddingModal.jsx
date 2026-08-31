import { useEffect, useMemo, useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import FormModal, { fieldClass, FieldError } from '../common/FormModal.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { createWedding } from '../../services/weddingService.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

const emptyForm = {
  partner1Name: '',
  partner2Name: '',
  weddingDate: '',
  city: '',
  expectedGuests: '',
  estimatedBudget: '',
  description: '',
};

function todayInputValue() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function buildWeddingName(groom, bride) {
  const left = String(groom || '').trim();
  const right = String(bride || '').trim();
  if (!left || !right) return '';
  return `${left} & ${right} Wedding`;
}

export default function CreateWeddingModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { refreshWeddings } = useActiveWedding();
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const minimumDate = useMemo(() => todayInputValue(), []);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm);
    setFieldErrors({});
    setError('');
    setSaving(false);
  }, [isOpen]);

  const previewName = buildWeddingName(form.partner1Name, form.partner2Name);
  const dirty = Object.values(form).some((value) => String(value || '').trim() !== '');

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  function validate() {
    const next = {};
    if (!String(form.partner1Name).trim()) next.partner1Name = 'Groom name is required';
    if (!String(form.partner2Name).trim()) next.partner2Name = 'Bride name is required';
    if (!form.weddingDate) next.weddingDate = 'Wedding date is required';
    else if (form.weddingDate < minimumDate) next.weddingDate = 'Wedding date cannot be in the past';
    if (!String(form.city).trim()) next.city = 'City is required';
    const guests = Number(form.expectedGuests);
    if (!Number.isInteger(guests) || guests < 1) next.expectedGuests = 'Expected guests must be a whole number of 1 or more';
    const budget = Number(form.estimatedBudget);
    if (!Number.isFinite(budget) || budget < 0) next.estimatedBudget = 'Estimated budget must be 0 or more';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (saving) return;
    setError('');
    if (!validate()) return;

    const payload = {
      partner1Name: String(form.partner1Name).trim(),
      partner2Name: String(form.partner2Name).trim(),
      weddingDate: form.weddingDate,
      city: String(form.city).trim(),
      expectedGuests: Number(form.expectedGuests),
      estimatedBudget: Number(form.estimatedBudget),
      description: String(form.description || '').trim(),
      weddingName: buildWeddingName(form.partner1Name, form.partner2Name),
    };

    setSaving(true);
    try {
      const data = await createWedding(payload);
      const wedding = data.wedding;
      await refreshWeddings(wedding._id);
      onClose?.();
      await showSuccess(
        'Wedding Created Successfully',
        `${wedding.weddingName} is ready. Generate a partner invite code from your wedding dashboard.`,
      );
      // Profile only — open Wedding Summary next. Booking is a separate step.
      navigate(`/weddings/${wedding._id}`, { state: { justCreated: true } });
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Unable to create wedding');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Wedding"
      subtitle="Start with your wedding profile. Booking comes next."
      size="lg"
      loading={saving}
      dirty={dirty}
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Create Wedding"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          Groom Name *
          <input
            required
            maxLength={80}
            name="partner1Name"
            value={form.partner1Name}
            onChange={update}
            className={fieldClass}
            placeholder="e.g. Muuse"
            autoFocus
          />
          <FieldError message={fieldErrors.partner1Name} />
        </label>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          Bride Name *
          <input
            required
            maxLength={80}
            name="partner2Name"
            value={form.partner2Name}
            onChange={update}
            className={fieldClass}
            placeholder="e.g. Salma"
          />
          <FieldError message={fieldErrors.partner2Name} />
        </label>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          Wedding Date *
          <span className="relative block">
            <input
              required
              type="date"
              min={minimumDate}
              name="weddingDate"
              value={form.weddingDate}
              onChange={update}
              className={`${fieldClass} pr-10`}
            />
            <FiCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
          </span>
          <FieldError message={fieldErrors.weddingDate} />
        </label>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          City *
          <input
            required
            maxLength={80}
            name="city"
            value={form.city}
            onChange={update}
            className={fieldClass}
            placeholder="e.g. Mogadishu"
          />
          <FieldError message={fieldErrors.city} />
        </label>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          Expected Guests *
          <input
            required
            min={1}
            step={1}
            type="number"
            name="expectedGuests"
            value={form.expectedGuests}
            onChange={update}
            className={fieldClass}
            placeholder="250"
          />
          <FieldError message={fieldErrors.expectedGuests} />
        </label>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-200">
          Estimated Budget ($) *
          <input
            required
            min={0}
            step={0.01}
            type="number"
            name="estimatedBudget"
            value={form.estimatedBudget}
            onChange={update}
            className={fieldClass}
            placeholder="2000"
          />
          <FieldError message={fieldErrors.estimatedBudget} />
        </label>
        <label className="sm:col-span-2 text-sm font-medium text-stone-700 dark:text-stone-200">
          Description <span className="font-normal text-stone-400">(optional)</span>
          <textarea
            rows={3}
            maxLength={1000}
            name="description"
            value={form.description}
            onChange={update}
            className={`${fieldClass} resize-none`}
            placeholder="Share a little about your celebration"
          />
        </label>
      </div>

      {previewName ? (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-100">
          Wedding name will be saved as <span className="font-semibold">{previewName}</span>
        </p>
      ) : null}
    </FormModal>
  );
}
