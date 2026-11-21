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

  // ---------- темы оформления ----------
  // Сайт всегда в «Ретро-приставке» (assets/retro.css подключён в <head> каждой страницы), другого стиля у сайта нет.
  // Страница-подарок может быть в любой теме, которую выбрал клиент (PH.applyTheme).
  const THEMES = {
    retro: { name: 'Ретро-приставка', logo: 'controller', swatch: ['#101018', '#E63946', '#F4C430'] },
    cozy: { name: 'Уютный вечер', logo: 'heart', swatch: ['#141A33', '#FFC857', '#FF6F91'] },
    light: { name: 'Светлый подарок', logo: 'gift', swatch: ['#FFF8EE', '#FF8A5B', '#6C5CE7'] },
    arcade: { name: 'Неон-аркада', logo: 'star', swatch: ['#12061F', '#FF3EA5', '#29E7FF'] },
    birthday: { name: 'День рождения', logo: 'gift', swatch: ['#FFF0F6', '#FF4D8D', '#3DB2FF'] },
    newyear: { name: 'Новый год', logo: 'gift', swatch: ['#0E2433', '#E8C547', '#D7263D'] }
  };
  const appSrc = (document.currentScript && document.currentScript.src) || location.href;
  let siteTheme = 'retro';
  // Только для страницы-подарка (gift.html): тема, которую выбрал клиент.
  // retro — стиль сайта как есть; остальные — assets/gift-themes/*.css
  function applyGiftTheme(name) {
    if (!THEMES[name]) name = 'retro';
    const site = document.getElementById('site-theme');
    let gl = document.getElementById('gift-theme');
    if (site) site.disabled = name !== 'retro';
    if (name === 'retro') { if (gl) gl.remove(); }
    else {
      if (!gl) { gl = document.createElement('link'); gl.id = 'gift-theme'; gl.rel = 'stylesheet'; document.head.appendChild(gl); }
      gl.href = new URL('gift-themes/' + name + '.css?v=3', appSrc).href;
    }
    siteTheme = name; window.PH.siteTheme = name; document.documentElement.dataset.giftTheme = name;
    document.querySelectorAll('.logo canvas[data-icon]').forEach(c => { c.dataset.icon = THEMES[name].logo; if (window.PX) PX.drawIcon(c, c.dataset.icon, false); });
  }
  window.PH.THEMES = THEMES;
  window.PH.applyGiftTheme = applyGiftTheme;
  window.PH.siteTheme = siteTheme;

  // ---------- иконки и персонажи в разметке ----------
  function paint(root) {
    root.querySelectorAll('.logo canvas[data-icon]').forEach(c => { c.dataset.icon = THEMES[siteTheme].logo; });
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

  document.addEventListener('DOMContentLoaded', () => { paint(document); bindTags(document); });
})();
