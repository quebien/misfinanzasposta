const STORAGE_KEY = 'misfinanzas-posta-data';
const APP_VERSION = '1.3.0';
const DEFAULT_CURRENCY = '$';

function normalizeEntry(entry) {
  return {
    ...entry,
    batchId: entry.batchId || ''
  };
}

let state = loadState();
let currentMonth = new Date();
let monthlyChart, expenseRankChart, incomeRankChart;
let selectedEntryId = null;

init();

function init() {
  bindTabs();
  bindForms();
  bindControls();
  applyTheme(state.theme || 'light');
  document.getElementById('themeToggle').checked = state.theme === 'dark';
  document.getElementById('versionBadge').textContent = `v${APP_VERSION}`;
  document.getElementById('footerText').textContent = `Mis Finanzas Posta versión ${APP_VERSION} · Desarrollado por Andrés B.M. Carizza e IA`;
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
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalizeEntry) : [],
      incomeCategories: parsed.incomeCategories ? [...parsed.incomeCategories] : (parsed.categories ? [...parsed.categories] : []),
      expenseCategories: parsed.expenseCategories ? [...parsed.expenseCategories] : (parsed.categories ? [...parsed.categories] : []),
      currency: DEFAULT_CURRENCY
    };
  }
  return seedData();
}

function seedData() {
  const today = new Date();
  const entries = [];
  const incomeCategories = ['Salario', 'Freelance'];
  const expenseCategories = ['Alquiler', 'Comida', 'Transporte', 'Ocio', 'Servicios'];
  const sample = [
    { type: 'income', description: 'Salario', amount: 3500, date: shiftMonths(today, -2), category: 'Salario', notes: 'Pago mensual' },
    { type: 'income', description: 'Freelance UX', amount: 900, date: shiftMonths(today, -1), category: 'Freelance', notes: 'Proyecto landing' },
    { type: 'income', description: 'Salario', amount: 3600, date: shiftMonths(today, -1), category: 'Salario', notes: 'Aumento 3%' },
    { type: 'income', description: 'Salario', amount: 3600, date: today, category: 'Salario', notes: 'Mes actual' },
    { type: 'income', description: 'Reintegro impuesto', amount: 250, date: today, category: 'Freelance', notes: 'Devolución' },
    { type: 'expense', description: 'Alquiler', amount: 1200, date: shiftMonths(today, -2), category: 'Alquiler', notes: '' },
    { type: 'expense', description: 'Supermercado', amount: 320, date: shiftMonths(today, -1), category: 'Comida', notes: '' },
    { type: 'expense', description: 'Transporte', amount: 110, date: shiftMonths(today, -1), category: 'Transporte', notes: 'Abono mensual' },
    { type: 'expense', description: 'Streaming', amount: 45, date: today, category: 'Ocio', notes: 'Suscripción' },
    { type: 'expense', description: 'Salud', amount: 210, date: today, category: 'Servicios', notes: 'Prepaga' },
    { type: 'expense', description: 'Supermercado', amount: 340, date: today, category: 'Comida', notes: '' },
    { type: 'expense', description: 'Cena con amigos', amount: 95, date: shiftDays(today, -10), category: 'Ocio', notes: '' }
  ];

  sample.forEach((item, idx) => entries.push({ ...item, id: idx + 1, date: toInputDate(item.date) }));

  const initial = { entries: entries.map(normalizeEntry), incomeCategories, expenseCategories, currency: DEFAULT_CURRENCY, theme: 'light' };
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
      if (btn.dataset.target === 'dashboard') {
        renderMonth();
        renderDashboard();
      }
      if (btn.dataset.target === 'search') {
        focusSearchInput();
      }
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
  document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
  document.getElementById('deleteEntry').addEventListener('click', handleDeleteEntry);
  document.getElementById('deleteBatch').addEventListener('click', handleDeleteBatch);
  document.querySelector('#editForm select[name="type"]').addEventListener('change', e => updateEditCategoryOptions(e.target.value));
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

  document.getElementById('addIncomeCategory').addEventListener('click', () => handleCategoryAdd('income'));
  document.getElementById('addExpenseCategory').addEventListener('click', () => handleCategoryAdd('expense'));
  document.getElementById('incomeCategoryList').addEventListener('click', handleCategoryAction);
  document.getElementById('expenseCategoryList').addEventListener('click', handleCategoryAction);
  document.getElementById('clearSearchText').addEventListener('click', clearSearchText);
  document.getElementById('resetAll').addEventListener('click', () => handleReset('all'));
  document.getElementById('resetExpenses').addEventListener('click', () => handleReset('expense'));
  document.getElementById('resetIncomes').addEventListener('click', () => handleReset('income'));
  document.getElementById('resetExpenseCategories').addEventListener('click', () => handleReset('expenseCategories'));
  document.getElementById('resetIncomeCategories').addEventListener('click', () => handleReset('incomeCategories'));
  document.getElementById('downloadBackup').addEventListener('click', downloadBackup);
  document.getElementById('restoreFile').addEventListener('change', restoreFromFile);
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
  const batch = (data.get('batch') || '').trim();
  const notes = data.get('notes').trim();

  if (!description || !amount || !date || !category) {
    showMessage('Completá todos los campos para guardar el movimiento.', 'error');
    return;
  }

  const validCategories = type === 'income' ? state.incomeCategories : state.expenseCategories;
  if (!validCategories.includes(category)) {
    showMessage('Seleccioná una categoría válida.', 'error');
    return;
  }

  const entriesToAdd = [];
  const baseDate = new Date(date + 'T00:00:00');
  const batchId = batch || (repeat !== 'none' ? generateBatchId() : '');

  if (repeat === 'none') {
    entriesToAdd.push(createEntry({ type, description, amount, date, category, notes, batchId }));
  } else if (repeat === 'monthly') {
    for (let i = 0; i < repeatCount; i++) {
      const targetDate = shiftMonths(baseDate, i);
      entriesToAdd.push(createEntry({ type, description, amount, date: toInputDate(targetDate), category, notes: annotate(notes, `Repetición ${i+1}/${repeatCount}`), batchId }));
    }
  } else if (repeat === 'installments') {
    const installmentAmount = +(amount / repeatCount).toFixed(2);
    for (let i = 0; i < repeatCount; i++) {
      const targetDate = shiftMonths(baseDate, i);
      entriesToAdd.push(createEntry({ type, description: `${description} (cuota ${i+1}/${repeatCount})`, amount: installmentAmount, date: toInputDate(targetDate), category, notes: annotate(notes, 'Cuotas'), batchId }));
    }
  }

  state.entries.push(...entriesToAdd);
  saveState();
  form.reset();
  setTodayDefaults();
  const categorySelect = form.querySelector('select[name="category"]');
  if (categorySelect) categorySelect.value = '';
  refreshUI();
  showMessage(entriesToAdd.length > 1 ? `${entriesToAdd.length} movimientos guardados con éxito.` : 'Movimiento guardado con éxito.', 'success');
}

function createEntry({ type, description, amount, date, category, notes, batchId = '' }) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
    type,
    description,
    amount: Number(amount),
    date,
    category,
    notes,
    batchId
  };
}

function annotate(notes, extra) {
  return notes ? `${notes} · ${extra}` : extra;
}

function generateBatchId() {
  return crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}`;
}

function showMessage(text, type = 'success') {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = `toast ${type}`;
  box.classList.remove('hidden');
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => box.classList.add('hidden'), 3500);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshUI() {
  renderCategories();
  renderDashboard();
  renderMonthlyViews();
  renderSearchResults(state.entries);
  renderRanking();
  updatePreviews();
}

function renderCategories() {
  const expenseSelect = document.querySelector('#expenseForm select[name="category"]');
  const incomeSelect = document.querySelector('#incomeForm select[name="category"]');
  const searchSelect = document.querySelector('#searchForm select[name="category"]');

  populateCategorySelect(incomeSelect, state.incomeCategories, true);
  populateCategorySelect(expenseSelect, state.expenseCategories, true);

  if (searchSelect) {
    const current = searchSelect.value;
    searchSelect.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'Todas';
    searchSelect.appendChild(allOpt);
    state.incomeCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === current) opt.selected = true;
      searchSelect.appendChild(opt);
    });
    const divider = document.createElement('option');
    divider.textContent = ',-------,';
    divider.disabled = true;
    searchSelect.appendChild(divider);
    state.expenseCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === current) opt.selected = true;
      searchSelect.appendChild(opt);
    });
  }

  renderCategoryChips('income');
  renderCategoryChips('expense');
}

function populateCategorySelect(select, categories, includePlaceholder = false, selectedValue) {
  if (!select) return;
  const current = selectedValue !== undefined ? selectedValue : select.value;
  select.innerHTML = '';
  if (includePlaceholder) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Seleccioná una categoría';
    placeholder.disabled = true;
    placeholder.selected = !current;
    select.appendChild(placeholder);
  }
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === current) option.selected = true;
    select.appendChild(option);
  });
  if (current && !categories.includes(current)) {
    const missing = document.createElement('option');
    missing.value = current;
    missing.textContent = `${current} (eliminada)`;
    select.appendChild(missing);
    missing.selected = true;
  }
}

function renderCategoryChips(type) {
  const container = document.getElementById(type === 'income' ? 'incomeCategoryList' : 'expenseCategoryList');
  const categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
  if (!container) return;
  container.innerHTML = '';
  categories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${cat}</span>`;
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.dataset.category = cat;
    editBtn.dataset.type = type;
    editBtn.dataset.action = 'edit';
    editBtn.className = 'ghost';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Borrar';
    delBtn.dataset.category = cat;
    delBtn.dataset.type = type;
    delBtn.dataset.action = 'delete';
    delBtn.className = 'ghost danger';
    chip.append(editBtn, delBtn);
    container.appendChild(chip);
  });
}

function handleCategoryAdd(type) {
  const input = document.getElementById(type === 'income' ? 'newIncomeCategory' : 'newExpenseCategory');
  const value = (input.value || '').trim();
  if (!value) {
    showMessage('Ingresá un nombre de categoría.', 'error');
    return;
  }
  const list = type === 'income' ? state.incomeCategories : state.expenseCategories;
  if (list.includes(value)) {
    showMessage('La categoría ya existe.', 'error');
    return;
  }
  list.push(value);
  saveState();
  input.value = '';
  refreshUI();
  showMessage('Categoría agregada con éxito.', 'success');
}

function handleCategoryAction(event) {
  const btn = event.target.closest('button');
  if (!btn) return;
  const { category, type, action } = btn.dataset;
  if (!category || !type) return;
  const list = type === 'income' ? state.incomeCategories : state.expenseCategories;
  if (action === 'edit') {
    const updated = prompt('Nuevo nombre de la categoría', category);
    if (!updated) return;
    const trimmed = updated.trim();
    if (!trimmed) return;
    if (list.includes(trimmed) && trimmed !== category) {
      showMessage('Ya existe otra categoría con ese nombre.', 'error');
      return;
    }
    const idx = list.indexOf(category);
    if (idx >= 0) list[idx] = trimmed;
    state.entries.filter(e => e.type === (type === 'income' ? 'income' : 'expense') && e.category === category)
      .forEach(e => e.category = trimmed);
    saveState();
    refreshUI();
    showMessage('Categoría actualizada sin dejar datos huérfanos.', 'success');
  }
  if (action === 'delete') {
    const used = state.entries.filter(e => e.type === (type === 'income' ? 'income' : 'expense') && e.category === category);
    if (used.length) {
      showMessage(`No se puede borrar, hay ${used.length} movimientos con esta categoría.`, 'error');
      return;
    }
    const idx = list.indexOf(category);
    if (idx >= 0) list.splice(idx,1);
    saveState();
    refreshUI();
    showMessage('Categoría eliminada.', 'success');
  }
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

  const currency = DEFAULT_CURRENCY;
  document.getElementById('monthIncome').textContent = formatCurrency(income, currency);
  document.getElementById('monthExpense').textContent = formatCurrency(expense, currency);
  const balanceEl = document.getElementById('monthBalance');
  balanceEl.textContent = formatCurrency(balance, currency);
  balanceEl.classList.toggle('negative', balance < 0);

  const recentList = document.getElementById('recentList');
  recentList.innerHTML = '';
  const sorted = [...state.entries].sort((a,b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(entry => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${entry.description}</strong><br><small>${formatDate(entry.date)} · ${entry.category}</small>`;
    const amount = document.createElement('span');
    amount.className = 'amount ' + (entry.type === 'expense' ? 'negative' : 'positive');
    amount.textContent = (entry.type === 'expense' ? '-' : '+') + formatCurrency(entry.amount, currency);
    li.append(left, amount);
    li.addEventListener('click', () => openEntryFromShortcut(entry.id));
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
  const currency = DEFAULT_CURRENCY;

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
  const currency = DEFAULT_CURRENCY;
  const fragment = document.createDocumentFragment();
  list.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(entry => {
    const tr = document.createElement('tr');
    tr.dataset.id = entry.id;
    tr.classList.add('clickable-row');
    if (entry.id === selectedEntryId) tr.classList.add('selected-row');
    const amountClass = entry.type === 'expense' ? 'amount negative' : 'amount positive';
    tr.innerHTML = `<td>${formatDate(entry.date)}</td><td>${entry.type === 'expense' ? 'Gasto' : 'Ingreso'}</td><td>${entry.description}</td><td>${entry.category}</td><td class="${amountClass}">${(entry.type === 'expense' ? '-' : '+') + formatCurrency(entry.amount, currency)}</td><td>${entry.notes || ''}</td>`;
    tr.addEventListener('click', () => openEditor(entry.id));
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

function openEditor(entryId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  selectedEntryId = entryId;
  const form = document.getElementById('editForm');
  form.description.value = entry.description;
  form.amount.value = entry.amount;
  form.date.value = entry.date;
  form.notes.value = entry.notes || '';
  form.batch.value = entry.batchId || '';
  form.type.value = entry.type;
  updateEditCategoryOptions(entry.type, entry.category);
  document.getElementById('editorId').textContent = entryId;
  updateBatchDeleteButton(entry);
  document.getElementById('entryEditor').classList.remove('hidden');
  document.getElementById('entryEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.description.focus();
  highlightSearchRow(entryId);
}

function updateEditCategoryOptions(type, selectedValue) {
  const select = document.querySelector('#editForm select[name="category"]');
  const list = type === 'income' ? state.incomeCategories : state.expenseCategories;
  populateCategorySelect(select, list, true, selectedValue);
  if (!selectedValue) select.value = '';
}

function handleEditSubmit(e) {
  e.preventDefault();
  if (!selectedEntryId) return;
  const form = e.target;
  const data = new FormData(form);
  const description = data.get('description').trim();
  const amount = Number(data.get('amount'));
  const date = data.get('date');
  const category = data.get('category');
  const type = data.get('type');
  const batchId = (data.get('batch') || '').trim();
  const notes = data.get('notes').trim();
  if (!description || !amount || !date || !category || !type) {
    showMessage('Completá todos los campos del registro.', 'error');
    return;
  }
  const list = type === 'income' ? state.incomeCategories : state.expenseCategories;
  if (!list.includes(category)) {
    showMessage('Seleccioná una categoría válida para el tipo elegido.', 'error');
    return;
  }
  const entry = state.entries.find(e => e.id === selectedEntryId);
  if (!entry) return;
  Object.assign(entry, { description, amount: Number(amount), date, category, type, notes, batchId });
  saveState();
  refreshUI();
  openEditor(selectedEntryId);
  showMessage('Registro actualizado.', 'success');
}

function updateBatchDeleteButton(entry) {
  const btn = document.getElementById('deleteBatch');
  if (!btn) return;
  const hasBatch = !!entry.batchId;
  if (!hasBatch) {
    btn.classList.add('hidden');
    btn.dataset.batchId = '';
    return;
  }
  const siblings = state.entries.filter(e => e.batchId === entry.batchId);
  btn.classList.toggle('hidden', !hasBatch);
  btn.dataset.batchId = entry.batchId;
  btn.textContent = siblings.length > 1 ? `Borrar lote (${siblings.length})` : 'Borrar lote';
}

function handleDeleteEntry() {
  if (!selectedEntryId) return;
  if (!confirm('¿Seguro que querés borrar este registro?')) return;
  state.entries = state.entries.filter(e => e.id !== selectedEntryId);
  saveState();
  selectedEntryId = null;
  document.getElementById('entryEditor').classList.add('hidden');
  refreshUI();
  showMessage('Registro eliminado.', 'success');
}

function handleDeleteBatch() {
  const btn = document.getElementById('deleteBatch');
  const batchId = btn?.dataset.batchId;
  if (!batchId) return;
  const related = state.entries.filter(e => e.batchId === batchId);
  if (!related.length) return;
  if (!confirm(`¿Seguro que querés borrar los ${related.length} registros de este lote?`)) return;
  state.entries = state.entries.filter(e => e.batchId !== batchId);
  saveState();
  selectedEntryId = null;
  document.getElementById('entryEditor').classList.add('hidden');
  refreshUI();
  showMessage('Lote eliminado.', 'success');
}

function openEntryFromShortcut(entryId) {
  switchTab('search');
  renderSearchResults(state.entries);
  openEditor(entryId);
}

function switchTab(targetId) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.target === targetId);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === targetId);
  });
  if (targetId === 'search') focusSearchInput();
  if (targetId === 'dashboard') {
    renderMonth();
    renderDashboard();
  }
}

function focusSearchInput() {
  const input = document.querySelector('#searchForm input[name="text"]');
  if (input) input.focus();
}

function highlightSearchRow(entryId) {
  document.querySelectorAll('#searchResults tr').forEach(tr => {
    tr.classList.toggle('selected-row', tr.dataset.id === String(entryId));
  });
  const row = document.querySelector(`#searchResults tr[data-id="${entryId}"]`);
  if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearSearchText() {
  const input = document.querySelector('#searchForm input[name="text"]');
  if (!input) return;
  input.value = '';
  input.focus();
  renderSearchResults(state.entries);
}

function handleReset(type) {
  const prompts = {
    all: '¿Seguro que querés borrar TODOS los movimientos y categorías? Esta acción no se puede deshacer.',
    expense: '¿Seguro que querés borrar solo los gastos? Esta acción no se puede deshacer.',
    income: '¿Seguro que querés borrar solo los ingresos? Esta acción no se puede deshacer.',
    expenseCategories: '¿Seguro que querés borrar todas las categorías de gastos?',
    incomeCategories: '¿Seguro que querés borrar todas las categorías de ingresos?'
  };
  if (!confirm(prompts[type])) return;
  if (type === 'all') {
    state.entries = [];
    state.incomeCategories = [];
    state.expenseCategories = [];
  } else if (type === 'expense') {
    state.entries = state.entries.filter(e => e.type !== type);
  } else if (type === 'income') {
    state.entries = state.entries.filter(e => e.type !== type);
  } else if (type === 'expenseCategories') {
    state.expenseCategories = [];
  } else if (type === 'incomeCategories') {
    state.incomeCategories = [];
  }
  saveState();
  selectedEntryId = null;
  document.getElementById('entryEditor').classList.add('hidden');
  refreshUI();
  showMessage('Datos limpiados.', 'success');
}

function getBackupPayload() {
  return {
    ...state,
    entries: state.entries.map(normalizeEntry),
    version: APP_VERSION
  };
}

function downloadBackup() {
  const payload = getBackupPayload();
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `misfinanzas-backup-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  const preview = document.getElementById('backupPreview');
  if (preview) preview.value = data;
  showMessage('Backup descargado.', 'success');
}

function restoreFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.entries)) throw new Error('Backup inválido');
      state = {
        ...state,
        ...parsed,
        entries: parsed.entries.map(normalizeEntry),
        incomeCategories: parsed.incomeCategories ? [...parsed.incomeCategories] : [],
        expenseCategories: parsed.expenseCategories ? [...parsed.expenseCategories] : [],
        currency: parsed.currency || DEFAULT_CURRENCY,
        theme: parsed.theme || 'light'
      };
      saveState();
      applyTheme(state.theme);
      document.getElementById('themeToggle').checked = state.theme === 'dark';
      const preview = document.getElementById('backupPreview');
      if (preview) preview.value = JSON.stringify(parsed, null, 2);
      selectedEntryId = null;
      document.getElementById('entryEditor').classList.add('hidden');
      refreshUI();
      showMessage('Backup restaurado con éxito.', 'success');
    } catch (err) {
      console.error(err);
      showMessage('No se pudo restaurar el backup.', 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
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

function formatCurrency(value, currency = DEFAULT_CURRENCY) {
  return `${currency}${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
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
  document.getElementById('themePreview').textContent = state.theme === 'dark' ? 'Oscuro' : 'Claro';
}
