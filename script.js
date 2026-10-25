/* ==========================================================================
   VANTAGE — script.js   (plain JavaScript, no framework)

   Loaded with `defer` from <head>, so it runs after the page is parsed.
   It only declares functions/variables until DOMContentLoaded fires.
   ========================================================================== */

/* ==========================================================================
   SETTINGS — who receives the investor messages
   --------------------------------------------------------------------------
   The contact form emails Dennis through FormSubmit (formsubmit.co), a free
   form-to-email service, so you do not need a server of your own.

   ONE-TIME SETUP
   1. Put Dennis's real email address between the quotes below.
   2. Publish the site, open it, and send one test message through the form.
   3. FormSubmit emails Dennis an "Activate Form" link. He clicks it once.
   From then on every investor message lands in his inbox. The investor's own
   address is set as Reply-To, so Dennis can simply press Reply.
   ========================================================================== */
const DENNIS_EMAIL = 'PUT-DENNIS-EMAIL-HERE';

/* ==========================================================================
   Simulation state
   ========================================================================== */
let isBranched = false;
let isCommitted = false;
let autoFlowInterval = null;
let lastFocusedElement = null;
let boardroomTimer = null;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const milestonesData = [
  { id: 0, title: "Legal & CAC Registration", status: "DONE (Wk 0)", progress: 100, conf: 99, notes: "CAC completed in Port Harcourt, Nigeria." },
  { id: 1, title: "Brand Identity & Architecture", status: "DONE (Wk 2)", progress: 100, conf: 98, notes: "Deep Mode aesthetic & typography established." },
  { id: 2, title: "Wave MVP", status: "LIVE (Wk 8)", progress: 75, conf: 87, notes: "POC deployed (password-protected, access on request)." },
  { id: 3, title: "Global Beta Launch", status: "PLANNED (Q3)", progress: 25, conf: 67, notes: "Original target. High engineering contention flagged." },
  { id: 4, title: "Funding Round", status: "HORIZON (Q4)", progress: 5, conf: 41, notes: "Pitch materials queued. Gated on Phase 2 traction proof points." },
  { id: 5, title: "RAG Knowledge Layer", status: "NEXT (Wk 14)", progress: 10, conf: 58, notes: "Domain knowledge base scoped. Scheduled after the beta feedback loop." }
];

/* ==========================================================================
   Node selection / inspector pill
   Shared by the SVG wave nodes and the milestone cards below the wave —
   whichever one is clicked, both get highlighted via [data-node-index].
   ========================================================================== */
/* On narrow screens the wave scrolls sideways; keep the selected node in view. */
function centerNodeInWave(index) {
  const box = document.querySelector('.wave-scroll');
  const node = document.querySelector(`svg [data-node-index="${index}"]`);
  if (!box || !node || box.scrollWidth <= box.clientWidth) return;
  const b = box.getBoundingClientRect(), n = node.getBoundingClientRect();
  box.scrollTo({ left: box.scrollLeft + (n.left + n.width / 2) - (b.left + b.width / 2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function selectNode(index) {
  const data = milestonesData[index];
  if (!data) return;

  const pillTitle = document.getElementById('pillNodeTitle');
  const pillStatus = document.getElementById('pillNodeStatus');
  const aiStatus = document.getElementById('aiStatusText');

  if (pillTitle) pillTitle.innerText = data.title;
  if (pillStatus) pillStatus.innerText = `Status: ${data.status} • Sample conf: ${data.conf}% • Progress: ${data.progress}%`;
  if (aiStatus) aiStatus.innerText = `Interrogating node: "${data.title}" -> ${data.notes}`;

  centerNodeInWave(index);
  document.querySelectorAll('[data-node-index]').forEach((el) => {
    el.classList.toggle('is-focused-node', Number(el.dataset.nodeIndex) === index);
  });
}

/* ==========================================================================
   Scenario branching
   ========================================================================== */
const BASE_PATH = 'M 20,160 Q 150,110 270,160 T 520,160 T 770,160 T 980,160';
const COMMIT_PATH = 'M 20,160 Q 150,110 270,160 T 520,160 Q 640,60 760,110 T 980,90';
const BRANCH_LABEL = '<span class="amber-dot"></span> Sprout Scenario Branch (Pivot +3 Mo)';
const $ = (id) => document.getElementById(id);

/* One render function reads isBranched / isCommitted and updates every
   dependent element, so repeated toggle/commit/reset cannot drift apart. */

/* ==========================================================================
   Visual effects: header shrink and scroll reveal.
   Purely presentational; disabled for reduced motion where it animates.
   ========================================================================== */
function initEffects() {
  const reduce = prefersReducedMotion();
  const header = document.querySelector('.header-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  const SPOT = '.glass-panel:not(.header-header),.glass-panel-glow,.vx-card,.vx-panel,.info-card,.investor-stat,.investor-card-2,.investor-card-3,.investor-card-4,.investor-fund,.pillars-card-5,.simulation-card-2,.vx-preview';
  const skip = (el) => el.closest('#contactModal') || el.closest('header');
  if (reduce || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll(SPOT + ', main h2, .vx-steps li, .vx-eyebrow')]
    .filter((el) => !skip(el) && !el.closest('.vx-hero'));
  document.documentElement.classList.add('vx-fx');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('vx-in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  targets.forEach((el, i) => {
    el.classList.add('vx-reveal');
    el.style.setProperty('--d', ((i % 4) * 0.07) + 's');
    io.observe(el);
  });
}

function renderScenario(message) {
  const show = (id, on, display) => { const el = $(id); if (el) el.style.display = on ? display : 'none'; };
  const branchPath = $('branchWavePath');
  if (branchPath) {
    branchPath.style.opacity = (isBranched && !isCommitted) ? '1' : '0';
    if (isBranched) branchPath.setAttribute('stroke-dashoffset', '0');
  }
  show('branchNode1', isBranched && !isCommitted, 'block');
  show('branchNode2', isBranched && !isCommitted, 'block');
  show('branchLegend', isBranched && !isCommitted, 'flex');
  show('commitBranchBtn', isBranched && !isCommitted, 'inline-flex');

  const primary = $('primaryWavePath');
  if (primary) {
    primary.setAttribute('d', isCommitted ? COMMIT_PATH : BASE_PATH);
    primary.setAttribute('stroke', isCommitted ? '#43D6A0' : 'url(#cyanGradient)');
  }
  const conf = $('statConfidence');
  if (conf) {
    conf.innerText = isBranched ? '92%' : '87%';
    conf.classList.toggle('stat-value--green', isBranched);
    conf.classList.toggle('stat-value--blue', !isBranched);
    conf.title = 'Illustrative demo value, not a validated prediction';
  }
  const inProg = $('statInProgress');
  if (inProg) inProg.innerText = isBranched ? '5' : '4';

  const toggle = $('toggleBranchBtn');
  if (toggle) {
    toggle.classList.toggle('is-active', isBranched && !isCommitted);
    toggle.disabled = isCommitted;
    toggle.setAttribute('aria-pressed', String(isBranched));
    toggle.innerHTML = isCommitted ? 'Scenario committed (reset to explore again)'
      : isBranched ? '<span class="amber-dot"></span> Branch Active (Collapse)' : BRANCH_LABEL;
  }
  const commit = $('commitBranchBtn');
  if (commit) commit.classList.toggle('is-committed', isCommitted);

  if (message) {
    const ai = $('aiStatusText');
    if (ai) ai.innerText = message;
  }
}

function toggleScenarioBranch() {
  if (isCommitted) return;
  isBranched = !isBranched;
  renderScenario(isBranched
    ? 'Illustrating Scenario B (+3 Mo R&D). Confidence rises from 67% to 92% in this demo (illustrative, not a validated prediction).'
    : 'Baseline plan restored (illustrative demo, 0 conflicts).');
}

function commitBranchScenario() {
  if (!isBranched || isCommitted) return;
  isCommitted = true;
  renderScenario('Scenario B committed as the primary path (illustrative). Reset to return to the baseline.');
  const t = $('pillNodeTitle'), s = $('pillNodeStatus');
  if (t) t.innerText = 'Committed: +3 Mo Refined Architecture';
  if (s) s.innerText = 'Primary timeline • Illustrative confidence 92%';
}

function resetSimulation() {
  clearTimeout(boardroomTimer);
  if (autoFlowInterval) { clearInterval(autoFlowInterval); autoFlowInterval = null; }
  const auto = $('autoFlowBtn');
  if (auto) { auto.innerText = '\u25B6 Auto Flow'; auto.setAttribute('aria-pressed', 'false'); }
  isBranched = false;
  isCommitted = false;
  const sc = $('waveScrubber');
  if (sc) sc.value = 45;
  applyPhaseFilter('all');
  selectNode(2);
  renderScenario('Simulation reset to baseline plan.');
}

/* ==========================================================================
   Phase filter — highlights matching milestones and dims the rest.
   Phase mapping follows the roadmap section; confirm it before launch.
   ========================================================================== */
const PHASE_OF = { 0: 'pre', 1: 'pre', 2: 'p1', 3: 'p2', 5: 'p3', 4: 'p3' };
const PHASE_NAME = { all: 'All milestones', pre: 'Pre-launch', p1: 'Phase 1', p2: 'Phase 2', p3: 'Phase 3' };

function applyPhaseFilter(key) {
  document.querySelectorAll('[data-phase-filter]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.phaseFilter === key));
  });
  let matches = 0;
  document.querySelectorAll('[data-node-index]').forEach((el) => {
    const hit = key === 'all' || PHASE_OF[Number(el.dataset.nodeIndex)] === key;
    el.classList.toggle('is-dimmed', !hit);
    if (hit && el.classList.contains('milestone-card')) matches++;
  });
  const note = $('phaseFilterStatus');
  if (note) note.textContent = key === 'all' ? 'Showing all milestones.'
    : matches ? `Highlighting ${matches} milestone${matches > 1 ? 's' : ''} in ${PHASE_NAME[key]}; others are dimmed.`
    : `No milestones in ${PHASE_NAME[key]} yet.`;
}

function handleScrubber(val) {
  val = Math.max(0, Math.min(100, Number(val) || 0));
  const primaryPath = document.getElementById('primaryWavePath');
  if (primaryPath) {
    const waveOffset = Math.sin(val / 10) * 20;
    primaryPath.setAttribute('d', `M 20,160 Q 150,${110 + waveOffset} 270,160 T ${500 + val * 0.4},160 T 770,160 T 980,160`);
  }
  const nodeIndex = Math.min(3, Math.floor((val / 100) * 4));
  selectNode(nodeIndex);
}

function stepWave(dir) {
  const scrubber = document.getElementById('waveScrubber');
  if (!scrubber) return;
  let val = parseInt(scrubber.value, 10) + (dir * 25);
  if (val < 0) val = 0;
  if (val > 100) val = 100;
  scrubber.value = val;
  handleScrubber(val);
}

function autoFlowSimulation() {
  const btn = document.getElementById('autoFlowBtn');
  const scrubber = document.getElementById('waveScrubber');
  if (!btn || !scrubber) return;

  if (autoFlowInterval) {
    clearInterval(autoFlowInterval);
    autoFlowInterval = null;
    btn.innerText = "▶ Auto Flow";
    btn.setAttribute('aria-pressed', 'false');
  } else {
    if (prefersReducedMotion()) {
      const aiStatus = document.getElementById('aiStatusText');
      if (aiStatus) aiStatus.innerText = "Auto flow is off because reduced motion is enabled. Use Step or the timeline slider.";
      return;
    }
    btn.innerText = "⏸ Pause Flow";
    btn.setAttribute('aria-pressed', 'true');
    autoFlowInterval = setInterval(() => {
      const val = (parseInt(scrubber.value, 10) + 2) % 100;
      scrubber.value = val;
      handleScrubber(val);
    }, 100);
  }
}

function simulateBoardroomExchange() {
  scrollToDemo();
  const aiStatus = document.getElementById('aiStatusText');
  if (aiStatus) aiStatus.innerText = "Board Member: 'What if we delay global launch by 3 months to focus on R&D?'";
  clearTimeout(boardroomTimer);
  boardroomTimer = setTimeout(() => {
    if (!isBranched) toggleScenarioBranch();
  }, prefersReducedMotion() ? 0 : 1000);
}

function scrollToDemo() {
  if (isMenuLayout() && scrollToSection('simulation', { updateHash: false })) return;   // phones/tablets: land exactly on the section top
  const el = document.getElementById('simulation');
  if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* ==========================================================================
   Contact modal — open/close, focus handling, submit
   ========================================================================== */
function openContactModal(triggerEl) {
  lastFocusedElement = triggerEl || document.activeElement;
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.classList.add('is-open');
  const errorBox = document.getElementById('formError');
  if (errorBox) errorBox.classList.remove('is-visible');
  modal.setAttribute('aria-hidden', 'false');
  setBackgroundInert(true);
  const firstField = modal.querySelector('input, textarea, select');
  if (firstField) firstField.focus();
}

function setBackgroundInert(on) {
  ['main-content'].forEach((id) => { const el = document.getElementById(id); if (el) el.inert = on; });
  document.querySelectorAll('header, footer').forEach((el) => { el.inert = on; });
  document.body.style.overflow = on ? 'hidden' : '';
}

function trapModalFocus(e) {
  const modal = document.getElementById('contactModal');
  if (e.key !== 'Tab' || !modal || !modal.classList.contains('is-open')) return;
  const f = [...modal.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  setBackgroundInert(false);
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

/* Sends the form to Dennis's inbox. While sending, the button is locked so the
   message cannot be sent twice. If sending fails, the visitor keeps what they
   typed and gets a "email Dennis directly" link as a back-up. */
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function showLeadSuccess(form, feedback) {
  form.style.display = 'none';
  feedback.classList.add('is-visible');
  setTimeout(() => {
    closeContactModal();
    form.reset();
    form.style.display = 'block';
    feedback.classList.remove('is-visible');
  }, 3000);
}

function showLeadError(errorBox, lead) {
  errorBox.textContent = '';
  if (!isValidEmail(DENNIS_EMAIL)) {
    errorBox.textContent = "Email delivery is not set up yet. Add Dennis's email address at the top of script.js (DENNIS_EMAIL).";
  } else {
    const subject = `VANTAGE investor enquiry from ${lead.name}`;
    const body = `Name: ${lead.name}\nEmail: ${lead.email}\nInterest: ${lead.role}\n\n${lead.note}`;
    const link = document.createElement('a');
    link.textContent = 'email Dennis directly';
    link.href = `mailto:${DENNIS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    errorBox.append('We could not send your message. Please try again, or ', link, '.');
  }
  errorBox.classList.add('is-visible');
}

async function handleLeadSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('leadForm');
  const feedback = document.getElementById('formFeedback');
  const errorBox = document.getElementById('formError');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  if (!form || !feedback || !errorBox || !submitBtn) return;

  const roleSelect = document.getElementById('leadRole');
  const lead = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    role: roleSelect ? roleSelect.options[roleSelect.selectedIndex].text : '',
    note: form.elements.note.value.trim() || '(no note)',
  };

  errorBox.classList.remove('is-visible');
  if (form.elements._honey.value) { showLeadSuccess(form, feedback); return; }   // spam trap: people never fill it
  if (!form.elements.consent || !form.elements.consent.checked) {
    errorBox.textContent = 'Please tick the consent box so we can store your details and reply.';
    errorBox.classList.add('is-visible');
    if (form.elements.consent) form.elements.consent.focus();
    return;
  }
  if (!isValidEmail(DENNIS_EMAIL)) { showLeadError(errorBox, lead); return; }

  const idleLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);   // give up after 15 seconds

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${DENNIS_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        role: lead.role,
                message: lead.note,
        consent: 'yes',

        _replyto: lead.email,
        _subject: `VANTAGE investor enquiry from ${lead.name}`,
        _template: 'table',
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || String(result.success) !== 'true') throw new Error(result.message || `HTTP ${response.status}`);
    showLeadSuccess(form, feedback);
  } catch (err) {
    console.error('Investor form: message was not sent.', err);
    showLeadError(errorBox, lead);
  } finally {
    clearTimeout(timer);
    submitBtn.disabled = false;
    submitBtn.textContent = idleLabel;
  }
}

/* ==========================================================================
   Mobile / tablet navigation menu
   ========================================================================== */
function toggleMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  const isOpen = menu.classList.toggle('is-open');
  btn.setAttribute('aria-expanded', String(isOpen));
  menu.setAttribute('aria-hidden', String(!isOpen));
}

function closeMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  menu.classList.remove('is-open');
  btn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
}

/* ==========================================================================
   In-page navigation (phones and tablets, where the menu is a drop-down)

   Problem this solves: the browser works out where to scroll while the menu
   is still open, then the menu collapses and everything above the target
   moves up, so the page lands hundreds of pixels too far down.
   Fix: close the menu first (no animation), measure the final layout, then
   scroll so the TOP of the section sits just below the sticky header.
   On wide screens (full nav bar, no drop-down) the browser's own anchor
   scrolling is left alone.
   ========================================================================== */
const NAV_MENU_QUERY = '(max-width: 1279px)';
const NAV_GAP = 24;   // space between the header and the section top (px); leaves room for the numbered section marker

function isMenuLayout() {
  return window.matchMedia(NAV_MENU_QUERY).matches;
}

/* Distance from the top of the screen to the bottom of the (closed) sticky header, plus a gap */
function getNavOffset() {
  const header = document.querySelector('.header-header');
  if (!header) return NAV_GAP;
  const menu = document.getElementById('mobileMenu');
  const openExtra = menu && menu.classList.contains('is-open') ? menu.offsetHeight : 0;
  const stickyTop = parseFloat(getComputedStyle(header).top) || 0;
  return Math.round(stickyTop + header.offsetHeight - openExtra + NAV_GAP);
}

/* Collapse the menu immediately so the page layout is final before we measure */
function closeMenuInstantly() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  menu.style.transition = 'none';
  closeMobileMenu();
  void menu.offsetHeight;          // force the collapse to apply now
  menu.style.transition = '';      // bring the slide animation back for next time
}

function scrollToSection(id, options = {}) {
  const target = document.getElementById(id);
  if (!target) return false;
  closeMenuInstantly();

  const offset = getNavOffset();                                   // header bottom + gap (the hero goes to the very top instead)
  const destination = () => (id === 'vision' ? 0 : Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - offset)));
  window.scrollTo({ top: destination(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  /* If something nudged the layout while scrolling (fonts, images), correct a small miss.
     A bigger gap means the person scrolled away on purpose, so we leave it alone. */
  setTimeout(() => {
    const miss = destination() - Math.round(window.scrollY);
    if (Math.abs(miss) > 2 && Math.abs(miss) < 160) window.scrollTo({ top: destination(), behavior: 'auto' });
  }, 950);

  if (options.updateHash !== false && window.location.hash !== `#${id}`) {
    history.pushState(null, '', `#${id}`);
  }

  /* Keyboard and screen-reader users: move focus to the section without a visible ring */
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.style.outline = 'none';
    target.addEventListener('blur', () => { target.removeAttribute('tabindex'); target.style.outline = ''; }, { once: true });
  }
  target.focus({ preventScroll: true });
  return true;
}

function initAnchorNavigation() {
  const keepOffsetInSync = () => {
    /* The browser also uses this offset for #links on page load and for Tab focus.
       On wide screens the stylesheet's own value stays in charge. */
    document.documentElement.style.scrollPaddingTop = isMenuLayout() ? `${getNavOffset()}px` : '';
  };
  keepOffsetInSync();
  window.addEventListener('resize', keepOffsetInSync, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (hash.length < 2 || hash === '#main-content') return;                // "skip to content" keeps its normal behaviour
      if (!isMenuLayout()) return;                                            // full nav bar: browser handles it
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (scrollToSection(hash.slice(1))) e.preventDefault();
    });
  });
}

/* ==========================================================================
   Scrollspy — highlights the nav link for the section in view
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  if (!sections.length || !navLinks.length || !('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach((section) => observer.observe(section));
}

/* ==========================================================================
   Back to top
   ========================================================================== */
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 700);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==========================================================================
   Keyboard support for the SVG wave nodes (milestone cards are real
   <button> elements, so Enter/Space already work on them natively)
   ========================================================================== */
function initWaveNodeKeyboardSupport() {
  document.querySelectorAll('#waveSvg [data-node-index]').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectNode(Number(el.dataset.nodeIndex));
      }
    });
  });
}

/* ==========================================================================
   Init
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);

  document.querySelectorAll('#mobileMenu a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  const contactModal = document.getElementById('contactModal');
  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) closeContactModal();
    });
  }

  document.querySelectorAll('.milestone-card[data-node-index]').forEach((card) => {
    card.addEventListener('click', () => selectNode(Number(card.dataset.nodeIndex)));
  });

  document.querySelectorAll('[data-phase-filter]').forEach((btn) => btn.addEventListener('click', () => applyPhaseFilter(btn.dataset.phaseFilter)));
  applyPhaseFilter('all');
  renderScenario();
  initEffects();
  initAnchorNavigation();
  initScrollSpy();
  initBackToTop();
  initWaveNodeKeyboardSupport();
  selectNode(2);
});

window.addEventListener('keydown', trapModalFocus);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContactModal();
});