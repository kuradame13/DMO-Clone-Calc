(() => {
  'use strict';

  /* Values from DMO Wiki — Perfect Clone Table (levels 1 to 15).
     Attack / Critical / Evasion / Health are % of the base stat.
     Block is a flat amount (percentage points) and does not scale. */
  const TABLE = {
    attack:   [3, 6, 9, 14, 19, 24, 34, 44, 54, 69, 84, 99, 114, 129, 144],
    critical: [15, 30, 45, 70, 95, 120, 170, 220, 270, 345, 420, 495, 570, 645, 720],
    block:    [2, 4, 6, 9, 12, 15, 21, 27, 33, 42, 51, 60, 69, 78, 87],
    evasion:  [12, 24, 36, 56, 76, 96, 136, 176, 216, 276, 336, 396, 456, 516, 576],
    health:   [2, 4, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 44, 49, 54]
  };

  const STATS = {
    attack:   { label: 'Ataque' },
    critical: { label: 'Crítico' },
    block:    { label: 'Bloqueio', flat: true },
    evasion:  { label: 'Evasão' },
    health:   { label: 'Vida', note: 'Vida só fica disponível depois da Transcendência.' }
  };

  const STAT_ORDER = ['attack', 'critical', 'block', 'evasion', 'health'];

  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

  function parseNumber(raw) {
    if (typeof raw !== 'string') return NaN;
    let s = raw.trim().replace(/\s/g, '');
    if (!s) return NaN;

    if (s.includes(',')) {
      // pt-BR: dots are thousands, comma is decimal.
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      // "1.000" / "12.500" -> thousands separators.
      s = s.replace(/\./g, '');
    }

    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return Number(s);
  }

  function compute(stat, level, base) {
    const pct = TABLE[stat][level - 1];
    const flat = Boolean(STATS[stat].flat);

    if (flat) {
      const total = Number.isFinite(base) ? base + pct : null;
      return { pct, bonus: pct, total, flat: true };
    }

    const bonus = base * pct / 100;
    return { pct, bonus, total: base + bonus, flat: false };
  }

  // Allow quick logic tests in Node without a DOM.
  if (typeof document === 'undefined') {
    module.exports = { TABLE, STATS, STAT_ORDER, compute, parseNumber };
    return;
  }

  const els = {
    form: document.getElementById('calc-form'),
    chips: Array.from(document.querySelectorAll('.chip')),
    base: document.getElementById('base-value'),
    baseHelp: document.getElementById('base-help'),
    level: document.getElementById('clone-level'),
    levelHelp: document.getElementById('level-help'),
    error: document.getElementById('error'),
    clear: document.getElementById('clear-btn'),
    result: document.getElementById('result'),
    resStatus: document.getElementById('res-status'),
    resLevel: document.getElementById('res-level'),
    resBonus: document.getElementById('res-bonus'),
    resFormula: document.getElementById('res-formula'),
    resTotal: document.getElementById('res-total'),
    resNote: document.getElementById('res-note'),
    table: document.getElementById('clone-table')
  };

  let selectedStat = 'attack';
  let lastResult = null;

  function format(value) {
    return nf.format(value);
  }

  /* ---- build level select ---- */
  for (let level = 1; level <= 15; level += 1) {
    const option = document.createElement('option');
    option.value = String(level);
    option.textContent = `Nível ${level}`;
    els.level.appendChild(option);
  }

  /* ---- build reference table ---- */
  function buildTable() {
    const tbody = els.table.querySelector('tbody');
    const fragment = document.createDocumentFragment();

    for (let level = 1; level <= 15; level += 1) {
      const row = document.createElement('tr');
      row.dataset.level = String(level);

      const th = document.createElement('td');
      th.textContent = String(level);
      th.style.color = 'var(--muted)';
      row.appendChild(th);

      for (const stat of STAT_ORDER) {
        const cell = document.createElement('td');
        cell.dataset.stat = stat;
        cell.textContent = `${TABLE[stat][level - 1]}%`;
        row.appendChild(cell);
      }

      fragment.appendChild(row);
    }

    tbody.appendChild(fragment);
  }

  function highlightTable(stat, level) {
    els.table.querySelectorAll('tr.is-active').forEach((row) => row.classList.remove('is-active'));
    els.table.querySelectorAll('td.is-active').forEach((cell) => cell.classList.remove('is-active'));

    const row = els.table.querySelector(`tbody tr[data-level="${level}"]`);
    if (!row) return;

    row.classList.add('is-active');
    const cell = row.querySelector(`td[data-stat="${stat}"]`);
    if (cell) cell.classList.add('is-active');
  }

  /* ---- ui state ---- */
  function setStat(stat) {
    selectedStat = stat;

    els.chips.forEach((chip) => {
      const active = chip.dataset.stat === stat;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-checked', String(active));
      chip.tabIndex = active ? 0 : -1;
    });

    const isBlock = Boolean(STATS[stat].flat);
    els.base.placeholder = isBlock ? 'Opcional no Bloqueio' : 'Ex.: 1.000';
    els.baseHelp.textContent = isBlock
      ? 'Bloqueio não escala com o base — o bônus é sempre fixo. Este campo é opcional.'
      : 'Use o valor branco do status, sem o bônus verde do clone.';

    updateLevelHelp();

    if (lastResult) {
      const level = Number(els.level.value);
      showResult(stat, level, lastResult.base);
    }
  }

  function updateLevelHelp() {
    const level = Number(els.level.value) || 1;
    const value = TABLE[selectedStat][level - 1];
    els.levelHelp.textContent = STATS[selectedStat].flat
      ? `Bônus perfeito: +${value} pontos percentuais (fixo).`
      : `Bônus perfeito: ${value}% do valor base.`;
  }

  function showError(message) {
    els.error.textContent = message;
    els.error.classList.add('is-visible');
    els.base.classList.add('is-invalid');
    els.base.focus();
  }

  function clearError() {
    els.error.textContent = '';
    els.error.classList.remove('is-visible');
    els.base.classList.remove('is-invalid');
  }

  /* ---- result ---- */
  function showResult(stat, level, base) {
    const result = compute(stat, level, base);
    const statInfo = STATS[stat];
    const filledBase = Number.isFinite(base);

    els.resStatus.textContent = statInfo.label;
    els.resLevel.textContent = `Nível ${level}`;

    if (result.flat) {
      els.resBonus.textContent = `+${format(result.bonus)}%`;
      els.resFormula.textContent = 'Valor fixo · não escala com o base';
      els.resTotal.textContent = filledBase ? format(result.total) : '—';
      els.resNote.hidden = false;
      els.resNote.textContent = `Bloqueio é o único status fixo: no nível 15 o valor é sempre 87%, independente do Digimon.`;
    } else {
      els.resBonus.textContent = `+${format(result.bonus)}`;
      els.resFormula.textContent = `${format(base)} × ${result.pct}%`;
      els.resTotal.textContent = format(result.total);
      els.resNote.hidden = !statInfo.note;
      if (statInfo.note) els.resNote.textContent = statInfo.note;
    }

    els.result.hidden = false;
    els.result.classList.remove('is-shown');
    // Restart the entrance animation.
    void els.result.offsetWidth;
    els.result.classList.add('is-shown');

    highlightTable(stat, level);
    lastResult = { base, stat, level };
  }

  /* ---- events ---- */
  els.chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      setStat(chip.dataset.stat);
      clearError();
    });

    chip.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();

      const current = STAT_ORDER.indexOf(selectedStat);
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      const next = (current + dir + STAT_ORDER.length) % STAT_ORDER.length;
      setStat(STAT_ORDER[next]);
      els.chips.find((c) => c.dataset.stat === STAT_ORDER[next]).focus();
    });
  });

  els.level.addEventListener('change', () => {
    updateLevelHelp();
    clearError();
    if (lastResult) showResult(selectedStat, Number(els.level.value), lastResult.base);
  });

  els.base.addEventListener('input', () => {
    clearError();
    lastResult = null;
  });

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();

    const level = Number(els.level.value) || 1;
    const raw = els.base.value.trim();
    const isBlock = Boolean(STATS[selectedStat].flat);

    updateLevelHelp();

    if (!raw && !isBlock) {
      showError('Digite o valor base do status para calcular.');
      return;
    }

    let base = parseNumber(raw);

    if (raw && !Number.isFinite(base)) {
      showError('Valor inválido. Use apenas números, por exemplo: 1.000 ou 1000.');
      return;
    }

    if (!isBlock && base <= 0) {
      showError('O valor base precisa ser maior que zero.');
      return;
    }

    if (isBlock && !raw) base = NaN;

    showResult(selectedStat, level, base);

    if (navigator.vibrate) navigator.vibrate(8);
  });

  els.clear.addEventListener('click', () => {
    els.form.reset();
    els.level.value = '1';
    els.base.value = '';
    clearError();
    lastResult = null;
    els.result.hidden = true;
    els.result.classList.remove('is-shown');

    setStat('attack');
    updateLevelHelp();

    els.table.querySelectorAll('tr.is-active').forEach((row) => row.classList.remove('is-active'));
    els.table.querySelectorAll('td.is-active').forEach((cell) => cell.classList.remove('is-active'));

    els.base.focus();
  });

  /* ---- init ---- */
  buildTable();
  setStat('attack');
  els.level.value = '1';
  updateLevelHelp();
})();
