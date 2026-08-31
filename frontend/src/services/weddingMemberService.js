import api from './api.js';

export async function createPartnerInvite(weddingId, partnerEmail) {
  const { data } = await api.post('/wedding-members/invite', {
    weddingId,
    partnerEmail,
  }, {
    headers: { 'X-Wedding-Id': weddingId },
  });
  return data;
}

export async function verifyInviteCode(code) {
  const { data } = await api.post('/wedding-members/verify', { invite_code: code });
  return data;
}

export async function acceptInvitation({ inviteCode }) {
  const { data } = await api.post('/wedding-members/accept-invitation', {
    invite_code: inviteCode,
  });
  return data;
}

export async function getMyMembership() {
  const { data } = await api.get('/wedding-members/my');
  return data;
}

export async function getJoinRequests(weddingId) {
  const { data } = await api.get('/wedding-members/requests', {
    headers: { 'X-Wedding-Id': weddingId },
    params: { weddingId },
  });
  return data;
}

export async function acceptJoinRequest(joinRequestId) {
  const { data } = await api.post(`/wedding-members/${joinRequestId}/accept`);
  return data;
}

export async function rejectJoinRequest(joinRequestId) {
  const { data } = await api.post(`/wedding-members/${joinRequestId}/reject`);
  return data;
}

export async function getWeddingMembers(weddingId) {
  const { data } = await api.get(`/wedding-members/wedding/${weddingId}`);
  return data;
}
