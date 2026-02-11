(function() {
  var pages = [
    { href: 'xnor-popcount-explained.html', label: 'XNOR' },
    { href: 'colony-code-explained.html', label: 'Code' },
    { href: 'ouroboros-architecture.html', label: 'Architecture' },
    { href: 'self-improvement-loop.html', label: 'Self-Improve' },
    { href: 'colony-mindmap.html', label: 'Mindmap' },
    { href: 'colony-report-2026-02-09.html', label: 'Report' }
  ];

  var current = location.pathname.split('/').pop() || 'index.html';

  var style = document.createElement('style');
  style.textContent = [
    '#ouroboros-nav { position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(10,10,15,0.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }',
    '#ouroboros-nav .onav-inner { max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:6px;height:44px;padding:0 16px;overflow-x:auto;white-space:nowrap;scrollbar-width:none; }',
    '#ouroboros-nav .onav-inner::-webkit-scrollbar { display:none; }',
    '#ouroboros-nav a { text-decoration:none;transition:color 0.2s,background 0.2s;flex-shrink:0; }',
    '#ouroboros-nav .onav-back { color:#a1afc4;font-size:0.82rem;margin-right:6px; }',
    '#ouroboros-nav .onav-back:hover { color:#22d3ee; }',
    '#ouroboros-nav .onav-sep { color:rgba(255,255,255,0.15);flex-shrink:0;font-size:0.8rem; }',
    '#ouroboros-nav .onav-home { color:#22d3ee;font-size:0.85rem;font-weight:600;margin:0 4px; }',
    '#ouroboros-nav .onav-home:hover { color:#67e8f9; }',
    '#ouroboros-nav .onav-link { color:#8b949e;font-size:0.8rem;padding:4px 10px;border-radius:6px; }',
    '#ouroboros-nav .onav-link:hover { color:#f0f6fc;background:rgba(255,255,255,0.08); }',
    '#ouroboros-nav .onav-link.active { color:#22d3ee;background:rgba(34,211,238,0.1); }'
  ].join('\n');
  document.head.appendChild(style);

  var nav = document.createElement('nav');
  nav.id = 'ouroboros-nav';

  var inner = '<div class="onav-inner">';
  inner += '<a href="/" class="onav-back">← AIBridges</a>';
  inner += '<span class="onav-sep">|</span>';
  inner += '<a href="index.html" class="onav-home' + (current === 'index.html' ? ' active' : '') + '">Ouroboros</a>';
  inner += '<span class="onav-sep">|</span>';

  for (var i = 0; i < pages.length; i++) {
    var p = pages[i];
    var cls = 'onav-link' + (current === p.href ? ' active' : '');
    inner += '<a href="' + p.href + '" class="' + cls + '">' + p.label + '</a>';
  }

  inner += '</div>';
  nav.innerHTML = inner;

  document.body.insertBefore(nav, document.body.firstChild);
  document.body.style.paddingTop = (parseFloat(getComputedStyle(document.body).paddingTop) + 52) + 'px';
})();
