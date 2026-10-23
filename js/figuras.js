/* Las figuras de las rutas listas (2026-10-22): el movimiento.
 *
 * Los dibujos salen del kit de anatomy (MIT, github.com/wheresryan22/anatomy) y los
 * escribe _figuras/*.mjs. Aquí solo se mueven. Reglas:
 *  - Se mueve con calma (curvas suaves), y solo mientras se ve.
 *  - En el catálogo (data-modo="al-pasar") se mueve al pasar el ratón o al enfocar; en un
 *    teléfono, mientras está a la vista. En la página de la ruta, siempre que se vea.
 *  - Con «reducir movimiento», la figura se queda quieta en una pose que se entiende sola.
 *  - Nada se guarda.
 */
(function () {
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tactil = matchMedia('(hover: none)').matches;
  var suave = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  // ── La caja de repaso (Aprender a aprender) ─────────────────────────────
  // Una ficha sube, viaja y baja al compartimento siguiente; al final se olvida y vuelve al
  // primero. El orden de pintado lo dice dónde está: dentro de un compartimento va en su
  // hueco (detrás del separador de delante); arriba, por encima de todo.
  function caja(raiz, datos) {
    var svg = raiz.querySelector('svg');
    var ficha = svg.querySelector('[data-parte="ficha"]');
    var huecos = {};
    svg.querySelectorAll('[data-hueco]').forEach(function (g) { huecos[g.getAttribute('data-hueco')] = g; });
    var lectura = raiz.querySelector('[data-lectura]');
    var D = datos.dias, X = datos.aterriza, ALZA = datos.alza, ex = datos.ex, ez = datos.ez;

    var dice = function (i) { return 'Peldaño ' + (i + 1) + ' · vuelve ' + (D[i] === 1 ? 'mañana' : 'en ' + D[i] + ' días'); };
    var ruta = [1, 2, 3, 4, 5, 6, 0];                 // a dónde va después de cada espera
    var desde = 0, hacia = 1, fase = 'espera', t = 0, x = X[0], z = 0;
    var DUR = { espera: 1.3, sube: 0.45, viaja: 0.7, baja: 0.45 };

    function poner() {
      var hueco = z >= ALZA - 0.01 ? 'arriba' : String(fase === 'baja' ? hacia : desde);
      if (ficha.parentNode !== huecos[hueco]) huecos[hueco].appendChild(ficha);
      ficha.setAttribute('transform', 'translate(' + (x * ex[0] + z * ez[0]).toFixed(2) + ' ' + (x * ex[1] + z * ez[1]).toFixed(2) + ')');
    }
    function escribir(texto) { if (lectura && lectura.textContent !== texto) lectura.textContent = texto; }

    if (quieto) {                                       // una pose quieta que ya cuenta la idea
      desde = 3; x = X[3]; poner(); escribir(dice(3)); return function () {};
    }
    escribir(dice(0)); poner();

    return function paso(dt) {
      t += dt;
      var dur = DUR[fase] * (fase === 'viaja' && hacia === 0 ? 1.8 : 1);
      var k = Math.min(1, t / dur), e = suave(k);
      if (fase === 'sube') z = ALZA * e;
      else if (fase === 'viaja') x = X[desde] + (X[hacia] - X[desde]) * e;
      else if (fase === 'baja') z = ALZA * (1 - e);
      if (k >= 1) {
        t = 0;
        if (fase === 'espera') { fase = 'sube'; if (hacia === 0) escribir('Se olvidó · vuelve al primero'); }
        else if (fase === 'sube') fase = 'viaja';
        else if (fase === 'viaja') fase = 'baja';
        else { fase = 'espera'; desde = hacia; hacia = ruta[desde]; z = 0; x = X[desde]; escribir(dice(desde)); }
      }
      poner();
    };
  }

  // ── El guion: la forma de casi todas (2026-10-23) ───────────────────────
  // Cada figura dice qué piezas (data-p) se MUEVEN —claves [t, dx, dy, dz] en el mundo del
  // dibujo— y cuáles se ENCIENDEN —claves [t, opacidad]—, en un bucle de T segundos. Entre dos
  // claves, una curva suave. Las lecturas [t, título, texto] cuentan el módulo que se está
  // viendo y lo que se aprende en él: la figura recorre la ruta.
  function guion(raiz, datos) {
    var svg = raiz.querySelector('svg');
    var titulo = raiz.querySelector('[data-titulo]');
    var lectura = raiz.querySelector('[data-lectura]');
    var ex = datos.ex, ey = datos.ey, ez = datos.ez, T = datos.T;
    var pistas = datos.pistas.map(function (p) {
      return { els: svg.querySelectorAll('[data-p="' + p.p + '"]'), mueve: p.mueve, luce: p.luce };
    });
    function valor(claves, t, n) {
      if (t <= claves[0][0]) return claves[0].slice(1, 1 + n);
      for (var i = 1; i < claves.length; i++) {
        if (t <= claves[i][0]) {
          var a = claves[i - 1], b = claves[i], k = suave((t - a[0]) / Math.max(b[0] - a[0], 1e-6)), out = [];
          for (var j = 1; j <= n; j++) out.push(a[j] + (b[j] - a[j]) * k);
          return out;
        }
      }
      return claves[claves.length - 1].slice(1, 1 + n);
    }
    function pintar(t) {
      pistas.forEach(function (p) {
        if (p.mueve) {
          var v = valor(p.mueve, t, 3);
          var tr = 'translate(' + (v[0] * ex[0] + v[1] * ey[0] + v[2] * ez[0]).toFixed(2) + ' ' + (v[0] * ex[1] + v[1] * ey[1] + v[2] * ez[1]).toFixed(2) + ')';
          p.els.forEach(function (el) { el.setAttribute('transform', tr); });
        }
        if (p.luce) {
          var o = valor(p.luce, t, 1)[0].toFixed(3);
          p.els.forEach(function (el) { el.style.opacity = o; });
        }
      });
      var l = null, n = -1;
      datos.lecturas.forEach(function (x, i) { if (x[0] <= t) { l = x; n = i; } });
      if (l) {
        if (titulo && titulo.textContent !== l[1]) titulo.textContent = l[1];
        if (lectura && lectura.textContent !== l[2]) lectura.textContent = l[2];
      }
      // Fuera del dibujo, la lista de lo que se aprende enciende el módulo que se está viendo.
      marcas.forEach(function (m) { m.classList.toggle('ahora', m.getAttribute('data-modulo') === String(n)); });
    }
    var marcas = (raiz.closest('[data-marcas]') || raiz).querySelectorAll('[data-modulo]');
    // En el catálogo la figura espera en su momento más completo (la pose): quieta, ya cuenta
    // la ruta entera. Al pasar el ratón arranca desde el principio.
    var alPasar = raiz.getAttribute('data-modo') === 'al-pasar';
    var t = 0, empezada = false;
    pintar(quieto || alPasar ? datos.pose : 0);
    if (quieto) return function () {};
    return function (dt) { if (!empezada) { empezada = true; t = 0; } else t = (t + dt) % T; pintar(t); };
  }

  var FIGURAS = { caja: caja, guion: guion };

  document.querySelectorAll('[data-figura]').forEach(function (raiz) {
    var hace = FIGURAS[raiz.getAttribute('data-figura')];
    if (!hace) return;
    var paso = hace(raiz, JSON.parse(raiz.getAttribute('data-datos')));
    if (quieto) return;
    var alPasar = raiz.getAttribute('data-modo') === 'al-pasar' && !tactil;
    var visto = false, pedido = !alPasar, cuadro = 0, antes = 0;
    function bucle(ahora) {
      var dt = antes ? Math.min((ahora - antes) / 1000, 1 / 20) : 1 / 60;
      antes = ahora;
      paso(dt);
      cuadro = requestAnimationFrame(bucle);
    }
    function decidir() {
      var va = visto && pedido && !document.hidden;
      if (va && !cuadro) { antes = 0; cuadro = requestAnimationFrame(bucle); }
      if (!va && cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    }
    new IntersectionObserver(function (v) { visto = v[v.length - 1].isIntersecting; decidir(); }, { threshold: 0.35 }).observe(raiz);
    document.addEventListener('visibilitychange', decidir);
    if (alPasar) {
      var zona = raiz.closest('a, .carta') || raiz;
      ['pointerenter', 'focusin'].forEach(function (ev) { zona.addEventListener(ev, function () { pedido = true; decidir(); }); });
      ['pointerleave', 'focusout'].forEach(function (ev) { zona.addEventListener(ev, function () { pedido = false; decidir(); }); });
    }
  });
})();
