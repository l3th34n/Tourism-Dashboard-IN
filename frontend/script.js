/* India Tourism Dashboard — frontend interactions.
   Demo figures are deliberately NOT fabricated. Connect an approved data endpoint
   by setting window.TOURISM_API_URL before this script loads. */
(() => {
  'use strict';

  const DATA_URL = window.TOURISM_API_URL || '';
  const $ = (selector) => document.querySelector(selector);
  const stats = {
    foreignTourists: $('#foreign-tourists'),
    domesticTourists: $('#domestic-tourists'),
    tourismRevenue: $('#tourism-revenue'),
    topDestination: $('#top-destination')
  };

  // Data format expected from your own Flask API:
  // { source: '...', updatedAt: '2026-09-01',
  //   stats: { foreignTourists: {value: 9500000, unit: 'visits', year: 2025},
  //            domesticTourists: {...}, tourismRevenue: {...},
  //            topDestination: {value: '...', year: 2025} },
  //   arrivals: [{year: 2022, value: 123456}, ...],
  //   comparison: [{label: 'Domestic', value: 123}, ...],
  //   states: [{label: '...', value: 123}, ...] }
  // These example numbers describe the schema only, NOT real tourism figures.

  function setStatus(message) {
    Object.values(stats).forEach((el) => { if (el) el.textContent = message; });
  }

  function formatStat(item) {
    if (!item || item.value === undefined || item.value === null) return 'Not available';
    const value = typeof item.value === 'number'
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.value)
      : String(item.value);
    return [value, item.unit, item.year ? `(${item.year})` : ''].filter(Boolean).join(' ');
  }

  function renderStats(data) {
    Object.entries(stats).forEach(([key, el]) => {
      if (el) el.textContent = formatStat(data?.stats?.[key]);
    });
  }

  function createChart(containerId, records, type = 'bar') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(records) || !records.length) {
      container.textContent = 'Chart data is not available yet.';
      return;
    }
    const cleaned = records
      .map((r) => ({ label: String(r.label ?? r.year ?? ''), value: Number(r.value) }))
      .filter((r) => r.label && Number.isFinite(r.value) && r.value >= 0)
      .slice(0, 20);
    if (!cleaned.length) {
      container.textContent = 'No valid chart data available.';
      return;
    }
    const max = Math.max(...cleaned.map((r) => r.value), 1);
    const chart = document.createElement('div');
    chart.className = 'js-chart';
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', cleaned.map((r) => `${r.label}: ${r.value}`).join('; '));
    Object.assign(chart.style, { display: 'grid', gap: '12px', width: '100%', alignSelf: 'stretch' });
    cleaned.forEach(({ label, value }) => {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'grid', gridTemplateColumns: 'minmax(70px, 1fr) 3fr auto', alignItems: 'center', gap: '10px', fontSize: '13px' });
      const name = document.createElement('span');
      name.textContent = label;
      const track = document.createElement('div');
      Object.assign(track.style, { height: type === 'line' ? '12px' : '18px', background: '#e6edf3', borderRadius: '12px', overflow: 'hidden' });
      const bar = document.createElement('div');
      Object.assign(bar.style, { height: '100%', width: `${(value / max) * 100}%`, background: '#13805e', borderRadius: '12px', transition: 'width .5s ease' });
      track.append(bar);
      const number = document.createElement('strong');
      number.textContent = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
      row.append(name, track, number);
      chart.append(row);
    });
    container.append(chart);
  }

  function renderData(data) {
    renderStats(data);
    createChart('tourist-arrival-chart', data.arrivals, 'line');
    createChart('domestic-foreign-chart', data.comparison);
    createChart('state-tourism-chart', data.states);
  }

  async function loadTourismData() {
    if (!DATA_URL) {
      setStatus('Connect API to view data');
      ['tourist-arrival-chart', 'domestic-foreign-chart', 'state-tourism-chart']
        .forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = 'Official data will appear after API integration.';
        });
      return;
    }
    setStatus('Loading data…');
    try {
      const response = await fetch(DATA_URL, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data !== 'object' || !data.stats) throw new Error('Unexpected API response');
      renderData(data);
    } catch (error) {
      console.error('Tourism API error:', error);
      setStatus('Data temporarily unavailable');
      ['tourist-arrival-chart', 'domestic-foreign-chart', 'state-tourism-chart']
        .forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = 'Unable to load chart data.'; });
    }
  }

  // Interactive data-explorer buttons: scroll to relevant existing charts.
  const explorerTargets = [
    '#tourist-arrival-chart', '#domestic-foreign-chart',
    '#state-tourism-chart', '#statistics', '#tourist-arrival-chart'
  ];
  document.querySelectorAll('#data-explorer button').forEach((button, index) => {
    button.type = 'button';
    button.addEventListener('click', () => {
      document.querySelectorAll('#data-explorer button').forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
        b.style.background = '';
        b.style.color = '';
      });
      button.setAttribute('aria-pressed', 'true');
      button.style.background = '#13805e';
      button.style.color = '#ffffff';
      const target = document.querySelector(explorerTargets[index]);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (index === 3 || index === 4) {
        const note = document.getElementById('explorer-note') || document.createElement('p');
        note.id = 'explorer-note';
        note.setAttribute('role', 'status');
        note.textContent = 'Detailed revenue and monthly views require additional API data.';
        document.getElementById('data-explorer')?.append(note);
      }
    });
  });

  // Font-size controls in the government accessibility bar.
  const fontLinks = Array.from(document.querySelectorAll('.gov-bar a'));
  let fontScale = 100;
  fontLinks.forEach((link) => {
    const action = link.textContent.trim();
    if (!['A-', 'A', 'A+'].includes(action)) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      fontScale = action === 'A' ? 100 : Math.min(125, Math.max(85, fontScale + (action === 'A+' ? 5 : -5)));
      document.documentElement.style.fontSize = `${fontScale}%`;
    });
  });

  // The contact form needs a backend. Do not pretend a message was submitted.
  const contactForm = document.querySelector('#contact form');
  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    let message = document.getElementById('contact-status');
    if (!message) {
      message = document.createElement('p');
      message.id = 'contact-status';
      message.setAttribute('role', 'status');
      contactForm.append(message);
    }
    message.textContent = 'Contact form is not connected yet. Please add a backend endpoint before accepting messages.';
  });

  // Avoid dead destination links until destination pages are created.
  document.querySelectorAll('.destination-container a[href="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.open('https://www.incredibleindia.gov.in/', '_blank', 'noopener,noreferrer');
    });
  });

  loadTourismData();
})();

/* ==================================================
   CINEMATIC SCROLL ENHANCEMENT
   Standalone block; preserves all existing dashboard JS.
================================================== */
(() => {
  'use strict';

  const section = document.querySelector('.photo-story');
  const photo = document.querySelector('.photo-story__image');
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (!section || !photo || prefersReducedMotion ||
      !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('has-scroll-motion');

  // Reveal the caption and headline once the photo is in view.
  const storyObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.18 });
  storyObserver.observe(section);

  // Give the existing dashboard cards a staggered entrance.
  const cards = document.querySelectorAll(
    '.stat-card, .chart-container article, .destination-container article'
  );
  const cardObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  cards.forEach((card, index) => {
    card.classList.add('scroll-reveal');
    card.style.setProperty('--reveal-delay', `${(index % 4) * 90}ms`);
    cardObserver.observe(card);
  });

  // Parallax: shift the oversized image slightly as the user scrolls.
  // requestAnimationFrame prevents redundant work during rapid scrolling.
  let framePending = false;

  function paintParallax() {
    framePending = false;
    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.bottom <= 0 || rect.top >= viewportHeight) return;

    const progress = (viewportHeight - rect.top) /
      (viewportHeight + rect.height);
    const shift = Math.max(-55, Math.min(55, (progress - 0.5) * 110));
    photo.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
  }

  function queueParallax() {
    if (!framePending) {
      framePending = true;
      window.requestAnimationFrame(paintParallax);
    }
  }

  window.addEventListener('scroll', queueParallax, { passive: true });
  window.addEventListener('resize', queueParallax);
  queueParallax();
})();
