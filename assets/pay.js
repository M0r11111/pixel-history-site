/* Pixel History — окно оплаты: оплата игры и пополнение баланса.
   Сейчас: с баланса или через Kaspi (оплату подтверждаем вручную, обычно за минуты).
   Позже: картой (эквайринг) — кнопка уже есть и включится в админке.
   Нужен PHAPI (assets/api.js). */
(function () {
  'use strict';
  const fmt = n => (Math.round(n || 0)).toLocaleString('ru-RU').replace(/[ ,]/g, ' ') + ' ₸';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let modal = null, box = null, onClose = null, pollT = null;

  const css = `.pay-box{max-width:480px!important;text-align:left!important;justify-items:stretch!important;gap:16px!important;max-height:92vh;overflow-y:auto}
.pay-box h3{font-size:15px}.pay-amount{font-family:var(--pixel);font-size:22px;color:var(--moss)}
.pay-opts{display:grid;gap:10px}.pay-opt{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;background:var(--bg);border:3px solid var(--surface2);color:var(--text);font:inherit;cursor:pointer}
.pay-opt:hover:not([disabled]){border-color:var(--moss)}.pay-opt b{font-family:var(--pixel);font-size:11px}.pay-opt small{color:var(--muted)}
.pay-opt[disabled]{opacity:.5;cursor:not-allowed}.pay-opt.main{border-color:var(--yellow)}
.pay-code{display:inline-block;font-family:var(--pixel);font-size:13px;padding:8px 10px;border:2px dashed var(--moss);color:var(--moss);cursor:pointer}
.pay-qr{display:flex;justify-content:center}.pay-qr img{width:210px;max-width:100%;background:#fff;padding:8px}
.pay-steps{display:grid;gap:6px;font-size:14px;padding-left:18px}.pay-wait{display:flex;gap:12px;align-items:center}
.pay-wait i{width:14px;height:14px;background:var(--moss);animation:payblink 1s steps(2) infinite}@keyframes payblink{50%{opacity:.2}}
.pay-x{background:none;border:0;color:var(--muted);font:inherit;text-decoration:underline;cursor:pointer;justify-self:center}
.pay-presets{display:flex;gap:8px;flex-wrap:wrap}.pay-presets button{padding:10px 12px;border:3px solid var(--surface2);background:none;color:var(--text);font:inherit;cursor:pointer}
.pay-presets button.on{border-color:var(--moss);color:var(--moss)}`;

  function ensure() {
    if (modal) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    modal = document.createElement('div'); modal.className = 'modal'; modal.id = 'payModal';
    modal.innerHTML = '<div class="panel hot pay-box"></div>';
    document.body.appendChild(modal);
    box = modal.firstChild;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }
  function show(html) { ensure(); box.innerHTML = html; modal.classList.add('open'); }
  function close() {
    clearTimeout(pollT);
    if (modal) modal.classList.remove('open');
    const f = onClose; onClose = null; if (f) f();
  }
  const err = (msg) => { const e = box.querySelector('.err'); if (e) e.textContent = msg; };

  // Kaspi: счёт → инструкция → «Я оплатил» → ждём подтверждения админа
  async function kaspi(body, kind, done) {
    let p;
    try { p = await PHAPI.api('/api/payments', { method: 'POST', body: Object.assign({ method: 'kaspi' }, body) }); }
    catch (e) { err(e.message); return; }
    const b = await PHAPI.api('/api/billing'), k = b.methods.kaspi;
    const after = kind === 'game' ? 'игра сразу начнёт создаваться' : 'деньги появятся на балансе';
    show(`<h3>Оплата через Kaspi</h3>
      <div><div class="muted small">К оплате</div><div class="pay-amount">${fmt(p.amount_kzt)}</div></div>
      ${k.qr ? `<div class="pay-qr"><img src="${esc(k.qr)}" alt="Kaspi QR"></div><p class="muted small" style="text-align:center">Отсканируйте камерой в приложении Kaspi.kz</p>` : ''}
      ${k.pay_link ? `<a class="btn primary block" href="${esc(k.pay_link)}" target="_blank" rel="noopener">Открыть Kaspi и оплатить</a>` : ''}
      ${k.receiver || k.phone ? `<div class="sum-row"><span>Получатель</span><span>${esc(k.receiver || '')} ${esc(k.phone || '')}</span></div>` : ''}
      <ol class="pay-steps">
        <li>Оплатите <b>${fmt(p.amount_kzt)}</b>${k.qr ? ' по QR' : k.pay_link ? ' по кнопке выше' : k.phone ? ' переводом на номер выше' : ''}.</li>
        <li>Если есть комментарий, напишите код: <span class="pay-code" title="Скопировать">${esc(p.code)}</span></li>
        <li>Нажмите «Я оплатил» — проверим и подтвердим, после этого ${after}.</li>
      </ol>
      ${k.instructions ? `<p class="small muted">${esc(k.instructions)}</p>` : ''}
      <div class="opt-group"><b>Ваш номер в Kaspi</b><input class="field" id="payPhone" inputmode="tel" placeholder="+7 700 000 00 00" style="padding:12px" value="${esc(p.payer_phone || '')}">
        <small class="muted">По нему найдём ваш платёж. Можно оставить пустым, если указали код.</small></div>
      <p class="err"></p>
      <button class="btn primary block" id="payClaim">Я оплатил</button>
      <button class="pay-x" id="payCancel">Отменить счёт</button>`);
    box.querySelector('.pay-code').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(p.code); e.target.textContent = p.code + ' ✓'; };
    box.querySelector('#payCancel').onclick = async () => { try { await PHAPI.api('/api/payments/' + p.id + '/cancel', { method: 'POST' }); } catch (e) {} close(); };
    box.querySelector('#payClaim').onclick = async () => {
      try { p = await PHAPI.api('/api/payments/' + p.id + '/claim', { method: 'POST', body: { payer_phone: box.querySelector('#payPhone').value } }); }
      catch (e) { err(e.message); return; }
      window.PH && PH.track && PH.track('claim');
      wait(p, kind, done);
    };
  }

  function wait(p, kind, done) {
    show(`<h3>Проверяем оплату</h3>
      <div class="pay-wait"><i></i><span>Платёж ${esc(p.code)} на ${fmt(p.amount_kzt)} — сверяем с Kaspi.</span></div>
      <p class="small muted">Обычно это занимает несколько минут (ночью — до утра). Как только подтвердим, ${kind === 'game' ? 'игра начнёт создаваться сама' : 'деньги появятся на балансе'}.
      Окно можно закрыть — всё будет видно в <a class="yellow" href="/account.html">личном кабинете</a>.</p>
      <p class="err"></p>
      <button class="btn block" id="payLater">Закрыть, проверю потом</button>`);
    const prev = onClose; onClose = prev ? () => prev(true) : null;      // закрыли окно во время проверки — оплата «в процессе»
    box.querySelector('#payLater').onclick = () => close();
    const tick = async () => {
      if (!modal.classList.contains('open')) return;
      try {
        const s = await PHAPI.api('/api/payments/' + p.id);
        if (s.status === 'paid') { onClose = null; close(); done(s); return; }
        if (s.status === 'rejected') { err('Мы не нашли этот платёж в Kaspi. Если вы оплатили — напишите нам, разберёмся.'); return; }
      } catch (e) {}
      pollT = setTimeout(tick, 4000);
    };
    pollT = setTimeout(tick, 3000);
  }

  // Оплата игры. Промис: { via: 'balance' | 'kaspi' | 'free' }; отказ — если окно закрыли.
  function payGame(game) {
    return new Promise(async (resolve, reject) => {
      let b;
      try { b = await PHAPI.api('/api/billing'); } catch (e) { reject(e); return; }
      const due = game.due_kzt != null ? game.due_kzt : game.price_kzt;
      if (!b.require_payment || due <= 0) { resolve({ via: 'free' }); return; }
      onClose = pending => reject(Object.assign(new Error(pending ? 'Оплата проверяется' : 'Оплата не завершена'), { cancelled: !pending, pending: !!pending }));
      window.PH && PH.track && PH.track('checkout');
      const k = b.methods.kaspi, kaspiReady = k.enabled && (k.qr || k.pay_link || k.phone), enough = b.balance >= due;
      show(`<h3>Оплата игры</h3>
        <div class="sum-row"><span>${esc(game.title || 'Новая игра')} · ${game.mode === 'human' ? 'делает человек' : 'делает ИИ'}</span></div>
        <div><div class="muted small">${game.paid_kzt ? 'Доплата' : 'К оплате'}</div><div class="pay-amount">${fmt(due)}</div></div>
        <div class="pay-opts">
          <button class="pay-opt ${enough ? 'main' : ''}" data-m="balance" ${enough ? '' : 'disabled'}><span><b>С баланса</b><br><small>На балансе ${fmt(b.balance)}${enough ? '' : ' — не хватает ' + fmt(due - b.balance)}</small></span><span>→</span></button>
          <button class="pay-opt ${!enough ? 'main' : ''}" data-m="kaspi" ${kaspiReady ? '' : 'disabled'}><span><b>Kaspi</b><br><small>${kaspiReady ? 'QR или перевод · подтверждаем за минуты' : 'Скоро будет доступно'}</small></span><span>→</span></button>
          <button class="pay-opt" data-m="card" ${b.methods.card.enabled ? '' : 'disabled'}><span><b>Банковская карта</b><br><small>${b.methods.card.enabled ? 'Visa, Mastercard, Apple Pay' : 'Скоро'}</small></span><span>→</span></button>
        </div>
        <p class="small muted">${game.mode === 'human' ? 'Художник возьмёт заказ сразу после оплаты.' : 'После оплаты игра создаётся за пару минут. Не понравится — пересоздадите бесплатно.'}</p>
        <p class="err"></p>
        <button class="pay-x" id="payCancel">Отмена</button>`);
      box.querySelector('#payCancel').onclick = () => close();
      box.querySelector('.pay-opts').onclick = async e => {
        const o = e.target.closest('.pay-opt'); if (!o || o.disabled) return;
        if (o.dataset.m === 'balance') {
          try { await PHAPI.api('/api/games/' + game.id + '/pay-balance', { method: 'POST' }); onClose = null; close(); resolve({ via: 'balance' }); }
          catch (er) { err(er.message); }
        } else if (o.dataset.m === 'kaspi') kaspi({ purpose: 'game', game_id: game.id }, 'game', () => resolve({ via: 'kaspi' }));
        else err('Оплата картой появится позже');
      };
    });
  }

  // Пополнение баланса. Промис выполняется, когда деньги зачислены.
  function topup(preset) {
    return new Promise(async (resolve, reject) => {
      let b;
      try { b = await PHAPI.api('/api/billing'); } catch (e) { reject(e); return; }
      onClose = pending => reject(Object.assign(new Error(pending ? 'Пополнение проверяется' : 'Пополнение не завершено'), { cancelled: !pending, pending: !!pending }));
      window.PH && PH.track && PH.track('topup_open');
      const k = b.methods.kaspi, kaspiReady = k.enabled && (k.qr || k.pay_link || k.phone);
      const presets = [5000, 10000, 15000, 30000];
      show(`<h3>Пополнить баланс</h3>
        <div class="muted small">Сейчас на балансе: ${fmt(b.balance)}</div>
        <div class="pay-presets">${presets.map(v => `<button data-v="${v}" class="${v === (preset || 15000) ? 'on' : ''}">${fmt(v)}</button>`).join('')}</div>
        <div class="opt-group"><b>Или своя сумма</b><input class="field" id="paySum" inputmode="numeric" value="${preset || 15000}" style="padding:12px"><small class="muted">От ${fmt(b.topup_min)} до ${fmt(b.topup_max)}</small></div>
        <div class="pay-opts">
          <button class="pay-opt main" data-m="kaspi" ${kaspiReady ? '' : 'disabled'}><span><b>Kaspi</b><br><small>${kaspiReady ? 'QR или перевод · подтверждаем за минуты' : 'Скоро будет доступно'}</small></span><span>→</span></button>
          <button class="pay-opt" data-m="card" disabled><span><b>Банковская карта</b><br><small>Скоро</small></span><span>→</span></button>
        </div>
        <p class="err"></p>
        <button class="pay-x" id="payCancel">Отмена</button>`);
      const sum = box.querySelector('#paySum');
      box.querySelector('.pay-presets').onclick = e => { const v = e.target.closest('button'); if (!v) return; sum.value = v.dataset.v; box.querySelectorAll('.pay-presets button').forEach(x => x.classList.toggle('on', x === v)); };
      sum.oninput = () => { sum.value = sum.value.replace(/\D/g, ''); box.querySelectorAll('.pay-presets button').forEach(x => x.classList.toggle('on', x.dataset.v === sum.value)); };
      box.querySelector('#payCancel').onclick = () => close();
      box.querySelector('.pay-opts').onclick = e => {
        const o = e.target.closest('.pay-opt'); if (!o || o.disabled) return;
        if (o.dataset.m === 'kaspi') kaspi({ purpose: 'topup', amount_kzt: parseInt(sum.value, 10) || 0 }, 'topup', s => resolve(s));
      };
    });
  }

  window.PHPay = { payGame, topup, fmt, close };
})();
