/* Pixel History — связь сайта с сервером (аккаунты, игры). */
(function () {
  const online = /^https?:/.test(location.protocol);

  async function api(path, opts = {}) {
    const o = { method: opts.method || 'GET', headers: { 'X-PH': '1' }, credentials: 'same-origin' };
    if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    let r;
    try { r = await fetch(path, o); } catch (e) { const err = new Error('Нет связи с сервером'); err.status = 0; throw err; }
    let data = null; try { data = await r.json(); } catch (e) { /* пустой ответ */ }
    if (!r.ok) { const err = new Error((data && (typeof data.detail === 'string' ? data.detail : 'Проверьте данные')) || 'Ошибка ' + r.status); err.status = r.status; throw err; }
    return data;
  }

  let upPromise = null, mePromise = null;
  function serverUp() { if (!online) return Promise.resolve(false); if (!upPromise) upPromise = api('/api/health').then(() => true, () => false); return upPromise; }
  function me(force) { if (!mePromise || force) mePromise = serverUp().then(up => up ? api('/api/me').catch(() => null) : null); return mePromise; }
  function loginUrl() { return '/login.html?next=' + encodeURIComponent(location.pathname + location.search); }

  window.PHAPI = { api, me, serverUp, online, loginUrl };

  // В шапке: «Войти» или имя + «Админка»
  document.addEventListener('DOMContentLoaded', async () => {
    const wrap = document.querySelector('.nav .wrap');
    if (!wrap || !(await serverUp())) return;
    const u = await me();
    const btn = wrap.querySelector(':scope > .btn');
    const link = (href, text) => { const a = document.createElement('a'); a.className = 'nav-acc'; a.href = href; a.textContent = text; wrap.insertBefore(a, btn); return a; };
    if (u && u.role === 'admin') link('/admin/', 'Админка');
    if (u) link('/account.html', (u.name || 'Кабинет').slice(0, 14));
    else link(loginUrl(), 'Войти');
  });
})();
