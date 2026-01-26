// Mobile Menu - IncentivaBR
// Gerencia o menu mobile em todas as páginas

(function() {
  'use strict';

  // Aguarda DOM carregado
  document.addEventListener('DOMContentLoaded', initMobileMenu);

  function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle') || document.querySelector('.menu-toggle');
    const nav = document.querySelector('.header nav, .navbar nav');

    if (!menuToggle || !nav) return;

    // Criar overlay com efeito
    let overlay = document.querySelector('.mobile-nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-nav-overlay';
      document.body.appendChild(overlay);
    }

    // Criar botão de fechar dentro do menu
    let closeBtn = nav.querySelector('.mobile-close-area');
    if (!closeBtn) {
      closeBtn = document.createElement('div');
      closeBtn.className = 'mobile-close-area';
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.setAttribute('aria-label', 'Fechar menu');
      nav.insertBefore(closeBtn, nav.firstChild);

      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeMenu();
      });
    }

    // Toggle menu ao clicar no botão
    menuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMenu();
    });

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', closeMenu);

    // Fechar menu ao clicar em um link (exceto o botão de fechar)
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        // Pequeno delay para permitir navegação
        setTimeout(closeMenu, 150);
      });
    });

    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('show')) {
        closeMenu();
      }
    });

    // Fechar menu ao redimensionar para desktop
    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth > 768 && nav.classList.contains('show')) {
          closeMenu();
        }
      }, 100);
    });

    // Detectar swipe para fechar (direita para esquerda)
    let touchStartX = 0;
    let touchEndX = 0;

    nav.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    nav.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const swipeDistance = touchStartX - touchEndX;
      // Se swipe para esquerda (mais de 50px), fecha o menu
      if (swipeDistance < -50 && nav.classList.contains('show')) {
        closeMenu();
      }
    }

    function toggleMenu() {
      const isOpen = nav.classList.contains('show');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function openMenu() {
      // Adiciona classes com pequeno delay para animação suave
      nav.classList.add('show');
      overlay.classList.add('show');
      menuToggle.classList.add('active');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');

      // Atualizar ícone do botão toggle
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      }

      // Focus no primeiro link para acessibilidade
      setTimeout(() => {
        const firstLink = nav.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 300);
    }

    function closeMenu() {
      nav.classList.remove('show');
      overlay.classList.remove('show');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');

      // Atualizar ícone do botão toggle
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }

      // Retorna foco para o botão de menu
      menuToggle.focus();
    }

    // Expor funções globalmente se necessário
    window.mobileMenu = {
      open: openMenu,
      close: closeMenu,
      toggle: toggleMenu
    };
  }
})();
