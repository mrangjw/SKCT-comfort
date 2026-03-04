const API_BASE = import.meta.env.VITE_API_URL || '';

function getUserId(): string {
  let id = localStorage.getItem('skct-user-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('skct-user-id', id);
  }
  return id;
}

function getNickname(): string {
  return localStorage.getItem('skct-nickname') || '';
}

async function apiFetch(path: string, body?: unknown) {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const api = {
  getUserId,
  getNickname,
  setNickname: (name: string) => localStorage.setItem('skct-nickname', name),

  syncStats: (stats: unknown) => apiFetch('/stats', { userId: getUserId(), nickname: getNickname(), stats }),
  getStats: () => apiFetch('/stats'),

  syncWrongNotes: (notes: unknown) => apiFetch('/wrong-notes', { userId: getUserId(), notes }),
  getWrongNotes: () => apiFetch('/wrong-notes'),

  recordSession: (data: { section: string; type: string; correct: number; total: number; duration: number }) =>
    apiFetch('/sessions', { userId: getUserId(), nickname: getNickname(), ...data }),

  // Feedback
  submitFeedback: (data: { type: string; message: string; questionId?: string }) =>
    apiFetch('/feedback', { userId: getUserId(), nickname: getNickname(), ...data }),
  getFeedback: (isAdmin?: boolean) =>
    apiFetch(`/feedback${isAdmin ? '?all=true' : ''}`),
  replyFeedback: (feedbackId: string, reply: string) =>
    apiFetch('/feedback/reply', { feedbackId, reply }),
  resolveFeedback: (feedbackId: string) =>
    apiFetch('/feedback/resolve', { feedbackId }),

  // Admin
  adminGetUsers: (password: string) => apiFetch(`/admin/users?pw=${encodeURIComponent(password)}`),
  adminGetUsage: (password: string) => apiFetch(`/admin/usage?pw=${encodeURIComponent(password)}`),
};
