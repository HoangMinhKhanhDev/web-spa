/* ═══════════════════════════════════════
   AUTH STATE – Chỉ lưu user info (không phải token!)
   Token được lưu trong HttpOnly Cookie bởi server
   ═══════════════════════════════════════ */
const Auth = {
  _userKey: 'thanhthoi_user',
  get user() { try { return JSON.parse(localStorage.getItem(this._userKey)); } catch { return null; } },
  // Không có .token property nữa — token nằm trong HttpOnly cookie, JS không đọc được (bảo mật)
  save(user) {
    // Chỉ lưu thông tin hiển thị UI (không có token)
    localStorage.setItem(this._userKey, JSON.stringify(user));
  },
  isLoggedIn() { return !!this.user; },
  async logout() {
    try { await window.api.post('/auth/logout', {}); } catch(e) {}
    localStorage.removeItem(this._userKey);
    localStorage.removeItem('thanhthoi_cart');
    location.href = 'index.html';
  }
};
