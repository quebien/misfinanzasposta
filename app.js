const STORAGE_KEY = 'misfinanzas-posta-data';
let state = loadState();
let currentMonth = new Date();
let monthlyChart, expenseRankChart, incomeRankChart;

init();

function init() {
  bindTabs();
  bindForms();
  bindControls();
  applyTheme(state.theme || 'light');
  document.getElementById('currencySelect').value = state.currency || '$';
  document.getElementById('themeToggle').checked = state.theme === 'dark';
  renderCategories();
  renderMonth();
  renderDashboard();
  renderMonthlyViews();
  renderSearchResults(state.entries);
  renderRanking();
  updatePreviews();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return seedData();
}

function seedData() {
  const today = new Date();
  const entries = [];
  const categories = ['Salario', 'Freelance', 'Alquiler', 'Comida', 'Transporte', 'Ocio', 'Servicios', 'Ahorro'];
  const sample = [
    { type: 'income', description: 'Salario', amount: 3500, date: shiftMonths(today, -2), category: 'Salario', notes: 'Pago mensual' },
    { type: 'income', description: 'Freelance UX', amount: 900, date: shiftMonths(today, -1), category: 'Freelance', notes: 'Proyecto landing' },
    { type: 'income', description: 'Salario', amount: 3600, date: shiftMonths(today, -1), category: 'Salario', notes: 'Aumento 3%' },
    { type: 'income', description: 'Salario', amount: 3600, date: today, category: 'Salario', notes: 'Mes actual' },
    { type: 'income', description: 'Reintegro impuesto', amount: 250, date: today, category: 'Ahorro', notes: 'Devolución' },
    { type: 'expense', description: 'Alquiler', amount: 1200, date: shiftMonths(today, -2), category: 'Alquiler', notes: '' },
    { type: 'expense', description: 'Supermercado', amount: 320, date: shiftMonths(today, -1), category: 'Comida', notes: '' },
    { type: 'expense', description: 'Transporte', amount: 110, date: shiftMonths(today, -1), category: 'Transporte', notes: 'Abono mensual' },
    { type: 'expense', description: 'Streaming', amount: 45, date: today, category: 'Ocio', notes: 'Suscripción' },
    { type: 'expense', description: 'Salud', amount: 210, date: today, category: 'Servicios', notes: 'Prepaga' },
    { type: 'expense', description: 'Supermercado', amount: 340, date: today, category: 'Comida', notes: '' },
    { type: 'expense', description: 'Cena con amigos', amount: 95, date: shiftDays(today, -10), category: 'Ocio', notes: '' }
  ];

  sample.forEach((item, idx) => entries.push({ ...item, id: idx + 1, date: toInputDate(item.date) }));

  const initial = { entries, categories, currency: '$', theme: 'light' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function shiftMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}
function shiftDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
}

function bindForms() {
  setTodayDefaults();
  document.getElementById('expenseForm').addEventListener('submit', e => {
    e.preventDefault();
    addEntriesFromForm(e.target, 'expense');
  });
  document.getElementById('incomeForm').addEventListener('submit', e => {
    e.preventDefault();
    addEntriesFromForm(e.target, 'income');
  });
  document.getElementById('searchForm').addEventListener('submit', handleSearch);
  document.getElementById('rankingMode').addEventListener('change', toggleRankingMode);
  document.getElementById('rankingMonth').addEventListener('change', renderRanking);
  document.getElementById('rankingFrom').addEventListener('change', renderRanking);
  document.getElementById('rankingTo').addEventListener('change', renderRanking);
  ['expenseForm','incomeForm'].forEach(id => {
    const form = document.getElementById(id);
    const repeatSelect = form.querySelector('select[name="repeat"]');
    const label = form.querySelector('label.optional');
    repeatSelect.addEventListener('change', () => {
      label.classList.toggle('hidden', repeatSelect.value === 'none');
    });
  });
}

function bindControls() {
  document.getElementById('prevMonth').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderMonth(); renderDashboard(); };
  document.getElementById('nextMonth').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderMonth(); renderDashboard(); };

  document.getElementById('themeToggle').addEventListener('change', e => {
    const theme = e.target.checked ? 'dark' : 'light';
    applyTheme(theme);
    state.theme = theme;
    saveState();
    refreshUI();
  });

  document.getElementById('currencySelect').addEventListener('change', e => {
    state.currency = e.target.value;
    saveState();
    refreshUI();
  });

  document.getElementById('addCategory').addEventListener('click', () => {
    const input = document.getElementById('newCategory');
    const value = input.value.trim();
    if (!value) return;
    if (!state.categories.includes(value)) {
      state.categories.push(value);
      saveState();
      renderCategories();
      updatePreviews();
    }
    input.value = '';
  });
}

function setTodayDefaults() {
  const today = toInputDate(new Date());
  document.querySelectorAll('input[type="date"]').forEach(input => { if (!input.value) input.value = today; });
  document.getElementById('rankingMonth').value = today.slice(0,7);
}

function addEntriesFromForm(form, type) {
  const data = new FormData(form);
  const description = data.get('description').trim();
  const amount = Number(data.get('amount'));
  const date = data.get('date');
  const category = data.get('category');
  const repeat = data.get('repeat');
  const repeatCount = Math.max(1, Number(data.get('repeatCount') || 1));
  const notes = data.get('notes').trim();

  if (!description || !amount || !date || !category) return;

  const entriesToAdd = [];
  const baseDate = new Date(date + 'T00:00:00');

  if (repeat === 'none') {
    entriesToAdd.push(createEntry({ type, description, amount, date, category, notes }));
  } else if (repeat === 'monthly') {
    for (let i = 0; i < repeatCount; i++) {
      const targetDate = shiftMonths(baseDate, i);
      entriesToAdd.push(createEntry({ type, description, amount, date: toInputDate(targetDate), category, notes: annotate(notes, `Repetición ${i+1}/${repeatCount}`) }));
    }
  } else if (repeat === 'installments') {
    const installmentAmount = +(amount / repeatCount).toFixed(2);
    for (let i = 0; i < repeatCount; i++) {
      const targetDate = shiftMonths(baseDate, i);
      entriesToAdd.push(createEntry({ type, description: `${description} (cuota ${i+1}/${repeatCount})`, amount: installmentAmount, date: toInputDate(targetDate), category, notes: annotate(notes, 'Cuotas') }));
    }
  }

  state.entries.push(...entriesToAdd);
  saveState();
  form.reset();
  setTodayDefaults();
  refreshUI();
}

function createEntry({ type, description, amount, date, category, notes }) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
    type,
    description,
    amount: Number(amount),
    date,
    category,
    notes
  };
}

function annotate(notes, extra) {
  return notes ? `${notes} · ${extra}` : extra;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshUI() {
  renderDashboard();
  renderMonthlyViews();
  renderSearchResults(state.entries);
  renderRanking();
  updatePreviews();
}

function renderCategories() {
  const selects = [
    document.querySelector('#expenseForm select[name="category"]'),
    document.querySelector('#incomeForm select[name="category"]'),
    document.querySelector('#searchForm select[name="category"]')
  ];
  selects.forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = '';
    if (select.name === 'category' && select.closest('#search')) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Todas';
      select.appendChild(opt);
    }
    state.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (cat === current) option.selected = true;
      select.appendChild(option);
    });
  });
  document.getElementById('categoryList').textContent = state.categories.join(', ');
}

function renderMonth() {
  const formatter = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
  document.getElementById('currentMonth').textContent = formatter.format(currentMonth);
}

function renderDashboard() {
  const monthEntries = state.entries.filter(e => isSameMonth(e.date, currentMonth));
  const income = sumByType(monthEntries, 'income');
  const expense = sumByType(monthEntries, 'expense');
  const balance = income - expense;

  const currency = state.currency || '$';
  document.getElementById('monthIncome').textContent = formatCurrency(income, currency);
  document.getElementById('monthExpense').textContent = formatCurrency(expense, currency);
  const balanceEl = document.getElementById('monthBalance');
  balanceEl.textContent = formatCurrency(balance, currency);
  balanceEl.classList.toggle('negative', balance < 0);

  const recentList = document.getElementById('recentList');
  recentList.innerHTML = '';
  const sorted = [...state.entries].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  sorted.forEach(entry => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${entry.description}</strong><br><small>${formatDate(entry.date)} · ${entry.category}</small>`;
    const amount = document.createElement('span');
    amount.className = 'amount ' + (entry.type === 'expense' ? 'negative' : 'positive');
    amount.textContent = (entry.type === 'expense' ? '-' : '+') + formatCurrency(entry.amount, currency);
    li.append(left, amount);
    recentList.appendChild(li);
  });
}

function renderMonthlyViews() {
  const grouped = groupByMonth(state.entries);
  const rows = Object.entries(grouped).sort((a,b) => new Date(b[0]) - new Date(a[0]));
  const tbody = document.getElementById('monthlyTable');
  tbody.innerHTML = '';
  const labels = [];
  const incomeData = [];
  const expenseData = [];
  const currency = state.currency || '$';

  rows.forEach(([month, entries]) => {
    const income = sumByType(entries, 'income');
    const expense = sumByType(entries, 'expense');
    const balance = income - expense;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatMonthLabel(month)}</td><td>${formatCurrency(income, currency)}</td><td>${formatCurrency(expense, currency)}</td><td class="${balance<0?'amount negative':''}">${formatCurrency(balance, currency)}</td>`;
    tbody.appendChild(tr);
    labels.push(formatMonthLabel(month));
    incomeData.push(income);
    expenseData.push(expense);
  });

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.reverse(),
      datasets: [
        { label: 'Ingresos', data: incomeData.reverse(), borderColor: '#22d3a6', backgroundColor: 'rgba(34,211,166,0.15)', tension: 0.3, fill: true },
        { label: 'Gastos', data: expenseData.reverse(), borderColor: '#d7263d', backgroundColor: 'rgba(215,38,61,0.15)', tension: 0.3, fill: true }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text') } } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } }
      }
    }
  });
}

function handleSearch(e) {
  e.preventDefault();
  const data = new FormData(e.target);
  const text = data.get('text').toLowerCase();
  const from = data.get('from');
  const to = data.get('to');
  const category = data.get('category');

  const results = state.entries.filter(entry => {
    const matchText = !text || entry.description.toLowerCase().includes(text) || (entry.notes || '').toLowerCase().includes(text);
    const matchCat = !category || entry.category === category;
    const date = entry.date;
    const afterFrom = !from || date >= from;
    const beforeTo = !to || date <= to;
    return matchText && matchCat && afterFrom && beforeTo;
  });

  renderSearchResults(results);
}

function renderSearchResults(list) {
  const tbody = document.getElementById('searchResults');
  tbody.innerHTML = '';
  const currency = state.currency || '$';
  list.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(entry => {
    const tr = document.createElement('tr');
    const amountClass = entry.type === 'expense' ? 'amount negative' : 'amount positive';
    tr.innerHTML = `<td>${formatDate(entry.date)}</td><td>${entry.type === 'expense' ? 'Gasto' : 'Ingreso'}</td><td>${entry.description}</td><td>${entry.category}</td><td class="${amountClass}">${(entry.type === 'expense' ? '-' : '+') + formatCurrency(entry.amount, currency)}</td><td>${entry.notes || ''}</td>`;
    tbody.appendChild(tr);
  });
}

function toggleRankingMode() {
  const mode = document.getElementById('rankingMode').value;
  document.getElementById('monthPickerLabel').classList.toggle('hidden', mode !== 'month');
  document.getElementById('rangeFromLabel').classList.toggle('hidden', mode !== 'range');
  document.getElementById('rangeToLabel').classList.toggle('hidden', mode !== 'range');
  renderRanking();
}

function renderRanking() {
  const mode = document.getElementById('rankingMode').value;
  let filtered = [];
  if (mode === 'month') {
    const month = document.getElementById('rankingMonth').value;
    if (!month) return;
    filtered = state.entries.filter(e => e.date.startsWith(month));
  } else {
    const from = document.getElementById('rankingFrom').value;
    const to = document.getElementById('rankingTo').value;
    filtered = state.entries.filter(e => (!from || e.date >= from) && (!to || e.date <= to));
  }

  const expenseData = sumByCategory(filtered.filter(e => e.type === 'expense'));
  const incomeData = sumByCategory(filtered.filter(e => e.type === 'income'));
  drawRankChart('expenseRank', expenseData, 'Gastos', '#d7263d', 'expense');
  drawRankChart('incomeRank', incomeData, 'Ingresos', '#22d3a6', 'income');
}

function drawRankChart(canvasId, dataObj, label, color, kind) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (kind === 'expense' && expenseRankChart) expenseRankChart.destroy();
  if (kind === 'income' && incomeRankChart) incomeRankChart.destroy();
  const labels = Object.keys(dataObj);
  const values = Object.values(dataObj);
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } }
      }
    }
  });
  if (kind === 'expense') expenseRankChart = chart; else incomeRankChart = chart;
}

function sumByCategory(entries) {
  return entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
}

function groupByMonth(entries) {
  return entries.reduce((acc, entry) => {
    const month = entry.date.slice(0,7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {});
}

function isSameMonth(dateStr, dateObj) {
  const target = dateStr.slice(0,7);
  const compare = toInputDate(new Date(dateObj)).slice(0,7);
  return target === compare;
}

function sumByType(list, type) {
  return list.filter(e => e.type === type).reduce((acc, e) => acc + Number(e.amount), 0);
}

function formatCurrency(value, currency) {
  return `${currency}${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function toInputDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split('-');
  return new Date(`${monthStr}-01T00:00:00`).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
}

function updatePreviews() {
  document.getElementById('currencyPreview').textContent = state.currency || '$';
  document.getElementById('themePreview').textContent = state.theme === 'dark' ? 'Oscuro' : 'Claro';
}
