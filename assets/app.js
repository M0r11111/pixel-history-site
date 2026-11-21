/* Pixel History — общие помощники для всех страниц */
(function () {
  // ---------- хранилище (герои, черновик игры) ----------
  const store = {
    get(key, def) { try { const v = localStorage.getItem('ph_' + key); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem('ph_' + key, JSON.stringify(val)); } catch (e) { /* приватный режим — ок */ } }
  };
  function heroes() {
    const saved = store.get('heroes', null);
    if (saved && saved.length) return saved;
    return [Object.assign({ id: 'you' }, PX.HEROES.you), Object.assign({ id: 'asem' }, PX.HEROES.asem)];
  }
  window.PH = { store, heroes };

  // ---------- стиль сайта (варианты оформления) ----------
  // goblin — исходный; cozy, light, retro — варианты в assets/themes/*.css
  const SITE_THEMES = { goblin: { name: 'Goblincore', logo: 'mushroom' }, cozy: { name: 'Уютный вечер', logo: 'heart' }, light: { name: 'Светлый подарок', logo: 'gift' }, retro: { name: 'Ретро-приставка', logo: 'controller' } };
  const q = new URLSearchParams(location.search);
  let siteTheme = q.get('theme') || store.get('site_theme', 'goblin');
  if (!SITE_THEMES[siteTheme]) siteTheme = 'goblin';
  store.set('site_theme', siteTheme);
  const appSrc = (document.currentScript && document.currentScript.src) || location.href;
  if (siteTheme !== 'goblin') {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('themes/' + siteTheme + '.css?v=1', appSrc).href;
    document.head.appendChild(l);
  }
  document.documentElement.dataset.siteTheme = siteTheme;
  window.PH.siteTheme = siteTheme;

  // переключатель стилей для сравнения: показываем, если в адресе есть ?theme=… или ?themes
  function themeSwitcher() {
    if (!(q.has('theme') || q.has('themes') || store.get('theme_switcher', false))) return;
    store.set('theme_switcher', true);
    const box = document.createElement('div'); box.className = 'theme-switch';
    box.innerHTML = '<b>Стиль сайта:</b>' + Object.entries(SITE_THEMES).map(([id, t]) => `<button data-t="${id}" class="${id === siteTheme ? 'on' : ''}">${t.name}</button>`).join('') + '<button data-t="hide" title="Скрыть">✕</button>';
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t === 'hide') { store.set('theme_switcher', false); box.remove(); return; }
      store.set('site_theme', b.dataset.t);
      const u = new URL(location.href); u.searchParams.set('theme', b.dataset.t); location.href = u.href;
    });
    document.body.appendChild(box);
  }

  // ---------- иконки и персонажи в разметке ----------
  function paint(root) {
    root.querySelectorAll('.logo canvas[data-icon]').forEach(c => { c.dataset.icon = SITE_THEMES[siteTheme].logo; });
    root.querySelectorAll('canvas[data-icon]').forEach(c => PX.drawIcon(c, c.dataset.icon, c.hasAttribute('data-outline')));
    root.querySelectorAll('canvas[data-hero]').forEach(c => {
      const key = c.dataset.hero;
      const o = PX.HEROES[key] || heroes().find(h => h.id === key) || PX.HEROES.base;
      PX.renderChar(c, o, 1);
    });
  }
  window.PH.paint = paint;

  // ---------- группы тегов: один выбранный ----------
  function bindTags(root) {
    root.querySelectorAll('.tags[data-single]').forEach(group => {
      group.addEventListener('click', e => {
        const t = e.target.closest('.tag'); if (!t) return;
        group.querySelectorAll('.tag').forEach(x => x.classList.toggle('on', x === t));
        group.dispatchEvent(new CustomEvent('pick', { detail: t.dataset.v || t.textContent.trim(), bubbles: true }));
      });
    });
  }
  window.PH.bindTags = bindTags;

  // ---------- модалки ----------
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-modal]');
    if (open) { e.preventDefault(); document.getElementById(open.dataset.modal).classList.add('open'); }
    if (e.target.matches('.modal') || e.target.closest('[data-close]')) {
      const m = e.target.closest('.modal'); if (m) m.classList.remove('open');
    }
  });

  document.addEventListener('DOMContentLoaded', () => { paint(document); bindTags(document); themeSwitcher(); });
})();
