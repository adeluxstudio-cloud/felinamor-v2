/* ============================================================
   FELINAMOR · interacciones
   ============================================================ */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- NAV ---------- */
  (function () {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!nav) return;
    function onScroll() {
      // fuera del inicio la barra siempre va sólida (los paneles tienen fondo claro)
      var solid = (document.body.dataset.tab !== 'inicio') || window.scrollY > 48;
      nav.classList.toggle('scrolled', solid);
    }
    window.__updateNav = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (toggle && links) {
      toggle.addEventListener('click', function () { links.classList.toggle('open'); });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) links.classList.remove('open');
      });
    }
  })();

  /* ---------- MARQUEE (desplazamiento continuo) ---------- */
  (function () {
    var track = document.getElementById('marqueeTrack');
    if (!track) return;
    var first = track.querySelector('.marquee-content');
    if (!first) return;
    var x = 0, speed = 0.55, paused = false;
    var w = first.offsetWidth;
    window.addEventListener('resize', function () { w = first.offsetWidth; }, { passive: true });
    var box = track.closest('.marquee');
    if (box) {
      box.addEventListener('mouseenter', function () { paused = true; });
      box.addEventListener('mouseleave', function () { paused = false; });
    }
    function loop() {
      if (!paused) {
        x -= speed;
        if (w && Math.abs(x) >= w) x += w;
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ---------- PESTAÑAS (paneles) ---------- */
  (function () {
    var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
    if (!panels.length) return;
    var valid = {};
    panels.forEach(function (p) { valid[p.dataset.tab] = true; });

    function setTab(name, push) {
      if (!valid[name]) name = 'inicio';
      document.body.dataset.tab = name;
      panels.forEach(function (p) { p.classList.toggle('active', p.dataset.tab === name); });
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-tab-link') === name); });
      var menu = document.getElementById('navLinks');
      if (menu) menu.classList.remove('open');
      window.scrollTo(0, 0);
      if (window.__updateNav) window.__updateNav();
      // refrescar medidas dependientes del layout (hero scrubbing, odómetros)
      if (typeof ScrollTrigger !== 'undefined') { try { ScrollTrigger.refresh(); } catch (e) {} }
      window.dispatchEvent(new Event('resize'));
      if (push !== false) {
        try { history.replaceState({ tab: name }, '', name === 'inicio' ? '#inicio' : '#' + name); } catch (e) {}
      }
    }
    window.__setTab = setTab;

    // clic en cualquier disparador de pestaña
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-tab-link]');
      if (!el) return;
      // si además abre una ficha de raza, deja que ese handler actúe
      if (el.hasAttribute('data-breed')) return;
      e.preventDefault();
      setTab(el.getAttribute('data-tab-link'));
    });

    // estado inicial según el hash
    var initial = (location.hash || '').replace('#', '');
    setTab(valid[initial] ? initial : 'inicio', false);
  })();

  /* ---------- HERO frame scrubbing ---------- */
  (function () {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    var total = parseInt(hero.dataset.frames || '0', 10);
    var base = hero.dataset.frameBase || '';
    var ctx = canvas.getContext('2d');
    var loader = document.getElementById('frameLoader');
    var loaderFill = document.getElementById('loaderFill');
    var content = hero.querySelector('.hero-content');
    var scrollCue = hero.querySelector('.hero-scroll');

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', function () { resize(); draw(current); });
    resize();

    var frames = [];
    var current = 0;
    var firstDrawn = false;
    var loaded = 0;

    function cssSize() { return { w: canvas.width / (Math.min(window.devicePixelRatio || 1, 2)), h: canvas.height / (Math.min(window.devicePixelRatio || 1, 2)) }; }

    function draw(idx) {
      var img = frames[idx];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      var s = cssSize();
      ctx.clearRect(0, 0, s.w, s.h);
      var r = Math.max(s.w / img.naturalWidth, s.h / img.naturalHeight);
      var w = img.naturalWidth * r, h = img.naturalHeight * r;
      ctx.drawImage(img, (s.w - w) / 2, (s.h - h) / 2, w, h);
      current = idx;
    }

    function tryInitial() {
      if (firstDrawn && frames[0] && frames[0].complete) { return; }
      if (frames[0] && frames[0].complete && frames[0].naturalWidth > 0) { draw(0); firstDrawn = true; }
    }

    if (total > 0) {
      if (loader) loader.classList.add('active');
      for (var i = 1; i <= total; i++) {
        var img = new Image();
        img.src = base + 'frame-' + String(i).padStart(4, '0') + '.jpg';
        img.onload = (function () {
          return function () {
            loaded++;
            if (loaderFill) loaderFill.style.width = ((loaded / total) * 100) + '%';
            tryInitial();
            if (loaded >= total && loader) setTimeout(function () { loader.classList.remove('active'); }, 400);
          };
        })();
        img.onerror = function () { loaded++; tryInitial(); };
        frames.push(img);
      }
      if (frames[0] && frames[0].complete) tryInitial();
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      if (total > 0) {
        var proxy = { f: 0 };
        gsap.to(proxy, {
          f: total - 1, snap: 'f', ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.35 },
          onUpdate: function () { draw(Math.round(proxy.f)); }
        });
      }
      gsap.to(content, {
        opacity: 0, y: -50, ease: 'none',
        scrollTrigger: { trigger: hero, start: '8% top', end: '34% top', scrub: true }
      });
      if (scrollCue) {
        gsap.to(scrollCue, {
          opacity: 0, ease: 'none',
          scrollTrigger: { trigger: hero, start: '5% top', end: '15% top', scrub: true }
        });
      }
    }
  })();

  /* ---------- RAZAS · pestañas + ficha dedicada ---------- */
  (function () {
    var DATA = {
      bengali: {
        num: '01', name: 'Bengalí', tagline: 'Manto salvaje, alma doméstica.',
        img: 'public/assets/breeds/bengali.webp',
        desc: [
          'El Bengalí nació del cruce entre el gato leopardo asiático y razas domésticas. Conserva el aspecto de un pequeño felino salvaje: rosetas, manto marmolado y un brillo casi metálico que los criadores llaman <em>glitter</em>.',
          'Es atlético, curioso y conversador. Necesita juego, alturas para trepar y compañía. A cambio entrega un vínculo intenso y una energía que llena la casa. No es un gato para dejar solo todo el día.'
        ],
        ficha: [['Origen', 'Estados Unidos'], ['Tamaño', 'Mediano a grande · 4–7 kg'], ['Pelaje', 'Corto, denso y brillante'], ['Temperamento', 'Activo, inteligente, curioso'], ['Energía', 'Muy alta'], ['Cuidados', 'Mucho juego y estímulo; cepillado mínimo'], ['Esperanza de vida', '12 – 16 años'], ['Ideal para', 'Hogares activos que disfrutan jugar']]
      },
      munchkin: {
        num: '02', name: 'Munchkin', tagline: 'Patas cortas, personalidad enorme.',
        img: 'public/assets/breeds/munchkin.webp',
        desc: [
          'El Munchkin se reconoce por sus patas cortas, resultado de una mutación natural. Pese a ellas se mueve con sorprendente agilidad y corre por toda la casa.',
          'Es sociable, juguetón y muy apegado a la familia. Le encanta la compañía de niños y otras mascotas, y se adapta bien a la vida en apartamento.'
        ],
        ficha: [['Origen', 'Estados Unidos'], ['Tamaño', 'Pequeño a mediano · 2.5–4 kg'], ['Pelaje', 'Corto o semilargo'], ['Temperamento', 'Juguetón, sociable, curioso'], ['Energía', 'Media-alta'], ['Cuidados', 'Cepillado regular; vigilar el peso'], ['Esperanza de vida', '12 – 15 años'], ['Ideal para', 'Familias y apartamentos']]
      },
      exotico: {
        num: '03', name: 'Gato Exótico', tagline: 'El Persa en versión práctica.',
        img: 'public/assets/breeds/exotico.webp',
        desc: [
          'El Exótico es el Persa en versión práctica: la misma cara redonda y dulce, pero con un pelaje corto y afelpado que pide mucho menos mantenimiento.',
          'Tranquilo y cariñoso, prefiere la calma a la acrobacia. Disfruta de un regazo, una ventana con sol y una rutina sin sobresaltos.'
        ],
        ficha: [['Origen', 'Estados Unidos'], ['Tamaño', 'Mediano · 3.5–6 kg'], ['Pelaje', 'Corto, denso y afelpado'], ['Temperamento', 'Tranquilo, afectuoso, sereno'], ['Energía', 'Baja'], ['Cuidados', 'Limpieza diaria de ojos; cepillado semanal'], ['Esperanza de vida', '12 – 15 años'], ['Ideal para', 'Hogares tranquilos y apartamentos']]
      },
      mainecoon: {
        num: '04', name: 'Maine Coon', tagline: 'El gigante gentil de Norteamérica.',
        img: 'public/assets/breeds/mainecoon.webp',
        desc: [
          'El Maine Coon es uno de los gatos domésticos más grandes que existen. Su pelaje semilargo, su cola frondosa y sus orejas con mechones le dan un porte casi salvaje.',
          'Detrás de ese tamaño vive un carácter dulce y sociable, casi perruno. Sigue a su familia por la casa, aprende juegos y mantiene un aire juguetón toda la vida.'
        ],
        ficha: [['Origen', 'Estados Unidos (Maine)'], ['Tamaño', 'Grande · 4.5–8+ kg'], ['Pelaje', 'Semilargo, denso, impermeable'], ['Temperamento', 'Gentil, sociable, inteligente'], ['Energía', 'Media'], ['Cuidados', 'Cepillado frecuente; espacio para moverse'], ['Esperanza de vida', '12 – 15 años'], ['Ideal para', 'Familias y hogares amplios']]
      },
      scottish: {
        num: '05', name: 'Scottish Fold', tagline: 'Orejas plegadas, expresión dulce.',
        img: 'public/assets/breeds/scottish.webp',
        desc: [
          'El rasgo que define al Scottish Fold son sus orejas plegadas hacia adelante, fruto de una mutación natural, que le dan una expresión dulce y de eterno cachorro.',
          'Es tranquilo, cariñoso y muy apegado. Le gusta estar donde está su gente, sin exigir demasiado. Solo trabajamos con cría responsable y seguimiento de su salud articular.'
        ],
        ficha: [['Origen', 'Escocia'], ['Tamaño', 'Mediano · 3–6 kg'], ['Pelaje', 'Corto o largo, denso'], ['Temperamento', 'Dulce, tranquilo, apegado'], ['Energía', 'Media-baja'], ['Cuidados', 'Seguimiento articular; cepillado regular'], ['Esperanza de vida', '11 – 15 años'], ['Ideal para', 'Familias y ambientes tranquilos']]
      },
      sphynx: {
        num: '06', name: 'Sphynx', tagline: 'Esfinge sin pelaje, cercanía sin barreras.',
        img: 'public/assets/breeds/sphynx.webp',
        desc: [
          'El Sphynx parece no tener pelo, pero su piel está cubierta de una pelusa fina y cálida al tacto, como un durazno. Su aspecto de esfinge esconde al gato más cariñoso que existe.',
          'Busca contacto todo el tiempo: brazos, regazo, cobijas. Es enérgico, extrovertido y sociable. Necesita baños regulares y abrigo, porque siente el frío más que otras razas.'
        ],
        ficha: [['Origen', 'Canadá'], ['Tamaño', 'Mediano · 3.5–5 kg'], ['Pelaje', 'Sin pelo (piel aterciopelada)'], ['Temperamento', 'Muy afectuoso, social, enérgico'], ['Energía', 'Alta'], ['Cuidados', 'Baños regulares; abrigo y protección solar'], ['Esperanza de vida', '12 – 15 años'], ['Ideal para', 'Quien busca un gato muy apegado']]
      },
      ragdoll: {
        num: '07', name: 'Ragdoll', tagline: 'Docilidad y elegancia, en estado puro.',
        img: 'public/assets/breeds/ragdoll.webp',
        desc: [
          'El Ragdoll debe su nombre a una costumbre encantadora: se relaja por completo cuando lo cargan, como un muñeco de trapo. Es grande, de pelaje sedoso y ojos azules intensos.',
          'Dócil y sereno, sigue a su familia con calma y rara vez saca las uñas. Es uno de los gatos más recomendados para hogares con niños.'
        ],
        ficha: [['Origen', 'Estados Unidos (California)'], ['Tamaño', 'Grande · 4.5–9 kg'], ['Pelaje', 'Semilargo y sedoso'], ['Temperamento', 'Dócil, relajado, sociable'], ['Energía', 'Baja-media'], ['Cuidados', 'Cepillado regular; gato de interior'], ['Esperanza de vida', '12 – 17 años'], ['Ideal para', 'Familias con niños y hogares tranquilos']]
      }
    };

    /* --- pestañas / filtro --- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.breed-tab'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.breed-card[data-cat]'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
        var cat = tab.dataset.cat;
        cards.forEach(function (card) {
          var match = cat === 'all' || card.dataset.cat === cat;
          if (match) {
            card.style.display = '';
            if (!REDUCED) { card.classList.remove('filter-in'); void card.offsetWidth; card.classList.add('filter-in'); }
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    /* --- ficha dedicada --- */
    var detail = document.getElementById('breedDetail');
    if (!detail) return;
    var bdImg = document.getElementById('bdImg');
    var bdNum = document.getElementById('bdNum');
    var bdName = document.getElementById('bdName');
    var bdTagline = document.getElementById('bdTagline');
    var bdDesc = document.getElementById('bdDesc');
    var bdFicha = document.getElementById('bdFicha');
    var bdWa = document.getElementById('bdWa');
    var bdWaText = document.getElementById('bdWaText');
    var bdScroll = document.getElementById('bdScroll');
    var isOpen = false;

    function openBreed(slug) {
      var d = DATA[slug];
      if (!d) return;
      var POS = {
        bengali: '50% 20%', exotico: '50% 16%', mainecoon: '50% 14%',
        scottish: '50% 16%', sphynx: '50% 14%',
        munchkin: '50% 50%', ragdoll: '50% 50%'
      };
      bdImg.src = d.img; bdImg.alt = d.name;
      bdImg.style.objectPosition = POS[slug] || '50% 30%';
      bdNum.textContent = d.num + ' — ' + d.name;
      bdName.textContent = d.name;
      bdTagline.textContent = d.tagline;
      bdDesc.innerHTML = d.desc.map(function (p) { return '<p>' + p + '</p>'; }).join('');
      bdFicha.innerHTML = d.ficha.map(function (r) {
        return '<div class="fic-row"><div class="fic-k">' + r[0] + '</div><div class="fic-v">' + r[1] + '</div></div>';
      }).join('');
      bdWaText.textContent = 'Preguntar por ' + d.name;
      bdWa.href = 'https://wa.me/573122230730?text=' + encodeURIComponent('Hola Felinamor, me interesa la raza ' + d.name + '. ¿Tienen disponibilidad?');
      detail.classList.add('open');
      detail.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (bdScroll) detail.scrollTop = 0;
      if (!isOpen) { history.pushState({ breed: slug }, ''); isOpen = true; }
    }

    function closeBreed() {
      detail.classList.remove('open');
      detail.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      isOpen = false;
    }

    document.querySelectorAll('[data-breed]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.__setTab) window.__setTab('razas');
        openBreed(el.dataset.breed);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (window.__setTab) window.__setTab('razas'); openBreed(el.dataset.breed); }
      });
    });

    var back = document.getElementById('bdBack');
    if (back) back.addEventListener('click', function () { history.back(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) history.back(); });
    window.addEventListener('popstate', function () { if (isOpen) closeBreed(); });
  })();

  /* ---------- ODOMETER ---------- */
  (function () {
    var odos = Array.prototype.slice.call(document.querySelectorAll('.odometer'));
    if (!odos.length) return;
    function animate(odo) {
      odo.querySelectorAll('.digit-wrap').forEach(function (wrap) {
        var target = parseInt(wrap.dataset.target, 10);
        var delay = parseFloat(wrap.dataset.delay || '0');
        var strip = wrap.querySelector('.digit-strip');
        var first = strip.querySelector('span');
        var cell = first ? first.getBoundingClientRect().height : wrap.getBoundingClientRect().height;
        if (REDUCED) { strip.style.transform = 'translate3d(0,-' + (target * cell) + 'px,0)'; return; }
        setTimeout(function () { strip.style.transform = 'translate3d(0,-' + (target * cell) + 'px,0)'; }, delay * 1000);
      });
    }
    function inView(el) {
      var r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.88 && r.bottom > 0;
    }
    function check() {
      odos = odos.filter(function (o) {
        if (inView(o)) { animate(o); return false; }
        return true;
      });
      if (!odos.length) window.removeEventListener('scroll', onScroll);
    }
    function onScroll() { check(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    check();
  })();

  /* ---------- REVEAL ---------- */
  (function () {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (REDUCED) { els.forEach(function (el) { el.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -70px 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- BREED CARD glow ---------- */
  (function () {
    document.querySelectorAll('.breed-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  })();
})();
