export function getApiError(error) {
  return error?.response?.data?.message || 'Something went wrong. Please try again.';
}

export function parseApiError(error) {
  const data = error?.response?.data || {};
  return {
    message: data.message || getApiError(error),
    code: data.code || null,
    field: data.field || null,
    details: data.details || null,
    status: error?.response?.status || null,
  };
}
