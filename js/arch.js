/* ==========================================================================
   SFC English Masterclass — Awwwards / Webby / FWA Interactive Engine
   - 60fps Matrix / Dot Grid Canvas Background
   - Dynamic Scroll Progress Indicator
   - IntersectionObserver Reveal & Stagger Animation
   - Intelligent Numbers CountUp Engine
   - Glassmorphic Fixed Header Controller
   - Smooth Accordion Animation
   - Form Submission UX
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Scroll Progress Bar
  const progressBar = document.getElementById('scrollProgressBar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    });
  }

  // 2. Matrix / Dot Grid Canvas Background (Light, Performant, Non-distracting)
  const canvas = document.getElementById('matrix_canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 150);
    });

    const dots = [];
    const numDots = Math.min(Math.floor((width * height) / 22000), 55);

    for (let i = 0; i < numDots; i++) {
      dots.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.4 + 0.8
      });
    }

    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    function animate() {
      if (!isVisible) {
        requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw subtle connective threads
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.04 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw dot points
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        dot.x += dot.vx;
        dot.y += dot.vy;

        if (dot.x < 0) dot.x = width;
        if (dot.x > width) dot.x = 0;
        if (dot.y < 0) dot.y = height;
        if (dot.y > height) dot.y = 0;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fill();
      }

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // 3. Fixed Sticky Header Controller
  const fixedHeader = document.getElementById('fixed_header');
  if (fixedHeader) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 400) {
        fixedHeader.classList.add('is_show');
      } else {
        fixedHeader.classList.remove('is_show');
      }
      lastScroll = currentScroll;
    });
  }

  // 4. Scroll Reveal Animation Engine (IntersectionObserver)
  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is_revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is_revealed'));
  }

  // 5. Intelligent Numbers CountUp Engine
  const counterElements = document.querySelectorAll('.metric_num[data-count]');
  let countersStarted = false;

  function runCounters() {
    if (countersStarted) return;
    countersStarted = true;

    counterElements.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-count'), 10);
      const duration = 1600; // ms
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * target);

        counter.innerText = currentVal.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.innerText = target.toLocaleString();
        }
      }

      requestAnimationFrame(updateCounter);
    });
  }

  const metricsSection = document.getElementById('metrics');
  if (metricsSection && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounters();
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    counterObserver.observe(metricsSection);
  } else {
    runCounters();
  }

  // 6. Smooth FAQ Accordion
  const faqItems = document.querySelectorAll('.faq_item_arch');
  faqItems.forEach(item => {
    const q = item.querySelector('.faq_q_arch');
    const a = item.querySelector('.faq_a_arch');
    if (q && a) {
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('is_open');
        
        // Close others
        faqItems.forEach(other => {
          if (other !== item && other.classList.contains('is_open')) {
            other.classList.remove('is_open');
            const otherA = other.querySelector('.faq_a_arch');
            if (otherA) otherA.style.maxHeight = null;
          }
        });

        if (!isOpen) {
          item.classList.add('is_open');
          a.style.maxHeight = a.scrollHeight + 40 + 'px';
        } else {
          item.classList.remove('is_open');
          a.style.maxHeight = null;
        }
      });
    }
  });

  // 7. Form Submission UX
  const form = document.getElementById('archContactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const submitText = submitBtn.querySelector('.btn_submit_text') || submitBtn;
      const originalText = submitText.innerText;

      submitText.innerText = 'PROCESSING REQUEST...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert('【無料学習相談のお申し込みを受け付けました】\n\nご登録いただいたメールアドレスへ、原則24時間以内に担当講師（堀安泰世）より日程調整のご案内をお送りいたします。\n現在の学力や教材、学習状況に合わせた最適なアドバイスをお伝えします。');
        submitText.innerText = originalText;
        submitBtn.disabled = false;
        form.reset();
      }, 600);
    });
  }

  // 8. Smooth Anchor Navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 70;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // 9. Interactive Concept Bubbles (Hover & Click & Touch Support)
  const bubbleItems = document.querySelectorAll('.concept_bubble_item');
  if (bubbleItems.length > 0) {
    function setBubbleExpanded(targetItem, expand = true) {
      if (expand) {
        bubbleItems.forEach(item => {
          if (item !== targetItem) {
            item.classList.remove('is_expanded');
            const head = item.querySelector('.bubble_bubble_head');
            if (head) head.setAttribute('aria-expanded', 'false');
          }
        });
        targetItem.classList.add('is_expanded');
        const head = targetItem.querySelector('.bubble_bubble_head');
        if (head) head.setAttribute('aria-expanded', 'true');
      } else {
        targetItem.classList.remove('is_expanded');
        const head = targetItem.querySelector('.bubble_bubble_head');
        if (head) head.setAttribute('aria-expanded', 'false');
      }
    }

    bubbleItems.forEach(item => {
      // クリック / タップによる切り替え
      item.addEventListener('click', () => {
        const isCurrentlyExpanded = item.classList.contains('is_expanded');
        if (!isCurrentlyExpanded) {
          setBubbleExpanded(item, true);
        } else {
          setBubbleExpanded(item, false);
        }
      });

      // キーボード操作対応 (Enter / Space)
      const head = item.querySelector('.bubble_bubble_head');
      if (head) {
        head.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isCurrentlyExpanded = item.classList.contains('is_expanded');
            setBubbleExpanded(item, !isCurrentlyExpanded);
          }
        });
      }

      // PCカーソルホバー対応（マウス操作時にホワッと展開）
      item.addEventListener('mouseenter', () => {
        if (window.innerWidth > 768) {
          setBubbleExpanded(item, true);
        }
      });
    });
  }

});
