/* Presentation only. Inquiry, authentication and endpoint settings remain in their own modules. */
(() => {
  'use strict';
  const root = document.documentElement;
  const content = document.getElementById('container');
  const skeleton = document.getElementById('siteSkeleton');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (root.classList.contains('is-loading')) {
    content.inert = true;
    content.setAttribute('aria-busy', 'true');
  }
  const started = performance.now();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const hero = document.querySelector('.hero_scene');
  const heroReady = hero?.decode ? hero.decode().catch(() => {}) : Promise.resolve();
  const fontsReady = document.fonts?.ready || Promise.resolve();
  // Real assets gate the skeleton briefly, but slow networks never trap the page.
  Promise.all([Promise.race([heroReady, wait(1400)]), Promise.race([fontsReady, wait(900)])])
    .then(() => wait(Math.max(0, (reducedMotion.matches ? 0 : 420) - (performance.now() - started))))
    .then(() => {
      content.inert = false;
      content.removeAttribute('aria-busy');
      root.classList.add('loading_exit');
      return wait(reducedMotion.matches ? 0 : 350);
    }).then(() => {
      clearTimeout(window.sfcLoadingFallback);
      root.classList.remove('is-loading', 'loading_exit');
      root.classList.add('is-ready');
      content.inert = false;
      content.removeAttribute('aria-busy');
      if (skeleton) skeleton.hidden = true;
    });

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const reveals = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is_revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: .08, rootMargin: '0px 0px -15px 0px'});
    root.classList.add('motion_enabled');
    document.querySelectorAll('[data-reveal]').forEach(el => reveals.observe(el));
  }
  document.querySelectorAll('.features_grid_3,.challenges_balloon_grid,.steps_row_3,.flow_steps_vertical').forEach(group => {
    [...group.children].forEach((item, i) => item.style.setProperty('--reveal-delay', Math.min(i * 65, 195) + 'ms'));
  });
  const header = document.getElementById('siteHeader');
  const menu = document.getElementById('mobileMenu');
  const menuToggle = document.getElementById('menuToggle');
  function closeMenu(restoreFocus = false) {
    if (!menu || !menuToggle) return;
    menu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'メニューを開く');
    if (restoreFocus) menuToggle.focus();
  }
  menuToggle?.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'メニューを閉じる' : 'メニューを開く');
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) closeMenu(true); });
  document.addEventListener('pointerdown', e => { if (menu && !menu.hidden && !header.contains(e.target)) closeMenu(); });
  matchMedia('(min-width: 1025px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  const updateHeader = () => header?.classList.toggle('is_scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, {passive: true}); updateHeader();

  document.querySelectorAll('.faq_item_arch').forEach((item, i) => {
    const question = item.querySelector('.faq_q_arch');
    const answer = item.querySelector('.faq_a_arch');
    answer.id = 'faq-answer-' + i;
    question.setAttribute('aria-controls', answer.id);
    answer.setAttribute('role', 'region');
    question.id = 'faq-question-' + i;
    answer.setAttribute('aria-labelledby', question.id);

  });
  // Keep the open answer's measured height correct after rotation or text resizing.
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(entries => entries.forEach(({target}) => {
      const answer = target.parentElement;
      if (answer.parentElement.classList.contains('is_open')) answer.style.maxHeight = target.scrollHeight + 40 + 'px';
    }));
    document.querySelectorAll('.faq_a_inner').forEach(el => observer.observe(el));
  }
  const voicesToggle = document.getElementById('voicesToggle');
  voicesToggle?.addEventListener('click', () => {
    const paused = document.getElementById('voices').classList.toggle('is_paused');
    voicesToggle.setAttribute('aria-pressed', String(paused));
    voicesToggle.textContent = paused ? '動きを再開する ▷' : '動きを止める Ⅱ';
  });
  document.querySelectorAll('.hero_cta,.btn_cv,.btn_mega_cta,.btn_submit_arch,.email_contact_button,.btn_sticky_cta').forEach(button => {
    button.classList.add('liquid_button');
    button.addEventListener('pointerdown', e => {
      if (reducedMotion.matches) return;
      const box = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.hypot(box.width, box.height) * 2;
      ripple.className = 'press_ripple'; ripple.setAttribute('aria-hidden', 'true');
      Object.assign(ripple.style, {width:size+'px', height:size+'px', left:(e.clientX-box.left-size/2)+'px', top:(e.clientY-box.top-size/2)+'px'});
      button.append(ripple); setTimeout(() => ripple.remove(), 700);
    });
  });
  // The current public site uses a verified email contact until the teacher's GAS URL is supplied.
  // A configured endpoint reveals the protected receipt form without adding a second mobile action.
  const endpoint = window.SFC_CONFIG?.publicEndpoint || '';
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  const formCard = document.getElementById('webFormCard');
  const fallback = document.getElementById('emailContactFallback');
  const mobileAction = document.getElementById('mobileConsultationButton');
  const contactForm = document.getElementById('archContactForm');
  const submitButton = contactForm?.querySelector('button[type=submit]');
  const phone = matchMedia('(max-width: 768px)');
  let formVisible = false;
  function updateMobileAction() {
    if (!mobileAction || !configured) return;
    const sending = Boolean(submitButton?.disabled);
    mobileAction.querySelector('.sticky_cta_main').textContent = sending ? '送信中…' : formVisible ? '入力内容を送信する' : '無料学習相談に申し込む';
    mobileAction.querySelector('.sticky_cta_sub').textContent = formVisible ? '無料学習相談のお申し込み' : '完全無料・オンライン相談 →';
    mobileAction.setAttribute('aria-disabled', String(sending));
    mobileAction.href = '#archContactForm';
  }
  if (configured && formCard && fallback && mobileAction && contactForm) {
    formCard.hidden = false; fallback.hidden = true;
    const updateFormVisibility = () => {
      const box = contactForm.getBoundingClientRect();
      formVisible = box.top < innerHeight - 130 && box.bottom > 100;
      updateMobileAction();
    };
    addEventListener('scroll', updateFormVisibility, {passive:true});
    addEventListener('resize', updateFormVisibility, {passive:true});
    if (submitButton) new MutationObserver(updateMobileAction).observe(submitButton, {attributes:true,attributeFilter:['disabled']});
    mobileAction.addEventListener('click', e => {
      if (phone.matches && formVisible) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!submitButton?.disabled) contactForm.requestSubmit();
      }
    });
    updateFormVisibility();
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
    document.querySelectorAll('.feature_card_arch').forEach(card => {
      let frame;
      card.addEventListener('pointermove', e => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const bounds = card.getBoundingClientRect();
          card.style.setProperty('--light-x', (e.clientX-bounds.left)+'px');
          card.style.setProperty('--light-y', (e.clientY-bounds.top)+'px');
        });
      }, {passive:true});
    });
  }
})();
