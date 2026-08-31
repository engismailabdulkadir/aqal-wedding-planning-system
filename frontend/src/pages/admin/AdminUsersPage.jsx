/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { ActionMenu, FormModal } from '../../components/common/index.js';
import UserAccountFormFields, { emptyUserForm, userToForm, validateUserForm } from '../../components/admin/UserAccountForm.jsx';
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from '../../services/roleService.js';
import { confirmBlock, confirmDelete, confirmUnblock, showApiError, showError, showSuccess } from '../../utils/alerts.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';

const roles = ['admin', 'customer', 'planner', 'vendor'];

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(new URLSearchParams(window.location.search).get('role') || '');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const load = () => getAdminUsers({ search, role }).then(setData).catch((e) => setError(getApiError(e)));

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search, role]);

  function openCreate() {
    setForm({ ...emptyUserForm });
    setErrors({});
    setFormError('');
    setDirty(false);
  }

  function openEdit(user) {
    setForm(userToForm(user));
    setErrors({});
    setFormError('');
    setDirty(false);
  }

  function changeForm(next) {
    setForm(next);
    setDirty(true);
    setErrors((current) => {
      if (!Object.keys(current).length) return current;
      const cleared = { ...current };
      for (const key of Object.keys(cleared)) {
        if (next[key] !== form?.[key]) delete cleared[key];
      }
      return cleared;
    });
    setFormError('');
  }

  async function submit() {
    const nextErrors = validateUserForm(form, { isEdit: Boolean(form._id) });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setFormError('');
    try {
      const emailPayload = form.email?.trim() ? form.email.trim() : '';
      if (form._id) {
        const payload = {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: emailPayload,
          phone: form.phone,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await updateAdminUser(form._id, payload);
        await showSuccess('User updated', 'The user was updated successfully.');
      } else {
        await createAdminUser({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: emailPayload || undefined,
          phone: form.phone,
          password: form.password,
          role: form.role,
        });
        await showSuccess('User Created', 'The user was created successfully.');
      }
      setForm(null);
      setDirty(false);
      load();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.field) {
        setErrors((current) => ({ ...current, [parsed.field]: parsed.message }));
        const summary = form?._id
          ? 'Unable to update user. Please correct the highlighted field.'
          : 'Unable to create user. Please correct the highlighted field.';
        setFormError(summary);
        await showError(summary, parsed.message);
        requestAnimationFrame(() => {
          const input = document.querySelector(`[data-field="${parsed.field}"]`);
          if (input && typeof input.focus === 'function') input.focus();
        });
      } else {
        setFormError(parsed.message);
        await showApiError(err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function blockUser(user) {
    const confirmed = user.isActive
      ? await confirmBlock(`Block ${user.firstName} ${user.lastName}?`, 'The user will no longer be able to access the system.')
      : await confirmUnblock(`Unblock ${user.firstName} ${user.lastName}?`);
    if (!confirmed) return;
    try {
      await updateAdminUser(user._id, { isActive: !user.isActive });
      await showSuccess(user.isActive ? 'User blocked successfully.' : 'User activated successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to update user status');
    }
  }

  async function removeUser(user) {
    const confirmed = await confirmDelete(
      `Delete ${user.firstName} ${user.lastName}?`,
      'This permanently removes the account. Prefer Block if they have history.',
    );
    if (!confirmed) return;
    try {
      await deleteAdminUser(user._id);
      await showSuccess('Record deleted successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to delete user');
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">System Management</p>
          <h1 className="font-display text-4xl font-semibold">Users</h1>
          <p className="mt-2 text-stone-500">Manage the four application roles and account status.</p>
        </div>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiPlus /> Add User
        </button>
      </div>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <FiSearch className="absolute left-3 top-3.5 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, or email" className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm" />
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border px-4 text-sm">
          <option value="">All roles</option>
          {roles.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{['Name', 'Username', 'Email', 'Phone', 'Role', 'Status', 'Created', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.users.map((user) => (
              <tr key={user._id}>
                <td className="px-5 py-4 font-semibold">{user.firstName} {user.lastName}</td>
                <td className="px-5 py-4">{user.username}</td>
                <td className="px-5 py-4">{user.email || '—'}</td>
                <td className="px-5 py-4">{user.phone || '—'}</td>
                <td className="px-5 py-4 capitalize">{user.role}</td>
                <td className="px-5 py-4">
                  <span className={user.isActive ? 'text-emerald-700' : 'text-red-600'}>{user.isActive ? 'Active' : 'Blocked'}</span>
                </td>
                <td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    items={[
                      { label: 'Edit', onClick: () => openEdit(user) },
                      { label: user.isActive ? 'Block' : 'Unblock', tone: 'warning', onClick: () => blockUser(user) },
                      { label: 'Delete', tone: 'danger', onClick: () => removeUser(user) },
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
        title={form?._id ? 'Edit User' : 'Add User'}
        size="md"
        loading={loading}
        dirty={dirty}
        error={formError}
        onSubmit={submit}
        submitLabel={form?._id ? 'Save User' : 'Save User'}
      >
        {form ? (
          <UserAccountFormFields
            form={form}
            onChange={changeForm}
            errors={errors}
            showStatus
          />
        ) : null}
      </FormModal>
    </div>
  );
}
