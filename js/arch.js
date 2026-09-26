/* ==========================================================================
   αrCH Inspired Interactive Script (arch.js)
   - Matrix / Dot Grid Canvas Background Animation
   - Fixed Sticky Header on Scroll
   - Interactive SVG Circle Button Hover Effects
   - Accordion for FAQ
   - Graceful Form Handling
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Matrix / Dot Grid Canvas Background
  const canvas = document.getElementById('matrix_canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const dots = [];
    const numDots = Math.floor((width * height) / 18000);

    for (let i = 0; i < numDots; i++) {
      dots.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.8
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.05 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw dots
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fill();
      }

      requestAnimationFrame(animate);
    }
    animate();
  }

  // 2. Fixed Header Scroll Trigger
  const fixedHeader = document.getElementById('fixed_header');
  if (fixedHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 350) {
        fixedHeader.classList.add('is_show');
      } else {
        fixedHeader.classList.remove('is_show');
      }
    });
  }

  // 3. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq_item_arch');
  faqItems.forEach(item => {
    const q = item.querySelector('.faq_q_arch');
    const a = item.querySelector('.faq_a_arch');
    if (q && a) {
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('is_open');
        faqItems.forEach(other => {
          other.classList.remove('is_open');
          const otherA = other.querySelector('.faq_a_arch');
          if (otherA) otherA.style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add('is_open');
          a.style.maxHeight = a.scrollHeight + 30 + 'px';
        }
      });
    }
  });

  // 4. Form Submission Handling
  const form = document.getElementById('archContactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'SENDING...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert('【無料受験相談・体験授業の予約を受け付けました】\n\nご入力いただいたメールアドレスへ、24時間以内に担当講師（堀安泰世）より個別面談日程のご案内をお送りいたします。');
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
        form.reset();
      }, 700);
    });
  }

  // 5. Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

});
