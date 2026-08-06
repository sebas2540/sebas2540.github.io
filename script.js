/* =========================================================
   SubnetCalc — script.js
   Lógica de cálculo de subredes IPv4 + interacción de UI.
   Sin frameworks. Comentado por bloques funcionales.
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     1. UTILIDADES DE IP / BINARIO
     ========================================================= */

  /** Convierte una IP "a.b.c.d" a un entero de 32 bits (unsigned). */
  function ipToInt(ip) {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  /** Convierte un entero de 32 bits a formato "a.b.c.d". */
  function intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  }

  /** Devuelve la máscara (como entero de 32 bits) a partir del prefijo CIDR. */
  function cidrToMaskInt(prefix) {
    return prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }

  /** Convierte un entero de 32 bits a su representación binaria de 32 caracteres. */
  function intToBinary(int) {
    return (int >>> 0).toString(2).padStart(32, '0');
  }

  /** Valida el formato de una dirección IPv4 (cuatro octetos 0-255, sin ceros a la izquierda salvo "0"). */
  function isValidIp(ip) {
    const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(regex);
    if (!match) return false;
    const octets = match.slice(1);
    return octets.every(function (octet) {
      if (octet.length > 1 && octet[0] === '0') return false; // ceros a la izquierda no permitidos
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }

  /** Determina la clase histórica (A-E) de una IP. */
  function getIpClass(firstOctet) {
    if (firstOctet >= 1 && firstOctet <= 126) return 'A';
    if (firstOctet === 127) return 'A (Loopback)';
    if (firstOctet >= 128 && firstOctet <= 191) return 'B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'D (Multicast)';
    if (firstOctet >= 240 && firstOctet <= 255) return 'E (Experimental)';
    return 'Desconocida';
  }

  /** Determina si una IP pertenece a un rango privado (RFC 1918) o especial. */
  function isPrivateIp(int) {
    const ranges = [
      [ipToInt('10.0.0.0'), ipToInt('10.255.255.255')],
      [ipToInt('172.16.0.0'), ipToInt('172.31.255.255')],
      [ipToInt('192.168.0.0'), ipToInt('192.168.255.255')],
      [ipToInt('127.0.0.0'), ipToInt('127.255.255.255')],
      [ipToInt('169.254.0.0'), ipToInt('169.254.255.255')]
    ];
    return ranges.some(function (r) { return int >= r[0] && int <= r[1]; });
  }

  /* =========================================================
     2. MOTOR DE CÁLCULO DE SUBREDES
     ========================================================= */

  function calculateSubnet(ip, prefix) {
    const ipInt = ipToInt(ip);
    const maskInt = cidrToMaskInt(prefix);
    const networkInt = (ipInt & maskInt) >>> 0;
    const wildcardInt = (~maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    const totalAddresses = Math.pow(2, 32 - prefix);
    let usableHosts, firstUsableInt, lastUsableInt;

    if (prefix >= 31) {
      // /31 y /32: casos especiales sin red/broadcast tradicionales
      usableHosts = prefix === 32 ? 1 : 2;
      firstUsableInt = networkInt;
      lastUsableInt = broadcastInt;
    } else {
      usableHosts = totalAddresses - 2;
      firstUsableInt = networkInt + 1;
      lastUsableInt = broadcastInt - 1;
    }

    const firstOctet = (ipInt >>> 24) & 255;

    return {
      ip: ip,
      prefix: prefix,
      network: intToIp(networkInt),
      networkInt: networkInt,
      broadcast: intToIp(broadcastInt),
      broadcastInt: broadcastInt,
      firstUsable: usableHosts > 0 ? intToIp(firstUsableInt) : 'N/A',
      lastUsable: usableHosts > 0 ? intToIp(lastUsableInt) : 'N/A',
      maskDecimal: intToIp(maskInt),
      maskBinary: intToBinary(maskInt),
      wildcard: intToIp(wildcardInt),
      usableHosts: usableHosts,
      totalAddresses: totalAddresses,
      ipClass: getIpClass(firstOctet),
      type: isPrivateIp(ipInt) ? 'Privada' : 'Pública'
    };
  }

  /** Genera la tabla de subredes al dividir la red base en un prefijo mayor. */
  function generateSubnetTable(networkInt, basePrefix, newPrefix) {
    const subnets = [];
    const blockSize = Math.pow(2, 32 - newPrefix);
    const subnetCount = Math.pow(2, newPrefix - basePrefix);
    const maxRows = 512; // límite de seguridad para no congelar el navegador

    for (let i = 0; i < subnetCount && i < maxRows; i++) {
      const subNetworkInt = (networkInt + i * blockSize) >>> 0;
      const subBroadcastInt = (subNetworkInt + blockSize - 1) >>> 0;
      const usable = newPrefix >= 31 ? (newPrefix === 32 ? 1 : 2) : blockSize - 2;
      subnets.push({
        index: i + 1,
        network: intToIp(subNetworkInt),
        first: newPrefix >= 31 ? intToIp(subNetworkInt) : intToIp(subNetworkInt + 1),
        last: newPrefix >= 31 ? intToIp(subBroadcastInt) : intToIp(subBroadcastInt - 1),
        broadcast: intToIp(subBroadcastInt),
        usable: usable
      });
    }
    return { subnets: subnets, truncated: subnetCount > maxRows, total: subnetCount };
  }

  /* =========================================================
     3. ELEMENTOS DEL DOM
     ========================================================= */

  const form = document.getElementById('subnet-form');
  const ipInput = document.getElementById('ip-address');
  const ipError = document.getElementById('ip-error');
  const cidrSelect = document.getElementById('cidr-prefix');
  const subnetCountSelect = document.getElementById('subnet-count');
  const clearBtn = document.getElementById('clear-btn');

  const loader = document.getElementById('loader');
  const resultsCard = document.getElementById('results');
  const resultsEmpty = document.getElementById('results-empty');
  const resultsGrid = document.getElementById('results-grid');
  const maskBinaryWrap = document.getElementById('mask-binary');
  const subnetsWrap = document.getElementById('subnets-wrap');
  const subnetsTableBody = document.querySelector('#subnets-table tbody');

  const copyBtn = document.getElementById('copy-btn');
  const printBtn = document.getElementById('print-btn');
  const pdfBtn = document.getElementById('pdf-btn');

  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  const themeToggle = document.getElementById('theme-toggle');
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');

  const toast = document.getElementById('toast');

  let lastResult = null; // guarda el último cálculo para copiar/imprimir/exportar

  /* =========================================================
     4. POBLAR SELECTS (CIDR /8–/30 y división de subredes)
     ========================================================= */

  function populateCidrSelect() {
    cidrSelect.innerHTML = '';
    for (let p = 8; p <= 30; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = '/' + p + '  —  ' + intToIp(cidrToMaskInt(p));
      if (p === 24) opt.selected = true;
      cidrSelect.appendChild(opt);
    }
  }

  function populateSubnetCountSelect() {
    const basePrefix = Number(cidrSelect.value);
    subnetCountSelect.innerHTML = '<option value="">No dividir</option>';
    for (let p = basePrefix + 1; p <= 30; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      const count = Math.pow(2, p - basePrefix);
      opt.textContent = '/' + p + '  (' + count + ' subredes)';
      subnetCountSelect.appendChild(opt);
    }
  }

  populateCidrSelect();
  populateSubnetCountSelect();
  cidrSelect.addEventListener('change', populateSubnetCountSelect);

  /* =========================================================
     5. VALIDACIÓN DEL FORMULARIO
     ========================================================= */

  function validateIp() {
    const value = ipInput.value.trim();
    if (!value) {
      showIpError('Introduce una dirección IP.');
      return false;
    }
    if (!isValidIp(value)) {
      showIpError('Formato inválido. Usa el formato 192.168.1.0');
      return false;
    }
    clearIpError();
    return true;
  }

  function showIpError(msg) {
    ipError.textContent = msg;
    ipInput.classList.add('invalid');
    ipInput.setAttribute('aria-invalid', 'true');
  }

  function clearIpError() {
    ipError.textContent = '';
    ipInput.classList.remove('invalid');
    ipInput.removeAttribute('aria-invalid');
  }

  ipInput.addEventListener('input', clearIpError);

  /* =========================================================
     6. RENDERIZADO DE RESULTADOS
     ========================================================= */

  function renderResults(result) {
    const items = [
      { label: 'Dirección de red', value: result.network, highlight: true },
      { label: 'Primera IP útil', value: result.firstUsable },
      { label: 'Última IP útil', value: result.lastUsable },
      { label: 'Broadcast', value: result.broadcast, highlight: true },
      { label: 'Máscara decimal', value: result.maskDecimal },
      { label: 'Wildcard mask', value: result.wildcard },
      { label: 'Hosts útiles', value: result.usableHosts.toLocaleString('es-ES') },
      { label: 'Total de direcciones', value: result.totalAddresses.toLocaleString('es-ES') },
      { label: 'Clase de la IP', value: result.ipClass },
      { label: 'Tipo de red', value: result.type, badge: result.type === 'Privada' ? 'badge-private' : 'badge-public' }
    ];

    resultsGrid.innerHTML = items.map(function (item) {
      const valueHtml = item.badge
        ? '<span class="badge ' + item.badge + '">' + item.value + '</span>'
        : item.value;
      return '<div class="result-item' + (item.highlight ? ' r-highlight' : '') + '">' +
        '<div class="r-label">' + item.label + '</div>' +
        '<div class="r-value">' + valueHtml + '</div>' +
        '</div>';
    }).join('');

    renderMaskBinary(result.maskBinary);
  }

  function renderMaskBinary(binaryString) {
    const octets = binaryString.match(/.{1,8}/g);
    maskBinaryWrap.innerHTML = octets.map(function (octet) {
      const bits = octet.split('').map(function (bit) {
        const cls = bit === '1' ? 'bit-network' : 'bit-host';
        return '<span class="mask-bit ' + cls + '">' + bit + '</span>';
      }).join('');
      return '<div class="mask-octet">' + bits + '</div>';
    }).join('');
  }

  function renderSubnetTable(data) {
    if (!data) {
      subnetsWrap.hidden = true;
      subnetsTableBody.innerHTML = '';
      return;
    }
    subnetsWrap.hidden = false;
    subnetsTableBody.innerHTML = data.subnets.map(function (s) {
      return '<tr>' +
        '<td>' + s.index + '</td>' +
        '<td>' + s.network + '</td>' +
        '<td>' + s.first + '</td>' +
        '<td>' + s.last + '</td>' +
        '<td>' + s.broadcast + '</td>' +
        '<td>' + s.usable.toLocaleString('es-ES') + '</td>' +
        '</tr>';
    }).join('');

    if (data.truncated) {
      subnetsTableBody.innerHTML += '<tr><td colspan="6" style="color:var(--text-faint);text-align:center;">' +
        'Mostrando las primeras ' + 512 + ' de ' + data.total.toLocaleString('es-ES') + ' subredes.</td></tr>';
    }
  }

  /* =========================================================
     7. ENVÍO DEL FORMULARIO (con loader simulado)
     ========================================================= */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateIp()) return;

    const ip = ipInput.value.trim();
    const prefix = Number(cidrSelect.value);
    const newPrefix = subnetCountSelect.value ? Number(subnetCountSelect.value) : null;

    resultsCard.hidden = true;
    resultsEmpty.hidden = true;
    loader.hidden = false;

    // Pequeño delay artificial para mostrar el loader (UX) sin bloquear el hilo.
    window.setTimeout(function () {
      try {
        const result = calculateSubnet(ip, prefix);
        lastResult = result;

        renderResults(result);

        if (newPrefix) {
          const tableData = generateSubnetTable(result.networkInt, prefix, newPrefix);
          renderSubnetTable(tableData);
        } else {
          renderSubnetTable(null);
        }

        loader.hidden = true;
        resultsCard.hidden = false;
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        saveToHistory(result);
        showToast('Cálculo completado correctamente.');
      } catch (err) {
        loader.hidden = true;
        resultsEmpty.hidden = false;
        showIpError('No se pudo calcular la subred. Verifica los datos.');
      }
    }, 450);
  });

  clearBtn.addEventListener('click', function () {
    form.reset();
    clearIpError();
    populateCidrSelect();
    populateSubnetCountSelect();
    resultsCard.hidden = true;
    resultsEmpty.hidden = false;
    lastResult = null;
  });

  /* =========================================================
     8. HISTORIAL (LocalStorage)
     ========================================================= */

  const HISTORY_KEY = 'subnetcalc_history';
  const HISTORY_LIMIT = 8;

  function getHistory() {
    try {
      return JSON.parse(window.localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(result) {
    let history = getHistory();
    const entry = {
      ip: result.ip,
      prefix: result.prefix,
      network: result.network,
      timestamp: Date.now()
    };
    // Evita duplicados consecutivos idénticos
    history = history.filter(function (h) { return !(h.ip === entry.ip && h.prefix === entry.prefix); });
    history.unshift(entry);
    history = history.slice(0, HISTORY_LIMIT);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) { /* almacenamiento no disponible: se ignora silenciosamente */ }
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (!history.length) {
      historyList.innerHTML = '<li class="history-empty">Aún no has realizado ningún cálculo.</li>';
      return;
    }
    historyList.innerHTML = history.map(function (h, i) {
      const date = new Date(h.timestamp);
      const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' +
        date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return '<li class="history-item">' +
        '<span>' + h.ip + '/' + h.prefix + ' <span class="history-meta">→ red ' + h.network + ' · ' + dateStr + '</span></span>' +
        '<button type="button" data-index="' + i + '">Reutilizar</button>' +
        '</li>';
    }).join('');
  }

  historyList.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    const history = getHistory();
    const entry = history[Number(btn.dataset.index)];
    if (!entry) return;
    ipInput.value = entry.ip;
    cidrSelect.value = String(entry.prefix);
    populateSubnetCountSelect();
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
    form.requestSubmit();
  });

  clearHistoryBtn.addEventListener('click', function () {
    try { window.localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderHistory();
    showToast('Historial borrado.');
  });

  renderHistory();

  /* =========================================================
     9. COPIAR / IMPRIMIR / EXPORTAR PDF
     ========================================================= */

  function buildResultsText(result) {
    return [
      'SubnetCalc — Resultado del cálculo de subred',
      '-------------------------------------------',
      'IP / CIDR: ' + result.ip + '/' + result.prefix,
      'Dirección de red: ' + result.network,
      'Primera IP útil: ' + result.firstUsable,
      'Última IP útil: ' + result.lastUsable,
      'Broadcast: ' + result.broadcast,
      'Máscara decimal: ' + result.maskDecimal,
      'Máscara binaria: ' + result.maskBinary,
      'Wildcard mask: ' + result.wildcard,
      'Hosts útiles: ' + result.usableHosts,
      'Total de direcciones: ' + result.totalAddresses,
      'Clase de la IP: ' + result.ipClass,
      'Tipo de red: ' + result.type
    ].join('\n');
  }

  copyBtn.addEventListener('click', function () {
    if (!lastResult) { showToast('Primero realiza un cálculo.'); return; }
    const text = buildResultsText(lastResult);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { showToast('Resultados copiados al portapapeles.'); })
        .catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Resultados copiados al portapapeles.');
    } catch (e) {
      showToast('No se pudo copiar automáticamente.');
    }
    document.body.removeChild(ta);
  }

  printBtn.addEventListener('click', function () {
    if (!lastResult) { showToast('Primero realiza un cálculo.'); return; }
    window.print();
  });

  pdfBtn.addEventListener('click', function () {
    if (!lastResult) { showToast('Primero realiza un cálculo.'); return; }
    try {
      const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFCtor) { showToast('El exportador de PDF no está disponible.'); return; }
      const doc = new jsPDFCtor();
      const lines = buildResultsText(lastResult).split('\n');
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      let y = 20;
      lines.forEach(function (line, idx) {
        if (idx === 0) { doc.setFontSize(15); doc.text(line, 14, y); doc.setFontSize(11); y += 10; }
        else if (line.startsWith('---')) { y += 2; }
        else { doc.text(line, 14, y); y += 8; }
      });
      doc.save('subnetcalc-' + lastResult.ip.replace(/\./g, '-') + '-' + lastResult.prefix + '.pdf');
      showToast('PDF descargado correctamente.');
    } catch (e) {
      showToast('Ocurrió un error al generar el PDF.');
    }
  });

  /* =========================================================
     10. TOAST DE NOTIFICACIONES
     ========================================================= */

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('show');
    }, 2600);
  }

  /* =========================================================
     11. TEMA CLARO / OSCURO
     ========================================================= */

  const THEME_KEY = 'subnetcalc_theme';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  function initTheme() {
    let saved = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    } else {
      applyTheme('dark');
    }
  }

  themeToggle.addEventListener('click', function () {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  initTheme();

  /* =========================================================
     12. MENÚ MÓVIL
     ========================================================= */

  navToggle.addEventListener('click', function () {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });

  mainNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  /* =========================================================
     13. BLOG — EXPANDIR ARTÍCULOS
     ========================================================= */

  document.querySelectorAll('.read-more-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const card = btn.closest('.blog-card');
      const full = card.querySelector('.blog-full');
      const excerpt = card.querySelector('.blog-excerpt');
      const isHidden = full.hidden;
      full.hidden = !isHidden;
      excerpt.style.display = isHidden ? 'none' : '-webkit-box';
      btn.innerHTML = isHidden
        ? 'Leer menos <i class="fa-solid fa-arrow-up"></i>'
        : 'Leer artículo completo <i class="fa-solid fa-arrow-right"></i>';
    });
  });

  /* =========================================================
     14. FORMULARIO DE CONTACTO (validación front-end, demo)
     ========================================================= */

  const contactForm = document.getElementById('contact-form');
  const contactNote = document.getElementById('contact-note');

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !message) {
      contactNote.style.color = 'var(--red)';
      contactNote.textContent = 'Por favor completa todos los campos.';
      return;
    }
    if (!emailRegex.test(email)) {
      contactNote.style.color = 'var(--red)';
      contactNote.textContent = 'Introduce un correo electrónico válido.';
      return;
    }
    contactNote.style.color = 'var(--green)';
    contactNote.textContent = '¡Gracias, ' + name + '! Tu mensaje ha sido preparado (demo sin backend).';
    contactForm.reset();
  });

  /* =========================================================
     15. VARIOS
     ========================================================= */

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

})();
