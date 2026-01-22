// Utils Module - IncentivaBR

const utils = {
  // Formatar valor em reais
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  // Formatar porcentagem
  formatPercent(value) {
    return `${(value || 0).toFixed(2)}%`;
  },

  // Formatar data
  formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  },

  // Formatar CPF
  formatCPF(cpf) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  // Limpar CPF
  cleanCPF(cpf) {
    return (cpf || '').replace(/\D/g, '');
  },

  // Validar CPF
  isValidCPF(cpf) {
    const cleaned = this.cleanCPF(cpf);
    return cleaned.length === 11 && /^\d+$/.test(cleaned);
  },

  // Validar email
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Máscara de CPF
  maskCPF(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    input.value = value;
  },

  // Máscara de telefone
  maskPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }

    input.value = value;
  },

  // Máscara de moeda
  maskCurrency(input) {
    let value = input.value.replace(/\D/g, '');
    value = (parseInt(value) / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = value === 'NaN' ? '' : value;
  },

  // Parse moeda para número
  parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  },

  // Calcular dias restantes
  daysRemaining(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  },

  // Toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Loading overlay
  showLoading(container = document.body) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    container.appendChild(overlay);
    return overlay;
  },

  hideLoading(overlay) {
    if (overlay) overlay.remove();
  },

  // Skeleton loading
  createSkeleton(type = 'card') {
    const div = document.createElement('div');
    div.className = `skeleton skeleton-${type}`;
    return div;
  },

  // Get query params
  getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // Badge de status
  getStatusBadge(status) {
    const badges = {
      active: '<span class="badge badge-success">Ativo</span>',
      pending: '<span class="badge badge-warning">Pendente</span>',
      confirmed: '<span class="badge badge-info">Confirmado</span>',
      processed: '<span class="badge badge-success">Processado</span>',
      cancelled: '<span class="badge badge-danger">Cancelado</span>',
      completed: '<span class="badge badge-primary">Concluído</span>',
      funded: '<span class="badge badge-success">Financiado</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  },

  // Badge de fundo
  getFundBadge(fundType) {
    const badges = {
      children: { color: '#4CAF50', label: 'Criança' },
      elderly: { color: '#2196F3', label: 'Idoso' },
      culture: { color: '#9C27B0', label: 'Cultura' },
      sports: { color: '#FF9800', label: 'Esporte' },
      audiovisual: { color: '#E91E63', label: 'Audiovisual' },
      recycling: { color: '#00BCD4', label: 'Reciclagem' },
      health_oncology: { color: '#F44336', label: 'Oncologia' },
      health_pcd: { color: '#3F51B5', label: 'PCD' }
    };
    const badge = badges[fundType] || { color: '#607D8B', label: fundType };
    return `<span class="badge" style="background-color: ${badge.color}">${badge.label}</span>`;
  }
};

// Adicionar estilos do toast e loading dinamicamente
const style = document.createElement('style');
style.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    background: #333;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10000;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast-success { background: #4CAF50; }
  .toast-error { background: #f44336; }
  .toast-warning { background: #ff9800; }
  .toast-content { display: flex; align-items: center; gap: 12px; }

  .loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255,255,255,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .spinner {
    width: 40px; height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1a73e8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  .skeleton-card { height: 300px; }
  .skeleton-text { height: 20px; margin-bottom: 8px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }
  .badge-success { background: #4CAF50; }
  .badge-warning { background: #ff9800; }
  .badge-danger { background: #f44336; }
  .badge-info { background: #2196F3; }
  .badge-primary { background: #1a73e8; }
`;
document.head.appendChild(style);
