const API_BASE = '/api';

/* ═══════════════════════════════════════
   API UTILS – HttpOnly Cookie (không cần token trong header)
   ═══════════════════════════════════════ */
const api = {
  _opts(method, data) {
    const opts = {
      method,
      credentials: 'include',  // BẮT BUỘC: gửi HttpOnly cookie kèm mọi request
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.body = JSON.stringify(data);
    return opts;
  },
  async get(endpoint) {
    LoadingBar.start();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, this._opts('GET'));
      if (!res.ok) throw await res.json();
      return await res.json();
    } finally {
      LoadingBar.done();
    }
  },
  async post(endpoint, data) {
    LoadingBar.start();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, this._opts('POST', data));
      if (!res.ok) throw await res.json();
      return await res.json();
    } finally {
      LoadingBar.done();
    }
  },
  async put(endpoint, data) {
    LoadingBar.start();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, this._opts('PUT', data));
      if (!res.ok) throw await res.json();
      return await res.json();
    } finally {
      LoadingBar.done();
    }
  },
  async patch(endpoint, data) {
    LoadingBar.start();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, this._opts('PATCH', data));
      if (!res.ok) throw await res.json();
      return await res.json();
    } finally {
      LoadingBar.done();
    }
  },
  async delete(endpoint) {
    LoadingBar.start();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, this._opts('DELETE'));
      if (!res.ok) throw await res.json();
      return await res.json();
    } finally {
      LoadingBar.done();
    }
  }
};

