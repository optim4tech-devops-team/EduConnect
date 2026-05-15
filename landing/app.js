const navToggle = document.querySelector('[data-nav-toggle]');
const navLinks = document.querySelectorAll('[data-nav-link]');
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
    if (window.innerWidth > 860) {
      setExpanded(false);
    }
  });
}
