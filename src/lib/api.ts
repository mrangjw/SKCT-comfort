const API_BASE = import.meta.env.VITE_API_URL || '';

const AUTH_KEY = 'skct-auth';

function getUserId(): string {
  try {
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (auth) return JSON.parse(auth).userId;
  } catch {}
  // Fallback for legacy
  let id = localStorage.getItem('skct-user-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('skct-user-id', id);
  }
  return id;
}

function getUserName(): string {
  try {
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (auth) return JSON.parse(auth).name;
  } catch {}
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

export interface UserData {
  stats: Record<string, unknown>;
  wrongNotes: unknown[];
  aiQuestions: unknown[];
  aiConfig: unknown | null;
  preferences: Record<string, unknown>;
}

export const api = {
  getUserId,
  getUserName,

  // Auth
  login: (name: string, className: string) =>
    apiFetch('/auth/login', { name, className }),

  // Bulk user data
  loadUserData: (): Promise<UserData | null> => apiFetch('/user-data') as Promise<UserData | null>,
  saveUserData: (data: Partial<UserData & { name?: string }>) => apiFetch('/user-data', data),

  // Legacy sync (still used by hooks)
  syncStats: (stats: unknown) => apiFetch('/stats', { userId: getUserId(), nickname: getUserName(), stats }),
  getStats: () => apiFetch('/stats'),

  syncWrongNotes: (notes: unknown) => apiFetch('/wrong-notes', { userId: getUserId(), notes }),
  getWrongNotes: () => apiFetch('/wrong-notes'),

  recordSession: (data: { section: string; type: string; correct: number; total: number; duration: number }) =>
    apiFetch('/sessions', { userId: getUserId(), nickname: getUserName(), ...data }),

  // Feedback
  submitFeedback: (data: { type: string; message: string; questionId?: string }) =>
    apiFetch('/feedback', { userId: getUserId(), nickname: getUserName(), ...data }),
  getFeedback: (isAdmin?: boolean) =>
    apiFetch(`/feedback${isAdmin ? '?all=true' : ''}`),
  replyFeedback: (feedbackId: string, reply: string) =>
    apiFetch('/feedback/reply', { feedbackId, reply }),
  resolveFeedback: (feedbackId: string) =>
    apiFetch('/feedback/resolve', { feedbackId }),

  // Admin
  adminGetUsers: (password: string) => apiFetch(`/admin/users?pw=${encodeURIComponent(password)}`),
  adminGetUsage: (password: string) => apiFetch(`/admin/usage?pw=${encodeURIComponent(password)}`),

  // RAG
  ragSearch: (query: string, section?: string, topK?: number) =>
    apiFetch('/rag/search', { query, section: section || '', top_k: topK || 5 }),
  ragStatus: () => apiFetch('/rag/status'),
};
