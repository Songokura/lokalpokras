/* LOKAL-POKRAS - сценарии: плиты, маскировка зоны ремонта, язык, меню, счётчики, форма. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement, body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ASSET_V = ((doc.currentScript && doc.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var isMobile = function () { return window.innerWidth <= 760; };
  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var WA_NUM = '77058086162';

  /* ---------- i18n ---------- */
  var I18N = { ru: {} };
  var META = { ru: { title: doc.title, desc: (doc.querySelector('meta[name="description"]') || {}).content || '' } };
  var nodes = [].slice.call(doc.querySelectorAll('[data-i]'));
  nodes.forEach(function (el) { I18N.ru[el.getAttribute('data-i')] = el.innerHTML; });

  /* готовые тексты WhatsApp (русские; казахские и английские - в assets/lang/) */
  var WA_RU = {
    hero: 'Здравствуйте! Хочу оценить ремонт, отправлю фото повреждения.',
    lokal: 'Здравствуйте! Нужна локальная покраска. Отправлю фото детали.',
    tolsh: 'Здравствуйте! Нужна покраска под толщиномер. Отправлю фото детали.',
    polimer: 'Здравствуйте! Хочу убрать царапины или сколы полимером. Отправлю фото.',
    kuzov: 'Здравствуйте! Нужен кузовной ремонт, есть вмятина. Отправлю фото.',
    polir: 'Здравствуйте! Интересует полировка кузова. Какая цена?'
  };
  Object.keys(WA_RU).forEach(function (k) { I18N.ru['wa.' + k] = WA_RU[k]; });

  function waLinks(lang) {
    var d = I18N[lang] || I18N.ru;
    [].forEach.call(doc.querySelectorAll('a[data-wa]'), function (a) {
      var k = 'wa.' + a.getAttribute('data-wa');
      var msg = d[k] || I18N.ru[k] || '';
      a.href = 'https://wa.me/' + WA_NUM + (msg ? '?text=' + encodeURIComponent(msg) : '');
    });
  }

  function loadLang(lang, done) {
    if (I18N[lang] || lang === 'ru') return done();
    var s = doc.createElement('script');
    s.src = 'assets/lang/' + lang + '.js' + (ASSET_V ? '?v=' + ASSET_V : '');
    s.onload = function () {
      var dict = window['SITE_' + lang.toUpperCase()];
      if (dict) { I18N[lang] = dict; META[lang] = { title: dict['meta.title'], desc: dict['meta.desc'] }; }
      done();
    };
    s.onerror = function () { done(); };
    doc.head.appendChild(s);
  }

  function applyLang(lang) {
    var dict = I18N[lang] || I18N.ru;
    nodes.forEach(function (el) {
      var k = el.getAttribute('data-i');
      var v = dict[k] != null ? dict[k] : I18N.ru[k];
      if (v == null) return;
      el.innerHTML = v;
    });
    root.setAttribute('lang', lang);
    var m = META[lang] || META.ru;
    if (m && m.title) {
      doc.title = m.title;
      var md = doc.querySelector('meta[name="description"]');
      if (md && m.desc) md.content = m.desc;
    }
    [].forEach.call(doc.querySelectorAll('.lang button'), function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('lp-lang', lang); } catch (e) {}
    waLinks(lang);
    fitText();
    marquee();
    heroZone();
    onScroll();
  }
  function setLang(lang) { loadLang(lang, function () { applyLang(lang); }); }

  [].forEach.call(doc.querySelectorAll('.lang button'), function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });
  (function initLang() {
    var forced = (location.search.match(/[?&]lang=(ru|kk|en)/) || [])[1];
    var saved = null;
    try { saved = localStorage.getItem('lp-lang'); } catch (e) {}
    var lang = forced || saved || 'ru';
    if (lang !== 'ru' && lang !== 'kk' && lang !== 'en') lang = 'ru';
    waLinks('ru');
    if (lang !== 'ru') setLang(lang);
  })();

  /* ---------- fitText: дисплейный заголовок не вылезает за контейнер ---------- */
  function fitText() {
    [].forEach.call(doc.querySelectorAll('.fit'), function (h) {
      h.style.fontSize = '';
      var box = h.parentElement, max = box.clientWidth, size = parseFloat(getComputedStyle(h).fontSize), n = 0;
      var over = function () {
        var w = 0;
        [].forEach.call(h.children.length ? h.children : [h], function (c) { w = Math.max(w, c.scrollWidth); });
        return w > max + 1;
      };
      while (over() && n < 14 && size > 22) { size *= 0.95; h.style.fontSize = size + 'px'; n++; }
    });
  }

  /* ---------- бегущая лента: шаг цикла ровно одна копия ---------- */
  function marquee() {
    [].forEach.call(doc.querySelectorAll('.marq'), function (m) {
      var track = m.querySelector('.marq-track'), copy = track.querySelector('.marq-copy');
      [].forEach.call(track.querySelectorAll('.marq-copy:not(:first-child)'), function (c) { c.remove(); });
      var w = copy.getBoundingClientRect().width;
      if (!w) return;
      var need = Math.max(2, Math.ceil((window.innerWidth * 2) / w) + 1);
      for (var i = 1; i < need; i++) track.appendChild(copy.cloneNode(true));
      m.style.setProperty('--mw', w + 'px');
    });
  }

  /* ---------- меню ---------- */
  var burger = doc.querySelector('.burger'), menu = doc.getElementById('menu');
  function openMenu(on) {
    if (on) menu.hidden = false;
    requestAnimationFrame(function () {
      menu.classList.toggle('is-open', on);
      body.classList.toggle('menu-open', on);
      burger.setAttribute('aria-expanded', on ? 'true' : 'false');
      burger.setAttribute('aria-label', on ? 'Закрыть меню' : 'Открыть меню');
      if (!on) setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 340);
    });
  }
  burger.addEventListener('click', function () { openMenu(!body.classList.contains('menu-open')); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('menu-open')) openMenu(false); });
  [].forEach.call(menu.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { openMenu(false); }); });

  /* ---------- якоря: своя прокрутка с учётом шапки ---------- */
  var hdr = doc.getElementById('hdr');
  function targetTop(el) {
    var off = el.classList.contains('pw') && !isMobile() ? 0 : hdr.offsetHeight + 8;
    return el.getBoundingClientRect().top + window.pageYOffset - off;
  }
  function goTo(id, instant) {
    var el = doc.getElementById(id);
    if (!el) return false;
    var y = targetTop(el);
    if (instant || reduce) { root.style.scrollBehavior = 'auto'; window.scrollTo(0, y); root.style.scrollBehavior = ''; }
    else window.scrollTo({ top: y, behavior: 'smooth' });
    return true;
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    if (goTo(id)) { e.preventDefault(); history.pushState(null, '', '#' + id); }
  });

  /* ---------- маскировка: --p 0 (окно зоны ремонта) -> 1 (бумага снята) ---------- */
  function setP(ph, p) {
    p = Math.round(p * 1000) / 1000;
    if (ph._p === p) return;
    ph._p = p;
    ph.style.setProperty('--p', p);
  }

  /* ---------- плиты ---------- */
  var pws = [].slice.call(doc.querySelectorAll('.pw'));
  var hero = doc.querySelector('.pw.hero');
  var heroPlate = hero.querySelector('.plate');
  var heroPh = hero.querySelector('.hero-ph');
  var heroTxt = hero.querySelector('.hero-txt');
  var state = pws.map(function () { return { e: -1, s: -1, x: -1 }; });
  var H = window.innerHeight;
  var ticking = false;
  var introDone = false;

  function setVar(el, name, v, st, key) {
    v = Math.round(v * 1000) / 1000;
    if (st[key] === v) return;
    st[key] = v;
    el.style.setProperty(name, v);
  }

  /* окно зоны ремонта в герое: между шапкой и текстом, по центру */
  function heroZone() {
    if (!heroPh) return;
    var W = heroPlate.clientWidth, PH = heroPlate.clientHeight;
    if (!W || !PH) return;
    var mob = isMobile();
    var pr = heroPlate.getBoundingClientRect(), tr = heroTxt.getBoundingClientRect();
    var top = tr.bottom - pr.top + (mob ? 22 : 34);
    var bottom = PH - 44 - (mob ? 20 : 34);
    if (bottom - top < 120) bottom = top + 120;
    var h = bottom - top;
    heroPh.classList.toggle('small', h < 170);
    var w = Math.min(W * (mob ? 0.8 : 0.6), h * 1.6, 820);
    var x0 = (W - w) / 2;
    heroPh.style.setProperty('--zx0', (x0 / W * 100).toFixed(2));
    heroPh.style.setProperty('--zx1', ((x0 + w) / W * 100).toFixed(2));
    heroPh.style.setProperty('--zy0', (top / PH * 100).toFixed(2));
    heroPh.style.setProperty('--zy1', (bottom / PH * 100).toFixed(2));
  }

  function plates() {
    ticking = false;
    H = window.innerHeight;
    var mob = isMobile();
    var rects = pws.map(function (p) { return p.getBoundingClientRect(); });
    var enters = rects.map(function (r) { return clamp(1 - r.top / H, 0, 1); });
    pws.forEach(function (p, i) {
      var r = rects[i];
      if (r.bottom < -H || r.top > H * 2) return;
      var enter = enters[i];
      var span = r.height - H;
      var stay = span > 2 ? clamp(-r.top / span, 0, 1) : 0;
      var next = pws[i + 1];
      var exit = next && r.bottom > 0 ? enters[i + 1] : 0;
      var st = state[i];
      setVar(p, '--enter', enter, st, 'e');
      setVar(p, '--stay', stay, st, 's');
      setVar(p, '--exit', exit, st, 'x');
      p.classList.toggle('gone', !mob && (exit >= 1 || r.bottom <= 0));
      var txt = p.querySelector('.txt');
      if (txt && enter > 0.72 && (p !== hero || introDone)) txt.classList.add('on');
      if (p === hero) {
        if (introDone && heroPh) {
          var hp = reduce ? 1 : (mob ? easeOutCubic(clamp(exit, 0, 1)) : easeOutCubic(clamp(stay / 0.85, 0, 1)));
          setP(heroPh, hp);
        }
      } else {
        var ph = p.querySelector('.ph[data-mask]');
        if (ph) {
          var o = mob ? clamp((enter - 0.45) / 0.45, 0, 1) : clamp((enter - 0.4) / 0.55, 0, 1);
          setP(ph, reduce ? 1 : easeInOut(o));
        }
      }
    });
    stickyBar();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(plates); } }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- кадры в обычных секциях: маска снимается при появлении ---------- */
  var freePhs = [].slice.call(doc.querySelectorAll('.sec .ph[data-mask]'));
  function animPh(ph) {
    if (reduce) { setP(ph, 1); return; }
    var t0 = null, D = 1500, HOLD = 150;
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = clamp((t - t0 - HOLD) / D, 0, 1);
      setP(ph, easeOutCubic(k));
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var ioPh = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animPh(e.target); ioPh.unobserve(e.target); } });
    }, { threshold: 0.45 });
    freePhs.forEach(function (ph) { ioPh.observe(ph); });
  } else freePhs.forEach(function (ph) { setP(ph, 1); });

  /* ---------- интро героя: лента ложится по кромке, вырезанный кусок бумаги снимается ---------- */
  function runIntro() {
    var skip = reduce || location.hash || window.pageYOffset > 80 || !heroPh;
    if (skip) {
      if (heroPh) heroPh.style.setProperty('--in', 1);
      introDone = true; heroTxt.classList.add('on'); onScroll(); return;
    }
    var t0 = null, HOLD = 120, D = 1250;
    heroPh.style.setProperty('--in', 0);
    setTimeout(function () { heroTxt.classList.add('on'); }, 560);
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = clamp((t - t0 - HOLD) / D, 0, 1);
      heroPh.style.setProperty('--in', easeOutCubic(k).toFixed(3));
      if (k < 1) requestAnimationFrame(frame);
      else { heroPh.style.setProperty('--in', 1); introDone = true; onScroll(); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- липкая панель ---------- */
  var sticky = doc.getElementById('sticky'), kont = doc.getElementById('kontakty');
  var kontVisible = false;
  if ('IntersectionObserver' in window && kont) {
    new IntersectionObserver(function (es) { kontVisible = es[0].isIntersecting; stickyBar(); }, { threshold: 0.15 }).observe(kont);
  }
  function stickyBar() {
    if (!sticky) return;
    sticky.classList.toggle('is-on', window.pageYOffset > H * 0.55 && !kontVisible);
  }

  /* ---------- появление блоков и счётчики ---------- */
  var rvs = [].slice.call(doc.querySelectorAll('.rv'));
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-to'), 10), t0 = null, D = 1300;
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
    if (reduce) { el.textContent = fmt(to); return; }
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = easeOutCubic(clamp((t - t0) / D, 0, 1));
      el.textContent = fmt(Math.round(to * k));
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function revealed(el) {
    el.classList.add('in');
    [].forEach.call(el.querySelectorAll('[data-to]'), countUp);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { revealed(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(revealed);

  /* ---------- конверсии Google Ads (теги подключаются при деплое) ---------- */
  function fireConv(key) {
    if (typeof window.gtag_report_conversion !== 'function' || !window.AW_CONV) return;
    var sendTo = window.AW_CONV[key];
    if (sendTo) window.gtag_report_conversion(undefined, sendTo);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"], a[href*="wa.me"]') : null;
    if (!a) return;
    fireConv(a.getAttribute('href').indexOf('tel:') === 0 ? 'phone' : 'contact');
  });

  /* ---------- форма -> WhatsApp ---------- */
  var form = doc.getElementById('form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website.value) return;
      var name = form.name.value.trim(), phone = form.phone.value.trim();
      var ok = doc.getElementById('form-ok');
      var good = phone.replace(/\D/g, '').length >= 10;
      form.phone.closest('.fld').classList.toggle('is-bad', !good);
      if (!good) { form.phone.focus(); return; }
      var d = I18N[root.lang] || {};
      var t = function (k, ru) { return d[k] || ru; };
      var sel = form.service, service = sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].textContent.trim() : '';
      var lines = [t('fm.hello', 'Здравствуйте! Хочу оценить ремонт по фото.')];
      if (name) lines.push(t('fm.name', 'Имя') + ': ' + name);
      lines.push(t('fm.phone', 'Телефон') + ': ' + phone);
      if (service) lines.push(t('fm.service', 'Услуга') + ': ' + service);
      var msg = form.message.value.trim();
      if (msg) lines.push(t('fm.msg', 'Что случилось') + ': ' + msg);
      var url = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(lines.join('\n'));
      fireConv('form');
      window.open(url, '_blank', 'noopener');
      ok.hidden = false;
      form.querySelector('button[type="submit"]').blur();
    });
    form.phone.addEventListener('input', function () { form.phone.closest('.fld').classList.remove('is-bad'); });
  }

  /* ---------- старт ---------- */
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) { onScroll(); return; }
    lastW = window.innerWidth;
    fitText(); marquee(); heroZone(); onScroll();
  });
  function start() {
    fitText(); marquee(); heroZone();
    if (location.hash) {
      var id = decodeURIComponent(location.hash.slice(1));
      goTo(id, true);
      setTimeout(function () { goTo(id, true); plates(); }, 400);
    }
    runIntro();
    plates();
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(start); else start();
  window.addEventListener('load', function () { fitText(); marquee(); heroZone(); onScroll(); });
})();
