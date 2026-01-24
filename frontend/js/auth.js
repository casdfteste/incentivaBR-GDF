// Auth Module - IncentivaBR
const auth = {
  getToken() {
    return localStorage.getItem('incentivabr_token');
  },

  setToken(token) {
    localStorage.setItem('incentivabr_token', token);
  },

  clearToken() {
    localStorage.removeItem('incentivabr_token');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('incentivabr_user') || '{}');
    } catch {
      return {};
    }
  },

  setUser(user) {
    localStorage.setItem('incentivabr_user', JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem('incentivabr_user');
  },

  // Dados do cálculo IR
  getIRData() {
    try {
      return JSON.parse(localStorage.getItem('incentivabr_ir') || '{}');
    } catch {
      return {};
    }
  },

  setIRData(data) {
    localStorage.setItem('incentivabr_ir', JSON.stringify(data));
  },

  clearIRData() {
    localStorage.removeItem('incentivabr_ir');
  },

  logout() {
    this.clearToken();
    this.clearUser();
    this.clearIRData();
    window.location.href = 'login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }
};
