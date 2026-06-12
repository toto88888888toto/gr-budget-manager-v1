// ── TOAST & CONFIRM ──────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.style.cssText = `pointer-events:auto;background:#1e1e2e;border:1px solid ${colors[type] || colors.info}44;color:#e2e8f0;padding:12px 18px;border-radius:10px;font-size:14px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.4);min-width:240px;max-width:360px;opacity:0;transform:translateX(20px);transition:all 0.25s ease;`;
  const icon = document.createElement('span');
  icon.style.cssText = `width:22px;height:22px;border-radius:50%;background:${colors[type] || colors.info};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;`;
  icon.textContent = icons[type] || icons.info;
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    if (!modal || !okBtn || !cancelBtn) return resolve(window.confirm(message));
    msg.textContent = message;
    modal.style.display = 'flex';
    // Clone buttons to remove all previous listeners
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    const cleanup = (result) => {
      modal.style.display = 'none';
      resolve(result);
    };
    newOk.addEventListener('click', () => cleanup(true));
    newCancel.addEventListener('click', () => cleanup(false));
  });
}

(async function () {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = '/login.html';
  }
})();

const $ = (id) => document.getElementById(id);

// Forms
const projectForm = $("projectForm");
const transactionForm = $("transactionForm");

// Project form
const editId = $("editId");
const keepLogoPath = $("keepLogoPath");
const projectNo = $("projectNo");
const projectCode = $("projectCode");
const projectName = $("projectName");
const category = $("category");
const owner = $("owner");
const startDate = $("startDate");
const endDate = $("endDate");
const remark = $("remark");
const companyLogo = $("companyLogo");
const logoPreview = $("logoPreview");

const contractCurrency = $("contractCurrency");
const totalPrice = $("totalPrice");
const totalPriceRaw = $("totalPriceRaw");
const vatPercent = $("vatPercent");
const totalPriceWithVatDisplay = $("totalPriceWithVatDisplay");

// Transaction form
const selectedProjectId = $("selectedProjectId");
const selectedProjectText = $("selectedProjectText");

const txType = $("txType");
const txCategory = $("txCategory");
const txDescription = $("txDescription");
const txCurrency = $("txCurrency");
const txAmount = $("txAmount");
const txAmountRaw = $("txAmountRaw");
const txDate = $("txDate");
const billFile = $("billFile");

// Buttons
const saveBtn = $("saveBtn");
const resetBtn = $("resetBtn");
const addTxBtn = $("addTxBtn");
const clearTxBtn = $("clearTxBtn");
const refreshBtn = $("refreshBtn");
const downloadExcelBtn = $("downloadExcelBtn");
const logoutBtn = $("logoutBtn");

// List / filters
const projectList = $("projectList");
const searchInput = $("searchInput");
const filterCategory = $("filterCategory");
const filterOwner = $("filterOwner");
const sortBy = $("sortBy");

// KPI
const kpiProjects = $("kpiProjects");
const kpiIncome = $("kpiIncome");
const kpiInvestment = $("kpiInvestment");
const kpiExpense = $("kpiExpense");
const kpiProfit = $("kpiProfit");

// Datalists
const projectCategoryList = $("projectCategoryList");
const txCategoryList = $("txCategoryList");
const txDescriptionList = $("txDescriptionList");
const filterCategoryList = $("filterCategoryList");
const filterOwnerList = $("filterOwnerList");

// Project modal
const projectModal = $("projectModal");
const projectModalBackdrop = $("projectModalBackdrop");
const closeProjectModalBtn = $("closeProjectModal");
const editProjectBtn = $("editProjectBtn");
const openAddTxFromDetailBtn = $("openAddTxFromDetailBtn");
const deleteProjectBtn = $("deleteProjectBtn");
const projectModalHistory = $("projectModalHistory");
const detailHistoryCount = $("detailHistoryCount");

const detailProjectCode = $("detailProjectCode");
const detailProjectCategory = $("detailProjectCategory");
const detailProjectOwner = $("detailProjectOwner");
const detailProjectName = $("detailProjectName");
const detailProjectRemark = $("detailProjectRemark");
const detailStartDate = $("detailStartDate");
const detailEndDate = $("detailEndDate");
const detailCurrency = $("detailCurrency");
const detailTransactionCount = $("detailTransactionCount");
const projectDetailLogo = $("projectDetailLogo");

const detailTotalPrice = $("detailTotalPrice");
const detailVatPercent = $("detailVatPercent");
const detailTotalWithVat = $("detailTotalWithVat");
const detailActualCost = $("detailActualCost");
const detailEstimatedProfit = $("detailEstimatedProfit");
const detailBalance = $("detailBalance");
const detailIncome = $("detailIncome");
const detailInvestment = $("detailInvestment");
const detailExpense = $("detailExpense");

// Tx modal
const txModal = $("txModal");
const txModalBackdrop = $("txModalBackdrop");
const closeTxModalBtn = $("closeTxModal");
const txModalHistory = $("txModalHistory");
const txHistoryCount = $("txHistoryCount");

let allProjects = [];
let currentProjectId = "";

const DEFAULT_PROJECT_CATEGORIES = ["Administrative expenses"];
const DEFAULT_TX_CATEGORIES = ["Administrative expenses"];

// ── PROJECT STATUS ─────────────────────────────────────
const PROJECT_STATUSES = [
  { value: "draft",     label: "Draft" },
  { value: "active",    label: "Active" },
  { value: "on_hold",   label: "On Hold" },
  { value: "done",      label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

function normalizeStatus(value) {
  const v = String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return PROJECT_STATUSES.find((s) => s.value === v) ? v : "draft";
}

function getStatusLabel(value) {
  const s = PROJECT_STATUSES.find((x) => x.value === normalizeStatus(value));
  return s ? s.label : "Draft";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strict number parser.
 * Keeps Excel data untouched.
 * Frontend only converts display/calculation values safely.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value).trim();
  if (!raw) return 0;

  // remove commas first
  const cleaned = raw.replace(/,/g, "");

  // direct numeric string
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // fallback: pick first numeric fragment only
  // example bad value: "0 2026-03-17T09:48:36.429Z" -> 0
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;

  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function getCurrencySymbol(currency) {
  const map = {
    LAK: "₭",
    THB: "฿",
    USD: "$",
    CNY: "¥",
  };
  return map[String(currency || "").toUpperCase()] || "";
}

function formatDisplayNumber(value) {
  const num = toNumber(value);
  const decimals = Number.isInteger(num) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatMoney(value, currency = "") {
  const code = String(currency || "").toUpperCase();
  const symbol = getCurrencySymbol(code);
  const text = formatDisplayNumber(value);
  if (symbol) return `${symbol}${text}`;
  return `${text}${code ? ` ${code}` : ""}`;
}

function formatDateRange(start, end) {
  const startText = start || "-";
  const endText = end || "-";
  return `${escapeHtml(startText)} - ${escapeHtml(endText)}`;
}

function setButtonLoading(button, isLoading, text, loadingText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : text;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

function buildDatalist(listEl, values, pinnedValues = []) {
  const uniqueValues = [...new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))];
  const pinned = pinnedValues
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter((v) => uniqueValues.includes(v));

  const normal = uniqueValues
    .filter((value) => !pinned.includes(value))
    .sort((a, b) => a.localeCompare(b));

  const finalValues = [...pinned, ...normal];

  listEl.innerHTML = finalValues
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

// ── CUSTOM AUTOCOMPLETE ───────────────────────────────
let _acCategories = [];
let _acDescriptions = [];

function setupAutocomplete(inputEl, getValues) {
  if (!inputEl) return;
  // Wrap in relative div if not already
  const parent = inputEl.parentElement;
  if (!parent.classList.contains('autocomplete-wrap')) {
    parent.classList.add('autocomplete-wrap');
  }

  let listEl = null;

  function showList(items) {
    removeList();
    if (!items.length) return;
    listEl = document.createElement('div');
    listEl.className = 'autocomplete-list';
    items.forEach((val, i) => {
      const item = document.createElement('div');
      item.className = 'ac-item';
      item.textContent = val;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        inputEl.value = val;
        inputEl.dispatchEvent(new Event('input'));
        removeList();
      });
      listEl.appendChild(item);
    });
    parent.appendChild(listEl);
  }

  function removeList() {
    if (listEl) { listEl.remove(); listEl = null; }
  }

  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim().toLowerCase();
    const all = getValues();
    const matches = q
      ? all.filter(v => v.toLowerCase().includes(q) && v.toLowerCase() !== q)
      : all.slice(0, 8);
    showList(matches.slice(0, 10));
  });

  inputEl.addEventListener('focus', () => {
    const q = inputEl.value.trim().toLowerCase();
    const all = getValues();
    const matches = q
      ? all.filter(v => v.toLowerCase().includes(q))
      : all.slice(0, 8);
    showList(matches.slice(0, 10));
  });

  inputEl.addEventListener('blur', () => setTimeout(removeList, 150));
}

function initAutocompletes() {
  const catInputs = [
    document.getElementById('txCategory'),
    document.getElementById('editTxCategory')
  ];
  const descInputs = [
    document.getElementById('txDescription'),
    document.getElementById('editTxDescription')
  ];
  catInputs.forEach(el => setupAutocomplete(el, () => _acCategories));
  descInputs.forEach(el => setupAutocomplete(el, () => _acDescriptions));
}

function refreshDatalists(projects) {
  const projectCategories = [
    ...DEFAULT_PROJECT_CATEGORIES,
    ...projects.map((item) => item.category).filter(Boolean),
  ];

  const owners = [...new Set(projects.map((item) => item.owner).filter(Boolean))];

  const txCategories = [
    ...DEFAULT_TX_CATEGORIES,
    ...projects
      .flatMap((item) => (item.transactions || []).map((tx) => tx.category))
      .filter(Boolean),
  ];

  const txDescriptions = projects
    .flatMap((item) => (item.transactions || []).map((tx) => tx.description))
    .filter(Boolean);

  buildDatalist(projectCategoryList, projectCategories, DEFAULT_PROJECT_CATEGORIES);
  buildDatalist(filterCategoryList, projectCategories, DEFAULT_PROJECT_CATEGORIES);
  buildDatalist(filterOwnerList, owners);
  buildDatalist(txCategoryList, txCategories, DEFAULT_TX_CATEGORIES);
  buildDatalist(txDescriptionList, txDescriptions);

  // Update globals for custom autocomplete
  _acCategories = [...new Set([
    ...DEFAULT_TX_CATEGORIES,
    ...projects.flatMap(p => (p.transactions || []).map(tx => tx.category)).filter(Boolean)
  ])];
  _acDescriptions = [...new Set(
    projects.flatMap(p => (p.transactions || []).map(tx => tx.description)).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function calcTotalWithVat(total, vat) {
  const t = toNumber(total);
  const v = toNumber(vat);
  return t + (t * v) / 100;
}

/**
 * Recalculate all project summary values safely on frontend.
 * We do NOT trust broken precomputed fields if backend returns mixed text.
 */
function buildProjectSummary(project) {
  const currency = project?.contractCurrency || "LAK";
  const safeVatPercent = toNumber(project?.vatPercent);
  const safeTotalPrice = toNumber(project?.totalPrice);

  const transactions = Array.isArray(project?.transactions) ? project.transactions : [];

  let income = 0;
  let investment = 0;
  let expense = 0;

  for (const tx of transactions) {
    const amount = toNumber(tx?.amount);
    if (tx?.type === "income") income += amount;
    else if (tx?.type === "investment") investment += amount;
    else if (tx?.type === "expense") expense += amount;
  }

  const actualCost = investment + expense;
  const totalPriceWithVat = calcTotalWithVat(safeTotalPrice, safeVatPercent);
  const vatAmount = totalPriceWithVat - safeTotalPrice;
  const estimatedProfit = income - actualCost - vatAmount;
  const balance = income - actualCost;

  return {
    currency,
    totalPrice: safeTotalPrice,
    vatPercent: safeVatPercent,
    totalPriceWithVat,
    actualCost,
    estimatedProfit,
    balance,
    totals: {
      income,
      investment,
      expense,
    },
    transactionCount: transactions.length,
  };
}

function normalizeTransaction(tx) {
  return {
    ...tx,
    amount: toNumber(tx?.amount),
  };
}

function normalizeProject(project) {
  const normalizedTransactions = Array.isArray(project?.transactions)
    ? project.transactions.map(normalizeTransaction)
    : [];

  const summary = buildProjectSummary({
    ...project,
    transactions: normalizedTransactions,
  });

  return {
    ...project,
    contractCurrency: project?.contractCurrency || "LAK",
    status: normalizeStatus(project?.status),
    totalPrice: summary.totalPrice,
    vatPercent: summary.vatPercent,
    totalPriceWithVat: summary.totalPriceWithVat,
    actualCost: summary.actualCost,
    estimatedProfit: summary.estimatedProfit,
    balance: summary.balance,
    transactionCount: summary.transactionCount,
    totals: summary.totals,
    transactions: normalizedTransactions,
  };
}

function updateKPIs(projects) {
  const total = projects.reduce(
    (sum, project) => {
      sum.income += toNumber(project.totals?.income);
      sum.investment += toNumber(project.totals?.investment);
      sum.expense += toNumber(project.totals?.expense);
      sum.profit += toNumber(project.estimatedProfit);
      return sum;
    },
    { income: 0, investment: 0, expense: 0, profit: 0 }
  );

  kpiProjects.textContent = String(projects.length);
  kpiIncome.textContent = formatDisplayNumber(total.income);
  kpiInvestment.textContent = formatDisplayNumber(total.investment);
  kpiExpense.textContent = formatDisplayNumber(total.expense);
  if (kpiProfit) {
    kpiProfit.textContent = formatDisplayNumber(total.profit);
    kpiProfit.style.color = total.profit >= 0 ? "" : "#dc2626";
  }
  buildCategoryBreakdown(projects);
  buildAdminExpenses(projects);
}

// ── CATEGORY BREAKDOWN ─────────────────────────────────────────
function buildCategoryBreakdown(projects) {
  const grid = document.getElementById("categoryBreakdownGrid");
  if (!grid) return;

  // Aggregate all transactions by category
  const map = {};
  for (const project of projects) {
    for (const tx of (project.transactions || [])) {
      const cat = tx.category || "Uncategorized";
      if (!map[cat]) map[cat] = { total: 0, income: 0, investment: 0, expense: 0, txs: [] };
      const amt = toNumber(tx.amount);
      map[cat].total += amt;
      if (tx.type === "income")      map[cat].income     += amt;
      if (tx.type === "investment")  map[cat].investment += amt;
      if (tx.type === "expense")     map[cat].expense    += amt;
      map[cat].txs.push({ ...tx, _projectName: project.name, _projectCode: project.projectCode });
    }
  }

  const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);

  if (sorted.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px;">No transaction categories yet.</p>';
    return;
  }

  // Wire up search once
  const searchInput = document.getElementById("categorySearch");
  if (searchInput && !searchInput._catBound) {
    searchInput._catBound = true;
    searchInput.addEventListener("input", () => renderCatCards(grid, map, sorted, searchInput.value.trim().toLowerCase()));
  }

  renderCatCards(grid, map, sorted, searchInput ? searchInput.value.trim().toLowerCase() : "");
}

function renderCatCards(grid, map, sorted, filter = "") {
  const filtered = filter ? sorted.filter(([cat]) => cat.toLowerCase().includes(filter)) : sorted;

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px;">No categories match your search.</p>';
    return;
  }

  grid.innerHTML = filtered.map(([cat, data]) => `
    <div class="cat-card" data-cat="${escapeHtml(cat)}">
      <div class="cat-name">${escapeHtml(cat)}</div>
      <div class="cat-total">${formatDisplayNumber(data.total)}</div>
      <div class="cat-breakdown">
        ${data.income     ? `<span class="cat-tag income">In: ${formatDisplayNumber(data.income)}</span>` : ""}
        ${data.investment ? `<span class="cat-tag invest">Inv: ${formatDisplayNumber(data.investment)}</span>` : ""}
        ${data.expense    ? `<span class="cat-tag expense">Exp: ${formatDisplayNumber(data.expense)}</span>` : ""}
      </div>
      <div class="cat-count">${data.txs.length} transaction${data.txs.length !== 1 ? "s" : ""}</div>
    </div>
  `).join("");

  // Click → open detail modal
  grid.querySelectorAll(".cat-card").forEach(card => {
    card.addEventListener("click", () => {
      const cat = card.dataset.cat;
      openCategoryModal(cat, map[cat]);
    });
  });
}

function openCategoryModal(cat, data) {
  const modal = document.getElementById("categoryModal");
  const title = document.getElementById("categoryModalTitle");
  const sub   = document.getElementById("categoryModalSub");
  const body  = document.getElementById("categoryModalBody");

  title.textContent = cat;
  sub.textContent   = `${data.txs.length} transaction${data.txs.length !== 1 ? "s" : ""} · Total: ${formatDisplayNumber(data.total)}`;

  body.innerHTML = `
    <table class="cat-table">
      <thead>
        <tr>
          <th>Project</th>
          <th>Type</th>
          <th>Description</th>
          <th style="text-align:right">Amount</th>
          <th style="text-align:center">Bill</th>
        </tr>
      </thead>
      <tbody>
        ${data.txs.map(tx => `
          <tr>
            <td><span class="cat-proj-code">${escapeHtml(tx._projectCode || "")}</span> ${escapeHtml(tx._projectName || "")}</td>
            <td><span class="cat-type-badge ${tx.type}">${escapeHtml(tx.type || "")}</span></td>
            <td>${escapeHtml(tx.description || "-")}</td>
            <td style="text-align:right;font-weight:600">${formatDisplayNumber(tx.amount)}</td>
            <td style="text-align:center">
              ${tx.billPath
                ? `<button class="btn btn-sm" onclick="openBillPopup('${tx.billPath}')" type="button">View Bill</button>`
                : `<span style="color:var(--muted);font-size:12px;">—</span>`}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

document.getElementById("closeCategoryModal")?.addEventListener("click", closeCategoryModal);
document.getElementById("categoryModalBackdrop")?.addEventListener("click", closeCategoryModal);
function closeCategoryModal() {
  const modal = document.getElementById("categoryModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}


// ── BILL POPUP ─────────────────────────────────────────────────
function openBillPopup(url) {
  let modal = document.getElementById("billPopupModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "billPopupModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-backdrop" id="billPopupBackdrop"></div>
      <div class="modal-dialog bill-popup-dialog" role="dialog">
        <div class="modal-header">
          <h3>Bill / Receipt</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <a id="billPopupDownload" class="btn btn-sm" download>Download</a>
            <button type="button" class="modal-close" id="closeBillPopup">✕</button>
          </div>
        </div>
        <div class="modal-body bill-popup-body" id="billPopupBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeBillPopup").addEventListener("click", closeBillPopup);
    document.getElementById("billPopupBackdrop").addEventListener("click", closeBillPopup);
  }

  const body = document.getElementById("billPopupBody");
  const dl   = document.getElementById("billPopupDownload");
  dl.href = url;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  const isImage = ["jpg","jpeg","png","gif","webp","bmp"].includes(ext);
  const isPdf   = ext === "pdf";

  if (isImage) {
    body.innerHTML = `<img src="${url}" alt="Bill" style="max-width:100%;max-height:70vh;display:block;margin:0 auto;border-radius:8px;" />`;
  } else if (isPdf) {
    body.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:none;border-radius:8px;"></iframe>`;
  } else {
    body.innerHTML = `<div style="text-align:center;padding:40px 0;">
      <p style="color:var(--muted);margin-bottom:16px;">Preview not available for this file type.</p>
      <a href="${url}" download class="btn btn-primary">Download File</a>
    </div>`;
  }

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeBillPopup() {
  const modal = document.getElementById("billPopupModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
}


async function loadNextProjectCode() {
  const data = await fetchJSON("/api/next-project-code");
  projectNo.value = data.no || "";
  projectCode.value = data.projectCode || "";
}

function clearLogoPreview() {
  logoPreview.className = "avatar-preview";
  logoPreview.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M3 15l4-4 3 3 4-5 5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/></svg>';
}

function showLogoPreview(src) {
  if (!src) {
    clearLogoPreview();
    return;
  }

  logoPreview.className = "avatar-preview";
  logoPreview.innerHTML = `<img src="${src}" alt="Logo Preview">`;
}

function showDetailLogo(src) {
  if (!projectDetailLogo) return;

  if (!src) {
    projectDetailLogo.className = "logo-preview empty small";
    projectDetailLogo.innerHTML = "No logo";
    return;
  }

  projectDetailLogo.className = "logo-preview small";
  projectDetailLogo.innerHTML = `<img src="${src}" alt="Project Logo">`;
}

function parseInputNumber(value) {
  return String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");
}

function formatInputNumber(value) {
  if (!value) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function updateProjectPricePreview() {
  const raw = parseInputNumber(totalPrice.value);
  totalPriceRaw.value = raw;

  if (document.activeElement === totalPrice) {
    totalPrice.value = raw ? formatInputNumber(raw) : "";
  }

  const totalWithVat = calcTotalWithVat(raw, vatPercent.value);
  const currency = contractCurrency?.value || "";
  totalPriceWithVatDisplay.value = totalWithVat
    ? formatMoney(totalWithVat, currency)
    : "";
}

function resetProjectForm() {
  editId.value = "";
  keepLogoPath.value = "";
  projectName.value = "";
  category.value = "";
  owner.value = "";
  startDate.value = "";
  endDate.value = "";
  remark.value = "";
  companyLogo.value = "";
  contractCurrency.value = "LAK";
  totalPrice.value = "";
  totalPriceRaw.value = "";
  vatPercent.value = "10";
  totalPriceWithVatDisplay.value = "";
  saveBtn.textContent = "Save Project";
  clearLogoPreview();
  const _qcwr = $("quotationPdfCurrentWrap");
  if (_qcwr) _qcwr.style.display = "none";
  const _qpf = document.querySelector("#quotationPdfDrop .drop-zone__file"); if(_qpf) _qpf.textContent="";
  loadNextProjectCode().catch(console.error);
}

function getDefaultTxCategoryByType(type) {
  if (type === "expense") return "Administrative expenses";
  return "";
}

function resetTransactionForm(keepProject = true) {
  txType.value = "income";
  txCategory.value = getDefaultTxCategoryByType(txType.value);
  txDescription.value = "";
  txCurrency.value = "LAK";
  txAmount.value = "";
  txAmountRaw.value = "";
  txDate.value = todayISO();
  billFile.value = ""; const _bf = document.querySelector("#billFileDrop .drop-zone__file"); if(_bf) _bf.textContent="";

  if (!keepProject) {
    selectedProjectId.value = "";
    selectedProjectText.value = "";
    renderTxModalHistory(null);
  }
}

function populateProjectForm(project) {
  editId.value = project.id || "";
  keepLogoPath.value = project.logoPath || "";
  projectNo.value = project.no || "";
  projectCode.value = project.projectCode || "";
  projectName.value = project.projectName || "";
  category.value = project.category || "";
  owner.value = project.owner || "";
  startDate.value = project.startDate || "";
  endDate.value = project.endDate || "";
  remark.value = project.remark || "";
  contractCurrency.value = project.contractCurrency || "LAK";
  totalPriceRaw.value = String(toNumber(project.totalPrice || 0) || "");
  totalPrice.value = totalPriceRaw.value ? formatInputNumber(totalPriceRaw.value) : "";
  vatPercent.value = String(toNumber(project.vatPercent || 0));
  saveBtn.textContent = "Update Project";
  showLogoPreview(project.logoPath || "");
  updateProjectPricePreview();
  // (scroll handled by caller)
  // Show existing quotation link
  const _qcw = $("quotationPdfCurrentWrap");
  const _qcl = $("quotationPdfCurrentLink");
  if (_qcw && _qcl) {
    if (project.quotationPath) {
      _qcl.href = project.quotationPath;
      _qcw.style.display = "";
    } else {
      _qcw.style.display = "none";
    }
  }
}


function getFilteredProjects() {
  const keyword = searchInput.value.trim().toLowerCase();
  const categoryValue = filterCategory.value.trim().toLowerCase();
  const ownerValue = filterOwner.value.trim().toLowerCase();
  const sortValue = sortBy.value;

  let items = allProjects.filter((item) => {
    const haystack = [
      item.projectCode,
      item.projectName,
      item.category,
      item.owner,
      item.contractCurrency
    ]
      .join(" ")
      .toLowerCase();

    const matchesKeyword = !keyword || haystack.includes(keyword);
    const matchesCategory =
      !categoryValue || String(item.category || "").toLowerCase() === categoryValue;
    const matchesOwner =
      !ownerValue || String(item.owner || "").toLowerCase() === ownerValue;

    return matchesKeyword && matchesCategory && matchesOwner;
  });

  items = [...items];

  if (sortValue === "oldest") {
    items.sort((a, b) => toNumber(a.no) - toNumber(b.no));
  } else if (sortValue === "name") {
    items.sort((a, b) =>
      String(a.projectName || "").localeCompare(String(b.projectName || ""))
    );
  } else if (sortValue === "code") {
    items.sort((a, b) =>
      String(a.projectCode || "").localeCompare(String(b.projectCode || ""))
    );
  } else if (sortValue === "profitHigh") {
    items.sort((a, b) => toNumber(b.estimatedProfit) - toNumber(a.estimatedProfit));
  } else if (sortValue === "profitLow") {
    items.sort((a, b) => toNumber(a.estimatedProfit) - toNumber(b.estimatedProfit));
  } else {
    items.sort((a, b) => toNumber(b.no) - toNumber(a.no));
  }

  return items;
}

function getLogoCardHtml(item) {
  if (item.logoPath) {
    return `<img class="project-logo" src="${item.logoPath}" alt="${escapeHtml(
      item.projectName || "Project Logo"
    )}">`;
  }

  return `<div class="project-logo" style="display:grid;place-items:center;font-size:11px;font-weight:800;color:#94a3b8;">NO LOGO</div>`;
}

function getProjectRemarkText(item) {
  const text = String(item.remark || "").trim();
  return text || "No remark";
}

function renderProjectCard(item) {
  const isActive = item.id === currentProjectId;
  const currency = item.contractCurrency || "LAK";
  const profitClass = toNumber(item.estimatedProfit) >= 0 ? "profit-positive" : "profit-negative";
  const status = normalizeStatus(item.status);

  const statusOptions = PROJECT_STATUSES.map(
    (s) => `<option value="${s.value}" ${s.value === status ? "selected" : ""}>${escapeHtml(s.label)}</option>`
  ).join("");

  return `
    <article class="project-card ${isActive ? "active" : ""}" data-project-id="${item.id}">
      <div class="project-head">
        ${getLogoCardHtml(item)}
        <div class="project-title-wrap">
          <div class="project-code-row">
            <span class="project-code">${escapeHtml(item.projectCode || "")}</span>
            <select class="status-select status-${status}" data-action="change-status" data-id="${item.id}" onclick="event.stopPropagation()">
              ${statusOptions}
            </select>
          </div>
          <h3 class="project-name">${escapeHtml(item.projectName || "")}</h3>
        </div>
      </div>

      <div class="project-meta">
        <div class="meta-box">
          <div class="meta-label">Category</div>
          <div class="meta-value">${escapeHtml(item.category || "-")}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Owner</div>
          <div class="meta-value">${escapeHtml(item.owner || "-")}</div>
        </div>
      </div>

      <div class="amount-row">
        <div class="amount-box">
          <div class="label">Total Price</div>
          <div class="amt">${formatMoney(item.totalPrice, currency)}</div>
        </div>

        <div class="amount-box">
          <div class="label">Total + VAT</div>
          <div class="amt">${formatMoney(item.totalPriceWithVat, currency)}</div>
        </div>

        <div class="amount-box ${profitClass}">
          <div class="label">Profit</div>
          <div class="amt">${formatMoney(item.estimatedProfit, currency)}</div>
        </div>
      </div>

      <div class="amount-row">
        <div class="amount-box income">
          <div class="label">Income</div>
          <div class="amt">${formatDisplayNumber(item.totals?.income)}</div>
        </div>

        <div class="amount-box investment">
          <div class="label">Investment</div>
          <div class="amt">${formatDisplayNumber(item.totals?.investment)}</div>
        </div>

        <div class="amount-box expense">
          <div class="label">Expense</div>
          <div class="amt">${formatDisplayNumber(item.totals?.expense)}</div>
        </div>
      </div>

      <div class="project-foot">
        <div class="project-stat">Transactions <strong>${toNumber(item.transactionCount)}</strong></div>
        <div class="project-period">${formatDateRange(item.startDate, item.endDate)}</div>
      </div>

      <div class="project-remark">
        <div class="project-remark-label">Remark</div>
        <p>${escapeHtml(getProjectRemarkText(item))}</p>
      </div>

      <div class="project-actions">
        <button class="btn btn-light btn-small" data-action="open" data-id="${item.id}" type="button">Open</button>
        <button class="btn btn-light btn-small" data-action="add-tx" data-id="${item.id}" type="button">Add Transaction</button>
        <button class="btn btn-light btn-small" data-action="edit" data-id="${item.id}" type="button">Edit</button>
        <button class="btn btn-danger btn-small" data-action="delete" data-id="${item.id}" type="button">Delete</button>
      </div>
    </article>
  `;
}

function renderProjectList() {
  const items = getFilteredProjects();

  if (!items.length) {
    projectList.innerHTML = `
      <div class="empty-state" style="grid-column:1 / -1;">
        <h3>No projects found</h3>
        <p>Try another search or create a new project.</p>
      </div>
    `;
    return;
  }

  projectList.innerHTML = items.map(renderProjectCard).join("");
}

function getTypeBadgeClass(type) {
  if (type === "income") return "badge badge-income";
  if (type === "investment") return "badge badge-investment";
  if (type === "expense") return "badge badge-expense";
  return "badge";
}

function renderHistoryList(container, countEl, project = null) {
  if (!container || !countEl) return;

  const current = project?.id
    ? (allProjects.find((item) => item.id === project.id) || project)
    : (allProjects.find((item) => item.id === currentProjectId) || null);

  if (!current) {
    countEl.textContent = "0 item(s)";
    container.innerHTML = `
      <div class="empty-state small">
        <h3>No transactions yet</h3>
        <p>Add the first transaction for this project.</p>
      </div>
    `;
    return;
  }

  const transactions = Array.isArray(current.transactions) ? current.transactions : [];
  countEl.textContent = `${transactions.length} item(s)`;

  if (!transactions.length) {
    container.innerHTML = `
      <div class="empty-state small">
        <h3>No transactions yet</h3>
        <p>Add the first transaction for this project.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.map((tx) => {
    const fileLink = tx.billPath
      ? `<button class="btn btn-sm" onclick="openBillPopup('${tx.billPath}')" type="button">View Bill</button>`
      : `<span style="color:#94a3b8;">No file</span>`;

    return `
      <div class="history-item">
        <div class="history-top">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="${getTypeBadgeClass(tx.type)}">${escapeHtml((tx.type || "").toUpperCase())}</span>
            <strong style="font-size:16px;">${formatMoney(tx.amount, tx.currency)}</strong>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm" data-action="edit-tx" data-id="${tx.id}" type="button">Edit</button>
            <button class="btn btn-danger btn-small" data-action="delete-tx" data-id="${tx.id}" type="button">Delete</button>
          </div>
        </div>

        <div class="history-meta">
          <div><strong>No:</strong> ${escapeHtml(tx.no || "-")}</div>
          <div><strong>Category:</strong> ${escapeHtml(tx.category || "-")}</div>
          <div><strong>Date:</strong> ${escapeHtml(tx.date || "-")}</div>
        </div>

        <div class="project-remark" style="margin-bottom:10px;">
          <div class="project-remark-label">Description</div>
          <p>${escapeHtml(tx.description || "No description")}</p>
        </div>

        <div class="history-files">${fileLink}</div>
      </div>
    `;
  }).join("");
}

function renderTxModalHistory(project = null) {
  renderHistoryList(txModalHistory, txHistoryCount, project);
}

function renderProjectModalHistory(project = null) {
  renderHistoryList(projectModalHistory, detailHistoryCount, project);
}

function fillProjectModal(project = null) {
  const currentProject = project || allProjects.find((item) => item.id === currentProjectId);

  if (!currentProject) return;

  const currency = currentProject.contractCurrency || "LAK";
  const profit = toNumber(currentProject.estimatedProfit);

  showDetailLogo(currentProject.logoPath || "");

  detailProjectCode.textContent = currentProject.projectCode || "-";
  detailProjectCategory.textContent = currentProject.category || "-";
  detailProjectOwner.textContent = currentProject.owner || "-";
  detailProjectName.textContent = currentProject.projectName || "-";
  detailProjectRemark.textContent = getProjectRemarkText(currentProject);
  const _qw = $("detailQuotationWrap");
  const _ql = $("detailQuotationLink");
  if (_qw && _ql && currentProject.quotationPath) {
    _ql.href = currentProject.quotationPath;
    _qw.style.display = "";
  } else if (_qw) {
    _qw.style.display = "none";
  }
  detailStartDate.textContent = currentProject.startDate || "-";
  detailEndDate.textContent = currentProject.endDate || "-";
  detailCurrency.textContent = currency;
  detailTransactionCount.textContent = String(toNumber(currentProject.transactionCount));

  detailTotalPrice.textContent = formatMoney(currentProject.totalPrice, currency);
  detailVatPercent.textContent = `${formatDisplayNumber(currentProject.vatPercent)}%`;
  detailTotalWithVat.textContent = formatMoney(currentProject.totalPriceWithVat, currency);
  detailActualCost.textContent = formatMoney(currentProject.actualCost, currency);
  detailEstimatedProfit.textContent = formatMoney(profit, currency);
  detailBalance.textContent = formatMoney(currentProject.balance, currency);

  detailIncome.textContent = formatDisplayNumber(currentProject.totals?.income);
  detailInvestment.textContent = formatDisplayNumber(currentProject.totals?.investment);
  detailExpense.textContent = formatDisplayNumber(currentProject.totals?.expense);

  if (detailEstimatedProfit) {
    detailEstimatedProfit.classList.toggle("text-success", profit >= 0);
    detailEstimatedProfit.classList.toggle("text-danger", profit < 0);
  }

  renderProjectModalHistory(currentProject);
}

function openProjectModal(project) {
  if (!project || !projectModal) return;

  currentProjectId = project.id || "";
  fillProjectModal(project);
  renderProjectList();

  projectModal.classList.remove("hidden");
  projectModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeProjectModal() {
  if (!projectModal) return;
  projectModal.classList.add("hidden");
  projectModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openTxModal(project) {
  if (!project || !txModal) return;

  currentProjectId = project.id || "";
  const fullProject = allProjects.find((item) => item.id === currentProjectId) || project;

  selectedProjectId.value = fullProject.id || "";
  selectedProjectText.value = `${fullProject.projectCode || "-"} - ${fullProject.projectName || "-"}`;
  txDate.value = todayISO();

  renderProjectList();
  renderTxModalHistory(fullProject);

  txModal.classList.remove("hidden");
  txModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeTxModal() {
  if (!txModal) return;
  txModal.classList.add("hidden");
  txModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function loadProjects(keepSelection = true) {
  const projects = await fetchJSON("/api/projects");
  allProjects = (Array.isArray(projects) ? projects : []).map(normalizeProject);

  refreshDatalists(allProjects);
  updateKPIs(allProjects);

  if (
    keepSelection &&
    currentProjectId &&
    !allProjects.find((item) => item.id === currentProjectId)
  ) {
    currentProjectId = "";
  }

  renderProjectList();

  if (currentProjectId) {
    const selected = allProjects.find((item) => item.id === currentProjectId);
    if (selected) {
      selectedProjectId.value = selected.id || "";
      selectedProjectText.value = `${selected.projectCode || "-"} - ${selected.projectName || "-"}`;
      fillProjectModal(selected);
      renderTxModalHistory(selected);
      return;
    }
  }

  currentProjectId = "";
  selectedProjectId.value = "";
  selectedProjectText.value = "";
  renderProjectModalHistory(null);
  renderTxModalHistory(null);
}

async function submitProjectForm(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append("projectName", projectName.value.trim());
  formData.append("category", category.value.trim());
  formData.append("owner", owner.value.trim());
  formData.append("startDate", startDate.value);
  formData.append("endDate", endDate.value);
  formData.append("remark", remark.value.trim());
  formData.append("keepLogoPath", keepLogoPath.value.trim());
  formData.append("contractCurrency", contractCurrency.value);
  formData.append("totalPrice", totalPriceRaw.value || "0");
  formData.append("vatPercent", vatPercent.value || "0");

  if (companyLogo.files?.[0]) {
    formData.append("companyLogo", companyLogo.files[0]);
  }
  const quotationPdfInput = document.getElementById("quotationPdf");
  if (quotationPdfInput?.files?.[0]) {
    formData.append("quotationPdf", quotationPdfInput.files[0]);
  }

  const isEdit = Boolean(editId.value.trim());
  const url = isEdit ? `/api/projects/${editId.value.trim()}` : "/api/projects";
  const method = isEdit ? "PUT" : "POST";

  try {
    setButtonLoading(
      saveBtn,
      true,
      isEdit ? "Update Project" : "Save Project",
      isEdit ? "Updating..." : "Saving..."
    );

    const result = await fetchJSON(url, { method, body: formData });
    await loadProjects(false);
    resetProjectForm();
    if (typeof window.closeProjectDrawer === 'function') window.closeProjectDrawer();
    showToast(isEdit ? "Project updated successfully" : "Project saved successfully");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    const nowEdit = Boolean(editId.value.trim());
    setButtonLoading(
      saveBtn,
      false,
      nowEdit ? "Update Project" : "Save Project",
      ""
    );
  }
}

async function submitTransactionForm(event) {
  event.preventDefault();

  const projectId = selectedProjectId.value.trim();
  if (!projectId) {
    showToast("Please select a project first", "info");
    return;
  }

  const formData = new FormData();
  formData.append("type", txType.value);
  formData.append("category", txCategory.value.trim());
  formData.append("description", txDescription.value.trim());
  formData.append("currency", txCurrency.value);
  formData.append("amount", txAmountRaw.value || txAmount.value || "0");
  formData.append("date", txDate.value);

  if (billFile.files?.[0]) {
    formData.append("billFile", billFile.files[0]);
  }

  try {
    setButtonLoading(addTxBtn, true, "Add Transaction", "Saving...");

    await fetchJSON(`/api/projects/${projectId}/transactions`, {
      method: "POST",
      body: formData,
    });

    await loadProjects(false);

    const selected = allProjects.find((item) => item.id === projectId);
    if (selected) {
      currentProjectId = selected.id || "";
      fillProjectModal(selected);
      renderTxModalHistory(selected);
    }

    resetTransactionForm(true);
    closeTxModal();
    showToast("Transaction saved successfully");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(addTxBtn, false, "Add Transaction", "");
  }
}

async function deleteProjectById(id) {
  const project = allProjects.find((item) => item.id === id);
  if (!project) return;

  if (!await showConfirm(`Delete project "${project.projectName}" and all related transactions?`)) {
    return;
  }

  try {
    await fetchJSON(`/api/projects/${id}`, { method: "DELETE" });

    if (currentProjectId === id) {
      currentProjectId = "";
      selectedProjectId.value = "";
      selectedProjectText.value = "";
      closeProjectModal();
      closeTxModal();
    }

    await loadProjects(true);
    resetProjectForm();
    showToast("Project deleted");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleStatusChange(event) {
  const select = event.target.closest('select[data-action="change-status"]');
  if (!select) return;

  const id = select.dataset.id;
  const newStatus = select.value;

  // Optimistic UI update
  select.className = `status-select status-${newStatus}`;
  const project = allProjects.find((item) => item.id === id);
  if (project) project.status = newStatus;

  try {
    await fetchJSON(`/api/projects/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (error) {
    showToast(error.message, "error");
    // Reload to revert UI
    await loadProjects(true);
  }
}

async function handleProjectListClick(event) {
  // Ignore clicks on the status dropdown itself
  if (event.target.closest('select[data-action="change-status"]')) return;

  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;
    const project = allProjects.find((item) => item.id === id);

    if (!project) return;

    if (action === "open") {
      openProjectModal(project);
      return;
    }

    if (action === "add-tx") {
      currentProjectId = project.id || "";
      openTxModal(project);
      return;
    }

    if (action === "edit") {
      currentProjectId = project.id || "";
      populateProjectForm(project);
      closeProjectModal();
      if (typeof window.openProjectDrawer === 'function') window.openProjectDrawer();
      return;
    }

    if (action === "delete") {
      await deleteProjectById(id);
      return;
    }

    return;
  }

  const card = event.target.closest(".project-card");
  if (!card) return;

  const id = card.dataset.projectId;
  const project = allProjects.find((item) => item.id === id);
  if (!project) return;

  openProjectModal(project);
}

async function handleHistoryClick(event) {
  const button = event.target.closest('button[data-action="delete-tx"]');
  if (!button) return;

  const txId = button.dataset.id;
  if (!await showConfirm("Delete this transaction?")) return;

  try {
    await fetchJSON(`/api/transactions/${txId}`, { method: "DELETE" });
    await loadProjects(false);

    const selected = allProjects.find((item) => item.id === currentProjectId);
    if (selected) {
      fillProjectModal(selected);
      renderTxModalHistory(selected);
    } else {
      renderProjectModalHistory(null);
      renderTxModalHistory(null);
      closeProjectModal();
    }

    showToast("Transaction deleted");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function handleLogoInputChange() {
  const file = companyLogo.files?.[0];

  if (!file) {
    if (keepLogoPath.value) showLogoPreview(keepLogoPath.value);
    else clearLogoPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => showLogoPreview(reader.result);
  reader.readAsDataURL(file);
}

function handleAmountInput(event) {
  let raw = parseInputNumber(event.target.value);

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  txAmountRaw.value = raw;
  txAmount.value = raw ? formatInputNumber(raw) : "";
}

function handleProjectAmountInput(event) {
  let raw = parseInputNumber(event.target.value);

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  totalPriceRaw.value = raw;
  totalPrice.value = raw ? formatInputNumber(raw) : "";
  updateProjectPricePreview();
}

function handleTxTypeChange() {
  const defaultCategory = getDefaultTxCategoryByType(txType.value);
  if (defaultCategory && !txCategory.value.trim()) {
    txCategory.value = defaultCategory;
  }
}

async function handleLogout() {
  try {
    await fetchJSON("/api/logout", { method: "POST" });
    window.location.href = "/login.html";
  } catch (error) {
    showToast(error.message, "error");
  }
}

function attachEvents() {
  projectForm.addEventListener("submit", submitProjectForm);
  transactionForm.addEventListener("submit", submitTransactionForm);

  resetBtn.addEventListener("click", resetProjectForm);
  clearTxBtn.addEventListener("click", () => resetTransactionForm(true));

  refreshBtn.addEventListener("click", () => {
    loadProjects(true).catch((error) => showToast(error.message, "error"));
  });

  downloadExcelBtn.addEventListener("click", () => {
    window.location.href = "/api/download-excel";
  });

  logoutBtn?.addEventListener("click", handleLogout);

  companyLogo.addEventListener("change", handleLogoInputChange);
  document.getElementById("avatarAddBtn")?.addEventListener("click", () => companyLogo.click());
  txAmount.addEventListener("input", handleAmountInput);
  txType.addEventListener("change", handleTxTypeChange);

  totalPrice?.addEventListener("input", handleProjectAmountInput);
  vatPercent?.addEventListener("input", updateProjectPricePreview);
  contractCurrency?.addEventListener("change", updateProjectPricePreview);

  projectList.addEventListener("click", handleProjectListClick);
  projectList.addEventListener("change", handleStatusChange);
  projectModalHistory?.addEventListener("click", handleHistoryClick);
  txModalHistory?.addEventListener("click", handleHistoryClick);

  searchInput.addEventListener("input", renderProjectList);
  filterCategory.addEventListener("input", renderProjectList);
  filterOwner.addEventListener("input", renderProjectList);
  sortBy.addEventListener("change", renderProjectList);

  closeTxModalBtn?.addEventListener("click", closeTxModal);
  txModalBackdrop?.addEventListener("click", closeTxModal);

  closeProjectModalBtn?.addEventListener("click", closeProjectModal);
  projectModalBackdrop?.addEventListener("click", closeProjectModal);

  editProjectBtn?.addEventListener("click", () => {
    const project = allProjects.find((item) => item.id === currentProjectId);
    if (!project) { console.warn("Edit: no project found for id", currentProjectId); return; }
    try {
      populateProjectForm(project);
      closeProjectModal();
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    } catch(e) {
      console.error("Edit project error:", e);
      showToast("Edit failed: " + e.message, "error");
    }
  });

  openAddTxFromDetailBtn?.addEventListener("click", () => {
    const project = allProjects.find((item) => item.id === currentProjectId);
    if (!project) return;
    closeProjectModal();
    openTxModal(project);
  });

  deleteProjectBtn?.addEventListener("click", async () => {
    if (!currentProjectId) return;
    await deleteProjectById(currentProjectId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (txModal && !txModal.classList.contains("hidden")) {
      closeTxModal();
      return;
    }

    if (projectModal && !projectModal.classList.contains("hidden")) {
      closeProjectModal();
    }
  });
}

async function init() {
  txDate.value = todayISO();
  attachEvents();
  resetProjectForm();
  resetTransactionForm(false);
  closeTxModal();
  closeProjectModal();
  updateProjectPricePreview();
  await loadProjects(true);
  initAutocompletes();
}

// ── DRAG & DROP FILE ZONES ────────────────────────────
function setupDropZone(zoneId) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  const input = zone.querySelector('.drop-zone__input');
  const fileLabel = zone.querySelector('.drop-zone__file');
  if (!input) return;

  function updateLabel(file) {
    if (fileLabel) fileLabel.textContent = file ? file.name : '';
  }

  input.addEventListener('change', () => updateLabel(input.files?.[0]));

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    updateLabel(file);
  });
}

['billFileDrop', 'editTxBillDrop', 'quotationPdfDrop'].forEach(setupDropZone);

init().catch((error) => {
  console.error(error);
  showToast(error.message || "Failed to load app", "error");
});
// ── EDIT TRANSACTION MODAL ─────────────────────────────────────
(function () {
  const modal    = () => document.getElementById("editTxModal");
  const form     = () => document.getElementById("editTxForm");

  function openEditTx(txId) {
    const project = allProjects.find(p => (p.transactions || []).find(t => t.id === txId));
    if (!project) return;
    const tx = project.transactions.find(t => t.id === txId);
    if (!tx) return;

    document.getElementById("editTxId").value          = tx.id;
    document.getElementById("editTxType").value        = tx.type || "expense";
    document.getElementById("editTxAmount").value      = tx.amount || "";
    document.getElementById("editTxCategory").value    = tx.category || "";
    document.getElementById("editTxDate").value        = tx.date || new Date().toISOString().slice(0, 10);
    document.getElementById("editTxDescription").value = tx.description || "";
    document.getElementById("editTxBill").value = ""; const _ef = document.querySelector("#editTxBillDrop .drop-zone__file"); if(_ef) _ef.textContent="";

    modal().classList.remove("hidden");
    modal().setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeEditTx() {
    modal().classList.add("hidden");
    modal().setAttribute("aria-hidden", "true");
    // Only unlock scroll if no other modal is open
    const anyOpen = document.querySelector('.modal:not(.hidden)');
    if (!anyOpen) document.body.classList.remove("modal-open");
  }

  document.getElementById("closeEditTxModal")?.addEventListener("click", closeEditTx);
  document.getElementById("cancelEditTxBtn")?.addEventListener("click", closeEditTx);
  document.getElementById("editTxModalBackdrop")?.addEventListener("click", closeEditTx);

  document.getElementById("editTxForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id   = document.getElementById("editTxId").value;
    const bill = document.getElementById("editTxBill").files?.[0];
    const btn  = document.getElementById("saveEditTxBtn");

    const fd = new FormData();
    fd.append("type",        document.getElementById("editTxType").value);
    fd.append("amount",      parseInputNumber(document.getElementById("editTxAmount").value));
    fd.append("category",    document.getElementById("editTxCategory").value.trim());
    fd.append("date",        document.getElementById("editTxDate").value);
    fd.append("description", document.getElementById("editTxDescription").value.trim());
    if (bill) fd.append("billFile", bill);

    setButtonLoading(btn, true, "Save Changes", "Saving…");
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "PUT", body: fd });
      const data = await res.json();
      if (!data.ok) { showToast(data.error || "Failed to save", "error"); return; }
      closeEditTx();
      await loadProjects(true);
    } catch (err) {
      alert("Network error");
    } finally {
      setButtonLoading(btn, false, "Save Changes", "Saving…");
    }
  });

  // Delegate click for edit-tx buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="edit-tx"]');
    if (btn) openEditTx(btn.dataset.id);
  });
})();

// ── GLOBAL SEARCH ──────────────────────────────────────────────
(function () {
  const input   = document.getElementById("globalSearch");
  const clearBtn = document.getElementById("globalSearchClear");
  const modal   = document.getElementById("globalSearchModal");
  const results = document.getElementById("globalSearchResults");
  const countEl = document.getElementById("globalSearchResultCount");

  if (!input) return;

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    clearBtn.classList.toggle("hidden", !q);
    if (!q) { closeSearch(); return; }
    debounce = setTimeout(() => runSearch(q), 200);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSearch(); input.blur(); }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.add("hidden");
    closeSearch();
  });

  document.getElementById("closeGlobalSearch")?.addEventListener("click", closeSearch);
  document.getElementById("globalSearchBackdrop")?.addEventListener("click", closeSearch);

  function closeSearch() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    const anyOpen = document.querySelector('.modal:not(#globalSearchModal):not(.hidden)');
    if (!anyOpen) document.body.classList.remove("modal-open");
  }

  function runSearch(q) {
    const lower = q.toLowerCase();
    const hits = [];

    for (const project of allProjects) {
      for (const tx of (project.transactions || [])) {
        const fields = [
          tx.description, tx.category, tx.type,
          String(tx.amount || ""), tx.date, tx.no,
          project.name, project.projectCode
        ];
        if (fields.some(f => String(f || "").toLowerCase().includes(lower))) {
          hits.push({ tx, project });
        }
      }
    }

    countEl.textContent = `${hits.length} result${hits.length !== 1 ? "s" : ""} for "${q}"`;

    if (!hits.length) {
      results.innerHTML = `<p style="color:var(--muted);padding:20px 0;">No results found.</p>`;
    } else {
      results.innerHTML = hits.map(({ tx, project }) => `
        <div class="gsearch-item">
          <div class="gsearch-top">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="${getTypeBadgeClass(tx.type)}">${escapeHtml((tx.type||"").toUpperCase())}</span>
              <strong>${formatMoney(tx.amount, tx.currency)}</strong>
              <span class="cat-proj-code">${escapeHtml(project.projectCode||"")}</span>
              <span style="font-size:13px;color:var(--muted)">${escapeHtml(project.name||"")}</span>
            </div>
            <span style="font-size:12px;color:var(--muted)">${escapeHtml(tx.date||"")}</span>
          </div>
          <div class="gsearch-meta">
            <span><strong>Category:</strong> ${escapeHtml(tx.category||"-")}</span>
            <span><strong>Description:</strong> ${escapeHtml(tx.description||"-")}</span>
          </div>
          ${tx.billPath
            ? `<div style="margin-top:8px;"><button class="btn btn-sm" onclick="openBillPopup('${tx.billPath}')" type="button">View Bill</button></div>`
            : ""}
        </div>
      `).join("");
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }
})();

// ── ADMINISTRATIVE EXPENSES PANEL ─────────────────────────────
function buildAdminExpenses(projects) {
  const grid    = document.getElementById("adminExpensesGrid");
  const totalEl = document.getElementById("adminExpensesTotal");
  if (!grid) return;

  const fromVal = document.getElementById("adminDateFrom")?.value || "";
  const toVal   = document.getElementById("adminDateTo")?.value || "";

  // Collect all transactions from "Administrative expenses" projects
  const txs = [];
  for (const project of projects) {
    if ((project.category || "").toLowerCase() !== "administrative expenses") continue;
    for (const tx of (project.transactions || [])) {
      if (fromVal && (tx.date || "") < fromVal) continue;
      if (toVal   && (tx.date || "") > toVal)   continue;
      txs.push({ ...tx, _projectName: project.projectName, _projectCode: project.projectCode });
    }
  }

  // Group by category
  const map = {};
  let grandTotal = 0;
  for (const tx of txs) {
    const key = (tx.category || "Uncategorized").trim();
    if (!map[key]) map[key] = { total: 0, count: 0, txs: [] };
    map[key].total += toNumber(tx.amount);
    map[key].count++;
    map[key].txs.push(tx);
    grandTotal += toNumber(tx.amount);
  }

  totalEl.textContent = txs.length
    ? `Total: ${formatDisplayNumber(grandTotal)} LAK (${txs.length} tx)`
    : "";

  if (!txs.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px;">No administrative expenses yet.</p>';
    return;
  }

  const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);

  grid.innerHTML = sorted.map(([desc, data]) => `
    <div class="admin-exp-card" data-desc="${escapeHtml(desc)}">
      <div class="admin-exp-desc">${escapeHtml(desc)}</div>
      <div class="admin-exp-amount">${formatDisplayNumber(data.total)}</div>
      <div class="admin-exp-count">${data.count} payment${data.count !== 1 ? "s" : ""}</div>
    </div>
  `).join("");

  // Click to show transactions for this category
  grid.querySelectorAll(".admin-exp-card").forEach(card => {
    card.addEventListener("click", () => {
      const desc = card.dataset.desc;
      const data = map[desc];
      openCategoryModal(desc, {
        total: data.total,
        txs: data.txs.map(tx => ({ ...tx, billPath: tx.billPath || "" }))
      });
    });
  });
}

// Toggle show/hide
document.getElementById("categoryBreakdownToggle")?.addEventListener("click", function () {
  const body = document.getElementById("categoryBreakdownBody");
  const hidden = body.classList.toggle("hidden");
  this.textContent = hidden ? "Show ▾" : "Hide ▴";
});

["adminDateFrom", "adminDateTo"].forEach(id => {
  document.getElementById(id)?.addEventListener("change", () => buildAdminExpenses(allProjects));
});
document.getElementById("adminDateClear")?.addEventListener("click", () => {
  const f = document.getElementById("adminDateFrom");
  const t = document.getElementById("adminDateTo");
  if (f) f.value = "";
  if (t) t.value = "";
  buildAdminExpenses(allProjects);
});

document.getElementById("adminExpensesToggle")?.addEventListener("click", function () {
  const body = document.getElementById("adminExpensesBody");
  const hidden = body.classList.toggle("hidden");
  this.textContent = hidden ? "Show ▾" : "Hide ▴";
});
