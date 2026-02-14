(function() {
  var pages = [
    { href: '/ouroboros/', label: '🐍 Ouroboros' },
    { href: '/colony-research.html', label: '🧠 Insights' },
    { href: '/youtube-trends.html', label: '📺 YouTube' },
    { href: '/ouroboros/research-paper.html', label: '📄 Paper' },
    { href: '/ouroboros/colony-report-2026-02-09.html', label: '📊 Report' },
    { href: '/ouroboros/ouroboros-architecture.html', label: '🏗️ Architecture' },
    { href: '/ouroboros/xnor-popcount-explained.html', label: '⚡ XNOR' },
    { href: '/ouroboros/colony-code-explained.html', label: '💻 Code' },
  ];

  var current = location.pathname;
  
  // Normalize current path
  if (current.endsWith('/ouroboros/') || current.endsWith('/ouroboros')) {
    current = '/ouroboros/';
  }

  var style = document.createElement('style');
  style.textContent = [
    '#colony-nav { position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(10,10,15,0.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }',
    '#colony-nav .cnav-inner { max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:4px;height:48px;padding:0 16px;overflow-x:auto;white-space:nowrap;scrollbar-width:none; }',
    '#colony-nav .cnav-inner::-webkit-scrollbar { display:none; }',
    '#colony-nav a { text-decoration:none;transition:all 0.2s;flex-shrink:0; }',
    '#colony-nav .cnav-home { color:#22d3ee;font-weight:700;font-size:0.9rem;padding:6px 12px;border-radius:8px; }',
    '#colony-nav .cnav-home:hover { background:rgba(34,211,238,0.1); }',
    '#colony-nav .cnav-sep { color:rgba(255,255,255,0.2);margin:0 4px;font-size:0.7rem; }',
    '#colony-nav .cnav-link { color:#8b949e;font-size:0.85rem;padding:6px 12px;border-radius:8px; }',
    '#colony-nav .cnav-link:hover { color:#f0f6fc;background:rgba(255,255,255,0.08); }',
    '#colony-nav .cnav-link.active { color:#22d3ee;background:rgba(34,211,238,0.12); }',
    '@media (max-width: 600px) { #colony-nav .cnav-link { padding: 6px 8px; font-size: 0.8rem; } }'
  ].join('\n');
  document.head.appendChild(style);

  var nav = document.createElement('nav');
  nav.id = 'colony-nav';

  var inner = '<div class="cnav-inner">';
  inner += '<a href="/" class="cnav-home">AIBridges</a>';
  inner += '<span class="cnav-sep">›</span>';

  for (var i = 0; i < pages.length; i++) {
    var p = pages[i];
    var isActive = current === p.href || current.endsWith(p.href);
    var cls = 'cnav-link' + (isActive ? ' active' : '');
    inner += '<a href="' + p.href + '" class="' + cls + '">' + p.label + '</a>';
  }

  inner += '</div>';
  nav.innerHTML = inner;

  document.body.insertBefore(nav, document.body.firstChild);
  
  // Add padding to body
  var existingPadding = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
  document.body.style.paddingTop = (existingPadding + 56) + 'px';
})();
