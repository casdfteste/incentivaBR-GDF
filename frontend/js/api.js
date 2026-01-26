// API Module - IncentivaBR
const API_BASE = window.location.origin + '/api';

const api = {
  // Helper para fazer requisições
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, ...data };
      }

      return data;
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: 'Erro de conexão com o servidor' };
    }
  },

  // Auth
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async me() {
    const token = auth.getToken();
    if (!token) throw { status: 401, message: 'Não autenticado' };

    return this.request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Calculator
  async calculateIR(data) {
    return this.request('/calculator/ir', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async validateDistribution(data) {
    return this.request('/calculator/distribuir', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Projects
  async getProjects(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value);
      }
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/projects${query}`);
  },

  async getProject(id) {
    return this.request(`/projects/${id}`);
  },

  // Funds
  async getFunds() {
    return this.request('/funds');
  },

  async getFund(id) {
    return this.request(`/funds/${id}`);
  },

  // Organizations
  async getOrganizations(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/organizations${query}`);
  },

  async getOrganization(id) {
    return this.request(`/organizations/${id}`);
  },

  // Donations
  async createDonation(data) {
    const token = auth.getToken();
    if (!token) throw { status: 401, message: 'Não autenticado' };

    return this.request('/donations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
  },

  async getMyDonations(filters = {}) {
    const token = auth.getToken();
    if (!token) throw { status: 401, message: 'Não autenticado' };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/donations${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async getDonation(id) {
    const token = auth.getToken();
    if (!token) throw { status: 401, message: 'Não autenticado' };

    return this.request(`/donations/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
