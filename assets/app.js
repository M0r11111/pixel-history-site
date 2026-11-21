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

  // ---------- иконки и персонажи в разметке ----------
  function paint(root) {
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
