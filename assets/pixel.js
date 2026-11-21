/* Pixel History — пиксельный движок: персонажи, сцена, иконки (рисуем на canvas) */
function PXFactory(global) {
  const OUT = '#1A140F';

  function shade(hex, f) {
    const h = hex.replace('#', '');
    return '#' + [0, 2, 4].map(i => {
      const v = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)));
      return v.toString(16).padStart(2, '0');
    }).join('');
  }

  /* ======================================================================
     ПЕРСОНАЖ v2 — чиби-спрайт 24×36 клеток (большая голова, аниме-глаза).
     Виды:  front — три четверти, лицом вправо (стоит, видно лицо)
            side  — профиль вправо (ходьба, бег, прыжок)
            back  — со спины
     Поза (pose): armF / armB — передняя / задняя рука, legs — поза ног,
            breath — вдох (верх тела на 1 клетку ниже), lean — наклон вперёд (бег),
            eyes: 'closed', mouth: 'smile' | 'kiss', blush, dx / dy — сдвиг всего спрайта.
     Ноги стоят на строке FOOT (35); CX (12) — центр по горизонтали.
     ====================================================================== */
  const CW = 24, CX = 12, FOOT = 35;
  const TIE = '#C0593A', BONE = '#EDE4CF', GOLD = '#D4B95E';

  // строки головы: [y, x-от, x-до]
  const HEAD = {
    front: [[3, 9, 15], [4, 7, 17], [5, 6, 18], [6, 6, 18], [7, 6, 18], [8, 6, 18], [9, 6, 18], [10, 6, 18], [11, 6, 18], [12, 6, 18], [13, 6, 18], [14, 7, 18], [15, 8, 17], [16, 9, 16]],
    side: [[3, 9, 15], [4, 8, 17], [5, 7, 18], [6, 7, 18], [7, 7, 18], [8, 7, 18], [9, 7, 18], [10, 7, 18], [11, 7, 18], [12, 7, 18], [13, 7, 18], [14, 8, 18], [15, 9, 17], [16, 10, 16]],
    back: [[3, 9, 15], [4, 7, 17], [5, 6, 18], [6, 6, 18], [7, 6, 18], [8, 6, 18], [9, 6, 18], [10, 6, 18], [11, 6, 18], [12, 6, 18], [13, 6, 18], [14, 7, 17], [15, 8, 16], [16, 9, 15]]
  };
  // верх причёски: [y, x-от, x-до]
  const CROWN = {
    front: [[1, 8, 16], [2, 6, 18], [3, 5, 19], [4, 5, 19], [5, 5, 19], [6, 5, 19]],
    side: [[1, 8, 16], [2, 7, 18], [3, 6, 18], [4, 6, 19], [5, 6, 19], [6, 6, 19]],
    back: [[1, 8, 16], [2, 6, 18], [3, 5, 19], [4, 5, 19], [5, 5, 19], [6, 5, 19]]
  };

  // руки: точки плечо → локоть → кисть (передняя рука; задняя спереди — зеркально)
  const ARMS = {
    front: {
      down: [[16, 19], [17, 22], [17, 25]], up: [[16, 19], [18, 15], [18, 10]], wave: [[16, 19], [19, 16], [20, 11]],
      wave2: [[16, 19], [19, 16], [18, 10]], out: [[16, 19], [19, 19], [21, 17]], mouth: [[16, 19], [18, 21], [16, 15]],
      hip: [[16, 19], [19, 21], [16, 23]], forward: [[16, 19], [17, 22], [14, 23]], heart: [[16, 19], [18, 13], [14, 7]]
    },
    side: {
      down: [[12, 19], [12, 22], [12, 25]], swingF: [[12, 19], [13, 22], [15, 24]], swingB: [[12, 19], [11, 22], [9, 24]],
      runF: [[12, 19], [15, 21], [17, 18]], runB: [[12, 19], [9, 21], [8, 23]], forward: [[12, 19], [15, 20], [18, 20]],
      up: [[12, 19], [13, 15], [14, 10]], wave: [[12, 19], [15, 16], [16, 11]], wave2: [[12, 19], [15, 16], [14, 10]],
      mouth: [[12, 19], [15, 21], [18, 15]], out: [[12, 19], [16, 18], [19, 16]], hip: [[12, 19], [15, 22], [12, 24]],
      heart: [[12, 19], [14, 13], [15, 8]]
    }
  };
  // ноги: [бедро, колено, стопа] для задней (B) и передней (F) ноги
  const LEGS = {
    front: { stand: { B: [[10, 26], [10, 30], [10, 33]], F: [[14, 26], [14, 30], [14, 33]] },
             tuck: { B: [[10, 26], [9, 28], [10, 31]], F: [[14, 26], [15, 28], [14, 31]] } },
    side: {
      stand: { B: [[12, 26], [11, 30], [11, 33]], F: [[12, 26], [12, 30], [13, 33]] },
      w0: { B: [[12, 26], [10, 30], [8, 33]], F: [[12, 26], [14, 29], [16, 33]] },
      w1: { B: [[12, 26], [11, 30], [10, 32]], F: [[12, 26], [13, 30], [14, 33]] },
      w2: { B: [[12, 26], [13, 29], [12, 31]], F: [[12, 26], [12, 30], [12, 33]] },
      w3: { B: [[12, 26], [14, 29], [16, 33]], F: [[12, 26], [10, 30], [8, 33]] },
      w4: { B: [[12, 26], [13, 30], [14, 33]], F: [[12, 26], [11, 30], [10, 32]] },
      w5: { B: [[12, 26], [12, 30], [12, 33]], F: [[12, 26], [13, 29], [12, 31]] },
      r0: { B: [[12, 26], [10, 30], [6, 31]], F: [[12, 26], [15, 28], [18, 31]] },
      r1: { B: [[12, 26], [9, 29], [7, 27]], F: [[12, 26], [14, 29], [14, 33]] },
      r2: { B: [[12, 26], [14, 27], [13, 30]], F: [[12, 26], [12, 30], [11, 33]] },
      r3: { B: [[12, 26], [15, 28], [18, 31]], F: [[12, 26], [10, 30], [6, 31]] },
      r4: { B: [[12, 26], [14, 29], [14, 33]], F: [[12, 26], [9, 29], [7, 27]] },
      r5: { B: [[12, 26], [12, 30], [11, 33]], F: [[12, 26], [14, 27], [13, 30]] },
      jump: { B: [[12, 26], [10, 28], [8, 31]], F: [[12, 26], [15, 27], [14, 31]] }
    }
  };

  /* ---------- причёски: параметры ---------- */
  const HAIR = [
    ['bald', 'Лысый', 'm'], ['buzz', 'Ёжик', 'm'], ['short', 'Полубокс', 'm'], ['canadian', 'Канадка', 'm'], ['curtains', 'Шторы', 'm'],
    ['undercut', 'Андеркат', 'm'], ['mohawk', 'Ирокез', 'm'], ['mullet', 'Маллет', 'm'], ['curly', 'Кудри', 'u'], ['afro', 'Афро', 'u'],
    ['bob', 'Каре', 'f'], ['pixie', 'Пикси', 'f'], ['long', 'Длинные', 'f'], ['wavy', 'Волнистые', 'f'], ['fringe', 'С чёлкой', 'f'],
    ['ponytail', 'Хвост', 'f'], ['pigtails', 'Два хвостика', 'f'], ['braid', 'Коса', 'f'], ['bun', 'Пучок', 'f']
  ];
  const HAIRDEF = {
    buzz: { crown: 'buzz' }, short: { crown: 'normal', fringe: 'spiky', len: 0 }, canadian: { crown: 'tall', fringe: 'up', len: 0 },
    curtains: { crown: 'normal', fringe: 'curtain', len: 1 }, undercut: { crown: 'tall', fringe: 'swept', len: 0, shaved: true },
    mohawk: { crown: 'mohawk' }, mullet: { crown: 'normal', fringe: 'spiky', len: 0, mullet: true }, curly: { crown: 'curly', fringe: 'curly', len: 1 },
    afro: { crown: 'afro' }, bob: { crown: 'normal', fringe: 'straight', len: 2 }, pixie: { crown: 'normal', fringe: 'swept', len: 0 },
    long: { crown: 'normal', fringe: 'swept', len: 4 }, wavy: { crown: 'normal', fringe: 'swept', len: 4, wavy: true },
    fringe: { crown: 'normal', fringe: 'heavy', len: 4 }, ponytail: { crown: 'normal', fringe: 'swept', len: 0, extra: 'pony' },
    pigtails: { crown: 'normal', fringe: 'straight', len: 1, extra: 'pig' }, braid: { crown: 'normal', fringe: 'swept', len: 1, extra: 'braid' },
    bun: { crown: 'normal', fringe: 'swept', len: 0, extra: 'bun' }
  };
  const LEN_Y = [9, 12, 15, 19, 23];

  /* ---------- сборка спрайта ---------- */
  function charGrid(o, view, pose) {
    view = (view === 'side' || view === 'back') ? view : 'front';
    const P = pose || {}, g = {};
    let ox = 0, oy = 0;
    const set = (x, y, c) => { if (c) g[(x + ox) + ',' + (y + oy)] = c; };
    const R = (a, b, c, d, col) => { for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) set(x, y, col); };
    const upper = () => { ox = view === 'side' ? (P.lean || 0) : 0; oy = P.breath ? 1 : 0; };
    const lower = () => { ox = 0; oy = 0; };

    const sk = o.skin || '#E8C39E', skD = shade(sk, 0.82), skL = shade(sk, 1.08);
    const top = (o.topType && o.topType !== 'none') ? o.topType : null;
    const t = o.top || '#6E9145', tD = shade(t, 0.72), tL = shade(t, 1.16);
    const bot = (o.bottomType && o.bottomType !== 'none' && top !== 'dress') ? o.bottomType : null;
    const b = o.bottom || '#3E4A33', bD = shade(b, 0.72);
    const shoe = o.shoes || null;
    const hd = (o.hair && o.style && o.style !== 'bald') ? HAIRDEF[o.style] || HAIRDEF.short : null;
    const h = o.hair || '#222222', hD = shade(h, 0.66), hL = shade(h, 1.45);
    const eye = o.eyes || '#3B2B1E', eyeD = shade(eye, 0.55), DARK = '#241A14';
    const sleeve = !top ? 0 : (top === 'hoodie' || top === 'shirt') ? 0.8 : 0.38;

    // толстая линия по точкам (руки, ноги); col(t) — цвет по доле длины 0..1
    function line(pts, th, col, pad) {
      let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], seg = Math.hypot(bx - ax, by - ay), steps = Math.max(1, Math.abs(bx - ax), Math.abs(by - ay));
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(ax + (bx - ax) * s / steps), y = Math.round(ay + (by - ay) * s / steps), c = col((acc + seg * s / steps) / total);
          if (th === 2) R(x - (pad || 0), x + 1 + (pad || 0), y - (pad || 0), y + 1 + (pad || 0), c);
          else R(x - 1 - (pad || 0), x + 1 + (pad || 0), y - (pad || 0), y + (pad || 0), c);
        }
        acc += seg;
      }
    }
    function arm(pts, back, outlined) {
      const s1 = back ? shade(t, 0.62) : (view === 'side' ? shade(t, 0.9) : t), s2 = back ? shade(sk, 0.72) : sk;
      if (outlined) line(pts, 2, () => OUT, 1);
      line(pts, 2, u => (u < sleeve ? s1 : s2));
    }
    function leg(pts, back, outlined) {
      const f = back ? 0.78 : 1, skin = shade(sk, f), pants = shade(b, f);
      const cover = bot === 'pants' ? 0.97 : bot === 'shorts' ? 0.42 : 0;
      if (outlined) line(pts, 3, () => OUT, 1);
      line(pts, 3, u => (u < cover ? pants : skin));
      const [fx, fy] = pts[pts.length - 1], dir = view === 'side' ? 1 : (pts[0][0] < 12 ? 0 : 1);
      if (shoe) { const c = shade(shoe, f); R(fx - 1, fx + 1 + dir, fy, fy + 1, c); R(fx - 1, fx + 1 + dir, fy + 1, fy + 1, shade(c, 0.65)); set(fx + dir, fy, shade(c, 1.3)); }
      else R(fx - 1, fx + dir, fy + 1, fy + 1, skin);
    }

    // ---- причёска: задний слой (за головой и телом)
    function hairBack() {
      if (!hd) return;
      const L = LEN_Y[hd.len || 0];
      if (view === 'front') {
        if ((hd.len || 0) >= 3) { for (let y = 7; y <= L; y++) { const o2 = hd.wavy && y % 4 < 2 ? 1 : 0; R(4 - o2, 20 + o2, y, y, hD); } }
        if (hd.mullet) R(4, 7, 9, 18, hD);
        if (hd.extra === 'pony') { R(2, 4, 6, 17, h); R(2, 2, 7, 16, hD); R(4, 5, 6, 7, TIE); }
        if (hd.extra === 'pig') { R(1, 3, 8, 17, h); R(21, 23, 8, 17, hD); R(3, 4, 8, 9, TIE); R(20, 21, 8, 9, TIE); }
      } else if (view === 'side') {
        if ((hd.len || 0) >= 2) for (let y = 14; y <= L; y++) { const o2 = hd.wavy && y % 4 < 2 ? 1 : 0; R(5 - o2, 10, y, y, hD); }
        if (hd.mullet) R(5, 9, 13, 19, hD);
        if (hd.extra === 'pony') { R(2, 5, 5, 6, h); R(2, 4, 7, 17, h); R(2, 2, 8, 16, hD); R(5, 6, 5, 6, TIE); }
        if (hd.extra === 'pig') { R(3, 5, 9, 18, h); R(5, 6, 8, 9, TIE); }
        if (hd.extra === 'braid') { for (let y = 13; y <= 24; y++) { set(7, y, y % 2 ? h : hL); set(8, y, y % 2 ? hD : h); } R(7, 8, 25, 25, TIE); }
      } else {
        if (hd.extra === 'pig') { R(1, 3, 8, 17, h); R(21, 23, 8, 17, hD); R(3, 4, 8, 9, TIE); R(20, 21, 8, 9, TIE); }
      }
    }
    // ---- причёска: верхний слой
    function hairFront() {
      if (!hd) { if (!o.mannequin) { set(10, 4, skL); set(11, 4, skL); set(12, 5, skL); } return; }
      const spans = CROWN[view];
      const fillCrown = (y0, colorFn) => spans.forEach(([y, a, z]) => { if (y >= y0) for (let x = a; x <= z; x++) set(x, y, colorFn(x, y)); });
      const shadeFn = (x, y) => {
        if (view === 'back') return x >= 17 ? hD : (y <= 3 && x >= 9 && x <= 13 ? hL : h);
        if (x <= (view === 'side' ? 7 : 6)) return hD;
        if ((y === 2 || y === 3) && x >= 10 && x <= 14) return hL;
        return h;
      };
      const c = hd.crown;
      if (c === 'afro') {
        const cx = view === 'side' ? 11 : 12;
        for (let y = 0; y <= 13; y++) for (let x = 2; x <= 22; x++) {
          if ((x - cx) * (x - cx) / 1.1 + (y - 6.5) * (y - 6.5) > 64) continue;
          if (view === 'front' && y >= 8 && x >= 8 && x <= 18) continue;
          if (view === 'side' && y >= 8 && x >= 12) continue;
          set(x, y, (x * 7 + y * 3) % 9 === 0 ? hL : ((x + y) % 2 ? h : hD));
        }
        return;
      }
      if (c === 'mohawk') {
        const [a, z] = view === 'side' ? [9, 16] : [10, 14];
        R(a, z, 0, 6, h); R(a, a, 0, 6, hD); R(a + 1, a + 2, 1, 2, hL);
        for (let y = 3; y <= 8; y++) for (let x = 5; x <= 19; x++) if ((x < a || x > z) && (x + y) % 2 && (view !== 'side' || x < 13)) set(x, y, hD);
        if (view === 'back') R(11, 13, 7, 13, h);
        return;
      }
      if (c === 'buzz') { spans.forEach(([y, a, z]) => { if (y >= 2 && y <= 5) for (let x = a + 1; x <= z - 1; x++) set(x, y, (x + y) % 2 ? hD : h); }); return; }
      if (c === 'curly') {
        spans.forEach(([y, a, z]) => { for (let x = a - 1; x <= z + 1; x++) set(x, y, (x + y) % 2 ? h : hL); });
        R(8, 16, 0, 0, h); if (view !== 'back') { for (let x = (view === 'side' ? 8 : 5); x <= 19; x++) if (x % 2) set(x, 7, h); }
      } else {
        fillCrown(1, shadeFn);
        if (c === 'tall') { R(8, 16, 0, 0, h); R(10, 13, 0, 0, hL); }
        else { set(10, 0, h); set(14, 0, h); set(17, 1, h); }   // пряди-«вихры» сверху
      }
      const L = LEN_Y[hd.len || 0];
      if (view === 'back') {
        const y2 = Math.min(Math.max(L, 9), 16);
        R(5, 19, 7, y2, h); R(17, 19, 7, y2, hD); R(9, 11, 7, y2, shade(h, 1.15));
        for (let x = 5; x <= 19; x += 2) set(x, y2 + 1, h);
        if ((hd.len || 0) >= 3) { for (let y = 17; y <= L; y++) { const o2 = hd.wavy && y % 4 < 2 ? 1 : 0; R(5 - o2, 19 + o2, y, y, h); } R(11, 12, 17, L - 1, hL); }
        if (hd.mullet) R(7, 17, 16, 19, h);
        if (hd.shaved) for (let y = 8; y <= 12; y++) for (let x = 6; x <= 18; x++) set(x, y, (x + y) % 2 ? hD : sk);
        if (hd.extra === 'pony') { R(11, 13, 8, 8, TIE); R(11, 13, 9, 20, h); R(13, 13, 9, 20, hD); }
        if (hd.extra === 'braid') { for (let y = 13; y <= 25; y++) { set(11, y, y % 2 ? h : hL); set(12, y, y % 2 ? hD : h); } R(11, 12, 26, 26, TIE); }
        if (hd.extra === 'bun') { R(10, 14, 0, 2, h); R(13, 14, 0, 2, hD); set(11, 0, hL); }
        return;
      }
      const fr = hd.fringe;
      if (view === 'front') {
        if (fr === 'spiky') { R(6, 18, 7, 7, h); for (let x = 6; x <= 18; x++) { if (x % 3) set(x, 8, h); if (x % 3 === 1 && x > 7) set(x, 9, h); } set(16, 8, hL); }
        if (fr === 'swept') { R(6, 18, 7, 7, h); R(6, 14, 8, 8, h); R(6, 10, 9, 9, h); R(6, 7, 10, 10, h); set(13, 7, hL); set(9, 8, hL); }
        if (fr === 'straight') { R(6, 18, 7, 8, h); for (let x = 6; x <= 18; x++) if (x % 4 !== 3) set(x, 9, h); set(14, 7, hL); }
        if (fr === 'heavy') { R(6, 18, 7, 9, h); R(13, 15, 7, 7, hL); }
        if (fr === 'curtain') { R(6, 18, 7, 7, h); set(12, 7, null); delete g['12,' + (7 + oy)]; R(6, 10, 8, 8, h); R(14, 18, 8, 8, h); R(6, 8, 9, 9, h); R(16, 18, 9, 9, h); }
        if (fr === 'up') { R(6, 18, 7, 7, h); set(15, 6, hL); }
        if (fr === 'curly') { for (let x = 6; x <= 18; x++) { set(x, 7, (x % 2) ? h : hL); if (x % 2) set(x, 8, h); } }
        // боковые пряди
        R(5, 6, 7, Math.max(9, Math.min(L, 14)), hD);
        if ((hd.len || 0) >= 1) R(18, 19, 7, Math.min(L, 13), h);
        if ((hd.len || 0) >= 2) R(17, 19, 13, Math.min(L, 16), h);
        if ((hd.len || 0) >= 3) for (let y = 14; y <= L; y++) { const o2 = hd.wavy && y % 4 < 2 ? 1 : 0; R(17 + o2, 19 + o2, y, y, h); set(17 + o2, y, hL); }
        if (hd.shaved) for (let y = 5; y <= 9; y++) for (let x = 5; x <= 6; x++) set(x, y, (x + y) % 2 ? hD : sk);
        if (hd.extra === 'braid') { for (let y = 14; y <= 24; y++) { set(16, y, y % 2 ? h : hL); set(17, y, y % 2 ? hD : h); } R(16, 17, 25, 25, TIE); }
        if (hd.extra === 'bun') { R(10, 14, 0, 1, h); R(13, 14, 0, 1, hD); set(11, 0, hL); }
      } else { // side
        if (fr === 'spiky') { R(8, 18, 7, 7, h); set(15, 8, h); set(16, 8, h); set(18, 8, h); set(17, 9, h); set(19, 7, h); }
        if (fr === 'swept') { R(8, 18, 7, 7, h); R(14, 18, 8, 8, h); R(17, 18, 9, 9, h); set(19, 8, h); }
        if (fr === 'straight') { R(8, 18, 7, 8, h); set(17, 9, h); set(18, 9, h); }
        if (fr === 'heavy') { R(8, 18, 7, 9, h); }
        if (fr === 'curtain') { R(8, 18, 7, 7, h); R(16, 18, 8, 8, h); R(17, 18, 9, 9, h); }
        if (fr === 'up') { R(8, 18, 7, 7, h); set(19, 6, h); }
        if (fr === 'curly') { for (let x = 8; x <= 18; x++) { set(x, 7, (x % 2) ? h : hL); if (x % 2) set(x, 8, h); } }
        // затылок
        const yb = Math.max(10, Math.min(L, 14));
        R(6, 10, 4, yb, h); R(6, 7, 5, yb, hD); set(8, yb + 1, h);
        if (hd.shaved) for (let y = 6; y <= 10; y++) for (let x = 6; x <= 9; x++) set(x, y, (x + y) % 2 ? hD : sk);
        if (hd.extra === 'bun') { R(4, 7, 1, 4, h); R(4, 4, 2, 3, hD); set(5, 1, hL); }
      }
    }

    // ---- голова и лицо
    function head() {
      HEAD[view].forEach(([y, a, z]) => { for (let x = a; x <= z; x++) set(x, y, sk); });
      if (view === 'front') { HEAD.front.forEach(([y, a]) => set(a, y, skD)); R(9, 16, 16, 16, skD); set(5, 10, sk); set(5, 11, skD); set(5, 12, sk); }
      if (view === 'back') { HEAD.back.forEach(([y, a, z]) => set(z, y, skD)); set(5, 10, sk); set(5, 11, skD); set(19, 10, skD); set(19, 11, skD); }
      if (view === 'side') {
        HEAD.side.forEach(([y, a]) => { set(a, y, skD); set(a + 1, y, skD); });
        set(19, 11, sk); set(19, 12, skD);                                   // нос
        set(10, 10, skD); set(10, 11, skD); set(10, 12, skD); set(11, 12, skD); // ухо
        R(17, 18, 15, 15, sk); set(17, 16, skD);                              // подбородок
      }
      if (view === 'back' || o.mannequin) {
        if (o.mannequin && view !== 'back') { const ex = view === 'side' ? [15] : [10, 14]; ex.forEach(x => set(x, 11, skD)); }
        return;
      }
      const brow = hd ? hD : skD;
      if (view === 'front') {
        const eyes = [[10, 11], [14, 15]];
        eyes.forEach(([a, z]) => {
          if (P.eyes === 'closed') { set(a, 11, DARK); set(z, 11, DARK); set(a - 1, 10, null); }
          else { set(a, 10, DARK); set(z, 10, DARK); set(a, 11, '#FFFFFF'); set(z, 11, eye); set(a, 12, eye); set(z, 12, eyeD); }
          set(a, 9, brow); set(z, 9, brow);
        });
        set(17, 12, skD);                                                     // нос
        set(11, 13, '#E39B86'); set(16, 13, '#E39B86');
        if (P.blush) { set(10, 13, '#E39B86'); set(17, 13, '#D98C78'); }
        if (P.mouth === 'smile') { set(14, 14, '#7A3426'); set(15, 15, '#7A3426'); set(16, 14, '#7A3426'); }
        else if (P.mouth === 'kiss') { set(15, 14, '#C0593A'); set(16, 14, '#C0593A'); }
        else set(15, 14, '#9E4630');
      } else {
        if (P.eyes === 'closed') { set(15, 11, DARK); set(16, 11, DARK); }
        else { set(15, 10, DARK); set(16, 10, DARK); set(15, 11, '#FFFFFF'); set(16, 11, eye); set(15, 12, eye); set(16, 12, eyeD); }
        set(15, 9, brow); set(16, 9, brow);
        set(16, 13, '#E39B86'); if (P.blush) set(17, 13, '#E39B86');
        if (P.mouth === 'kiss') { set(19, 14, '#C0593A'); set(18, 14, '#9E4630'); }
        else if (P.mouth === 'smile') { set(17, 14, '#7A3426'); set(18, 13, '#7A3426'); }
        else set(18, 14, '#9E4630');
      }
    }

    // ---- тело и одежда
    function torso() {
      const [a, z] = view === 'side' ? [9, 15] : [8, 16];
      if (view === 'side') { R(12, 13, 17, 17, skD); R(10, 14, 18, 18, sk); R(a, z, 19, 25, sk); R(a, a, 19, 25, skD); }
      else { R(11, 13, 17, 17, skD); R(9, 15, 18, 18, sk); R(a, z, 19, 25, sk); R(a, a, 19, 25, skD); }
      if (top) {
        const by = top === 'dress' ? 25 : 25;
        if (view === 'side') { R(10, 14, 18, 18, t); R(a, z, 19, by, t); R(a, a, 19, by, tD); R(z, z, 19, by, tL); }
        else { R(9, 15, 18, 18, t); R(a, z, 19, by, t); R(a, a, 19, by, tD); R(a, z, by, by, tD); if (view === 'front') R(z, z, 19, by - 1, tL); }
        if (top === 'tshirt' && view === 'front') { set(12, 18, skD); set(13, 18, skD); }
        if (top === 'shirt') { if (view === 'front') { set(11, 18, BONE); set(14, 18, BONE); set(12, 18, skD); set(13, 18, skD); set(13, 20, tD); set(13, 22, tD); } if (view === 'side') set(14, 18, BONE); }
        if (top === 'hoodie') {
          if (view === 'front') { set(12, 19, BONE); set(12, 20, BONE); set(14, 19, BONE); set(14, 20, BONE); R(10, 14, 23, 24, tD); }
          if (view === 'back') R(9, 15, 18, 21, tD);
        }
      }
      if (bot) { const [p, q] = view === 'side' ? [9, 15] : [8, 16]; R(p, q, 25, 25, '#3B2B1E'); if (view !== 'back') set(view === 'side' ? 14 : 13, 25, GOLD); }
    }
    function hood() {   // капюшон за головой
      if (top !== 'hoodie') return;
      if (view === 'front') { R(7, 10, 15, 18, tD); R(6, 7, 16, 17, tD); }
      if (view === 'side') { R(7, 10, 14, 19, tD); }
    }
    function skirt() {
      const col = top === 'dress' ? t : (bot === 'skirt' ? b : null); if (!col) return;
      const dk = shade(col, 0.72);
      if (view === 'side') { R(9, 15, 26, 26, col); R(8, 16, 27, 29, col); R(8, 16, 29, 29, dk); R(8, 8, 27, 28, dk); }
      else { R(8, 16, 26, 26, col); R(7, 17, 27, 29, col); R(7, 17, 29, 29, dk); R(7, 7, 27, 28, dk); }
    }
    function acc() {
      if (o.acc === 'glasses') {
        const gl = o.glassesColor || '#2A2420';
        const box = (a, z) => { R(a, z, 9, 9, gl); R(a, z, 13, 13, gl); R(a, a, 10, 12, gl); R(z, z, 10, 12, gl); };
        if (view === 'front') { box(9, 12); box(13, 16); R(6, 8, 10, 10, gl); }
        if (view === 'side') { box(14, 17); R(11, 13, 10, 10, gl); }
        if (view === 'back') { set(5, 9, gl); set(19, 9, gl); }
      }
      if (o.acc === 'cap' || o.acc === 'mushroom') {          // кепка (старое значение mushroom тоже рисуем кепкой)
        const cc = o.capColor || '#E63946', cd = shade(cc, -0.3);
        R(8, 16, 0, 0, cc); R(6, 18, 1, 3, cc); R(6, 18, 4, 4, cd); set(12, 1, shade(cc, 0.3));
        if (view === 'front') R(15, 21, 5, 5, cd);
        if (view === 'side') R(16, 22, 5, 5, cd);
      }
      if (o.acc === 'flower') { const fx = view === 'back' ? 16 : 7; set(fx, 3, '#E39B86'); set(fx - 1, 4, '#E39B86'); set(fx + 1, 4, '#E39B86'); set(fx, 5, '#E39B86'); set(fx, 4, '#F2E3A0'); }
      if (o.acc === 'scarf') {
        if (view === 'side') { R(10, 15, 17, 18, GOLD); R(8, 9, 18, 21, '#B89A45'); }
        else { R(8, 16, 17, 18, GOLD); if (view === 'front') R(14, 15, 19, 22, '#B89A45'); }
      }
    }

    // ---- порядок слоёв
    if (view === 'side') {
      const legs = LEGS.side[P.legs] || LEGS.side.stand;
      upper(); hairBack(); hood();
      arm(ARMS.side[P.armB] || ARMS.side.down, true, false);
      lower(); leg(legs.B, true, false);
      upper(); torso();
      lower(); leg(legs.F, false, true);
      upper(); skirt(); head(); hairFront(); acc();
      arm(ARMS.side[P.armF] || ARMS.side.down, false, true);
    } else {
      const legs = LEGS.front[P.legs] || LEGS.front.stand;
      const af = ARMS.front[P.armF] || ARMS.front.down, ab = (ARMS.front[P.armB] || ARMS.front.down).map(([x, y]) => [24 - x, y]);
      upper(); hairBack(); if (view === 'front') hood();
      if (view === 'front') arm(ab, true, false);
      lower(); leg(legs.B, false, false); leg(legs.F, false, false);
      upper(); torso(); skirt(); head(); hairFront(); acc();
      if (view === 'back') { arm(ab.map(([x, y]) => [24 - x, y]).map(([x, y]) => [24 - x, y]), false, false); arm(af, false, false); }
      else arm(af, false, false);
    }

    // контур
    const out = [];
    Object.keys(g).forEach(k => {
      const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = (x + dx) + ',' + (y + dy); if (!g[n]) out.push(n); });
    });
    out.forEach(n => { if (!g[n]) g[n] = OUT; });
    return g;
  }

  function drawGrid(ctx, g, s, ox, oy, flip) {
    for (const k in g) {
      const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
      ctx.fillStyle = g[k]; ctx.fillRect(ox + (flip ? CW - 1 - x : x) * s, oy + y * s, s, s);
    }
  }

  const cache = new Map();
  function gridCached(o, view, pose) {
    const k = JSON.stringify([o, view, pose || null]);
    let g = cache.get(k);
    if (!g) { g = charGrid(o, view, pose); if (cache.size > 800) cache.clear(); cache.set(k, g); }
    return g;
  }
  // Персонаж в позе: (ox, oy) — левый верх сетки; ноги стоят на oy + FOOT·s
  function drawPose(ctx, o, s, ox, oy, view, pose, flip, shadow) {
    const P = pose || {};
    ox = Math.round(ox); oy = Math.round(oy);
    if (shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(ox + 7 * s, oy + FOOT * s, 10 * s, s); ctx.fillRect(ox + 8 * s, oy + (FOOT + 1) * s, 8 * s, s); }
    drawGrid(ctx, gridCached(o, view, P), s, Math.round(ox + (P.dx || 0) * s * (flip ? -1 : 1)), Math.round(oy + (P.dy || 0) * s), flip);
  }
  function drawChar(ctx, o, s, ox = 0, oy = 0) { drawPose(ctx, o, s, ox, oy, 'front', null, false, true); }
  function renderChar(canvas, o, s = 1, view, pose) {
    canvas.width = CW * s; canvas.height = (FOOT + 2) * s;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPose(ctx, o, s, 0, 0, view || 'front', pose, false, true);
  }

  /* ---------- анимации ---------- */
  const W6 = (arms) => ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'].map((l, i) => Object.assign({ legs: l }, arms[i]));
  const ANIMS = {
    idle: { name: 'Стоит', kind: 'idle', view: 'front', fps: 3, frames: [{}, {}, { breath: 1 }, { breath: 1 }, {}, {}, { breath: 1 }, { breath: 1, eyes: 'closed' }] },
    walk_normal: { name: 'Обычная', kind: 'walk', view: 'side', fps: 10, frames: W6([{ armF: 'swingB', armB: 'swingF' }, { armF: 'down', armB: 'down', dy: 1 }, { armF: 'swingF', armB: 'swingB' }, { armF: 'swingF', armB: 'swingB' }, { armF: 'down', armB: 'down', dy: 1 }, { armF: 'swingB', armB: 'swingF' }]) },
    walk_bouncy: { name: 'Вприпрыжку', kind: 'walk', view: 'side', fps: 9, frames: W6([{ armF: 'swingB', armB: 'swingF', mouth: 'smile' }, { mouth: 'smile', dy: 1 }, { armF: 'swingF', armB: 'swingB', dy: -3, mouth: 'smile' }, { armF: 'swingF', armB: 'swingB', mouth: 'smile' }, { mouth: 'smile', dy: 1 }, { armF: 'swingB', armB: 'swingF', dy: -3, mouth: 'smile' }]) },
    walk_proud: { name: 'Важная', kind: 'walk', view: 'side', fps: 6, frames: W6([{ armF: 'hip', armB: 'hip' }, { armF: 'hip', armB: 'hip' }, { armF: 'hip', armB: 'hip', dy: -1 }, { armF: 'hip', armB: 'hip' }, { armF: 'hip', armB: 'hip' }, { armF: 'hip', armB: 'hip', dy: -1 }]) },
    walk_sneak: { name: 'Крадётся', kind: 'walk', view: 'side', fps: 7, frames: W6(new Array(6).fill(0).map((_, i) => ({ armF: 'forward', armB: 'forward', dy: i % 3 === 1 ? 2 : 1 }))) },
    walk_run: { name: 'Бегом', kind: 'walk', view: 'side', fps: 13, frames: ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'].map((l, i) => ({ legs: l, lean: 1, armF: i < 3 ? 'runB' : 'runF', armB: i < 3 ? 'runF' : 'runB', dy: i % 3 === 0 ? -2 : (i % 3 === 1 ? 0 : -1), fx: i % 3 === 0 ? 'speed' : null })) },
    wave: { name: 'Прощание', kind: 'emote', view: 'front', fps: 4, frames: [{ armF: 'wave', mouth: 'smile' }, { armF: 'wave2', mouth: 'smile' }] },
    air_kiss: { name: 'Воздушный поцелуй', kind: 'emote', view: 'front', fps: 3, frames: [{ armF: 'mouth', eyes: 'closed', mouth: 'kiss' }, { armF: 'mouth', eyes: 'closed', mouth: 'kiss' }, { armF: 'out', mouth: 'smile', fx: 'fly1' }, { armF: 'out', mouth: 'smile', fx: 'fly2' }] },
    kiss: { name: 'Поцелуй', kind: 'duo', fps: 3, frames: [{ gap: 4 }, { gap: 2, blush: true }, { gap: 0, eyes: 'closed', mouth: 'kiss', blush: true, fx: 'heart' }, { gap: 0, eyes: 'closed', mouth: 'kiss', blush: true, fx: 'heart2' }] },
    hug: { name: 'Обнимашки', kind: 'duo', fps: 3, frames: [{ gap: 4, mouth: 'smile' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile', fx: 'heart' }, { gap: 1, armF: 'forward', armB: 'forward', eyes: 'closed', mouth: 'smile', blush: true, fx: 'heart2' }] },
    dance: { name: 'Танец', kind: 'emote', view: 'front', fps: 5, frames: [{ armF: 'up', armB: 'hip', mouth: 'smile' }, { armF: 'out', armB: 'out', dy: -2, mouth: 'smile' }, { armF: 'hip', armB: 'up', mouth: 'smile' }, { armF: 'out', armB: 'out', dy: -2, mouth: 'smile' }] },
    joy: { name: 'Прыжок радости', kind: 'emote', view: 'front', fps: 6, frames: [{ mouth: 'smile' }, { dy: -4, armF: 'wave', armB: 'wave', eyes: 'closed', mouth: 'smile', legs: 'tuck' }, { dy: -8, armF: 'up', armB: 'up', eyes: 'closed', mouth: 'smile', legs: 'tuck' }, { dy: -4, armF: 'wave', armB: 'wave', eyes: 'closed', mouth: 'smile', legs: 'tuck' }] },
    shy: { name: 'Смущение', kind: 'emote', view: 'front', fps: 3, frames: [{ blush: true, eyes: 'closed', armF: 'mouth', armB: 'hip' }, { blush: true, eyes: 'closed', armF: 'mouth', armB: 'hip', dx: 1 }, { blush: true, eyes: 'closed', armF: 'mouth', armB: 'hip' }, { blush: true, eyes: 'closed', armF: 'mouth', armB: 'hip', dx: -1 }] },
    heart: { name: 'Сердечко', kind: 'emote', view: 'front', fps: 3, frames: [{ armF: 'heart', armB: 'heart', mouth: 'smile', fx: 'heart' }, { armF: 'heart', armB: 'heart', mouth: 'smile', fx: 'heart2', breath: 1 }] }
  };
  const WALKS = Object.keys(ANIMS).filter(k => ANIMS[k].kind === 'walk');
  const EMOTES = Object.keys(ANIMS).filter(k => ANIMS[k].kind === 'emote' || ANIMS[k].kind === 'duo');
  function animFrame(id, ms) { const a = ANIMS[id]; if (!a) return {}; return a.frames[Math.floor(ms / 1000 * a.fps) % a.frames.length]; }

  const HEART = ['.rr.rr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  function drawHeart(ctx, cx, cy, p) {
    HEART.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'w' ? '#EDE4CF' : '#C0593A'; ctx.fillRect(Math.round(cx + (i - 3.5) * p), Math.round(cy + (j - 3) * p), p, p); } }));
  }
  function drawFx(ctx, fx, cx, footY, s, dir) {
    if (!fx) return; dir = dir || 1;
    const p = Math.max(2, Math.round(s * 0.6));
    if (fx === 'heart') drawHeart(ctx, cx, footY - 40 * s, p);
    if (fx === 'heart2') drawHeart(ctx, cx, footY - 42 * s, p + 1);
    if (fx === 'fly1') drawHeart(ctx, cx + dir * 11 * s, footY - 24 * s, p);
    if (fx === 'fly2') drawHeart(ctx, cx + dir * 15 * s, footY - 28 * s, p + 1);
    if (fx === 'speed') { ctx.fillStyle = 'rgba(237,228,207,.55)'; [[-14, -26, 6], [-16, -20, 8], [-13, -14, 5]].forEach(([x, y, w]) => ctx.fillRect(Math.round(cx + dir * x * s - (dir < 0 ? 0 : w * s)), footY + y * s, w * s, Math.max(1, s >> 1))); }
  }

  // Рисует анимацию (одиночную или парную). cx — центр, footY — линия земли.
  function drawAnim(ctx, id, hero, partner, ms, s, cx, footY, opts) {
    const a = ANIMS[id], flip = !!(opts && opts.flip), oy = footY - FOOT * s;
    if (!a) { drawPose(ctx, hero, s, Math.round(cx - CX * s), oy, 'front', null, flip); return; }
    const f = animFrame(id, ms);
    if (a.kind === 'duo') {
      const gap = f.gap == null ? 2 : f.gap;
      const oxA = Math.round(cx - (19 + gap / 2) * s), oxB = oxA + (15 + gap) * s;
      drawPose(ctx, partner || hero, s, oxB, oy, 'side', f, true);
      drawPose(ctx, hero, s, oxA, oy, 'side', f, false);
      drawFx(ctx, f.fx, cx, footY, s, 1);
      return;
    }
    drawPose(ctx, hero, s, Math.round(cx - CX * s), oy, a.view, f, flip);
    drawFx(ctx, f.fx, cx, footY, s, flip ? -1 : 1);
  }

  /* ---------- Превью-сцена (конструктор, генерация) ----------
     Берёт детальную локацию из game/scenes.js; если её нет на странице — простой ретро-фон. */
  function drawScene(ctx, s = 10, t = 0) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (global.PHScenes && global.PHScenes.draw(ctx, 'autumn', 260, t, 280)) { ctx.fillStyle = '#5D5E64'; if (ch > 360) ctx.fillRect(0, 360, cw, ch - 360); return; }
    ['#101018', '#16162A', '#1E1E3A', '#2A2A4A'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, Math.floor(i * ch / 5), cw, Math.ceil(ch / 5) + 1); });
    ctx.fillStyle = '#34344C'; ctx.fillRect(0, 280, cw, ch - 280); ctx.fillStyle = '#E63946'; ctx.fillRect(0, 280, cw, 4);
  }

  /* ---------- Иконки 8×8 ---------- */
  const IC = { R: '#E63946', L: '#3D7DD8', Q: '#F4C430', W: '#F1FAEE', K: '#5A5A72', k: '#C9C9D6', D: '#1B1B28', r: '#C0593A', w: '#EDE4CF', b: '#D9C9A3', g: '#5B7A3A', G: '#A8C46A', d: '#12150E', s: '#A9A68C', o: '#8A6A3A', y: '#D4B95E', Y: '#F2E3A0', c: '#9B8AC4', C: '#C9BCEB', B: '#4A3626' };
  const ICONS = {
    cartridge: ['.KKKKKK.', '.KkkkkK.', '.KLLLLK.', '.KLWWLK.', '.KLLLLK.', '.KKKKKK.', '.KQQQQK.', '..KKKK..'],
    star: ['...QQ...', '...QQ...', 'QQQQQQQQ', '.QQQQQQ.', '..QQQQ..', '.QQQQQQ.', '.QQ..QQ.', '.Q....Q.'],
    pin: ['..RRRR..', '.RRRRRR.', '.RRWWRR.', '.RRWWRR.', '.RRRRRR.', '..RRRR..', '...RR...', '...R....'],
    chat: ['.LLLLLLL.', 'LLLLLLLLL', 'LLWLWLWLL', 'LLLLLLLLL', '.LLLLLLL.', '..LL.....', '.LL......'],
    key: ['.QQQ....', 'Q...Q...', 'Q...QQQQ', 'Q...Q.Q.', '.QQQ..QQ'],
    house: ['...RR...', '..RRRR..', '.RRRRRR.', 'RRRRRRRR', '.kkkkkk.', '.kQkkLk.', '.kQkkLk.', '.kkkkLk.'],
    camera: ['..KK....', 'KKKKKKKK', 'KkKLLKkK', 'KKLWLLKK', 'KKLLLLKK', 'KkKLLKkK', 'KKKKKKKK'],
    cup: ['QQQQQQQQ', 'Q.QQQQ.Q', 'Q.QQQQ.Q', '.QQQQQQ.', '..QQQQ..', '...QQ...', '..KKKK..', '.KKKKKK.'],
    heart: ['.RR.RR.', 'RRWRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
    controller: ['........', '.dddddd.', 'dccccccd', 'cwcccrcc', 'wwwccccy', 'cwcccrcc', 'dccddccd', '.dd..dd.'],
    gift: ['....yy..yy....', '...yYy..yYy...', '....yyyyyy....', 'rrrrrryyrrrrrr', 'rrrrrryYrrrrrr', 'rrrrrryyrrrrrr', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.', '.rrrrryyrrrrr.']
  };
  function drawIcon(canvas, name, outline = false) {
    const m = ICONS[name]; if (!m) return;
    const pad = outline ? 1 : 0;
    canvas.width = m[0].length + pad * 2; canvas.height = m.length + pad * 2;
    const ctx = canvas.getContext('2d');
    const g = {};
    m.forEach((row, y) => [...row].forEach((ch, x) => { if (IC[ch]) g[(x + pad) + ',' + (y + pad)] = IC[ch]; }));
    if (outline) {
      const out = [];
      Object.keys(g).forEach(k => { const [x, y] = k.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const n = (x + dx) + ',' + (y + dy); if (!g[n]) out.push(n); }); });
      out.forEach(n => { if (!g[n]) g[n] = OUT; });
    }
    drawGrid(ctx, g, 1, 0, 0);
  }

  /* ---------- Готовые герои ---------- */
  const HEROES = {
    asem: { name: 'Асем', role: 'Кого ищем', skin: '#F0CBA8', hair: '#5A3A26', style: 'long', eyes: '#5B7A3A', top: '#C0593A', topType: 'hoodie', bottom: '#3E4A33', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_bouncy', emotes: ['wave', 'air_kiss', 'hug'] },
    you: { name: 'Вы', role: 'Главный герой', skin: '#C99A6E', hair: '#221A14', style: 'curtains', eyes: '#4A3626', top: '#3D7DD8', topType: 'tshirt', bottom: '#5E4530', bottomType: 'pants', shoes: '#2A2420', acc: 'none', walk: 'walk_normal', emotes: ['wave', 'hug'] },
    base: { name: 'Новый герой', role: 'Друг', skin: '#C9B994', mannequin: true }
  };

  global.PX = { CW, CX, FOOT, shade, charGrid, drawGrid, drawPose, drawChar, renderChar, drawAnim, drawHeart, animFrame, ANIMS, WALKS, EMOTES, HAIR, drawScene, drawIcon, HEROES, ICONS };
}
window.PXFactory = PXFactory;
PXFactory(window);
