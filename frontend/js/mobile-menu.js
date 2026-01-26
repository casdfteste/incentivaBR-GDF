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

    // Criar overlay
    let overlay = document.querySelector('.mobile-nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-nav-overlay';
      document.body.appendChild(overlay);
    }

    // Toggle menu ao clicar no botão
    menuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMenu();
    });

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', closeMenu);

    // Fechar menu ao clicar em um link
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        // Pequeno delay para permitir navegação
        setTimeout(closeMenu, 100);
      });
    });

    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('show')) {
        closeMenu();
      }
    });

    // Fechar menu ao redimensionar para desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768 && nav.classList.contains('show')) {
        closeMenu();
      }
    });

    function toggleMenu() {
      const isOpen = nav.classList.contains('show');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function openMenu() {
      nav.classList.add('show');
      overlay.classList.add('show');
      menuToggle.classList.add('active');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');

      // Atualizar ícone
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      }
    }

    function closeMenu() {
      nav.classList.remove('show');
      overlay.classList.remove('show');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');

      // Atualizar ícone
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    }

    // Expor funções globalmente se necessário
    window.mobileMenu = {
      open: openMenu,
      close: closeMenu,
      toggle: toggleMenu
    };
  }
})();
