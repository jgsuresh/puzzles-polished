(function () {
  'use strict';
  var puzzles = window.PUZZLES, cats = window.CATEGORIES;
  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var search = document.getElementById('search');
  var catLabel = {};
  cats.forEach(function (c) { catLabel[c.id] = c.label; });
  var activeCat = 'all';

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('stg-theme', t); } catch (e) {}
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#0f1320' : '#f4f1ea';
  }
  setTheme(document.documentElement.dataset.theme);
  document.getElementById('theme-btn').addEventListener('click', function () {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  [{ id: 'all', label: 'All' }].concat(cats).forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = c.label;
    b.dataset.cat = c.id;
    b.setAttribute('aria-pressed', String(c.id === 'all'));
    b.addEventListener('click', function () {
      activeCat = c.id;
      Array.prototype.forEach.call(filters.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
    filters.appendChild(b);
  });

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var q = search.value.trim().toLowerCase();
    var list = puzzles.filter(function (p) {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      return !q || (p.title + ' ' + p.description + ' ' + p.objective + ' ' + catLabel[p.category]).toLowerCase().indexOf(q) >= 0;
    });
    grid.innerHTML = list.length ? list.map(function (p) {
      return '<a class="card" href="' + (p.href || 'p/' + p.name + '.html') + '">' +
        '<div class="thumb"><img class="t-light" src="thumbs/' + p.name + '.png" alt="" loading="lazy" decoding="async" onerror="this.remove()">' +
        '<img class="t-dark" src="thumbs/' + p.name + '-dark.png" alt="" loading="lazy" decoding="async" onerror="this.remove()"></div>' +
        '<div class="meta"><h2>' + esc(p.title) + '</h2><p>' + esc(p.description) + '</p>' +
        '<span class="tag">' + esc(catLabel[p.category]) + '</span></div></a>';
    }).join('') : '<p class="empty">No puzzles match “' + esc(q) + '”.</p>';
  }

  search.addEventListener('input', render);
  render();
})();
