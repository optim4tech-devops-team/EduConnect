const navToggle = document.querySelector('[data-nav-toggle]');
const navLinks = document.querySelectorAll('[data-nav-link]');
const demoForm = document.querySelector('#demo-request-form');
const sectionLinks = Array.from(document.querySelectorAll('[data-section-link]'));
const trackedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const revealTargets = Array.from(
  document.querySelectorAll(
    '.section-heading, .feature-card, .layer-card, .role-card, .how-card, .app-copy, .phone-mockup, .faq-item, .demo-copy, .demo-form, .closing-panel, .stats-strip',
  ),
);

const setActiveSection = (hash) => {
  sectionLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === hash;
    link.classList.toggle('is-active', isMatch);
    if (isMatch) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

if (window.location.hash) {
  setActiveSection(window.location.hash);
}

if ('IntersectionObserver' in window && trackedSections.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

      if (visibleEntries.length > 0) {
        setActiveSection(`#${visibleEntries[0].target.id}`);
      }
    },
    {
      rootMargin: '-22% 0px -58% 0px',
      threshold: [0.2, 0.35, 0.5, 0.7],
    },
  );

  trackedSections.forEach((section) => observer.observe(section));
}

revealTargets.forEach((item, index) => {
  item.classList.add('reveal-item');
  item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 80}ms`);
});

if ('IntersectionObserver' in window && revealTargets.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.14,
    },
  );

  revealTargets.forEach((item) => revealObserver.observe(item));
} else {
  revealTargets.forEach((item) => item.classList.add('is-visible'));
}

if (navToggle) {
  const setExpanded = (nextValue) => {
    document.body.classList.toggle('is-nav-open', nextValue);
    navToggle.setAttribute('aria-expanded', String(nextValue));
    navToggle.setAttribute('aria-label', nextValue ? 'Menüyü kapat' : 'Menüyü aç');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = document.body.classList.contains('is-nav-open');
    setExpanded(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const targetHash = link.getAttribute('href');
      if (targetHash?.startsWith('#')) {
        setActiveSection(targetHash);
      }
      setExpanded(false);
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) {
      setExpanded(false);
    }
  });
}

if (demoForm instanceof HTMLFormElement) {
  const submitButton = demoForm.querySelector('button[type="submit"]');
  const statusEl = demoForm.querySelector('[data-form-status]');

  const setFormStatus = (message, type) => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.classList.remove('is-success', 'is-error');
    statusEl.classList.add('is-visible', type === 'success' ? 'is-success' : 'is-error');
  };

  const setSubmitting = (isSubmitting) => {
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? 'Gönderiliyor...' : 'Demo Talep Et';
  };

  const resolveApiBase = () => {
    const configuredBase = window.NOTIO_API_BASE;
    if (typeof configuredBase === 'string' && configuredBase.trim()) {
      return configuredBase.replace(/\/$/, '');
    }

    const isLocalHost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    return isLocalHost ? 'http://127.0.0.1:5002/api' : 'https://apigw.notioedu.com/api';
  };

  const buildPayload = () => {
    const data = new FormData(demoForm);
    const contactName = String(data.get('contactName') || '').trim();
    const nameParts = contactName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || contactName;
    const lastName = nameParts.join(' ') || '-';

    return {
      firstName,
      lastName,
      schoolName: String(data.get('schoolName') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim() || null,
      studentCount: String(data.get('studentCount') || '').trim() || null,
      roleFocus: String(data.get('roleFocus') || '').trim() || null,
      city: null,
      notes: String(data.get('notes') || '').trim() || null,
      website: String(data.get('website') || '').trim() || null,
    };
  };

  const parseErrorMessage = async (response) => {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return parsed?.message || 'Demo talebi gönderilemedi. Lütfen tekrar deneyin.';
    } catch {
      return response.status === 429
        ? 'Kısa sürede çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.'
        : 'Demo talebi gönderilemedi. Lütfen tekrar deneyin.';
    }
  };

  demoForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const lastSubmittedAt = Number(window.localStorage.getItem('notio-demo-request-last-submit') || '0');
    if (Date.now() - lastSubmittedAt < 60_000) {
      setFormStatus('Talebinizi aldık. Tekrar göndermek için lütfen kısa bir süre bekleyin.', 'error');
      return;
    }

    const payload = buildPayload();
    if (!payload.schoolName || !payload.firstName || !payload.phone) {
      setFormStatus('Okul adı, ad soyad ve telefon alanlarını doldurmanız gerekiyor.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${resolveApiBase()}/demo-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      window.localStorage.setItem('notio-demo-request-last-submit', String(Date.now()));
      demoForm.reset();
      setFormStatus('Demo talebiniz alındı. Notio ekibi sizinle en kısa sürede iletişime geçecek.', 'success');
    } catch (error) {
      setFormStatus(error instanceof Error ? error.message : 'Demo talebi gönderilemedi. Lütfen tekrar deneyin.', 'error');
    } finally {
      setSubmitting(false);
    }
  });
}
