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

const milestonesData = [
  { id: 0, title: "Legal & CAC Registration", status: "DONE (Wk 0)", progress: 100, conf: 99, notes: "CAC completed in Port Harcourt, Nigeria." },
  { id: 1, title: "Brand Identity & Architecture", status: "DONE (Wk 2)", progress: 100, conf: 98, notes: "Deep Mode aesthetic & typography established." },
  { id: 2, title: "Engine MVP & POC Wave", status: "LIVE (Wk 8)", progress: 75, conf: 87, notes: "picadashboard.netlify.app active and tested." },
  { id: 3, title: "Global Beta Launch", status: "PLANNED (Q3)", progress: 25, conf: 67, notes: "Original target. High engineering contention flagged." },
  { id: 4, title: "Series A Fundraise", status: "HORIZON (Q4)", progress: 5, conf: 41, notes: "Pitch materials queued. Gated on Phase 2 traction proof points." },
  { id: 5, title: "RAG Knowledge Layer", status: "NEXT (Wk 14)", progress: 10, conf: 58, notes: "Domain knowledge base scoped. Scheduled after the beta feedback loop." }
];

/* ==========================================================================
   Node selection / inspector pill
   Shared by the SVG wave nodes and the milestone cards below the wave —
   whichever one is clicked, both get highlighted via [data-node-index].
   ========================================================================== */
function selectNode(index) {
  const data = milestonesData[index];
  if (!data) return;

  const pillTitle = document.getElementById('pillNodeTitle');
  const pillStatus = document.getElementById('pillNodeStatus');
  const aiStatus = document.getElementById('aiStatusText');

  if (pillTitle) pillTitle.innerText = data.title;
  if (pillStatus) pillStatus.innerText = `Status: ${data.status} • Conf: ${data.conf}% • Progress: ${data.progress}%`;
  if (aiStatus) aiStatus.innerText = `Interrogating node: "${data.title}" -> ${data.notes}`;

  document.querySelectorAll('[data-node-index]').forEach((el) => {
    el.classList.toggle('is-focused-node', Number(el.dataset.nodeIndex) === index);
  });
}

/* ==========================================================================
   Scenario branching
   ========================================================================== */
function toggleScenarioBranch() {
  const branchPath = document.getElementById('branchWavePath');
  const branchNode1 = document.getElementById('branchNode1');
  const branchNode2 = document.getElementById('branchNode2');
  const branchLegend = document.getElementById('branchLegend');
  const commitBtn = document.getElementById('commitBranchBtn');
  const statConfidence = document.getElementById('statConfidence');
  const statInProgress = document.getElementById('statInProgress');
  const toggleBtn = document.getElementById('toggleBranchBtn');
  const aiStatus = document.getElementById('aiStatusText');
  if (!branchPath || !toggleBtn) return;

  if (!isBranched) {
    isBranched = true;
    branchPath.style.opacity = "1";
    branchPath.setAttribute("stroke-dashoffset", "0");
    if (branchNode1) branchNode1.style.display = "block";
    if (branchNode2) branchNode2.style.display = "block";
    if (branchLegend) branchLegend.style.display = "flex";
    if (commitBtn) commitBtn.style.display = "inline-flex";

    if (statConfidence) {
      statConfidence.innerText = "92%";
      statConfidence.classList.remove('stat-value--blue');
      statConfidence.classList.add('stat-value--green');
    }
    if (statInProgress) statInProgress.innerText = "5";

    toggleBtn.classList.add('is-active');
    toggleBtn.innerHTML = '<span class="amber-dot"></span> Branch Active (Collapse)';
    if (aiStatus) aiStatus.innerText = "Simulating Scenario B (+3 Mo R&D). Probability increases from 67% to 92%.";
  } else {
    isBranched = false;
    branchPath.style.opacity = "0";
    if (branchNode1) branchNode1.style.display = "none";
    if (branchNode2) branchNode2.style.display = "none";
    if (branchLegend) branchLegend.style.display = "none";
    if (commitBtn) commitBtn.style.display = "none";

    if (statConfidence) {
      statConfidence.innerText = "87%";
      statConfidence.classList.remove('stat-value--green');
      statConfidence.classList.add('stat-value--blue');
    }
    if (statInProgress) statInProgress.innerText = "4";

    toggleBtn.classList.remove('is-active');
    toggleBtn.innerHTML = '<span class="amber-dot"></span> Sprout Scenario Branch (Pivot +3 Mo)';
    if (aiStatus) aiStatus.innerText = "AI Co-Pilot: Plan calibrated (0 conflicts)";
  }
}

function commitBranchScenario() {
  if (!isBranched) return;
  isCommitted = true;

  const primaryPath = document.getElementById('primaryWavePath');
  const branchPath = document.getElementById('branchWavePath');
  const commitBtn = document.getElementById('commitBranchBtn');
  const aiStatus = document.getElementById('aiStatusText');
  const pillNodeTitle = document.getElementById('pillNodeTitle');
  const pillNodeStatus = document.getElementById('pillNodeStatus');

  if (primaryPath) {
    primaryPath.setAttribute('d', 'M 20,160 Q 150,110 270,160 T 520,160 Q 640,60 760,110 T 980,90');
    primaryPath.setAttribute('stroke', '#10b981');
  }
  if (branchPath) branchPath.style.opacity = "0";

  if (commitBtn) {
    commitBtn.innerText = "Scenario Committed to Primary!";
    commitBtn.classList.add('is-committed');
  }

  if (pillNodeTitle) pillNodeTitle.innerText = "Committed: +3 Mo Refined Architecture";
  if (pillNodeStatus) pillNodeStatus.innerText = "Active Primary Timeline • High Confidence (92%)";
  if (aiStatus) aiStatus.innerText = "Boardroom Decision Committed: Wave rewritten. Historical baseline archived.";

  setTimeout(() => {
    if (commitBtn) commitBtn.style.display = "none";
  }, 3500);
}

function resetSimulation() {
  isBranched = false;
  isCommitted = false;
  if (autoFlowInterval) {
    clearInterval(autoFlowInterval);
    autoFlowInterval = null;
    const autoFlowBtn = document.getElementById('autoFlowBtn');
    if (autoFlowBtn) autoFlowBtn.innerText = "▶ Auto Flow";
  }

  const primaryPath = document.getElementById('primaryWavePath');
  if (primaryPath) {
    primaryPath.setAttribute('d', 'M 20,160 Q 150,110 270,160 T 520,160 T 770,160 T 980,160');
    primaryPath.setAttribute('stroke', 'url(#cyanGradient)');
  }

  const branchPath = document.getElementById('branchWavePath');
  if (branchPath) branchPath.style.opacity = "0";

  const branchNode1 = document.getElementById('branchNode1');
  const branchNode2 = document.getElementById('branchNode2');
  const branchLegend = document.getElementById('branchLegend');
  const commitBtn = document.getElementById('commitBranchBtn');
  const waveScrubber = document.getElementById('waveScrubber');
  if (branchNode1) branchNode1.style.display = "none";
  if (branchNode2) branchNode2.style.display = "none";
  if (branchLegend) branchLegend.style.display = "none";
  if (commitBtn) commitBtn.style.display = "none";
  if (waveScrubber) waveScrubber.value = 45;

  const statConfidence = document.getElementById('statConfidence');
  if (statConfidence) {
    statConfidence.innerText = "87%";
    statConfidence.className = "stat-value stat-value--blue";
  }
  const statInProgress = document.getElementById('statInProgress');
  if (statInProgress) statInProgress.innerText = "4";

  const toggleBtn = document.getElementById('toggleBranchBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = '<span class="amber-dot"></span> Sprout Scenario Branch (Pivot +3 Mo)';
    toggleBtn.className = "branch-toggle-button";
  }

  selectNode(2);
  const aiStatus = document.getElementById('aiStatusText');
  if (aiStatus) aiStatus.innerText = "Simulation reset to baseline plan.";
}

function handleScrubber(val) {
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
  } else {
    btn.innerText = "⏸ Pause Flow";
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
  setTimeout(() => {
    if (!isBranched) toggleScenarioBranch();
  }, 1000);
}

function scrollToDemo() {
  const el = document.getElementById('simulation');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
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
  const firstField = modal.querySelector('input, textarea, select');
  if (firstField) firstField.focus();
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
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

  initScrollSpy();
  initBackToTop();
  initWaveNodeKeyboardSupport();
  selectNode(2);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContactModal();
});