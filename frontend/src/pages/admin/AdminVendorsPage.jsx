/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { ActionMenu, FormModal, fieldClass, FieldError } from '../../components/common/index.js';
import UserAccountFormFields, { emptyUserForm, validateUserForm } from '../../components/admin/UserAccountForm.jsx';
import { createAdminUser, getAdminVendors, updateAdminUser, updateAdminVendor } from '../../services/roleService.js';
import { confirmAction, confirmBlock, confirmUnblock, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

function statusColor(status) {
  if (status === 'approved') return 'text-emerald-700 bg-emerald-50';
  if (status === 'rejected') return 'text-red-700 bg-red-50';
  if (status === 'suspended') return 'text-amber-700 bg-amber-50';
  return 'text-stone-600 bg-stone-100';
}

const STATUS_COPY = {
  approved: {
    title: (name) => `Approve ${name}?`,
    text: "The vendor's active services will become available to customers.",
    confirm: 'Approve Vendor',
    success: 'Vendor approved successfully.',
  },
  rejected: {
    title: (name) => `Reject ${name}?`,
    text: 'The vendor will not appear as approved in the marketplace.',
    confirm: 'Reject Vendor',
    success: 'Vendor rejected.',
    danger: true,
  },
  suspended: {
    title: (name) => `Suspend ${name}?`,
    text: 'Active listings will be hidden until the vendor is reactivated.',
    confirm: 'Suspend Vendor',
    success: 'Vendor suspended successfully.',
    danger: true,
  },
  pending: {
    title: (name) => `Move ${name} back to pending?`,
    text: 'The vendor will need review before appearing as approved.',
    confirm: 'Set Pending',
    success: 'Vendor set to pending.',
  },
};

const emptyVendorEdit = {
  businessName: '',
  ownerName: '',
  category: 'other',
  city: '',
  phone: '',
  email: '',
  description: '',
};

export default function AdminVendorsPage() {
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => getAdminVendors(statusFilter ? { status: statusFilter } : {})
    .then(setData)
    .catch((e) => setError(getApiError(e)));

  useEffect(() => { load(); }, [statusFilter]);

  async function changeStatus(vendor, verificationStatus) {
    if (verificationStatus === vendor.verificationStatus) return;
    const copy = STATUS_COPY[verificationStatus] || STATUS_COPY.pending;
    const name = vendor.businessName || 'this vendor';
    const confirmed = await confirmAction({
      title: copy.title(name),
      text: copy.text,
      confirmButtonText: copy.confirm,
      danger: Boolean(copy.danger),
    });
    if (!confirmed) return;
    try {
      await updateAdminVendor(vendor._id, { verificationStatus });
      await showSuccess(copy.success);
      load();
    } catch (err) {
      await showApiError(err, 'Unable to update vendor status');
    }
  }

  async function reactivate(vendor) {
    const confirmed = await confirmAction({
      title: `Reactivate ${vendor.businessName}?`,
      text: 'Approved listings can become available to customers again.',
      confirmButtonText: 'Reactivate',
    });
    if (!confirmed) return;
    try {
      await updateAdminVendor(vendor._id, { verificationStatus: 'approved', active: true });
      await showSuccess('Vendor reactivated successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  async function toggleUser(vendor) {
    const user = vendor.user;
    if (!user?._id) return;
    const confirmed = user.isActive
      ? await confirmBlock(`Block ${vendor.businessName}?`, 'The vendor will no longer be able to access the system.')
      : await confirmUnblock(`Unblock ${vendor.businessName}?`);
    if (!confirmed) return;
    try {
      await updateAdminUser(user._id, { isActive: !user.isActive });
      await showSuccess(user.isActive ? 'User blocked successfully.' : 'User activated successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  async function submitAccount() {
    const nextErrors = validateUserForm(accountForm, { isEdit: false });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setFormError('');
    try {
      await createAdminUser({ ...accountForm, role: 'vendor' });
      await showSuccess('Vendor created', 'The vendor account was created successfully.');
      setAccountForm(null);
      setDirty(false);
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitEdit() {
    const nextErrors = {};
    if (!editForm.businessName?.trim()) nextErrors.businessName = 'Business name is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setFormError('');
    try {
      await updateAdminVendor(editForm._id, {
        businessName: editForm.businessName,
        ownerName: editForm.ownerName,
        category: editForm.category,
        city: editForm.city,
        phone: editForm.phone,
        email: editForm.email,
        description: editForm.description,
      });
      await showSuccess('Vendor updated', 'Vendor details were updated successfully.');
      setEditForm(null);
      setDirty(false);
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">Vendor Management</p>
          <h1 className="font-display text-4xl font-semibold">Vendors</h1>
          <p className="mt-2 text-stone-500">Review vendor businesses and verification status.</p>
        </div>
        <button type="button" onClick={() => { setAccountForm({ ...emptyUserForm, role: 'vendor' }); setErrors({}); setFormError(''); setDirty(false); }} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiPlus /> Add Vendor
        </button>
      </div>

      <div className="mt-7 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border px-4 py-3 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{['Business', 'Owner', 'Category', 'City', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.vendors?.map((vendor) => (
              <tr key={vendor._id}>
                <td className="px-5 py-4 font-semibold">{vendor.businessName}</td>
                <td className="px-5 py-4">{vendor.ownerName || vendor.user?.firstName} {vendor.user?.lastName}</td>
                <td className="px-5 py-4 capitalize">{vendor.category}</td>
                <td className="px-5 py-4">{vendor.city}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColor(vendor.verificationStatus)}`}>
                    {vendor.verificationStatus}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    items={[
                      { label: 'Edit', onClick: () => { setEditForm({ ...emptyVendorEdit, ...vendor }); setErrors({}); setFormError(''); setDirty(false); } },
                      vendor.verificationStatus !== 'approved' ? { label: 'Approve', onClick: () => changeStatus(vendor, 'approved') } : null,
                      vendor.verificationStatus !== 'rejected' ? { label: 'Reject', tone: 'danger', onClick: () => changeStatus(vendor, 'rejected') } : null,
                      vendor.verificationStatus !== 'suspended' ? { label: 'Suspend', tone: 'warning', onClick: () => changeStatus(vendor, 'suspended') } : { label: 'Reactivate', onClick: () => reactivate(vendor) },
                      { label: vendor.user?.isActive === false ? 'Unblock Account' : 'Block Account', tone: 'warning', onClick: () => toggleUser(vendor) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal
        isOpen={Boolean(accountForm)}
        onClose={() => { setAccountForm(null); setDirty(false); }}
        title="Add Vendor"
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submitAccount}
        submitLabel="Save Vendor"
      >
        {accountForm ? (
          <UserAccountFormFields
            form={accountForm}
            onChange={(next) => { setAccountForm(next); setDirty(true); }}
            errors={errors}
            roleLocked
          />
        ) : null}
      </FormModal>

      <FormModal
        isOpen={Boolean(editForm)}
        onClose={() => { setEditForm(null); setDirty(false); }}
        title="Edit Vendor"
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submitEdit}
        submitLabel="Save Vendor"
      >
        {editForm ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
              Business Name
              <input value={editForm.businessName} onChange={(e) => { setEditForm({ ...editForm, businessName: e.target.value }); setDirty(true); }} className={fieldClass} />
              <FieldError message={errors.businessName} />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Owner Name
              <input value={editForm.ownerName || ''} onChange={(e) => { setEditForm({ ...editForm, ownerName: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Category
              <input value={editForm.category || ''} onChange={(e) => { setEditForm({ ...editForm, category: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-stone-700">
              City
              <input value={editForm.city || ''} onChange={(e) => { setEditForm({ ...editForm, city: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Phone
              <input value={editForm.phone || ''} onChange={(e) => { setEditForm({ ...editForm, phone: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
              Email
              <input type="email" value={editForm.email || ''} onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
              Description
              <textarea rows={3} value={editForm.description || ''} onChange={(e) => { setEditForm({ ...editForm, description: e.target.value }); setDirty(true); }} className={fieldClass} />
            </label>
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}
