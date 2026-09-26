/* ==========================================================================
   Syntax English - Common JavaScript (main.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. FAQ Accordion (.faq-box & .faq-item)
  const faqBoxes = document.querySelectorAll('.faq-box, .faq-item');
  faqBoxes.forEach(item => {
    const question = item.querySelector('.faq-q, .faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqBoxes.forEach(other => {
          other.classList.remove('open');
          const ans = other.querySelector('.faq-a, .faq-answer');
          if (ans) ans.style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add('open');
          const answer = item.querySelector('.faq-a, .faq-answer');
          if (answer) {
            answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
          }
        }
      });
    }
  });

  // 2. Modal Open / Close
  const modal = document.getElementById('consultationModal');
  const openButtons = document.querySelectorAll('.js-open-modal');
  const closeButton = document.querySelector('.modal-close');

  if (modal) {
    openButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const campus = btn.getAttribute('data-campus') || document.body.getAttribute('data-current-campus') || '難関私大';
        const targetInput = modal.querySelector('input[name="targetCampus"]');
        if (targetInput) targetInput.value = campus;
        modal.style.display = 'flex';
      });
    });

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // 3. Form Submit Handling (Mock with graceful feedback)
  const handleFormSubmit = (form) => {
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = '送信中...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert('【無料体験・個別相談のご予約を受け付けました】\n\nご入力いただいた連絡先へ、24時間以内に担当講師より個別面談日程のご案内をお送りいたします。');
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
        form.reset();
        if (modal) modal.style.display = 'none';
      }, 800);
    });
  };

  handleFormSubmit(document.getElementById('consultForm'));
  handleFormSubmit(document.getElementById('inlineConsultForm'));

  // 4. Smooth Anchor Scrolling
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
