/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { ActionMenu, FormModal } from '../../components/common/index.js';
import UserAccountFormFields, { emptyUserForm, userToForm, validateUserForm } from '../../components/admin/UserAccountForm.jsx';
import { createAdminUser, deleteAdminUser, getAdminPlanners, updateAdminUser } from '../../services/roleService.js';
import { confirmAction, confirmDelete, confirmUnblock, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

export default function AdminPlannersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => getAdminPlanners({ search }).then(setData).catch((e) => setError(getApiError(e)));

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setForm({ ...emptyUserForm, role: 'planner' });
    setErrors({});
    setFormError('');
    setDirty(false);
  }

  async function submit() {
    const nextErrors = validateUserForm(form, { isEdit: Boolean(form._id) });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setFormError('');
    try {
      if (form._id) {
        await updateAdminUser(form._id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          isActive: form.isActive,
        });
        await showSuccess('Planner updated', 'Planner details were updated successfully.');
      } else {
        await createAdminUser({ ...form, role: 'planner' });
        await showSuccess('Planner created', 'The planner was created successfully.');
      }
      setForm(null);
      setDirty(false);
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(planner) {
    const confirmed = planner.isActive
      ? await confirmAction({
        title: `Deactivate ${planner.firstName} ${planner.lastName}?`,
        text: 'The planner will no longer be able to access assigned weddings.',
        confirmButtonText: 'Deactivate Planner',
        danger: true,
      })
      : await confirmUnblock(`Reactivate ${planner.firstName} ${planner.lastName}?`, 'The planner will regain access to assigned weddings.');
    if (!confirmed) return;
    try {
      await updateAdminUser(planner._id, { isActive: !planner.isActive });
      await showSuccess(planner.isActive ? 'Planner deactivated successfully.' : 'Planner activated successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  async function removePlanner(planner) {
    if (planner.assignedWeddings > 0) {
      const confirmed = await confirmAction({
        title: 'This planner already has assigned weddings.',
        text: 'The account cannot be permanently deleted. You can deactivate it instead.',
        confirmButtonText: 'Deactivate Planner',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await updateAdminUser(planner._id, { isActive: false });
        await showSuccess('Planner deactivated successfully.');
        load();
      } catch (err) {
        await showApiError(err);
      }
      return;
    }
    const confirmed = await confirmDelete(`Delete ${planner.firstName} ${planner.lastName}?`);
    if (!confirmed) return;
    try {
      await deleteAdminUser(planner._id);
      await showSuccess('Record deleted successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">Planner Management</p>
          <h1 className="font-display text-4xl font-semibold">Wedding Planners</h1>
          <p className="mt-2 text-stone-500">Manage planners, assignments, and performance.</p>
        </div>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiPlus /> Add Planner
        </button>
      </div>

      <div className="mt-7 rounded-2xl bg-white p-4 shadow-sm">
        <label className="relative block">
          <FiSearch className="absolute left-3 top-3.5 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search planners" className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm" />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{['Name', 'Email', 'Assigned Weddings', 'Available', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.planners?.map((planner) => (
              <tr key={planner._id}>
                <td className="px-5 py-4 font-semibold">{planner.firstName} {planner.lastName}</td>
                <td className="px-5 py-4">{planner.email}</td>
                <td className="px-5 py-4">{planner.assignedWeddings}</td>
                <td className="px-5 py-4">{planner.profile?.isAvailable ? 'Yes' : 'No'}</td>
                <td className="px-5 py-4">
                  <span className={planner.isActive ? 'text-emerald-700' : 'text-red-600'}>{planner.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    items={[
                      { label: 'View', onClick: () => navigate(`/admin/planners/${planner._id}`) },
                      { label: 'Edit', onClick: () => { setForm(userToForm({ ...planner, role: 'planner' })); setErrors({}); setFormError(''); setDirty(false); } },
                      { label: planner.isActive ? 'Deactivate' : 'Reactivate', tone: 'warning', onClick: () => toggleActive(planner) },
                      { label: 'Delete', tone: 'danger', onClick: () => removePlanner(planner) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal
        isOpen={Boolean(form)}
        onClose={() => { setForm(null); setDirty(false); }}
        title={form?._id ? 'Edit Planner' : 'Add Planner'}
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submit}
        submitLabel={form?._id ? 'Save Planner' : 'Save Planner'}
      >
        {form ? (
          <UserAccountFormFields
            form={form}
            onChange={(next) => { setForm(next); setDirty(true); }}
            errors={errors}
            roleLocked
            showStatus
          />
        ) : null}
      </FormModal>
    </div>
  );
}
