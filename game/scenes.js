/* Pixel History — детальные фоны локаций.
   Сцена = небо + слои с параллаксом (рисуются один раз в кэш и потом только сдвигаются
   за камерой — поэтому деталей много, а игра не тормозит) + пол + живая анимация
   (звёзды, мигающие огни, экраны). Всё нарисовано кодом, без чужих картинок. */
(function (global) {
  'use strict';
  const W = 640, H = 360, PF = '"Press Start 2P", monospace';
  let C = null;                                   // текущий холст для рисования
  const R = (c, x, y, w, h) => { C.fillStyle = c; C.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  /* ---------- базовые кисти ---------- */
  function circle(c, cx, cy, rad) { for (let dy = -rad; dy <= rad; dy += 2) { const w = Math.round(Math.sqrt(Math.max(0, rad * rad - dy * dy))); R(c, cx - w, cy + dy, w * 2, 2); } }
  function ellipse(c, cx, cy, rx, ry) { for (let dy = -ry; dy <= ry; dy += 2) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry)))); R(c, cx - w, cy + dy, w * 2, 2); } }
  function glow(cx, cy, rad, rgb, a) { [1, .72, .48, .28].forEach(k => circle(`rgba(${rgb},${a})`, cx, cy, Math.round(rad * k))); }
  function pool(cx, cy, rx, rgb, a) { [1, .7, .42].forEach(k => ellipse(`rgba(${rgb},${a})`, cx, cy, Math.round(rx * k), Math.max(2, Math.round(rx * k * .22)))); }
  function cone(x, y0, y1, w0, w1, rgb, a) { for (let y = y0; y < y1; y += 2) { const k = (y - y0) / (y1 - y0), w = w0 + (w1 - w0) * k; R(`rgba(${rgb},${(a * (1 - k * .55)).toFixed(3)})`, x - w / 2, y, w, 2); } }
  function text(s, x, y, size, color, align) { C.font = size + 'px ' + PF; C.fillStyle = color; C.textAlign = align || 'center'; C.textBaseline = 'top'; C.fillText(s, Math.round(x), Math.round(y)); }
  function sky(cols, y1) {
    const n = cols.length, band = y1 / n;
    cols.forEach((c, i) => R(c, 0, Math.floor(i * band), W, Math.ceil(band) + 2));
    for (let i = 1; i < n; i++) { const y = Math.floor(i * band); for (let x = 0; x < W; x += 4) { R(cols[i - 1], x, y, 2, 2); R(cols[i - 1], x + 2, y + 2, 2, 2); if (x % 8 === 0) R(cols[i - 1], x, y + 4, 2, 2); } }
    R(cols[n - 1], 0, y1, W, H - y1);
  }

  /* ---------- кэш слоёв ---------- */
  const cache = new Map();
  function fontOk() { try { return !document.fonts || document.fonts.check('8px "Press Start 2P"'); } catch (e) { return true; } }
  function cached(key, w, fn) {
    const k = key + (fontOk() ? '' : '~');
    let cv = cache.get(k);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = w; cv.height = H;
      const prev = C; C = cv.getContext('2d'); C.imageSmoothingEnabled = false;
      // рисуем трижды со сдвигом — чтобы предметы на краях бесшовно переходили при повторе
      for (const off of w === W ? [0] : [-w, 0, w]) { C.save(); C.translate(off, 0); fn(rng(hash(key))); C.restore(); }
      C = prev; cache.set(k, cv);
    }
    return cv;
  }
  function blit(ctx, cv, par, cam) { const w = cv.width; let o = -((cam * par) % w); if (o > 0) o -= w; for (let x = o; x < W; x += w) ctx.drawImage(cv, Math.round(x), 0); }

  /* ---------- предметы ---------- */
  // панельный дом: окна (горят ночью), балконы, снег на крыше, подъезд
  function building(r, x, base, w, h, o) {
    const top = base - h, fh = o.fh || 26, cw = o.cw || 22, night = !!o.night;
    R(o.wall, x, top, w, h);
    if (o.stripe) R(o.stripe, x, top + 6, w, 4);
    const cols = Math.max(1, Math.floor((w - 8) / cw)), mx = x + Math.round((w - cols * cw) / 2);
    const floorBottom = base - (o.shops ? 44 : o.door ? 34 : 10);
    for (let fy = top + 14; fy + 16 < floorBottom; fy += fh) {
      R(o.seam || shade(o.wall, -.12), x, fy - 6, w, 1);
      for (let c = 0; c < cols; c++) {
        const wx = mx + c * cw + Math.round((cw - 10) / 2), lit = r() < (o.litP || 0);
        if (lit) {
          const lc = pick(r, o.lit || ['#FFC35A']);
          if (night) R('rgba(255,190,90,.10)', wx - 4, fy - 4, 18, 21);
          R(o.frame || shade(o.wall, -.3), wx - 1, fy - 1, 12, 15); R(lc, wx, fy, 10, 13); R(shade(lc, .4), wx + 1, fy + 1, 3, 4);
          if (r() < .5) R(shade(lc, -.28), wx + 6, fy, 4, 13);
          if (r() < .15) R('rgba(30,20,20,.55)', wx + 2, fy + 6, 4, 7);     // силуэт в окне
        } else {
          R(o.frame || shade(o.wall, -.3), wx - 1, fy - 1, 12, 15); R(o.win, wx, fy, 10, 13);
          if (o.refl) { R(o.refl, wx + 1, fy + 1, 2, 7); R(o.refl, wx + 4, fy + 1, 1, 3); }
        }
        R(o.frame || shade(o.wall, -.3), wx, fy + 5, 10, 1); R(o.frame || shade(o.wall, -.3), wx + 5, fy, 1, 5);
        R(shade(o.wall, .18), wx - 2, fy + 13, 14, 2);
        if (o.balc && c % o.balc === 1) {
          const bc = o.balcC || shade(o.wall, -.18);
          R(bc, wx - 5, fy + 7, 20, 9); R(shade(bc, -.25), wx - 5, fy + 7, 20, 1);
          for (let k = 0; k < 20; k += 4) R(shade(bc, -.15), wx - 5 + k, fy + 8, 1, 8);
          if (o.snow) R('#E6ECF5', wx - 6, fy + 5, 22, 2);
          else if (r() < .3) { R(pick(r, ['#C0593A', '#EDE4CF', '#4A6E9C']), wx - 2, fy + 3, 4, 5); R(pick(r, ['#E8C547', '#9B8AC4']), wx + 5, fy + 3, 4, 4); }  // бельё
        }
      }
    }
    if (o.mosaic) for (let k = 0; k < w; k += 6) R(((k / 6) | 0) % 3 === 0 ? '#3E6E9C' : ((k / 6) | 0) % 3 === 1 ? '#C9643A' : '#EDE4CF', x + k, top + 2, 5, 3);
    // крыша
    R(shade(o.wall, -.35), x - 2, top - 3, w + 4, 4);
    R(shade(o.wall, -.45), x + Math.round(w * .25), top - 12, 2, 9); R(shade(o.wall, -.45), x + Math.round(w * .25) - 4, top - 12, 10, 1);
    if (o.snow) { R('#E8EEF6', x - 3, top - 7, w + 6, 5); for (let i = 0; i < w; i += 7 + Math.floor(r() * 9)) R('#E8EEF6', x + i, top - 2, 2, 2 + Math.floor(r() * 5)); }
    R('rgba(0,0,0,.16)', x + w - 8, top, 8, h);
    // первый этаж: магазины или подъезд
    if (o.shops) {
      const n = Math.max(1, Math.floor(w / 70)), sw = w / n;
      for (let i = 0; i < n; i++) {
        const sx = x + i * sw + 4, lab = pick(r, o.shops), sc = pick(r, ['#C0593A', '#3E6E9C', '#6E9145', '#8A4FA0', '#D4A23A']);
        R(sc, sx, base - 42, sw - 8, 10); text(lab, sx + (sw - 8) / 2, base - 40, 6, '#FFFFFF');
        R(night ? '#FFD98A' : '#9FC0D6', sx + 2, base - 30, sw - 26, 26); R(night ? '#FFF0C0' : '#CFE3EE', sx + 4, base - 28, 3, 20);
        R(shade(o.wall, -.4), sx + sw - 22, base - 30, 12, 30); R(night ? '#FFE6A6' : '#6A5A48', sx + sw - 20, base - 28, 8, 28);
        if (night) glow(sx + (sw - 8) / 2, base - 18, 26, '255,200,110', .06);
      }
    } else if (o.door) {
      const dx = x + Math.round(w / 2) - 9;
      R(shade(o.wall, -.4), dx - 6, base - 36, 30, 4); if (o.snow) R('#E8EEF6', dx - 7, base - 39, 32, 3);
      R(shade(o.wall, -.3), dx - 1, base - 32, 20, 32); R(night ? '#FFD27A' : '#5E4A38', dx + 1, base - 30, 16, 30);
      R(night ? '#FFF0C0' : '#7A6450', dx + 3, base - 28, 5, 12); R(shade(o.wall, -.3), dx + 8, base - 30, 1, 30);
      if (night) { glow(dx + 9, base - 22, 30, '255,205,120', .07); R('#FFE6A6', dx + 6, base - 42, 6, 3); }
    }
  }
  // дальний силуэт города (высотки, трубы)
  function skyline(r, w, base, o) {
    for (let x = -20; x < w + 20; x += 26 + Math.floor(r() * 40)) {
      const bw = 24 + Math.floor(r() * 46), bh = o.min + Math.floor(r() * (o.max - o.min));
      R(o.c, x, base - bh, bw, bh + 40);
      if (r() < .25) R(o.c, x + bw / 2 - 1, base - bh - 14, 2, 14);
      for (let y = base - bh + 6; y < base - 6; y += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 5) if (r() < o.litP) R(r() < .7 ? o.lit : o.lit2 || o.lit, wx, y, 2, 3);
    }
  }
  function lampPost(x, base, h, on, pole) {
    const pc = pole || '#23262E', hy = base - h;
    R(pc, x - 1, hy, 3, h); R(pc, x - 3, base - 5, 7, 5); R(pc, x - 2, base - 30, 5, 2);
    R(pc, x, hy, 14, 2); R(pc, x + 12, hy, 2, 3); R('#3A3D46', x + 7, hy + 3, 12, 3);
    R(on ? '#FFE6A6' : '#C9CED6', x + 8, hy + 6, 10, 2);
    if (on) { glow(x + 13, hy + 8, 30, '255,214,140', .09); cone(x + 13, hy + 8, base + 22, 10, 84, '255,214,140', .09); pool(x + 13, base + 12, 54, '255,214,140', .10); }
  }
  function car(x, base, c, o) {
    o = o || {};
    const d = shade(c, -.28), l = shade(c, .25), win = o.night ? '#24304A' : '#9FC4DA';
    R('rgba(0,0,0,.25)', x + 2, base - 3, 68, 4);
    R(c, x + 2, base - 22, 66, 13); R(c, x + 14, base - 33, 38, 12); R(c, x + 10, base - 24, 50, 3);
    R(win, x + 17, base - 31, 15, 9); R(win, x + 34, base - 31, 15, 9); R(c, x + 32, base - 31, 2, 9);
    if (!o.night) { R('#CFE3EE', x + 19, base - 30, 3, 6); R('#CFE3EE', x + 36, base - 30, 3, 6); }
    R(l, x + 2, base - 22, 66, 2); R(d, x + 2, base - 11, 66, 2); R(d, x + 33, base - 20, 1, 9);
    R('#151515', x + 8, base - 11, 14, 11); R('#151515', x + 48, base - 11, 14, 11); R('#8A8F96', x + 12, base - 7, 5, 4); R('#8A8F96', x + 52, base - 7, 5, 4);
    R('#FFE9A0', x + 64, base - 19, 4, 3); R('#C0303A', x + 1, base - 19, 3, 3);
    if (o.snow) { R('#E8EEF6', x + 14, base - 36, 38, 4); R('#E8EEF6', x + 2, base - 24, 12, 2); R('#E8EEF6', x + 54, base - 24, 14, 2); }
  }
  function branch(x, y, len, ang, d, c, snow) {
    for (let i = 0; i < len; i += 2) { const px = x + Math.cos(ang) * i, py = y - Math.sin(ang) * i; R(c, px, py, d > 2 ? 3 : 2, 2); if (snow && d <= 2 && i % 6 === 0) R('#E8EEF6', px, py - 2, 3, 1); }
    if (d <= 0) return;
    const ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
    branch(ex, ey, len * .72, ang + .42, d - 1, c, snow); branch(ex, ey, len * .66, ang - .5, d - 1, c, snow);
  }
  function bareTree(r, x, base, h, c, snow) { const th = h * .42; R(c, x - 3, base - th, 6, th); R(shade(c, .15), x - 3, base - th, 2, th); branch(x, base - th, h * .24, Math.PI / 2 + (r() - .5) * .3, 4, c, snow); if (snow) ellipse('#E8EEF6', x, base - 1, 16, 4); }
  function crownTree(r, x, base, h, cols) {
    R('#5A4230', x - 3, base - h * .55, 6, h * .55); R('#6E543C', x - 3, base - h * .55, 2, h * .55);
    branch(x, base - h * .5, h * .18, 2.2, 1, '#5A4230'); branch(x, base - h * .45, h * .16, .9, 1, '#5A4230');
    for (let k = 0; k < 11; k++) circle(cols[k % cols.length], x + (r() - .5) * h * .48, base - h * .66 + (r() - .5) * h * .34, Math.round(h * .13 + r() * h * .07));
    for (let k = 0; k < 26; k++) R(shade(cols[0], .3), x + (r() - .5) * h * .55, base - h * .66 + (r() - .5) * h * .4, 2, 2);
  }
  function poplar(r, x, base, h, c) {
    R('#4A3A2A', x - 2, base - h * .2, 4, h * .2);
    ellipse(c, x, base - h * .58, Math.round(h * .1), Math.round(h * .4)); ellipse(shade(c, .15), x - 3, base - h * .62, Math.round(h * .05), Math.round(h * .3));
    for (let k = 0; k < 14; k++) R(shade(c, -.2), x + (r() - .5) * h * .16, base - h * .3 - r() * h * .55, 2, 2);
  }
  function fir(x, base, h, c, snow) {
    R('#3A2A20', x - 2, base - 8, 4, 8);
    for (let i = 0; i < 4; i++) { const ty = base - h + i * h * .22, tw = h * (.18 + i * .1); for (let y = 0; y < h * .3; y += 2) { const w = tw * y / (h * .3); R(i % 2 ? c : shade(c, .08), x - w, ty + y, w * 2, 2); } if (snow) R('#E8EEF6', x - tw * .55, ty + h * .26, tw * 1.1, 2); }
    if (snow) R('#E8EEF6', x - 2, base - h - 1, 4, 3);
  }
  function kiosk(x, base, label, o) {
    const w = 84, night = o.night;
    R('rgba(0,0,0,.2)', x - 2, base - 3, w + 4, 4);
    R(o.body || '#4A3A2E', x, base - 56, w, 56); R(shade(o.body || '#4A3A2E', .12), x, base - 56, 3, 56);
    R(night ? '#FFD98A' : '#BFD8E0', x + 6, base - 46, w - 12, 26);
    for (let i = 0; i < 9; i++) R(['#C0593A', '#3E6E9C', '#6E9145', '#E8C547', '#FFFFFF'][i % 5], x + 10 + i * 7, base - 40 + (i % 2) * 8, 5, 6);
    R(shade(o.body || '#4A3A2E', -.3), x + 6, base - 33, w - 12, 2);
    for (let i = 0; i < w + 8; i += 8) R(((i / 8) | 0) % 2 ? (o.a1 || '#C0593A') : (o.a2 || '#EDE4CF'), x - 4 + i, base - 64, 8, 10);
    for (let i = 0; i < w + 8; i += 8) R(((i / 8) | 0) % 2 ? (o.a1 || '#C0593A') : (o.a2 || '#EDE4CF'), x - 4 + i + 2, base - 54, 4, 3);
    R('#2A1E16', x + 8, base - 82, w - 16, 16); text(label, x + w / 2, base - 77, 7, o.signC || '#FFB84F');
    R('#6E5238', x - 2, base - 20, w + 4, 4);
    if (o.snow) { R('#E8EEF6', x - 5, base - 68, w + 10, 4); R('#E8EEF6', x + 6, base - 86, w - 12, 4); }
    if (night) { glow(x + w / 2, base - 34, 54, '255,200,110', .07); pool(x + w / 2, base + 12, 60, '255,200,110', .08); }
  }
  function busStop(x, base, o) {
    const c = o.c || '#3A4A5A';
    R(c, x, base - 60, 3, 60); R(c, x + 78, base - 60, 3, 60); R(shade(c, .2), x - 4, base - 64, 90, 5);
    R('rgba(190,220,235,.35)', x + 4, base - 56, 72, 40); R('rgba(255,255,255,.3)', x + 8, base - 54, 3, 34);
    R('#6E5238', x + 12, base - 18, 56, 4); R(c, x + 16, base - 14, 2, 14); R(c, x + 62, base - 14, 2, 14);
    R('#3E6E9C', x + 86, base - 76, 22, 16); text('BUS', x + 97, base - 71, 6, '#FFFFFF'); R(c, x + 96, base - 60, 2, 60);
    if (o.snow) R('#E8EEF6', x - 5, base - 68, 92, 4);
  }
  function bench(x, base, c, snow) { R(c, x, base - 14, 46, 5); R(c, x, base - 26, 46, 4); R(shade(c, .2), x, base - 26, 46, 1); R('#2A2420', x + 4, base - 9, 3, 9); R('#2A2420', x + 39, base - 9, 3, 9); R('#2A2420', x + 4, base - 26, 3, 14); R('#2A2420', x + 39, base - 26, 3, 14); if (snow) { R('#E8EEF6', x - 1, base - 17, 48, 3); R('#E8EEF6', x - 1, base - 28, 48, 2); } }
  function bin(x, base, snow) { R('#3E5E4A', x, base - 20, 14, 20); R('#2F4A3A', x - 1, base - 22, 16, 3); R('#4E7460', x + 2, base - 18, 2, 14); if (snow) R('#E8EEF6', x - 1, base - 25, 16, 3); }
  function drift(x, base, w) { ellipse('#DCE4EF', x, base - 2, w, 6); ellipse('#EEF3F8', x - 2, base - 5, Math.round(w * .7), 4); }

  /* ---------- сцены ---------- */
  const S = {};

  // Зимний двор в Актобе ночью
  S.winter = {
    sky: () => { sky(['#070B1C', '#0A1026', '#0E1632', '#131D3E', '#19254A', '#202E56'], 230); },
    layers: [
      { par: .04, w: 1280, draw(r, gy) { skyline(r, 1280, gy - 40, { c: '#10162E', min: 50, max: 130, litP: .05, lit: '#3A4678', lit2: '#C9A050' }); R('#8A8F9C', 980, gy - 210, 10, 170); for (let y = gy - 210; y < gy - 40; y += 24) R('#B04040', 980, y, 10, 8); },
        anim(ctx, cam, t, gy) { const px = Math.round(980 - ((cam * .04) % 1280)); if (Math.floor(t / 600) % 2) { R('#FF5050', px + 3, gy - 214, 4, 4); R('#FF5050', px + 1280 + 3, gy - 214, 4, 4); } } },
      { par: .26, w: 1600, draw(r, gy) {
        const walls = ['#2C3047', '#34314A', '#2A3344', '#30344C'];
        let x = 10;
        while (x < 1600) { const w = 150 + Math.floor(r() * 90), h = 190 + Math.floor(r() * 60); building(r, x, gy - 14, w, h, { wall: pick(r, walls), win: '#151A2C', lit: ['#FFC35A', '#FFB347', '#FFD98A', '#9FD0FF'], litP: .42, night: true, snow: true, balc: 3, door: true, frame: '#1C2032' }); x += w + 26 + Math.floor(r() * 40); if (r() < .7) bareTree(r, x - 16, gy - 14, 90 + r() * 30, '#1A1E2E', true); }
      } },
      { par: 1, w: 1600, floor: true, draw(r, gy) {      // тротуар в снегу, бордюр, дорога
        R('#C3CDDF', 0, gy - 14, 1600, 28); for (let x = 0; x < 1600; x += 32) R('#B2BED3', x, gy - 14, 1, 28);
        for (let i = 0; i < 60; i++) R('#D7DFEC', r() * 1600, gy - 12 + r() * 22, 6 + r() * 18, 2);
        for (let i = 0; i < 40; i++) { const fx = r() * 1600, fy = gy - 8 + r() * 16; R('#A7B4CA', fx, fy, 3, 2); R('#A7B4CA', fx + 7, fy + 3, 3, 2); }
        R('#EEF3F8', 0, gy - 16, 1600, 3); R('#7E8AA2', 0, gy + 14, 1600, 5); R('#A9B4C8', 0, gy + 14, 1600, 1);
        R('#262B3B', 0, gy + 19, 1600, 60); for (let x = 0; x < 1600; x += 4) { R('#3A4258', x, gy + 27 + ((x / 4) % 2), 4, 2); R('#3A4258', x, gy + 43 + ((x / 4) % 2), 4, 2); }
        for (let i = 0; i < 70; i++) R('#AEB9CC', r() * 1600, gy + 20 + r() * 40, 2 + r() * 6, 1);
      } },
      { par: 1, w: 1600, draw(r, gy) {
        const b = gy - 14;
        [60, 520, 980, 1420].forEach(x => drift(x, b, 40));
        [180, 600, 1040, 1460].forEach(x => lampPost(x, b, 120, true));
        car(250, b, '#9AA3AE', { night: true, snow: true }); car(1120, b, '#6E2A30', { night: true, snow: true });
        kiosk(690, b, 'ПРОДУКТЫ 24', { night: true, snow: true, a1: '#3E6E9C', a2: '#EDE4CF', signC: '#7FE0FF' });
        [40, 420, 880, 1540].forEach(x => bareTree(r, x, b, 120 + r() * 40, '#1E2230', true));
        fir(360, b, 70, '#1E3A2E', true); fir(1560 - 600, b, 60, '#1E3A2E', true);
        bench(820, b, '#5E4A3A', true); bin(800, b, true); busStop(1240, b, { snow: true, c: '#2E3A4A' });
      } }
    ],
    back(ctx, cam, t, gy) {
      for (let i = 0; i < 46; i++) { const x = (i * 139 + 11) % W, y = (i * 61) % 180; if (Math.sin(t / 420 + i * 1.7) > -.3) R(i % 7 ? '#DDE4F0' : '#FFE6A6', x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
      glow(560, 56, 26, '242,227,160', .06); circle('#F2E3A0', 560, 56, 14); circle('#0A1026', 567, 51, 12);
    }
  };

  // Актобе, начало осени, день
  S.autumn = {
    sky: () => { sky(['#5A97D2', '#68A3DA', '#79AFE0', '#8DBCE6', '#A2C9EC', '#BAD8F0'], 220); circle('#FFF3B0', 540, 46, 20); circle('#FFE98A', 540, 46, 15); },
    layers: [
      { par: .05, w: 1280, draw(r, gy) { skyline(r, 1280, gy - 50, { c: '#9FB2C8', min: 50, max: 120, litP: .06, lit: '#B8C8DA' }); } },
      { par: .26, w: 1600, draw(r, gy) {
        const walls = ['#DCCFB6', '#E4D9C4', '#CFBEA0', '#D8C6A8'];
        let x = 0;
        while (x < 1600) { const w = 160 + Math.floor(r() * 90), h = 150 + Math.floor(r() * 70); building(r, x, gy - 14, w, h, { wall: pick(r, walls), win: '#5E7898', refl: '#A8C0D8', litP: 0, balc: 2, balcC: '#C2B89E', mosaic: r() < .5, shops: r() < .6 ? ['АПТЕКА', 'МАГАЗИН', 'САЛОН', 'КАФЕ', 'ЦВЕТЫ'] : null, door: true }); x += w + 20 + Math.floor(r() * 30); crownTree(r, x - 10, gy - 14, 90 + r() * 30, ['#E0A030', '#D4862A', '#E8C547']); }
      } },
      { par: 1, w: 1600, floor: true, draw(r, gy) {
        R('#A39D92', 0, gy - 14, 1600, 28); for (let x = 0; x < 1600; x += 24) R('#958F84', x, gy - 14, 1, 28); R('#958F84', 0, gy, 1600, 1);
        for (let i = 0; i < 90; i++) R(pick(r, ['#E0952F', '#C0593A', '#E8C547', '#B8762A']), r() * 1600, gy - 12 + r() * 24, 3, 2);
        R('#CFCAC0', 0, gy + 14, 1600, 5); R('#E6E2DA', 0, gy + 14, 1600, 1);
        R('#5D5E64', 0, gy + 19, 1600, 60); for (let x = 0; x < 1600; x += 64) R('#D8D2C0', x, gy + 40, 30, 3);
        for (let i = 0; i < 40; i++) R('#6A6B72', r() * 1600, gy + 22 + r() * 36, 4, 2);
      } },
      { par: 1, w: 1600, draw(r, gy) {
        const b = gy - 14;
        [150, 610, 1070, 1500].forEach(x => lampPost(x, b, 118, false, '#3A3D46'));
        [60, 330, 840, 1250].forEach(x => crownTree(r, x, b, 130 + r() * 30, ['#E8A630', '#D97F25', '#F0C846', '#C9602E']));
        car(420, b, '#E6E6E6'); car(930, b, '#3E5F8A'); car(1350, b, '#B84A3A');
        busStop(680, b, { c: '#4A5A6A' }); bench(1170, b, '#8A5A2E'); bin(1150, b);
        for (let i = 0; i < 12; i++) ellipse(pick(r, ['#E0952F', '#C0593A', '#E8C547']), r() * 1600, b + 1, 10, 3);
      } }
    ],
    back(ctx, cam, t, gy) {
      for (let i = 0; i < 4; i++) { const x = ((i * 220 + t / 60 - cam * .02) % 900 + 900) % 900 - 130, y = 30 + i * 22; ellipse('#F4F8FC', x, y, 34, 8); ellipse('#FFFFFF', x + 14, y - 6, 20, 6); ellipse('#E2ECF5', x - 4, y + 6, 26, 3); }
      for (let i = 0; i < 3; i++) { const bx = ((t / 30 + i * 70) % 800) - 80, by = 80 + i * 8 + Math.sin(t / 200 + i) * 3, f = Math.floor(t / 180 + i) % 2; R('#3A3A46', bx, by, 2, 2); R('#3A3A46', bx - 3, by - f * 2, 3, 2); R('#3A3A46', bx + 2, by - f * 2, 3, 2); }
    }
  };

  // Алматы вечером: горы, город, тополя
  S.almaty = {
    sky: () => { sky(['#23284F', '#363566', '#55447A', '#7E4E7E', '#B4607A', '#DE8468', '#F2AE70'], 240); circle('#FFD98A', 470, 214, 22); },
    layers: [
      { par: .03, w: 1280, draw(r, gy) {
        for (let x = -40; x < 1320; x += 4) { const h = 120 + Math.sin(x / 90) * 40 + Math.sin(x / 37) * 16 + Math.sin(x / 13) * 4; R('#5E5682', x, gy - 40 - h, 4, h + 40); if (h > 128) R('#F4E2EA', x, gy - 40 - h, 4, Math.round((h - 128) * .9) + 4); }
        for (let x = -40; x < 1320; x += 4) { const h = 70 + Math.sin(x / 50 + 2) * 22 + Math.sin(x / 17) * 6; R('#4A4670', x, gy - 40 - h, 4, h + 40); }
        R('#2E2C48', 300, gy - 150, 3, 110); R('#2E2C48', 296, gy - 120, 11, 3); R('#2E2C48', 298, gy - 100, 7, 2);
      },
        anim(ctx, cam, t, gy) { const x = Math.round(300 - ((cam * .03) % 1280)) + 1; if (Math.floor(t / 700) % 2) { R('#FF5050', x, gy - 152, 3, 3); R('#FF5050', x + 1280, gy - 152, 3, 3); } } },
      { par: .1, w: 1280, draw(r, gy) { skyline(r, 1280, gy - 30, { c: '#2E2A4A', min: 40, max: 120, litP: .25, lit: '#FFC35A', lit2: '#9FD0FF' }); } },
      { par: .3, w: 1600, draw(r, gy) {
        const walls = ['#3C3A58', '#46405E', '#3A4058'];
        let x = 0;
        while (x < 1600) { const w = 130 + Math.floor(r() * 80), h = 120 + Math.floor(r() * 80); building(r, x, gy - 14, w, h, { wall: pick(r, walls), win: '#24243A', lit: ['#FFC35A', '#FFD98A', '#FFB347'], litP: .45, night: true, balc: 3, shops: r() < .6 ? ['КАФЕ', 'КОФЕ', 'ПЕКАРНЯ', 'ЦВЕТЫ', 'МАРКЕТ'] : null, door: true }); x += w + 30; poplar(r, x - 14, gy - 14, 120, '#2A4232'); }
      } },
      { par: 1, w: 1600, floor: true, draw(r, gy) {
        R('#5A5868', 0, gy - 14, 1600, 6); R('#3E4A5A', 0, gy - 12, 1600, 3);       // арык
        R('#8E8A90', 0, gy - 8, 1600, 22); for (let x = 0; x < 1600; x += 24) R('#7E7A82', x, gy - 8, 1, 22);
        R('#B4AEB2', 0, gy + 14, 1600, 5); R('#3A3A46', 0, gy + 19, 1600, 60); for (let x = 0; x < 1600; x += 64) R('#C9C2B0', x, gy + 40, 30, 3);
      } },
      { par: 1, w: 1600, draw(r, gy) {
        const b = gy - 14;
        [90, 330, 560, 800, 1040, 1280, 1520].forEach(x => poplar(r, x, b, 190 + r() * 30, '#2E4A34'));
        [200, 680, 1160].forEach(x => lampPost(x, b, 120, true));
        car(380, b, '#EDEDED', { night: true }); car(900, b, '#2A2A2A', { night: true }); car(1360, b, '#C9A030', { night: true });
        bench(1000, b, '#6E4A30'); bin(980, b);
      } }
    ],
  };

  // Компьютерный клуб ночью
  S.club = {
    sky: () => { R('#140F22', 0, 0, W, H); },
    layers: [
      { par: .85, w: 1280, draw(r, gy) {
        R('#1C1530', 0, 0, 1280, gy); R('#0F0B1A', 0, 0, 1280, 40);
        for (let x = 0; x < 1280; x += 64) { R('#211A38', x + 2, 50, 60, gy - 70); R('#181229', x, 50, 2, gy - 70); }
        for (let x = 0; x < 1280; x += 160) { R('#2A2240', x + 40, 14, 60, 6); R('#FFF0FF', x + 44, 18, 52, 2); }
        R('#C03AB0', 0, 40, 1280, 3); R('rgba(192,58,176,.18)', 0, 43, 1280, 10); R('#4FE3FF', 0, gy - 62, 1280, 2); R('rgba(79,227,255,.12)', 0, gy - 70, 1280, 8);
        for (let k = 0; k < 2; k++) { const bx = 180 + k * 640; R('#0E0A16', bx, 62, 260, 52); R('#2A2040', bx + 4, 66, 252, 44); glow(bx + 130, 88, 120, '79,227,255', .03); text('COMPUTER CLUB', bx + 130, 81, 12, '#4FE3FF'); }
        const posters = [['#C0593A', '#E8C547'], ['#3E6E9C', '#9FD0FF'], ['#6E9145', '#D4F08A'], ['#8A4FA0', '#F0A8FF']];
        for (let i = 0; i < 6; i++) {
          const px = 40 + i * 214 + (i % 2) * 20, c = posters[i % 4];
          R('#0A0812', px - 2, 128, 48, 64); R(c[0], px, 130, 44, 60); R(shade(c[0], -.3), px, 166, 44, 24);
          if (i % 3 === 0) { R(c[1], px + 16, 140, 12, 20); R(c[1], px + 10, 156, 24, 6); }          // ракета
          else if (i % 3 === 1) { R(c[1], px + 20, 136, 4, 30); R(c[1], px + 14, 160, 16, 3); }     // меч
          else { R(c[1], px + 8, 146, 28, 14); R(shade(c[0], -.4), px + 12, 150, 6, 2); R(shade(c[0], -.4), px + 14, 148, 2, 6); R(shade(c[0], -.4), px + 28, 150, 3, 3); }  // джойстик
          text(['GG', 'WIN', 'LVL UP', 'PLAY', '1UP', 'GO!'][i], px + 22, 178, 6, '#FFFFFF');
        }
        for (let i = 0; i < 4; i++) { const sx = 140 + i * 320; R('#3A2E50', sx, 110, 10, 8); glow(sx + 5, 118, 26, '192,58,176', .06); }
      } },
      { par: 1, w: 1280, floor: true, draw(r, gy) {
        for (let x = 0; x < 1280; x += 32) for (let y = gy - 14; y < H; y += 16) R(((x / 32 + y / 16) | 0) % 2 ? '#17121F' : '#1C1626', x, y, 32, 16);
        for (let x = 0; x < 1280; x += 80) { R('rgba(79,140,255,.10)', x + 18, gy - 12, 44, 16); R('rgba(192,58,176,.08)', x + 30, gy + 8, 20, 30); }
      } },
      { par: 1, w: 1280, draw(r, gy) {
        const b = gy - 14;
        for (let i = 0; i < 16; i++) {
          const x = i * 80 + 10;
          if (i % 8 === 5) continue;                                                       // место под стойку админа
          R('#2E2440', x, b - 36, 64, 5); R('#241C34', x + 2, b - 31, 3, 31); R('#241C34', x + 59, b - 31, 3, 31);
          R('#0C0A12', x + 14, b - 72, 36, 30); const sc = pick(r, [['#4F8CFF', '#6E9145'], ['#FF6B6B', '#2A2A33'], ['#7FE0FF', '#3A5A9C'], ['#E8C547', '#8A4FA0']]);
          R(sc[0], x + 16, b - 70, 32, 16); R(sc[1], x + 16, b - 54, 32, 10); R('#FFFFFF', x + 20 + r() * 20, b - 60, 3, 4);
          R('#0C0A12', x + 30, b - 42, 4, 6); R('#3A2E50', x + 22, b - 40, 20, 2);
          glow(x + 32, b - 58, 34, '120,170,255', .05);
          R('#1A1426', x + 8, b - 38, 30, 3); for (let k = 0; k < 7; k++) R(['#FF5A5A', '#FFB84F', '#6FE38A', '#4FE3FF', '#C03AB0'][(k + i) % 5], x + 9 + k * 4, b - 38, 2, 1);
          R('#0E0A16', x + 50, b - 64, 12, 28); R(i % 2 ? '#C03AB0' : '#4FE3FF', x + 52, b - 60, 8, 8); R('#2A2238', x + 54, b - 48, 4, 2);
          R('#C03AB0', x + 2, b - 62, 14, 28); R('#1A1426', x + 5, b - 58, 8, 20); R('#C03AB0', x - 2, b - 32, 22, 6); R('#3A3352', x + 7, b - 26, 4, 18); R('#3A3352', x, b - 8, 18, 3);
        }
        for (let k = 0; k < 2; k++) {                                                      // стойка админа + холодильник
          const x = 5 * 80 + 10 + k * 640;
          R('#3A2E50', x - 6, b - 44, 74, 44); R('#4A3E64', x - 8, b - 48, 78, 5); R('#C03AB0', x - 6, b - 24, 74, 2);
          text('ADMIN', x + 31, b - 38, 6, '#FFB84F'); R('#0C0A12', x + 40, b - 66, 20, 16); R('#6FE38A', x + 42, b - 64, 16, 10);
          R('#DDE5EE', x - 40, b - 86, 30, 86); R('#BFD8E0', x - 37, b - 82, 24, 60); for (let s = 0; s < 4; s++) for (let c2 = 0; c2 < 3; c2++) R(['#C0593A', '#E8C547', '#4F8CFF', '#6FE38A'][(s + c2) % 4], x - 35 + c2 * 8, b - 78 + s * 15, 5, 11);
          glow(x - 25, b - 52, 40, '200,230,255', .05);
        }
      } }
    ],
    front(ctx, cam, t, gy) {
      const b = gy - 14;
      for (let i = 0; i < 16; i++) { if (i % 8 === 5) continue; const x = ((i * 80 + 10 - cam) % 1280 + 1280) % 1280; if (x > W + 10) continue; R('#FFFFFF', x + 18 + ((t / 90 + i * 9) % 26), b - 66 + (i % 3) * 4, 2, 2); }
      if (Math.floor(t / 400) % 5) R('rgba(79,227,255,.05)', 0, 0, W, 60);
    }
  };

  // Офис (Алматы): окна на горы, столы, серверная
  S.office = {
    sky: () => { R('#E6E0D2', 0, 0, W, H); },
    layers: [
      { par: .9, w: 1200, draw(r, gy) {
        R('#E6E0D2', 0, 0, 1200, gy); R('#D2C9B4', 0, gy - 60, 1200, 46); R('#BDB39C', 0, gy - 60, 1200, 2);
        for (let x = 0; x < 1200; x += 100) { R('#F6F2E8', x + 20, 6, 60, 5); R('rgba(255,250,230,.25)', x + 10, 11, 80, 12); }
        for (let k = 0; k < 3; k++) {
          const wx = 40 + k * 400;
          R('#7C7A74', wx - 4, 30, 228, 160);
          for (let y = 0; y < 152; y += 2) R(y < 70 ? '#8EC0EA' : '#A9D0EE', wx, 34 + y, 220, 2);
          for (let x = 0; x < 220; x += 2) { const h = 46 + Math.sin((x + k * 90) / 26) * 18 + Math.sin(x / 9) * 4; R('#7E8EAE', wx + x, 140 - h, 2, h); if (h > 52) R('#FFFFFF', wx + x, 140 - h, 2, h - 50); }
          for (let x = 0; x < 220; x += 14) { const h = 14 + ((x * 7 + k * 13) % 30); R('#6E7A90', wx + x, 186 - h, 12, h); for (let y = 186 - h + 3; y < 184; y += 5) R('#C9D8E8', wx + x + 3, y, 2, 2); }
          R('#7C7A74', wx + 108, 30, 4, 160); R('#7C7A74', wx - 4, 108, 228, 3); R('#9A978E', wx - 8, 190, 236, 6);
        }
        for (let k = 0; k < 3; k++) {
          const bx = 290 + k * 400;
          R('#B8B2A2', bx - 2, 60, 84, 60); R('#FFFFFF', bx, 62, 80, 56);
          for (let l = 0; l < 4; l++) R(['#3E6E9C', '#C0593A', '#3E6E9C', '#6E9145'][l], bx + 6, 70 + l * 11, 20 + ((l * 23 + k * 7) % 46), 2);
          R('#C0593A', bx + 54, 70, 16, 16); R('#FFFFFF', bx + 57, 73, 10, 10);
        }
        R('#2A2A33', 1040, 64, 90, 18); text('SERVER', 1085, 70, 7, '#6FE38A');
      } },
      { par: 1, w: 1200, floor: true, draw(r, gy) { for (let x = 0; x < 1200; x += 40) for (let y = gy - 14; y < H; y += 20) R(((x / 40 + y / 20) | 0) % 2 ? '#5A6474' : '#535C6B', x, y, 40, 20); for (let i = 0; i < 120; i++) R('#4A5262', r() * 1200, gy - 14 + r() * 74, 2, 2); } },
      { par: 1, w: 1200, draw(r, gy) {
        const b = gy - 14;
        for (let i = 0; i < 8; i++) {
          const x = i * 150 + 20; if (i === 7) continue;
          R('#8A6A48', x, b - 34, 90, 5); R('#6E543A', x + 4, b - 29, 4, 29); R('#6E543A', x + 82, b - 29, 4, 29);
          R('#2A2A33', x + 26, b - 66, 38, 26); R('#1E2430', x + 28, b - 64, 34, 20);
          for (let l = 0; l < 5; l++) R(pick(r, ['#6FE38A', '#4FE3FF', '#E8C547', '#EDE4CF']), x + 30 + (l % 2) * 4, b - 61 + l * 4, 8 + r() * 18, 2);
          R('#2A2A33', x + 43, b - 40, 4, 6); R('#3A3A46', x + 30, b - 37, 28, 3); R('#EDE4CF', x + 70, b - 41, 8, 7); R('#C0593A', x + 71, b - 40, 6, 2);
          R('#2E3440', x + 34, b - 30, 22, 5); R('#2E3440', x + 42, b - 50, 6, 20); R('#2E3440', x + 36, b - 58, 18, 10); R('#2E3440', x + 44, b - 25, 2, 18); R('#2E3440', x + 36, b - 7, 18, 2);
        }
        const sx = 7 * 150 + 30;
        R('#1E1E26', sx, b - 110, 60, 110); for (let k = 0; k < 10; k++) { R('#2E2E3A', sx + 4, b - 104 + k * 10, 52, 7); R('#6FE38A', sx + 8, b - 102 + k * 10, 2, 2); }
        R('#DDE5EE', 560, b - 46, 18, 46); R('#6FAFD8', 562, b - 64, 14, 18);
        R('#8A5A2E', 980, b - 20, 22, 20); circle('#5B7A3A', 991, b - 40, 14); circle('#6E9145', 986, b - 46, 9);
      } }
    ],
    front(ctx, cam, t, gy) { const b = gy - 14, sx = 7 * 150 + 30 - cam; if (sx > -70 && sx < W) for (let k = 0; k < 10; k++) R((Math.floor(t / 150) + k * 3) % 4 ? '#6FE38A' : '#FFB84F', sx + 14, b - 102 + k * 10, 2, 2); }
  };

  // ТЦ «Керуен Сити»
  S.mall = {
    sky: () => { R('#EDE6D8', 0, 0, W, H); },
    layers: [
      { par: .45, w: 1280, draw(r, gy) {
        R('#D8D2C4', 0, 0, 1280, 34); for (let x = 0; x < 1280; x += 40) { R('#BFD8EA', x + 2, 2, 36, 26); R('#E6F2FA', x + 4, 4, 8, 22); } R('#9A968C', 0, 30, 1280, 4);
        R('#E2DACA', 0, 34, 1280, 96);
        const nm = ['KIDS', 'TECH', 'SPORT', 'MUSIC', 'GAMES', 'TEA'], cl = ['#C0593A', '#3E6E9C', '#6E9145', '#8A4FA0', '#D4A23A', '#2E8A7A'];
        for (let i = 0; i < 8; i++) { const x = i * 160 + 10, k = i % 6; R('#9A9080', x, 44, 140, 76); R(cl[k], x, 44, 140, 14); text(nm[k], x + 70, 48, 7, '#FFFFFF'); R('#CFE3EC', x + 6, 62, 128, 58); R('#E6F2FA', x + 10, 64, 4, 52); for (let j = 0; j < 4; j++) R(pick(r, ['#C0593A', '#3E6E9C', '#E8C547', '#6E9145']), x + 24 + j * 26, 92, 14, 22); }
        R('rgba(207,227,236,.55)', 0, 112, 1280, 18); R('#B8B2A2', 0, 110, 1280, 3); R('#B8B2A2', 0, 128, 1280, 3); for (let x = 0; x < 1280; x += 40) R('#B8B2A2', x, 110, 2, 20);
        for (let k = 0; k < 2; k++) { const bx = 380 + k * 640; R('#8A867E', bx + 30, 34, 2, 14); R('#8A867E', bx + 230, 34, 2, 14); R('#2A2420', bx, 48, 262, 26); text('KERUEN CITY', bx + 131, 56, 10, '#D4B95E'); }
      } },
      { par: .9, w: 1440, draw(r, gy) {
        R('#E9E2D4', 0, 132, 1440, gy - 132);
        const nm = ['CAFE', 'SHOES', 'FASHION', 'BOOKS', 'FLOWERS', 'PHONE'], cl = ['#C0593A', '#3E6E9C', '#2A2420', '#6E9145', '#C0508A', '#4A4A5A'];
        for (let i = 0; i < 6; i++) {
          const x = i * 240 + 14, k = i;
          R('#8A8070', x, 140, 212, gy - 140); R(cl[k], x, 140, 212, 22); text(nm[k], x + 106, 147, 8, '#FFFFFF');
          R('#CFE3EC', x + 8, 168, 130, gy - 182); R('#E6F2FA', x + 12, 172, 5, gy - 194);
          R('#FFF2D0', x + 148, 168, 56, gy - 168);
          if (k === 1) for (let j = 0; j < 6; j++) { R('#B8AEA0', x + 18 + j * 19, 210 + (j % 2) * 26, 16, 2); R(pick(r, ['#C0593A', '#FFFFFF', '#3E6E9C', '#2A2420']), x + 20 + j * 19, 204 + (j % 2) * 26, 10, 6); }
          else if (k === 2) for (let j = 0; j < 3; j++) { const mx2 = x + 30 + j * 40; circle('#E8D6C0', mx2, 190, 6); R(pick(r, ['#C0593A', '#8A4FA0', '#2E8A7A']), mx2 - 9, 197, 18, 30); R('#3A3A46', mx2 - 6, 227, 12, 24); }
          else if (k === 4) for (let j = 0; j < 5; j++) { R('#6E9145', x + 24 + j * 22, 220, 3, 26); circle(pick(r, ['#C0508A', '#E8C547', '#FFFFFF', '#C0593A']), x + 25 + j * 22, 216, 7); }
          else for (let j = 0; j < 4; j++) R(pick(r, ['#C0593A', '#3E6E9C', '#E8C547', '#6E9145', '#EDE4CF']), x + 20 + j * 28, 196 + (j % 2) * 18, 18, 24);
        }
      } },
      { par: 1, w: 1280, floor: true, draw(r, gy) {
        for (let x = 0; x < 1280; x += 48) for (let y = gy - 14; y < H; y += 24) R(((x / 48 + y / 24) | 0) % 2 ? '#E9E2D4' : '#DED6C6', x, y, 48, 24);
        for (let x = 0; x < 1280; x += 96) { R('rgba(255,255,255,.45)', x + 20, gy, 30, 2); R('rgba(255,255,255,.3)', x + 26, gy + 14, 14, 2); }
      } },
      { par: 1, w: 1280, draw(r, gy) {
        const b = gy - 14;
        [180, 820].forEach(x => { R('#8A8270', x, b - 22, 40, 22); R('#A89E88', x - 2, b - 24, 44, 3); circle('#5B7A3A', x + 20, b - 44, 18); circle('#6E9145', x + 12, b - 52, 11); circle('#4A6A30', x + 30, b - 38, 9); });
        [460, 1100].forEach(x => bench(x, b, '#8A6A48'));
        R('#9A968C', 620, b - 130, 140, 6); for (let i = 0; i < 12; i++) R('#B8B2A2', 620 + i * 10, b - 130 + i * 10, 14, 4); R('#6A6660', 616, b - 132, 6, 132); R('#6A6660', 754, b - 20, 6, 20);
      } }
    ],
  };

  // Кинозал
  S.cinema = {
    sky: () => { R('#120910', 0, 0, W, H); },
    layers: [
      { par: .2, w: 1280, draw(r, gy) {
        R('#160B12', 0, 0, 1280, gy);
        for (let x = 0; x < 1280; x += 12) R(((x / 12) | 0) % 2 ? '#5A1620' : '#4A121A', x, 0, 12, 22);
        for (let k = 0; k < 2; k++) { const sx = 70 + k * 640; for (let x = 0; x < 50; x += 8) { R(((x / 8) | 0) % 2 ? '#7A1E2A' : '#5A1620', sx - 54 + x, 16, 8, 170); R(((x / 8) | 0) % 2 ? '#7A1E2A' : '#5A1620', sx + 504 + x, 16, 8, 170); } }
        for (let i = 0; i < 8; i++) { const x = 30 + i * 160; R('#2A141C', x, 196, 10, 18); glow(x + 5, 200, 20, '255,190,120', .05); }
      },
        anim(ctx, cam, t, gy) {
          const sx = Math.round(80 - ((cam * .2) % 640)), fl = .85 + Math.sin(t / 90) * .06, ph = Math.floor(t / 2500) % 3;
          for (let j = -1; j < 2; j++) {
            const x = sx + j * 640; if (x > W || x + 480 < 0) continue;
            R('#2A141C', x - 6, 18, 492, 172);
            R(['#7FB2E5', '#F2AE70', '#23284F'][ph], x, 24, 480, 160); R(['#6E9145', '#C9643A', '#2E2A4A'][ph], x, 140, 480, 44);
            circle(['#FFE98A', '#FFD98A', '#F2E3A0'][ph], x + 380, 64, 18);
            const hx = x + 60 + ((t / 12) % 360); R('#2A2420', hx, 116, 14, 24); circle('#E8C8A0', hx + 7, 110, 7);
            C.fillStyle = `rgba(255,250,235,${(1 - fl).toFixed(2)})`; C.fillRect(x, 24, 480, 160);
          }
        } },
      { par: .9, w: 1280, draw(r, gy) {
        for (let row = 0; row < 2; row++) for (let i = 0; i < 40; i++) {
          const x = i * 32 + row * 16, y = gy - 64 + row * 24;
          R(row ? '#7A1E2A' : '#5A1620', x, y, 28, 24); R(row ? '#9A2A36' : '#6E1C28', x + 2, y, 24, 6); R('#2A0C12', x + 26, y + 4, 2, 20);
          if (!row && i % 3 === 1) { circle('#1E0E14', x + 14, y - 6, 7); R('#1E0E14', x + 6, y - 2, 16, 6); }
        }
        for (let i = 0; i < 1280; i += 64) R('#FFB84F', i + 30, gy - 18, 4, 2);
      } },
      { par: 1, w: 640, floor: true, draw(r, gy) { R('#3A0E18', 0, gy - 14, 640, 74); for (let x = 0; x < 640; x += 16) for (let y = gy - 10; y < H; y += 16) R('#4A1420', x + ((y / 16) % 2) * 8, y, 4, 4); } }
    ],
    front(ctx, cam, t, gy) { cone(W - 40, 0, 190, 6, 260, '255,250,220', .035); }
  };

  // Оптика
  S.optics = {
    sky: () => { R('#EEF4F5', 0, 0, W, H); },
    layers: [
      { par: .9, w: 1200, draw(r, gy) {
        R('#EEF4F5', 0, 0, 1200, gy); R('#D5E2E6', 0, gy - 70, 1200, 56); R('#BFD0D6', 0, gy - 70, 1200, 2);
        for (let x = 0; x < 1200; x += 80) { R('#C9D2D6', x + 34, 0, 12, 6); glow(x + 40, 10, 20, '255,250,220', .07); }
        for (let k = 0; k < 2; k++) { const bx = 200 + k * 600; R('#3E6E9C', bx, 18, 200, 34); text('ОПТИКА', bx + 100, 30, 12, '#FFFFFF'); R('#FFFFFF', bx + 14, 32, 10, 6); R('#FFFFFF', bx + 28, 32, 10, 6); R('#FFFFFF', bx + 24, 33, 4, 2); }
        for (let i = 0; i < 9; i++) {
          const bx = 10 + i * 130; if (i % 3 === 2) continue;
          R('#B8C6CC', bx, 66, 110, 150); R('#CFDDE2', bx + 4, 70, 102, 142);
          for (let s = 0; s < 4; s++) { R('#8C9AA0', bx + 4, 102 + s * 30, 102, 3); for (let g2 = 0; g2 < 3; g2++) { const gx = bx + 12 + g2 * 32, gyy = 90 + s * 30, c = ['#2A2420', '#8A5A2E', '#C0593A', '#4A6E9C', '#C0508A'][(s + g2 + i) % 5]; R(c, gx, gyy, 9, 2); R(c, gx + 13, gyy, 9, 2); R(c, gx, gyy, 2, 7); R(c, gx + 7, gyy, 2, 7); R(c, gx + 13, gyy, 2, 7); R(c, gx + 20, gyy, 2, 7); R(c, gx, gyy + 6, 9, 2); R(c, gx + 13, gyy + 6, 9, 2); R(c, gx + 9, gyy + 2, 4, 2); R('rgba(160,210,240,.5)', gx + 2, gyy + 2, 5, 4); R('rgba(160,210,240,.5)', gx + 15, gyy + 2, 5, 4); } }
        }
        for (let k = 0; k < 3; k++) {                                                       // таблица для зрения
          const bx = 10 + (k * 3 + 2) * 130 + 20;
          R('#FFFFFF', bx, 70, 74, 120); R('#C9D2D6', bx - 2, 68, 78, 2);
          ['Ш Б', 'М Н К', 'Ы М Б Ш', 'Б Ы Н К М', 'Ш И Н Б К'].forEach((s, l) => text(s, bx + 37, 76 + l * 22, [12, 9, 7, 6, 5][l], '#2A2420'));
        }
      } },
      { par: 1, w: 640, floor: true, draw(r, gy) { for (let x = 0; x < 640; x += 32) for (let y = gy - 14; y < H; y += 16) R(((x / 32 + y / 16) | 0) % 2 ? '#E3E6E2' : '#D8DCD8', x, y, 32, 16); for (let x = 0; x < 640; x += 64) R('rgba(255,255,255,.6)', x + 10, gy + 2, 26, 2); } }
    ],
  };

  // Донерная
  S.food = {
    sky: () => { R('#F0B35A', 0, 0, W, H); },
    layers: [
      { par: .9, w: 1200, draw(r, gy) {
        R('#F0B35A', 0, 0, 1200, gy); R('#E6A048', 0, 0, 1200, 8);
        R('#F4E6CC', 0, gy - 90, 1200, 76); for (let x = 0; x < 1200; x += 16) R('#E2D2B4', x, gy - 90, 1, 76); for (let y = gy - 90; y < gy - 14; y += 16) R('#E2D2B4', 0, y, 1200, 1);
        for (let k = 0; k < 2; k++) {
          const bx = 60 + k * 600;
          R('#2A2420', bx, 18, 280, 96); R('#3A322C', bx + 4, 22, 272, 88);
          text('ДОНЕР ...... 1800 ₸', bx + 14, 32, 9, '#D4B95E', 'left'); text('ШАУРМА ..... 1500 ₸', bx + 14, 52, 9, '#EDE4CF', 'left'); text('ЛАВАШ ...... 1300 ₸', bx + 14, 72, 9, '#EDE4CF', 'left'); text('АЙРАН ....... 400 ₸', bx + 14, 92, 9, '#EDE4CF', 'left');
          const wx = bx + 340;                                                               // окно на вечернюю улицу
          R('#7A5A3A', wx - 4, 24, 168, 120); for (let y = 0; y < 112; y += 2) R(y < 60 ? '#3A3A6A' : '#6A4E78', wx, 28 + y, 160, 2);
          for (let i = 0; i < 5; i++) { const h = 30 + (i * 37 % 50); R('#2A2A44', wx + i * 32, 140 - h, 28, h); for (let y = 144 - h; y < 136; y += 8) R('#FFC35A', wx + i * 32 + 6 + (y % 3) * 6, y, 3, 4); }
          R('#7A5A3A', wx + 78, 24, 4, 120); text('ДОНЕР', wx + 80, 150, 8, '#C0593A');
        }
        R('#FFFFFF', 1100, 20, 60, 22); text('HALAL', 1130, 27, 7, '#2E8A4A');
      } },
      { par: 1, w: 1200, floor: true, draw(r, gy) { for (let x = 0; x < 1200; x += 24) for (let y = gy - 14; y < H; y += 24) R(((x / 24 + y / 24) | 0) % 2 ? '#D9C3A0' : '#C9B08A', x, y, 24, 24); } },
      { par: 1, w: 1200, draw(r, gy) {
        const b = gy - 14;
        for (let k = 0; k < 2; k++) {
          const x = 120 + k * 600;
          R('#8A5A2E', x, b - 46, 200, 46); R('#6E4624', x, b - 46, 200, 5); R('#A8703A', x - 4, b - 50, 208, 5);
          R('rgba(200,230,240,.6)', x + 10, b - 76, 120, 26); R('#B8B8B8', x + 8, b - 78, 124, 2);
          for (let i = 0; i < 5; i++) R(['#C0593A', '#6E9145', '#EDE4CF', '#E8C547', '#8A4FA0'][i], x + 14 + i * 23, b - 62, 18, 10);
          R('#B8B8B8', x + 160, b - 140, 4, 94); R('#9E5A2E', x + 150, b - 128, 24, 70); R('#C9783A', x + 152, b - 124, 6, 62); R('#7A4420', x + 168, b - 124, 4, 62);
          R('#3A3A46', x + 178, b - 132, 10, 80); for (let y = b - 128; y < b - 56; y += 6) R('#FF7A2A', x + 180, y, 6, 3);
          glow(x + 170, b - 92, 40, '255,140,40', .07);
          R('#C0303A', x + 60, b - 58, 6, 12); R('#E8C547', x + 68, b - 56, 6, 10);
        }
        [420, 520, 1020].forEach(x => { R('#6E4624', x + 18, b - 30, 4, 30); R('#8A5A2E', x, b - 34, 40, 5); R('#5A3A20', x - 10, b - 18, 10, 3); R('#5A3A20', x - 8, b - 15, 2, 15); R('#5A3A20', x + 40, b - 18, 10, 3); R('#5A3A20', x + 48, b - 15, 2, 15); R('#EDE4CF', x + 6, b - 40, 8, 6); });
      } }
    ],
    front(ctx, cam, t, gy) { const b = gy - 14; for (let k = 0; k < 2; k++) { const x = 120 + k * 600 + 180 - cam; if (x < -20 || x > W) continue; for (let y = b - 128; y < b - 56; y += 6) if ((y / 6 + Math.floor(t / 120)) % 3 === 0) R('#FFC35A', x + 2, y, 6, 3); } }
  };

  /* ---------- наружу ---------- */
  function has(name) { return !!S[name]; }
  // рисует всю сцену: небо, слои, пол. Возвращает true, если сцена есть.
  function draw(ctx, name, cam, t, gy) {
    const s = S[name]; if (!s) return false;
    gy = gy || 300; cam = Math.max(0, cam || 0);
    ctx.drawImage(cached(name + ':sky:' + gy, W, () => s.sky(gy)), 0, 0);
    t = t || 0;
    C = ctx; s.back && s.back(ctx, cam, t, gy);
    s.layers.forEach((L, i) => { blit(ctx, cached(name + ':' + i + ':' + gy, L.w, r => L.draw(r, gy)), L.par, cam); C = ctx; L.anim && L.anim(ctx, cam, t, gy); });
    C = ctx; s.front && s.front(ctx, cam, t, gy);
    return true;
  }
  global.PHScenes = { has, draw, names: Object.keys(S) };
})(window);
