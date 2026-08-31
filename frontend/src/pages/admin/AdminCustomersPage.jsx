/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { ActionMenu, FormModal } from '../../components/common/index.js';
import UserAccountFormFields, { emptyUserForm, userToForm, validateUserForm } from '../../components/admin/UserAccountForm.jsx';
import { createAdminUser, deleteAdminUser, getAdminCustomers, updateAdminUser } from '../../services/roleService.js';
import { confirmAction, confirmBlock, confirmDelete, confirmUnblock, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => getAdminCustomers({ search }).then(setData).catch((e) => setError(getApiError(e)));

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setForm({ ...emptyUserForm, role: 'customer' });
    setErrors({});
    setFormError('');
    setDirty(false);
  }

  function openEdit(customer) {
    setForm(userToForm({ ...customer, role: 'customer' }));
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
        await showSuccess('Customer updated', 'Customer details were updated successfully.');
      } else {
        await createAdminUser({ ...form, role: 'customer' });
        await showSuccess('Customer created', 'The customer was created successfully.');
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

  async function blockCustomer(customer) {
    const confirmed = customer.isActive
      ? await confirmBlock(`Block ${customer.firstName} ${customer.lastName}?`, 'The customer will no longer be able to access the system.')
      : await confirmUnblock(`Unblock ${customer.firstName} ${customer.lastName}?`);
    if (!confirmed) return;
    try {
      await updateAdminUser(customer._id, { isActive: !customer.isActive });
      await showSuccess(customer.isActive ? 'User blocked successfully.' : 'User activated successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to update customer status');
    }
  }

  async function removeCustomer(customer) {
    if (customer.weddingCount > 0) {
      const confirmed = await confirmAction({
        title: 'This customer already has wedding history.',
        text: 'The account cannot be permanently deleted. You can block it instead.',
        confirmButtonText: 'Block Customer',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await updateAdminUser(customer._id, { isActive: false });
        await showSuccess('User blocked successfully.');
        load();
      } catch (err) {
        await showApiError(err);
      }
      return;
    }
    const confirmed = await confirmDelete(`Delete ${customer.firstName} ${customer.lastName}?`);
    if (!confirmed) return;
    try {
      await deleteAdminUser(customer._id);
      await showSuccess('Record deleted successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to delete customer');
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">Customer Management</p>
          <h1 className="font-display text-4xl font-semibold">Customers</h1>
          <p className="mt-2 text-stone-500">View customer accounts, profiles, and wedding activity.</p>
        </div>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiPlus /> Add Customer
        </button>
      </div>

      <div className="mt-7 rounded-2xl bg-white p-4 shadow-sm">
        <label className="relative block">
          <FiSearch className="absolute left-3 top-3.5 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers" className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm" />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{['Name', 'Email', 'Weddings', 'Status', 'Joined', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.customers?.map((customer) => (
              <tr key={customer._id}>
                <td className="px-5 py-4 font-semibold">{customer.firstName} {customer.lastName}</td>
                <td className="px-5 py-4">{customer.email}</td>
                <td className="px-5 py-4">{customer.weddingCount}</td>
                <td className="px-5 py-4">
                  <span className={customer.isActive ? 'text-emerald-700' : 'text-red-600'}>{customer.isActive ? 'Active' : 'Blocked'}</span>
                </td>
                <td className="px-5 py-4">{new Date(customer.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    items={[
                      { label: 'View', onClick: () => navigate(`/admin/customers/${customer._id}`) },
                      { label: 'Edit', onClick: () => openEdit(customer) },
                      { label: customer.isActive ? 'Block' : 'Unblock', tone: 'warning', onClick: () => blockCustomer(customer) },
                      { label: 'Delete', tone: 'danger', onClick: () => removeCustomer(customer) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.customers?.length && !error ? <p className="p-8 text-center text-stone-400">No customers found.</p> : null}
      </div>

      <FormModal
        isOpen={Boolean(form)}
        onClose={() => { setForm(null); setDirty(false); }}
        title={form?._id ? 'Edit Customer' : 'Add Customer'}
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submit}
        submitLabel={form?._id ? 'Save Customer' : 'Save Customer'}
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
