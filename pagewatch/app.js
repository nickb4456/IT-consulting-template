// PageWatch — SPA Client Logic
const API_BASE = window.PAGEWATCH_API || 'https://4wvv0at4ea.execute-api.us-east-1.amazonaws.com/prod';

// ── State ──
const state = {
  apiKey: localStorage.getItem('pw_apiKey'),
  email: localStorage.getItem('pw_email'),
  monitors: [],
  selectedMonitor: null,
  results: [],
  turnstileToken: null,
  turnstileMonitorToken: null,
};

// ── Helpers ──
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.apiKey) headers['X-Api-Key'] = state.apiKey;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  show(t);
  setTimeout(() => hide(t), 3000);
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function statusColor(monitor) {
  if (monitor.status === 'paused') return 'gray';
  if (monitor.status === 'error') return 'red';
  if (monitor.lastDiffScore > monitor.threshold) return 'yellow';
  return 'green';
}

// ── Turnstile Callbacks ──
window.onTurnstileSuccess = (token) => { state.turnstileToken = token; enableSignup(); };
window.onTurnstileMonitor = (token) => { state.turnstileMonitorToken = token; };

function enableSignup() {
  const btn = $('#signup-btn');
  if (btn) btn.disabled = false;
}

// ── Landing Page Logic ──
function initLanding() {
  // Redirect to dashboard if already logged in
  if (state.apiKey) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Auth tabs
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      hide($('#forgot-form'));
      if (tab.dataset.tab === 'login') {
        show($('#login-form'));
        hide($('#signup-form'));
      } else {
        hide($('#login-form'));
        show($('#signup-form'));
      }
    });
  });

  // Nav links
  const navSignup = $('#nav-signup');
  if (navSignup) navSignup.addEventListener('click', (e) => {
    e.preventDefault();
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-tab')[1].classList.add('active');
    hide($('#login-form'));
    show($('#signup-form'));
    $('#auth').scrollIntoView({ behavior: 'smooth' });
  });

  const navLogin = $('#nav-login');
  if (navLogin) navLogin.addEventListener('click', (e) => {
    e.preventDefault();
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-tab')[0].classList.add('active');
    show($('#login-form'));
    hide($('#signup-form'));
    $('#auth').scrollIntoView({ behavior: 'smooth' });
  });

  const heroCta = $('#hero-cta');
  if (heroCta) heroCta.addEventListener('click', (e) => {
    e.preventDefault();
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-tab')[1].classList.add('active');
    hide($('#login-form'));
    show($('#signup-form'));
    $('#auth').scrollIntoView({ behavior: 'smooth' });
  });

  // Forgot password link
  const forgotLink = $('#forgot-pw-link');
  if (forgotLink) forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    hide($('#login-form'));
    hide($('#signup-form'));
    show($('#forgot-form'));
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
  });

  const backToLogin = $('#back-to-login');
  if (backToLogin) backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    hide($('#forgot-form'));
    show($('#login-form'));
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-tab')[0].classList.add('active');
  });

  // Forgot password form
  const forgotForm = $('#forgot-form');
  if (forgotForm) forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide($('#forgot-error'));
    hide($('#forgot-success'));
    try {
      await api('POST', '/auth/forgot-password', {
        email: $('#forgot-email').value,
      });
      const successEl = $('#forgot-success');
      successEl.textContent = 'If an account exists with that email, a reset link has been sent.';
      show(successEl);
    } catch (err) {
      // Always show success message to prevent email enumeration
      const successEl = $('#forgot-success');
      successEl.textContent = 'If an account exists with that email, a reset link has been sent.';
      show(successEl);
    }
  });

  // Login form
  const loginForm = $('#login-form');
  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide($('#login-error'));
    try {
      const data = await api('POST', '/auth/login', {
        email: $('#login-email').value,
        password: $('#login-password').value,
      });
      state.apiKey = data.apiKey;
      state.email = data.email;
      localStorage.setItem('pw_apiKey', data.apiKey);
      localStorage.setItem('pw_email', data.email);
      window.location.href = 'dashboard.html';
    } catch (err) {
      const errEl = $('#login-error');
      errEl.textContent = err.message;
      show(errEl);
    }
  });

  // Signup form
  const signupForm = $('#signup-form');
  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide($('#signup-error'));
    hide($('#signup-success'));

    const password = $('#signup-password').value;
    const confirm = $('#signup-password-confirm').value;
    if (password !== confirm) {
      const errEl = $('#signup-error');
      errEl.textContent = 'Passwords do not match.';
      show(errEl);
      return;
    }

    try {
      await api('POST', '/auth/signup', {
        email: $('#signup-email').value,
        password,
        turnstileToken: state.turnstileToken,
      });
      const successEl = $('#signup-success');
      successEl.textContent = 'Account created! Check your email for a verification link.';
      show(successEl);
      signupForm.reset();
    } catch (err) {
      const errEl = $('#signup-error');
      errEl.textContent = err.message;
      show(errEl);
    }
  });
}

// ── Dashboard Logic ──
function initDashboard() {
  if (!state.apiKey) {
    window.location.href = 'index.html';
    return;
  }

  // Logout
  $('#nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('pw_apiKey');
    localStorage.removeItem('pw_email');
    window.location.href = 'index.html';
  });

  // Account link
  $('#nav-account').addEventListener('click', (e) => {
    e.preventDefault();
    showAccountView();
  });

  // Add monitor buttons
  $('#add-monitor-btn').addEventListener('click', openAddModal);
  $('#empty-add-btn').addEventListener('click', openAddModal);
  $('#cancel-add-btn').addEventListener('click', closeAddModal);

  // Close modal on overlay click
  $('#add-modal').addEventListener('click', (e) => {
    if (e.target === $('#add-modal')) closeAddModal();
  });
  $('#edit-modal').addEventListener('click', (e) => {
    if (e.target === $('#edit-modal')) closeEditModal();
  });

  // Threshold slider (add)
  $('#monitor-threshold').addEventListener('input', (e) => {
    $('#threshold-value').textContent = e.target.value + '%';
  });

  // Threshold slider (edit)
  $('#edit-threshold').addEventListener('input', (e) => {
    $('#edit-threshold-value').textContent = e.target.value + '%';
  });

  // Add monitor form
  $('#add-monitor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hide($('#add-error'));
    const monitorUrl = $('#monitor-url').value.trim();
    if (!/^https?:\/\//i.test(monitorUrl)) {
      const errEl = $('#add-error');
      errEl.textContent = 'URL must start with https:// or http://';
      show(errEl);
      return;
    }
    try {
      await api('POST', '/monitors', {
        url: monitorUrl,
        name: $('#monitor-name').value,
        interval: parseInt($('#monitor-interval').value),
        threshold: parseInt($('#monitor-threshold').value),
        alertEmail: $('#monitor-email').value || state.email,
        turnstileToken: state.turnstileMonitorToken,
      });
      closeAddModal();
      toast('Monitor added');
      await loadMonitors();
    } catch (err) {
      const errEl = $('#add-error');
      errEl.textContent = err.message;
      show(errEl);
    }
  });

  // Edit monitor form
  $('#edit-monitor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedMonitor) return;
    try {
      await api('PATCH', `/monitors/${state.selectedMonitor.monitorId}`, {
        interval: parseInt($('#edit-interval').value),
        threshold: parseInt($('#edit-threshold').value),
        alertEmail: $('#edit-email').value,
      });
      closeEditModal();
      toast('Monitor updated');
      await loadMonitors();
      if (state.selectedMonitor) selectMonitor(state.selectedMonitor.monitorId);
    } catch (err) {
      toast('Error: ' + err.message);
    }
  });

  // Pause/delete/edit buttons
  $('#pause-btn').addEventListener('click', async () => {
    if (!state.selectedMonitor) return;
    const newStatus = state.selectedMonitor.status === 'paused' ? 'active' : 'paused';
    await api('PATCH', `/monitors/${state.selectedMonitor.monitorId}`, { status: newStatus });
    toast(newStatus === 'paused' ? 'Monitor paused' : 'Monitor resumed');
    await loadMonitors();
    selectMonitor(state.selectedMonitor.monitorId);
  });

  $('#delete-btn').addEventListener('click', async () => {
    if (!state.selectedMonitor) return;
    if (!confirm('Delete this monitor? This cannot be undone.')) return;
    await api('DELETE', `/monitors/${state.selectedMonitor.monitorId}`);
    state.selectedMonitor = null;
    toast('Monitor deleted');
    await loadMonitors();
    showEmptyView();
  });

  $('#edit-btn').addEventListener('click', () => {
    if (!state.selectedMonitor) return;
    openEditModal();
  });

  // Cancel edit
  $('#cancel-edit-btn').addEventListener('click', closeEditModal);

  // Diff view back
  $('#back-to-timeline').addEventListener('click', (e) => {
    e.preventDefault();
    if (state.selectedMonitor) selectMonitor(state.selectedMonitor.monitorId);
  });

  // Diff toggle
  $$('.diff-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.diff-toggle .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.view === 'overlay') {
        hide($('#diff-content-sidebyside'));
        show($('#diff-content-overlay'));
      } else {
        show($('#diff-content-sidebyside'));
        hide($('#diff-content-overlay'));
      }
    });
  });

  loadMonitors();
}

function openAddModal() { show($('#add-modal')); }
function closeAddModal() { hide($('#add-modal')); $('#add-monitor-form').reset(); hide($('#add-error')); }
function openEditModal() {
  const m = state.selectedMonitor;
  if (!m) return;
  $('#edit-interval').value = m.interval;
  $('#edit-threshold').value = m.threshold;
  $('#edit-threshold-value').textContent = m.threshold + '%';
  $('#edit-email').value = m.alertEmail || '';
  show($('#edit-modal'));
}
function closeEditModal() { hide($('#edit-modal')); }

async function loadMonitors() {
  try {
    const data = await api('GET', '/monitors');
    state.monitors = data.monitors || [];
    renderMonitorList();
  } catch (err) {
    console.error('Failed to load monitors:', err);
  }
}

function renderMonitorList() {
  const list = $('#monitor-list');
  if (state.monitors.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="font-size:13px;">No monitors yet</p></div>';
    return;
  }
  list.innerHTML = state.monitors.map(m => `
    <div class="monitor-item ${state.selectedMonitor?.monitorId === m.monitorId ? 'active' : ''}"
         data-id="${esc(m.monitorId)}">
      <div class="status-dot ${statusColor(m)}"></div>
      <div class="monitor-info">
        <div class="monitor-name">${esc(m.name)}</div>
        <div class="monitor-url">${esc(m.url)}</div>
      </div>
      <div class="monitor-diff" style="color: ${Number(m.lastDiffScore) > Number(m.threshold) ? 'var(--red)' : 'var(--text-muted)'}">
        ${m.lastDiffScore != null ? Number(m.lastDiffScore) + '%' : '—'}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.monitor-item').forEach(el => {
    el.addEventListener('click', () => selectMonitor(el.dataset.id));
  });
}

async function selectMonitor(monitorId) {
  const m = state.monitors.find(m => m.monitorId === monitorId);
  if (!m) return;
  state.selectedMonitor = m;
  renderMonitorList();

  showTimelineView();
  $('#detail-name').textContent = m.name;
  $('#detail-url').textContent = m.url;
  $('#detail-interval').textContent = `Every ${m.interval} min`;
  $('#detail-status').textContent = m.status;
  $('#pause-btn').textContent = m.status === 'paused' ? 'Resume' : 'Pause';

  try {
    const data = await api('GET', `/monitors/${monitorId}/results`);
    state.results = data.results || [];
    renderTimeline();
  } catch (err) {
    console.error('Failed to load results:', err);
  }
}

function renderTimeline() {
  const el = $('#timeline');
  if (state.results.length === 0) {
    el.innerHTML = '<div class="empty-state"><h3>No captures yet</h3><p>The first check will happen shortly.</p></div>';
    return;
  }
  el.innerHTML = state.results.map(r => `
    <div class="timeline-entry" data-ts="${esc(r.checkedAt)}">
      <div class="timeline-thumb">
        ${r.screenshotKey ? '<img src="" data-key="' + esc(r.screenshotKey) + '" alt="Screenshot">' : ''}
      </div>
      <div class="timeline-details">
        <div class="timeline-time">${formatTime(r.checkedAt)}</div>
        <div class="timeline-status ${r.status === 'changed' ? 'changed' : r.status === 'error' ? 'error' : 'no-change'}">
          ${r.status === 'changed' ? 'Changed' : r.status === 'error' ? 'Error' : 'No change'}
          ${r.errorMsg ? ' — ' + esc(r.errorMsg) : ''}
        </div>
      </div>
      <div class="timeline-score" style="color: ${Number(r.diffScore) > Number(state.selectedMonitor?.threshold || 5) ? 'var(--red)' : 'var(--text-muted)'}">
        ${r.diffScore != null ? Number(r.diffScore) + '%' : '—'}
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.timeline-entry').forEach(entry => {
    entry.addEventListener('click', () => showDiffView(entry.dataset.ts));
  });

  // Lazy-load thumbnail presigned URLs
  el.querySelectorAll('.timeline-thumb img[data-key]').forEach(async (img) => {
    const ts = img.closest('.timeline-entry').dataset.ts;
    try {
      const data = await api('GET', `/monitors/${state.selectedMonitor.monitorId}/screenshot/${encodeURIComponent(ts)}`);
      img.src = data.url;
    } catch { /* thumbnail load failure is non-critical */ }
  });
}

async function showDiffView(ts) {
  const r = state.results.find(r => r.checkedAt === ts);
  if (!r) return;

  hide($('#view-timeline'));
  show($('#view-diff'));
  hide($('#view-empty'));
  hide($('#view-account'));

  $('#diff-time').textContent = formatTime(r.checkedAt);
  $('#diff-score-display').textContent = (r.diffScore != null ? r.diffScore + '%' : '—');

  // Load images
  const monId = state.selectedMonitor.monitorId;
  try {
    const [ssData, diffData] = await Promise.all([
      api('GET', `/monitors/${monId}/screenshot/${encodeURIComponent(ts)}`),
      r.diffKey ? api('GET', `/monitors/${monId}/diff/${encodeURIComponent(ts)}`) : null,
    ]);
    $('#diff-current-img').src = ssData.url;
    if (diffData) $('#diff-overlay-img').src = diffData.url;

    // Load baseline
    if (state.selectedMonitor.baselineKey) {
      // Use first result's screenshot as baseline display
      const baselineTs = state.results[state.results.length - 1]?.checkedAt;
      if (baselineTs) {
        const bData = await api('GET', `/monitors/${monId}/screenshot/${encodeURIComponent(baselineTs)}`);
        $('#diff-baseline-img').src = bData.url;
      }
    }
  } catch (err) {
    console.error('Failed to load diff images:', err);
  }
}

function showTimelineView() {
  show($('#view-timeline'));
  hide($('#view-empty'));
  hide($('#view-diff'));
  hide($('#view-account'));
}

function showEmptyView() {
  show($('#view-empty'));
  hide($('#view-timeline'));
  hide($('#view-diff'));
  hide($('#view-account'));
}

async function showAccountView() {
  hide($('#view-empty'));
  hide($('#view-timeline'));
  hide($('#view-diff'));
  show($('#view-account'));
  state.selectedMonitor = null;
  renderMonitorList();

  try {
    const data = await api('GET', '/account');
    $('#account-monitors').textContent = data.monitorCount ?? 0;
    $('#account-checks').textContent = data.checksToday ?? 0;
    $('#account-plan').textContent = data.plan ?? 'Free';
    $('#account-limit').textContent = data.monitorLimit ?? 5;
    maskApiKey();
  } catch (err) {
    console.error('Failed to load account:', err);
    maskApiKey();
  }
}

function maskApiKey() {
  const el = $('#account-api-key');
  const key = state.apiKey || '—';
  const masked = key.length > 8 ? key.slice(0, 3) + '••••••••' + key.slice(-4) : '••••••••';
  el.textContent = masked;
  el.dataset.revealed = 'false';
  el.style.cursor = 'pointer';
  el.title = 'Click to reveal';
  el.onclick = () => {
    if (el.dataset.revealed === 'false') {
      el.textContent = key;
      el.dataset.revealed = 'true';
      el.title = 'Click to hide';
    } else {
      el.textContent = masked;
      el.dataset.revealed = 'false';
      el.title = 'Click to reveal';
    }
  };
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = window.location.pathname.includes('dashboard');
  if (isDashboard) {
    initDashboard();
  } else {
    initLanding();
  }
});
