// Toast Notifications - IncentivaBR
// Sistema de notificações visuais para feedback ao usuário

const Toast = (function() {
  'use strict';

  let container = null;

  // Configurações padrão
  const defaults = {
    duration: 4000,      // Tempo em ms (0 = não fecha automaticamente)
    position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
    pauseOnHover: true,  // Pausa o timer ao passar o mouse
    closeOnClick: true,  // Fecha ao clicar
    showProgress: true,  // Mostra barra de progresso
    maxToasts: 5         // Máximo de toasts simultâneos
  };

  // Ícones para cada tipo
  const icons = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-times-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  };

  // Inicializa o container
  function init() {
    if (container) return;

    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);

    // Adicionar estilos se não existirem
    if (!document.getElementById('toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'toast-styles';
      styles.textContent = getStyles();
      document.head.appendChild(styles);
    }
  }

  // Retorna os estilos CSS
  function getStyles() {
    return `
      .toast-container {
        position: fixed;
        z-index: 99999;
        pointer-events: none;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 100%;
        box-sizing: border-box;
      }

      .toast-container.top-right {
        top: 0;
        right: 0;
        align-items: flex-end;
      }

      .toast-container.top-left {
        top: 0;
        left: 0;
        align-items: flex-start;
      }

      .toast-container.bottom-right {
        bottom: 0;
        right: 0;
        align-items: flex-end;
      }

      .toast-container.bottom-left {
        bottom: 0;
        left: 0;
        align-items: flex-start;
      }

      .toast-container.top-center {
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      .toast-container.bottom-center {
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      .toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 22px;
        border-radius: 14px;
        background: white;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.12);
        max-width: 420px;
        min-width: 320px;
        animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .toast:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .toast.removing {
        animation: toastSlideOut 0.3s ease forwards;
      }

      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes toastSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      .toast-container.top-left .toast,
      .toast-container.bottom-left .toast {
        animation-name: toastSlideInLeft;
      }

      .toast-container.top-left .toast.removing,
      .toast-container.bottom-left .toast.removing {
        animation-name: toastSlideOutLeft;
      }

      @keyframes toastSlideInLeft {
        from {
          opacity: 0;
          transform: translateX(-100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes toastSlideOutLeft {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-100%);
        }
      }

      .toast-container.top-center .toast,
      .toast-container.bottom-center .toast {
        animation-name: toastSlideInCenter;
      }

      .toast-container.top-center .toast.removing,
      .toast-container.bottom-center .toast.removing {
        animation-name: toastSlideOutCenter;
      }

      @keyframes toastSlideInCenter {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes toastSlideOutCenter {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
      }

      .toast-icon {
        font-size: 28px;
        flex-shrink: 0;
        margin-top: 0;
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-title {
        font-weight: 700;
        font-size: 17px;
        color: #111;
        margin-bottom: 6px;
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      .toast-message {
        font-size: 15px;
        color: #444;
        line-height: 1.5;
        word-wrap: break-word;
        font-weight: 500;
      }

      .toast-close {
        background: none;
        border: none;
        padding: 6px;
        cursor: pointer;
        color: #777;
        font-size: 18px;
        line-height: 1;
        flex-shrink: 0;
        border-radius: 6px;
        transition: all 0.2s;
        margin: -4px -8px -4px 0;
      }

      .toast-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 5px;
        border-radius: 0 0 14px 14px;
        transition: width linear;
      }

      .toast.paused .toast-progress {
        animation-play-state: paused;
      }

      /* Toast Types */
      .toast.toast-success {
        border-left: 5px solid #00A859;
      }
      .toast.toast-success .toast-icon {
        color: #00A859;
      }
      .toast.toast-success .toast-title {
        color: #007A40;
      }
      .toast.toast-success .toast-progress {
        background: linear-gradient(90deg, #00A859, #00C969);
      }

      .toast.toast-error {
        border-left: 5px solid #E74C3C;
      }
      .toast.toast-error .toast-icon {
        color: #E74C3C;
      }
      .toast.toast-error .toast-title {
        color: #C0392B;
      }
      .toast.toast-error .toast-progress {
        background: linear-gradient(90deg, #E74C3C, #ff6b5b);
      }

      .toast.toast-warning {
        border-left: 5px solid #F7941D;
      }
      .toast.toast-warning .toast-icon {
        color: #F7941D;
      }
      .toast.toast-warning .toast-title {
        color: #D97A00;
      }
      .toast.toast-warning .toast-progress {
        background: linear-gradient(90deg, #F7941D, #FFB800);
      }

      .toast.toast-info {
        border-left: 5px solid #3498DB;
      }
      .toast.toast-info .toast-icon {
        color: #3498DB;
      }
      .toast.toast-info .toast-title {
        color: #2980B9;
      }
      .toast.toast-info .toast-progress {
        background: linear-gradient(90deg, #3498DB, #5dade2);
      }

      /* Mobile Responsive */
      @media (max-width: 480px) {
        .toast-container {
          padding: 12px;
          left: 0 !important;
          right: 0 !important;
          transform: none !important;
        }

        .toast-container.top-right,
        .toast-container.top-left,
        .toast-container.top-center {
          align-items: stretch;
        }

        .toast-container.bottom-right,
        .toast-container.bottom-left,
        .toast-container.bottom-center {
          align-items: stretch;
        }

        .toast {
          max-width: 100%;
          min-width: 0;
          width: 100%;
          padding: 16px 18px;
          gap: 12px;
        }

        .toast-icon {
          font-size: 26px;
        }

        .toast-title {
          font-size: 16px;
        }

        .toast-message {
          font-size: 14px;
        }

        .toast-close {
          font-size: 16px;
          padding: 8px;
        }
      }
    `;
  }

  // Cria e exibe um toast
  function show(options) {
    init();

    // Merge options com defaults
    const opts = { ...defaults, ...options };

    // Atualiza posição do container
    container.className = 'toast-container ' + opts.position;

    // Limita quantidade de toasts
    const currentToasts = container.querySelectorAll('.toast:not(.removing)');
    if (currentToasts.length >= opts.maxToasts) {
      remove(currentToasts[0]);
    }

    // Cria elemento do toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${opts.type || 'info'}`;

    // Monta HTML
    const icon = icons[opts.type] || icons.info;
    const title = opts.title ? `<div class="toast-title">${opts.title}</div>` : '';
    const message = opts.message ? `<div class="toast-message">${opts.message}</div>` : '';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title}
        ${message}
      </div>
      <button class="toast-close" aria-label="Fechar">
        <i class="fas fa-times"></i>
      </button>
      ${opts.showProgress && opts.duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    // Adiciona ao container
    container.appendChild(toast);

    // Timer para auto-close
    let timeoutId = null;
    let startTime = Date.now();
    let remaining = opts.duration;

    if (opts.duration > 0) {
      // Configura barra de progresso
      const progress = toast.querySelector('.toast-progress');
      if (progress) {
        progress.style.width = '100%';
        progress.style.transitionDuration = opts.duration + 'ms';
        // Força reflow para animação funcionar
        progress.offsetHeight;
        progress.style.width = '0%';
      }

      timeoutId = setTimeout(() => remove(toast), opts.duration);

      // Pause on hover
      if (opts.pauseOnHover) {
        toast.addEventListener('mouseenter', () => {
          clearTimeout(timeoutId);
          remaining -= Date.now() - startTime;
          toast.classList.add('paused');
          const progress = toast.querySelector('.toast-progress');
          if (progress) {
            const computedWidth = getComputedStyle(progress).width;
            progress.style.transitionDuration = '0ms';
            progress.style.width = computedWidth;
          }
        });

        toast.addEventListener('mouseleave', () => {
          startTime = Date.now();
          toast.classList.remove('paused');
          const progress = toast.querySelector('.toast-progress');
          if (progress) {
            progress.style.transitionDuration = remaining + 'ms';
            progress.style.width = '0%';
          }
          timeoutId = setTimeout(() => remove(toast), remaining);
        });
      }
    }

    // Close on click
    if (opts.closeOnClick) {
      toast.addEventListener('click', (e) => {
        if (!e.target.closest('.toast-close')) {
          remove(toast);
        }
      });
    }

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(timeoutId);
      remove(toast);
    });

    // Callback
    if (typeof opts.onShow === 'function') {
      opts.onShow(toast);
    }

    return toast;
  }

  // Remove um toast com animação
  function remove(toast) {
    if (!toast || toast.classList.contains('removing')) return;

    toast.classList.add('removing');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Remove todos os toasts
  function clear() {
    if (!container) return;
    const toasts = container.querySelectorAll('.toast');
    toasts.forEach(toast => remove(toast));
  }

  // Atalhos para tipos comuns
  function success(message, title = 'Sucesso!') {
    return show({ type: 'success', title, message });
  }

  function error(message, title = 'Erro!') {
    return show({ type: 'error', title, message, duration: 6000 });
  }

  function warning(message, title = 'Atenção!') {
    return show({ type: 'warning', title, message });
  }

  function info(message, title = '') {
    return show({ type: 'info', title, message });
  }

  // API pública
  return {
    show,
    success,
    error,
    warning,
    info,
    clear,
    remove
  };
})();

// Expor globalmente
window.Toast = Toast;
