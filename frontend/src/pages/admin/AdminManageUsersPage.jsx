/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import AdminUserActionButtons from '../../components/admin/AdminUserActionButtons.jsx';
import { FormModal } from '../../components/common/index.js';
import UserAccountFormFields, {
  emptyUserForm,
  splitFullName,
  userToForm,
  validateUserForm,
} from '../../components/admin/UserAccountForm.jsx';
import { createAdminUser, getAdminUsers, updateAdminUser } from '../../services/roleService.js';
import {
  confirmAction,
  confirmBlock,
  showApiError,
  showError,
  showSuccess,
} from '../../utils/alerts.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';
import { getRoleLabel } from '../../utils/roles.js';
import {
  accountStatusClass,
  getAccountStatusLabel,
  getFullName,
  isProtectedAdminUser,
  resolveAccountStatus,
} from '../../utils/userDisplay.js';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'groom', label: 'Groom' },
  { value: 'bride', label: 'Bride' },
  { value: 'wedding_planner', label: 'Wedding Planner' },
  { value: 'vendor', label: 'Vendor' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
];

function formatCreatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function canChangeStatus(user, currentUser) {
  if (isProtectedAdminUser(user)) return false;
  if (currentUser?._id === user._id) return false;
  return true;
}

export default function AdminManageUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [createForm, setCreateForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [createDirty, setCreateDirty] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (role) params.role = role;
    if (status) params.status = status;
    return getAdminUsers(params).then(setData).catch((e) => setError(getApiError(e)));
  };

  useEffect(() => {
    load();
  }, [search, role, status]);

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, []);

  const summary = data?.summary || { total: 0, active: 0, inactive: 0, blocked: 0 };

  function openCreate() {
    setCreateForm({ ...emptyUserForm });
    setCreateErrors({});
    setCreateError('');
    setCreateDirty(false);
  }

  function openEdit(user) {
    setEditForm(userToForm(user));
    setEditErrors({});
    setEditError('');
    setEditDirty(false);
  }

  function applySearch() {
    setSearch(searchDraft.trim());
  }

  async function submitCreate() {
    const nextErrors = validateUserForm(createForm, {
      isEdit: false,
      requireConfirmPassword: true,
      useFullName: true,
    });
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setCreateLoading(true);
    setCreateError('');
    try {
      const { firstName, lastName } = splitFullName(createForm.fullName);
      const emailPayload = createForm.email?.trim() ? createForm.email.trim() : '';
      const accountStatus = createForm.isActive ? 'active' : 'inactive';
      await createAdminUser({
        firstName,
        lastName,
        username: createForm.username,
        email: emailPayload || undefined,
        phone: createForm.phone,
        password: createForm.password,
        role: createForm.role,
        accountStatus,
      });
      await showSuccess('User created successfully.');
      setCreateForm(null);
      setCreateDirty(false);
      load();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.field) {
        setCreateErrors((current) => ({ ...current, [parsed.field]: parsed.message }));
        setCreateError('Unable to create user. Please correct the highlighted field.');
        await showError('Unable to create user', parsed.message);
      } else {
        setCreateError(parsed.message);
        await showApiError(err);
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function submitEdit() {
    const nextErrors = validateUserForm(editForm, { isEdit: true, useFullName: true });
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setEditLoading(true);
    setEditError('');
    try {
      const { firstName, lastName } = splitFullName(editForm.fullName);
      const emailPayload = editForm.email?.trim() ? editForm.email.trim() : '';
      const payload = {
        firstName,
        lastName,
        username: editForm.username,
        email: emailPayload,
        phone: editForm.phone,
        role: editForm.role,
        accountStatus: editForm.accountStatus,
      };
      await updateAdminUser(editForm._id, payload);
      await showSuccess('User updated', 'Changes were saved successfully.');
      setEditForm(null);
      setEditDirty(false);
      load();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.field) {
        setEditErrors((current) => ({ ...current, [parsed.field]: parsed.message }));
        setEditError('Unable to update user. Please correct the highlighted field.');
        await showError('Unable to update user', parsed.message);
      } else {
        setEditError(parsed.message);
        await showApiError(err);
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function activateUser(user) {
    if (!canChangeStatus(user, currentUser)) {
      await showError('Action not allowed', 'This administrator account cannot be changed.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Activate this user?',
      text: 'The user will be able to log in again.',
      confirmButtonText: 'Confirm',
    });
    if (!confirmed) return;
    try {
      await updateAdminUser(user._id, { accountStatus: 'active' });
      await showSuccess('User activated successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to activate user');
    }
  }

  async function setInactive(user) {
    if (!canChangeStatus(user, currentUser)) {
      await showError('Action not allowed', 'This administrator account cannot be changed.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Set this user as inactive?',
      text: 'The user will not be able to log in until reactivated.',
      confirmButtonText: 'Confirm',
    });
    if (!confirmed) return;
    try {
      await updateAdminUser(user._id, { accountStatus: 'inactive' });
      await showSuccess('User set inactive.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to update user status');
    }
  }

  async function blockUser(user) {
    if (!canChangeStatus(user, currentUser)) {
      await showError('Action not allowed', 'This administrator account cannot be blocked.');
      return;
    }
    const confirmed = await confirmBlock(
      'Are you sure you want to block this user?',
      'The user will no longer be able to access the system.',
    );
    if (!confirmed) return;
    try {
      await updateAdminUser(user._id, { accountStatus: 'blocked' });
      await showSuccess('User blocked successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to block user');
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-display text-3xl font-semibold text-stone-900">Manage Users</h1>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Users Summary</h2>
              <p className="mt-1 text-sm text-stone-500">
                Total: <span className="font-semibold text-stone-800">{summary.total}</span>
                <span className="mx-2 text-stone-300">|</span>
                Active: <span className="font-semibold text-emerald-700">{summary.active}</span>
                <span className="mx-2 text-stone-300">|</span>
                Inactive: <span className="font-semibold text-stone-600">{summary.inactive}</span>
                <span className="mx-2 text-stone-300">|</span>
                Blocked: <span className="font-semibold text-red-700">{summary.blocked}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-[200px] flex-1">
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
                  placeholder="Search by full name"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-4 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <button
                type="button"
                onClick={applySearch}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <FiSearch className="h-4 w-4" /> Search
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <FiPlus className="h-4 w-4" /> Add User
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              aria-label="Filter by role"
            >
              {ROLE_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        {error ? <p className="px-6 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                {['Full Name', 'Username', 'Role', 'Status', 'Email', 'Phone', 'Created At', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3.5 font-semibold whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data?.users?.length ? data.users.map((user) => {
                const accountStatus = resolveAccountStatus(user);
                return (
                  <tr key={user._id} className="hover:bg-stone-50/80">
                    <td className="px-5 py-3.5 font-semibold text-stone-900 whitespace-nowrap">{getFullName(user)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{user.username}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getRoleLabel(user.role)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accountStatusClass(accountStatus)}`}>
                        {getAccountStatusLabel(user)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{user.email || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{user.phone || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{formatCreatedAt(user.createdAt)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <AdminUserActionButtons
                        user={user}
                        canChangeStatus={canChangeStatus(user, currentUser)}
                        onActivate={activateUser}
                        onEdit={openEdit}
                        onSetInactive={setInactive}
                        onBlock={blockUser}
                      />
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-stone-500">
                    {data ? 'No users found.' : 'Loading users…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={Boolean(createForm)}
        onClose={() => { setCreateForm(null); setCreateDirty(false); }}
        title="Add User"
        size="md"
        loading={createLoading}
        dirty={createDirty}
        error={createError}
        onSubmit={submitCreate}
        submitLabel="Create User"
        cancelLabel="Cancel"
      >
        {createForm ? (
          <UserAccountFormFields
            form={createForm}
            onChange={(next) => { setCreateForm(next); setCreateDirty(true); setCreateError(''); }}
            errors={createErrors}
            useFullName
            useActiveCheckbox
            showConfirmPassword
          />
        ) : null}
      </FormModal>

      <FormModal
        isOpen={Boolean(editForm)}
        onClose={() => { setEditForm(null); setEditDirty(false); }}
        title="Edit User"
        size="md"
        loading={editLoading}
        dirty={editDirty}
        error={editError}
        onSubmit={submitEdit}
        submitLabel="Save Changes"
        cancelLabel="Cancel"
      >
        {editForm ? (
          <UserAccountFormFields
            form={editForm}
            onChange={(next) => { setEditForm(next); setEditDirty(true); setEditError(''); }}
            errors={editErrors}
            useFullName
            showStatus
            allowRoleEdit
            roleLocked={isProtectedAdminUser(editForm)}
            statusLocked={isProtectedAdminUser(editForm)}
          />
        ) : null}
      </FormModal>
    </div>
  );
}
