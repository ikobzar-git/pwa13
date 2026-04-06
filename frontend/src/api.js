const API_BASE = '/api';

// Simple TTL cache
const _cache = new Map();
function cached(key, ttlMs, fn) {
  const entry = _cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.promise;
  const promise = fn().catch(err => { _cache.delete(key); throw err; });
  _cache.set(key, { promise, expires: Date.now() + ttlMs });
  return promise;
}

function getActiveRole() {
  return localStorage.getItem('active_role');
}

function getToken() {
  const role = getActiveRole();
  if (role) return localStorage.getItem(`token_${role}`);
  return localStorage.getItem('token') || null;
}

function getCsrfToken() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function ensureCsrfCookie() {
  await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const csrf = getCsrfToken();
  if (csrf) headers['X-XSRF-TOKEN'] = csrf;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers, credentials: 'include' }).catch((e) => {
    throw new Error(e.message || 'NetworkError');
  });

  if (res.status === 401) {
    const currentRole = getActiveRole();
    if (currentRole) {
      localStorage.removeItem(`token_${currentRole}`);
      const otherRole = currentRole === 'staff' ? 'client' : 'staff';
      if (localStorage.getItem(`token_${otherRole}`)) {
        localStorage.setItem('active_role', otherRole);
        window.location.reload();
      } else {
        localStorage.removeItem('active_role');
        if (!window.location.pathname.includes('/login')) window.location.href = '/login';
      }
    } else {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  return res;
}

export async function apiJson(url, options = {}) {
  let res;
  try {
    res = await api(url, options);
  } catch (e) {
    const isNetwork = !e.message || e.message === 'Failed to fetch' || e.message.includes('fetch') || e.message === 'NetworkError';
    const msg = isNetwork ? 'Сервер недоступен. Запустите backend: docker compose up app' : (e.message || 'Ошибка запроса');
    const err = new Error(msg);
    err.body = {};
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      data.errors?.phone?.[0] ||
      data.errors?.code?.[0] ||
      (typeof data.errors === 'string' ? data.errors : null) ||
      (res.status >= 500 ? `Ошибка сервера (${res.status}). См. логи: docker compose logs app` : 'Ошибка запроса');
    const err = new Error(msg);
    err.body = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const config = () => cached('config', 10 * 60_000, () => apiJson('/config'));

export const pushSubscribe = (subscription) =>
  apiJson('/push-subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });

export const auth = {
  staffLogin: async (phone, password) => {
    await ensureCsrfCookie();
    return apiJson('/auth/staff', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },
  staffSendCode: async (phone) => {
    await ensureCsrfCookie();
    return apiJson('/auth/staff/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  staffVerify: async (phone, code) => {
    await ensureCsrfCookie();
    return apiJson('/auth/staff/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },
  clientSendCode: async (phone) => {
    await ensureCsrfCookie();
    return apiJson('/auth/client/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  clientVerify: async (phone, code) => {
    await ensureCsrfCookie();
    return apiJson('/auth/client/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },
  logout: () => apiJson('/logout', { method: 'POST' }),
  userWithToken: async (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCsrfToken();
    if (csrf) headers['X-XSRF-TOKEN'] = csrf;
    const res = await fetch(`${API_BASE}/user`, { headers, credentials: 'include' });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },
};

export const companies = {
  list: () => cached('companies_list', 5 * 60_000, () => apiJson('/companies')),
  services: (id, staffId) =>
    cached(`companies_services_${id}_${staffId || 0}`, 5 * 60_000, () =>
      apiJson(`/companies/${id}/services${staffId ? `?staff_id=${staffId}` : ''}`)),
  staff: (id) => cached(`companies_staff_${id}`, 5 * 60_000, () => apiJson(`/companies/${id}/staff`)),
  searchClients: (id, query) => apiJson(`/companies/${id}/clients/search?q=${encodeURIComponent(query)}`),
};

function invalidateRecords() {
  for (const k of _cache.keys()) {
    if (k.startsWith('records_') || k.startsWith('slots_') || k.startsWith('date_avail_')) _cache.delete(k);
  }
}

export const records = {
  slots: (companyId, staffId, date) =>
    cached(`slots_${companyId}_${staffId}_${date}`, 2 * 60_000, () =>
      apiJson(`/records/slots?company_id=${companyId}&staff_id=${staffId}&date=${date}`)),
  create: (data) => {
    return apiJson('/records', { method: 'POST', body: JSON.stringify(data) })
      .then(res => { invalidateRecords(); return res; });
  },
  cancel: (recordId, companyId) => {
    return apiJson(`/records/${recordId}`, {
      method: 'DELETE',
      body: JSON.stringify({ company_id: companyId }),
    }).then(res => { invalidateRecords(); return res; });
  },
  my: (params = {}) => {
    const key = `records_my_${new URLSearchParams(params).toString()}`;
    return cached(key, 30_000, () => apiJson(`/records/my?${new URLSearchParams(params).toString()}`));
  },
  staff: (params = {}) => {
    const key = `records_staff_${new URLSearchParams(params).toString()}`;
    return cached(key, 30_000, () => apiJson(`/records/staff?${new URLSearchParams(params).toString()}`));
  },
  clientHistory: (clientId, companyId) =>
    cached(`records_client_${clientId}_${companyId}`, 60_000, () =>
      apiJson(`/records/client/${clientId}?company_id=${companyId || ''}`)),
  dateAvailability: (companyId, staffId, month, serviceId) =>
    cached(`date_avail_${companyId}_${staffId}_${serviceId || 0}_${month}`, 2 * 60_000, () =>
      apiJson(`/records/date-availability?company_id=${companyId}&staff_id=${staffId}&month=${month}${serviceId ? `&service_id=${serviceId}` : ''}`)),
  myHistory: () => cached('records_myHistory', 60_000, () => apiJson('/records/my-history')),
};

export const profile = {
  get: () => cached('profile', 2 * 60_000, () => apiJson('/profile')),
  update: (data) => {
    return apiJson('/profile', { method: 'PUT', body: JSON.stringify(data) })
      .then(res => { _cache.delete('profile'); return res; });
  },
  updatePublic: (data) => {
    return apiJson('/profile/public', { method: 'PUT', body: JSON.stringify(data) })
      .then(res => { _cache.delete('profile'); return res; });
  },
};

export async function uploadPublicPhoto(file) {
  await ensureCsrfCookie();
  const token = getToken();
  const csrf = getCsrfToken();
  const fd = new FormData();
  fd.append('photo', file);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-XSRF-TOKEN'] = csrf;
  const res = await fetch(`${API_BASE}/profile/public-photo`, {
    method: 'POST',
    headers,
    body: fd,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Ошибка загрузки');
    err.body = data;
    throw err;
  }
  _cache.delete('profile');
  return data;
}

export async function fetchPublicMaster(slug) {
  const res = await fetch(`${API_BASE}/public/masters/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Страница не найдена');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const workstations = {
  sync: (companyId) =>
    apiJson('/workstations/sync', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId || undefined }),
    }),
  list: (companyId) =>
    apiJson(`/workstations?company_id=${encodeURIComponent(companyId || '')}`),
  availability: (companyId, from, to) =>
    apiJson(
      `/workstations/availability?company_id=${encodeURIComponent(companyId)}&from=${from}&to=${to}`
    ),
  myBookings: (companyId) =>
    apiJson(`/workstations/my-bookings?company_id=${encodeURIComponent(companyId || '')}`),
  book: (workstationId, dates, companyId) =>
    apiJson('/workstations/book', {
      method: 'POST',
      body: JSON.stringify({
        workstation_id: workstationId,
        dates,
        company_id: companyId || undefined,
      }),
    }),
  cancel: (bookingId, companyId) =>
    apiJson(
      `/workstations/bookings/${bookingId}?company_id=${encodeURIComponent(companyId || '')}`,
      { method: 'DELETE' }
    ),
};

export const facilityRequests = {
  list: (companyId) =>
    apiJson(`/facility-requests?company_id=${encodeURIComponent(companyId || '')}`),
  create: (payload, companyId) =>
    apiJson('/facility-requests', {
      method: 'POST',
      body: JSON.stringify({ ...payload, company_id: companyId || undefined }),
    }),
  updateStatus: (id, status, companyId) =>
    apiJson(`/facility-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, company_id: companyId || undefined }),
    }),
};

export const feedback = {
  topics: () => cached('feedback_topics', 10 * 60_000, () => apiJson('/feedback/topics')),
  create: (text, topicId, companyId) => {
    return apiJson('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        text,
        topic_id: topicId || undefined,
        company_id: companyId || undefined,
      }),
    }).then(res => { _cache.delete('feedback_my'); _cache.delete('feedback_list'); return res; });
  },
  my: () => cached('feedback_my', 60_000, () => apiJson('/feedback/my')),
  list: (params = {}) => {
    const key = `feedback_list_${new URLSearchParams(params).toString()}`;
    return cached(key, 60_000, () => apiJson(`/feedback?${new URLSearchParams(params).toString()}`));
  },
};

function invalidateNotes() {
  for (const k of _cache.keys()) {
    if (k.startsWith('notes_')) _cache.delete(k);
  }
}

export const notes = {
  list: (clientId, companyId) =>
    cached(`notes_${clientId}_${companyId}`, 60_000, () =>
      apiJson(`/clients/${clientId}/notes?company_id=${companyId || ''}`)),
  create: (clientId, data, companyId) => {
    return apiJson(`/clients/${clientId}/notes?company_id=${companyId || ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(res => { invalidateNotes(); return res; });
  },
  my: () => cached('notes_my', 60_000, () => apiJson('/notes/my')),
  delete: (id) => {
    return apiJson(`/notes/${id}`, { method: 'DELETE' })
      .then(res => { invalidateNotes(); return res; });
  },
};

export const favorites = {
  list: () => cached('favorites_list', 60_000, () => apiJson('/favorites')),
  toggle: (yclientsStaffId, companyId, staffName) => {
    return apiJson('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({
        yclients_staff_id: yclientsStaffId,
        company_id: companyId,
        staff_name: staffName,
      }),
    }).then(res => { _cache.delete('favorites_list'); return res; });
  },
};

export const chat = {
  conversations: () => apiJson('/chat/conversations'),
  create: (data) => apiJson('/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),
  show: (id) => apiJson(`/chat/conversations/${id}`),
  sendMessage: (conversationId, body) =>
    apiJson(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  unreadCount: () => apiJson('/chat/unread-count'),
};

export const stats = {
  personal: (period = 'week') =>
    cached(`stats_personal_${period}`, 2 * 60_000, () => apiJson(`/stats/personal?period=${period}`)),
  personalDaily: (period = 'week') =>
    cached(`stats_personalDaily_${period}`, 2 * 60_000, () => apiJson(`/stats/personal-daily?period=${period}`)),
};

export const finance = {
  balance: (companyId) => apiJson(`/finance/balance?company_id=${companyId || ''}`),
  history: (companyId) => apiJson(`/finance/history?company_id=${companyId || ''}`),
  payouts: (companyId) => apiJson(`/finance/payouts?company_id=${companyId || ''}`),
  requestPayout: (amount, comment, companyId) =>
    apiJson('/finance/payouts', {
      method: 'POST',
      body: JSON.stringify({ amount, comment, company_id: companyId }),
    }),
  processPayout: (id, status, adminComment, companyId) =>
    apiJson(`/finance/payouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_comment: adminComment, company_id: companyId }),
    }),
};

export const schedule = {
  list: (companyId, from, to) =>
    apiJson(`/schedule?company_id=${companyId || ''}&from=${from || ''}&to=${to || ''}`),
  save: (dates, companyId) =>
    apiJson('/schedule', {
      method: 'POST',
      body: JSON.stringify({ dates, company_id: companyId }),
    }),
  remove: (id) => apiJson(`/schedule/${id}`, { method: 'DELETE' }),
  timeOff: (companyId) => apiJson(`/schedule/time-off?company_id=${companyId || ''}`),
  requestTimeOff: (data, companyId) =>
    apiJson('/schedule/time-off', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId }),
    }),
  processTimeOff: (id, status, companyId) =>
    apiJson(`/schedule/time-off/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, company_id: companyId }),
    }),
};

export const inventory = {
  list: (companyId) => apiJson(`/inventory?company_id=${companyId || ''}`),
  create: (data, companyId) =>
    apiJson('/inventory', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId }),
    }),
  summary: (companyId) => apiJson(`/inventory/summary?company_id=${companyId || ''}`),
};

export const documents = {
  list: (companyId) => apiJson(`/documents?company_id=${companyId || ''}`),
  upload: async (title, category, file, companyId) => {
    await ensureCsrfCookie();
    const fd = new FormData();
    fd.append('title', title);
    fd.append('category', category);
    fd.append('file', file);
    if (companyId) fd.append('company_id', companyId);
    const token = getToken();
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(getCsrfToken() ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
      },
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.message || `HTTP ${res.status}`);
      err.body = body;
      throw err;
    }
    return res.json();
  },
  remove: (id, companyId) =>
    apiJson(`/documents/${id}?company_id=${companyId || ''}`, { method: 'DELETE' }),
};

export const manager = {
  dashboard: (companyId) => apiJson(`/manager/dashboard?company_id=${companyId || ''}`),
  dashboardSummary: (companyId, period) =>
    apiJson(`/manager/dashboard/summary?company_id=${companyId || ''}&period=${period || 'week'}`),
  branches: () => apiJson('/manager/dashboard/branches'),
  staff: () => apiJson('/manager/staff'),
  staffStats: (userId, period, companyId) =>
    apiJson(`/manager/staff/${userId}/stats?period=${period || 'week'}&company_id=${companyId || ''}`),
  staffPublicProfile: (userId) => apiJson(`/manager/staff/${userId}/public-profile`),
  updateStaffPublicProfile: (userId, data) =>
    apiJson(`/manager/staff/${userId}/public-profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  financeOverview: (companyId, period) =>
    apiJson(`/manager/finance/overview?company_id=${companyId || ''}&period=${period || 'month'}`),
  transactions: (params = {}) =>
    apiJson(`/manager/finance/transactions?${new URLSearchParams(params).toString()}`),
  scheduleOverview: (companyId, from, to) =>
    apiJson(`/manager/schedule/overview?company_id=${companyId || ''}&from=${from || ''}&to=${to || ''}`),
  clientStats: (companyId, period) =>
    apiJson(`/manager/clients/stats?company_id=${companyId || ''}&period=${period || 'month'}`),
};
