import Swal from 'sweetalert2';
import { getApiError } from './apiError.js';

const baseClass = {
  popup: 'wp-swal',
  title: 'wp-swal-title',
  htmlContainer: 'wp-swal-text',
  confirmButton: 'wp-swal-confirm',
  cancelButton: 'wp-swal-cancel',
  actions: 'wp-swal-actions',
  icon: 'wp-swal-icon',
};

function fire(options) {
  return Swal.fire({
    buttonsStyling: false,
    reverseButtons: true,
    customClass: options.customClass || baseClass,
    ...options,
  });
}

export function showSuccess(title, text = '', options = {}) {
  return fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: options.confirmButtonText || 'OK',
    ...options,
  });
}

export function showError(title = 'Unable to save changes', text = '') {
  return fire({ icon: 'error', title, text, confirmButtonText: 'OK' });
}

export function showApiError(error, title = 'Unable to save changes') {
  return showError(title, getApiError(error));
}

export async function confirmAction({
  title,
  text = '',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  icon = 'warning',
  danger = false,
} = {}) {
  const result = await fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    focusCancel: true,
    customClass: {
      ...baseClass,
      confirmButton: danger ? 'wp-swal-confirm wp-swal-danger' : 'wp-swal-confirm',
    },
  });
  return result.isConfirmed === true;
}

export function confirmDelete(
  title = 'Delete this record?',
  text = 'This action may not be reversible.',
) {
  return confirmAction({ title, text, confirmButtonText: 'Delete', danger: true });
}

export function confirmBlock(
  title = 'Block this user?',
  text = 'The user will no longer be able to access the system.',
) {
  return confirmAction({ title, text, confirmButtonText: 'Block User', danger: true });
}

export function confirmUnblock(
  title = 'Unblock this user?',
  text = 'The user will be able to sign in again.',
) {
  return confirmAction({ title, text, confirmButtonText: 'Unblock' });
}

export function confirmDiscard() {
  return confirmAction({
    title: 'Discard unsaved changes?',
    text: 'Entered information will be lost.',
    confirmButtonText: 'Discard',
    cancelButtonText: 'Keep Editing',
    danger: true,
  });
}

export function confirmArchive(
  title = 'Archive this record?',
  text = 'It will be hidden from new bookings but historical records will be kept.',
  confirmButtonText = 'Archive',
) {
  return confirmAction({ title, text, confirmButtonText });
}
