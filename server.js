const express = require('express');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { google } = require('googleapis');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const LOGO_DIR = path.join(UPLOAD_DIR, 'logos');
const BILL_DIR = path.join(UPLOAD_DIR, 'bills');
const EXCEL_FILE = path.join(DATA_DIR, 'budget.xlsx');

const LOGIN_HTML = path.join(PUBLIC_DIR, 'login.html');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');

const PROJECT_SHEET = 'Projects';
const TRANSACTION_SHEET = 'Transactions';
const DEFAULT_VAT_PERCENT = 10;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
if (!fs.existsSync(BILL_DIR)) fs.mkdirSync(BILL_DIR, { recursive: true });

// ── SEED DATA ────────────────────────────────────────
// If RESET_DATA=true env var is set, wipe budget.xlsx so app starts fresh
if (process.env.RESET_DATA === 'true' && fs.existsSync(EXCEL_FILE)) {
  fs.unlinkSync(EXCEL_FILE);
  console.log('[Reset] Deleted budget.xlsx — starting fresh');
}

// ── GOOGLE DRIVE SETUP ────────────────────────────────
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '';
let drive = null;

async function initGoogleDrive() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken || !DRIVE_FOLDER_ID) {
      console.log('[Drive] OAuth credentials or DRIVE_FOLDER_ID not set — skipping Drive sync');
      return;
    }
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:3333/callback');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('No access token returned');
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log('[Drive] Google Drive client initialized (OAuth2) - token verified OK');
  } catch (err) {
    console.error('[Drive] Failed to initialize Google Drive:', err.message);
  }
}

async function findDriveFile(name) {
  if (!drive) return null;
  const res = await drive.files.list({
    q: `name='${name}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  });
  return res.data.files?.[0] || null;
}

async function downloadFromDrive() {
  if (!drive) return;
  try {
    const file = await findDriveFile('budget.xlsx');
    if (!file) {
      console.log('[Drive] No budget.xlsx on Drive yet — will create on first save');
      return;
    }
    const dest = fs.createWriteStream(EXCEL_FILE);
    const response = await drive.files.get(
      { fileId: file.id, alt: 'media' },
      { responseType: 'stream' }
    );
    await new Promise((resolve, reject) => {
      response.data.pipe(dest);
      dest.on('finish', resolve);
      dest.on('error', reject);
    });
    console.log('[Drive] Downloaded budget.xlsx from Google Drive');
  } catch (err) {
    console.error('[Drive] Download failed:', err.message);
  }
}

async function uploadToDrive() {
  if (!drive) return;
  try {
    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(EXCEL_FILE)
    };
    const existing = await findDriveFile('budget.xlsx');
    if (existing) {
      await drive.files.update({ fileId: existing.id, media, supportsAllDrives: true });
    } else {
      await drive.files.create({
        requestBody: { name: 'budget.xlsx', parents: [DRIVE_FOLDER_ID] },
        media,
        supportsAllDrives: true
      });
    }
    console.log('[Drive] Synced budget.xlsx to Google Drive');
  } catch (err) {
    console.error('[Drive] Upload failed:', err.message);
  }
}

// ── DRIVE IMAGE SYNC ──────────────────────────────────
let driveLogosFolderId = null;
let driveBillsFolderId = null;

async function getOrCreateSubfolder(name, parentId, cacheVar) {
  if (!drive) return null;
  try {
    const res = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)', spaces: 'drive'
    });
    if (res.data.files?.length > 0) return res.data.files[0].id;
    const folder = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }
    });
    console.log(`[Drive] Created '${name}' folder in Drive`);
    return folder.data.id;
  } catch (err) {
    console.error(`[Drive] Failed to get/create '${name}' folder:`, err.message);
    return null;
  }
}

async function uploadImageToDrive(filePath, fileName) {
  if (!drive) return;
  try {
    const isLogo = filePath.includes('/logos/');
    if (isLogo) {
      driveLogosFolderId = driveLogosFolderId || await getOrCreateSubfolder('logos', DRIVE_FOLDER_ID);
    } else {
      driveBillsFolderId = driveBillsFolderId || await getOrCreateSubfolder('bills', DRIVE_FOLDER_ID);
    }
    const folderId = isLogo ? driveLogosFolderId : driveBillsFolderId;
    if (!folderId) return;
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.pdf': 'application/pdf', '.webp': 'image/webp' };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    const existing = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)', spaces: 'drive'
    });
    const media = { mimeType, body: fs.createReadStream(filePath) };
    if (existing.data.files?.length > 0) {
      await drive.files.update({ fileId: existing.data.files[0].id, media });
    } else {
      await drive.files.create({ requestBody: { name: fileName, parents: [folderId] }, media });
    }
    console.log('[Drive] Uploaded image:', fileName);
  } catch (err) {
    console.error('[Drive] Image upload failed:', fileName, err.message);
  }
}

async function downloadFolderFromDrive(driveFolderId, localDir) {
  try {
    const res = await drive.files.list({
      q: `'${driveFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)', spaces: 'drive'
    });
    for (const f of (res.data.files || [])) {
      const localPath = path.join(localDir, f.name);
      if (fs.existsSync(localPath)) continue;
      const dest = fs.createWriteStream(localPath);
      const response = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'stream' });
      await new Promise((resolve, reject) => { response.data.pipe(dest); dest.on('finish', resolve); dest.on('error', reject); });
      console.log('[Drive] Downloaded:', f.name);
    }
  } catch (err) {
    console.error('[Drive] Download folder failed:', err.message);
  }
}

async function downloadUploadsFromDrive() {
  if (!drive) return;
  try {
    driveLogosFolderId = driveLogosFolderId || await getOrCreateSubfolder('logos', DRIVE_FOLDER_ID);
    driveBillsFolderId = driveBillsFolderId || await getOrCreateSubfolder('bills', DRIVE_FOLDER_ID);
    if (driveLogosFolderId) await downloadFolderFromDrive(driveLogosFolderId, LOGO_DIR);
    if (driveBillsFolderId) await downloadFolderFromDrive(driveBillsFolderId, BILL_DIR);
    console.log('[Drive] Images synced from Drive');
  } catch (err) {
    console.error('[Drive] Download uploads failed:', err.message);
  }
}

function scheduleImageUpload(req) {
  if (!drive || !req.files) return;
  Object.values(req.files).flat().forEach(f => {
    uploadImageToDrive(f.path, f.filename).catch(err => console.error('[Drive] schedule upload failed:', err.message));
  });
}

initGoogleDrive();

app.set('trust proxy', 1);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: 'glori.sid',
    secret: process.env.SESSION_SECRET || 'glori_secret_2026_change_me',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: 'auto',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/uploads/logos', express.static(LOGO_DIR, { maxAge: '7d' }));
app.use('/uploads/bills', express.static(BILL_DIR, { maxAge: '7d' }));
app.use(express.static(PUBLIC_DIR));

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | ip=${req.ip} | secure=${req.secure} | xfwd=${
      req.headers['x-forwarded-proto'] || '-'
    }`
  );
  next();
});

const USERS = [
  {
    username: 'bin',
    passwordHash:
      '$2b$10$6nm6.uHG3zmS7/u4nliIMukMkuZYJsTpnOE2ugpwvXKRifDKbrhCS'
  }
];

function isPageRequest(req) {
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();

  if (isPageRequest(req)) {
    return res.redirect('/login.html');
  }

  return res.status(401).json({ ok: false, message: 'Unauthorized' });
}

function sendError(res, message, status = 500) {
  return res.status(status).json({ ok: false, error: message });
}

function toNumber(value) {
  return Number(String(value ?? '').replace(/,/g, '').trim()) || 0;
}

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function toText(value) {
  return String(value ?? '').trim();
}

// ── PROJECT STATUS ─────────────────────────────────────
const VALID_STATUSES = ['draft', 'active', 'on_hold', 'done', 'cancelled'];

function normalizeStatus(value) {
  const v = String(value || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  return VALID_STATUSES.includes(v) ? v : 'draft';
}

function publicPathFromFile(file) {
  if (!file) return '';
  if (file.fieldname === 'companyLogo') return `/uploads/logos/${file.filename}`;
  if (file.fieldname === 'billFile') return `/uploads/bills/${file.filename}`;
  return `/uploads/${file.filename}`;
}

function removePublicFile(filePath) {
  try {
    if (!filePath || typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) return;
    const fullPath = path.join(DATA_DIR, filePath.replace('/', ''));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (error) {
    console.error('Failed deleting file', filePath, error.message);
  }
}

function styleSheet(sheet, count) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = Array.from({ length: count }, () => ({ width: 22 }));

  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  row.height = 22;
}

function ensureHeaders(sheet, headers) {
  if (sheet.rowCount === 0) {
    sheet.addRow(headers);
  } else {
    const current = sheet
      .getRow(1)
      .values
      .slice(1)
      .map((v) => String(v || '').trim());

    const matches = JSON.stringify(current) === JSON.stringify(headers);

    if (!matches) {
      if (sheet.rowCount >= 1) sheet.spliceRows(1, 1);
      sheet.insertRow(1, headers);
    }
  }

  styleSheet(sheet, headers.length);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'companyLogo') return cb(null, LOGO_DIR);
    if (file.fieldname === 'billFile') return cb(null, BILL_DIR);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path
      .basename(file.originalname || 'file', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);

    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }
});

const projectUpload = upload.fields([{ name: 'companyLogo', maxCount: 1 }]);
const transactionUpload = upload.fields([{ name: 'billFile', maxCount: 1 }]);

const PROJECT_HEADERS = [
  'id',
  'no',
  'projectCode',
  'projectName',
  'category',
  'owner',
  'startDate',
  'endDate',
  'remark',
  'logoPath',
  'contractCurrency',
  'totalPrice',
  'vatPercent',
  'totalWithVat',
  'profit',
  'status',
  'createdAt',
  'updatedAt'
];

const TRANSACTION_HEADERS = [
  'id',
  'no',
  'projectId',
  'type',
  'category',
  'description',
  'currency',
  'amount',
  'date',
  'billPath',
  'createdAt',
  'updatedAt'
];

let workbookCache = null;
let projectSheetCache = null;
let transactionSheetCache = null;

function invalidateWorkbookCache() {
  workbookCache = null;
  projectSheetCache = null;
  transactionSheetCache = null;
}

async function openWorkbook() {
  if (workbookCache && projectSheetCache && transactionSheetCache) {
    return {
      workbook: workbookCache,
      projectSheet: projectSheetCache,
      transactionSheet: transactionSheetCache
    };
  }

  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(EXCEL_FILE)) {
    await workbook.xlsx.readFile(EXCEL_FILE);
  }

  let projectSheet = workbook.getWorksheet(PROJECT_SHEET);
  let transactionSheet = workbook.getWorksheet(TRANSACTION_SHEET);

  if (!projectSheet) projectSheet = workbook.addWorksheet(PROJECT_SHEET);
  if (!transactionSheet) transactionSheet = workbook.addWorksheet(TRANSACTION_SHEET);

  ensureHeaders(projectSheet, PROJECT_HEADERS);
  ensureHeaders(transactionSheet, TRANSACTION_HEADERS);

  workbookCache = workbook;
  projectSheetCache = projectSheet;
  transactionSheetCache = transactionSheet;

  return { workbook, projectSheet, transactionSheet };
}

let writeQueue = Promise.resolve();

function queueWrite(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

async function saveWorkbook(workbook) {
  await workbook.xlsx.writeFile(EXCEL_FILE);
  invalidateWorkbookCache();
  await uploadToDrive();
}

function rowToProject(row) {
  const values = row.values;
  return {
    id: toText(values[1]),
    no: toNumber(values[2]),
    projectCode: toText(values[3]),
    projectName: toText(values[4]),
    category: toText(values[5]),
    owner: toText(values[6]),
    startDate: normalizeDate(values[7]),
    endDate: normalizeDate(values[8]),
    remark: toText(values[9]),
    logoPath: toText(values[10]),
    contractCurrency: toText(values[11]) || 'LAK',
    totalPrice: toNumber(values[12]),
    vatPercent: toNumber(values[13]),
    totalWithVat: toNumber(values[14]),
    profit: toNumber(values[15]),
    status: normalizeStatus(values[16]),
    createdAt: toText(values[17]),
    updatedAt: toText(values[18]),
    _rowNumber: row.number
  };
}

function rowToTransaction(row) {
  const values = row.values;
  return {
    id: toText(values[1]),
    no: toNumber(values[2]),
    projectId: toText(values[3]),
    type: toText(values[4]).toLowerCase(),
    category: toText(values[5]),
    description: toText(values[6]),
    currency: toText(values[7]) || 'LAK',
    amount: toNumber(values[8]),
    date: normalizeDate(values[9]),
    billPath: toText(values[10]),
    createdAt: toText(values[11]),
    updatedAt: toText(values[12]),
    _rowNumber: row.number
  };
}

function readProjects(sheet) {
  const projects = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (!row.getCell(1).value && !row.getCell(4).value) return;
    projects.push(rowToProject(row));
  });
  return projects;
}

function readTransactions(sheet) {
  const transactions = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (!row.getCell(1).value && !row.getCell(3).value) return;
    transactions.push(rowToTransaction(row));
  });
  return transactions;
}

function projectToRow(project) {
  return [
    toText(project.id),
    toNumber(project.no),
    toText(project.projectCode),
    toText(project.projectName),
    toText(project.category),
    toText(project.owner),
    normalizeDate(project.startDate),
    normalizeDate(project.endDate),
    toText(project.remark),
    toText(project.logoPath),
    toText(project.contractCurrency || 'LAK'),
    toNumber(project.totalPrice),
    toNumber(project.vatPercent),
    toNumber(project.totalWithVat),
    toNumber(project.profit),
    normalizeStatus(project.status),
    toText(project.createdAt),
    toText(project.updatedAt)
  ];
}

function transactionToRow(tx) {
  return [
    toText(tx.id),
    toNumber(tx.no),
    toText(tx.projectId),
    toText(tx.type),
    toText(tx.category),
    toText(tx.description),
    toText(tx.currency),
    toNumber(tx.amount),
    normalizeDate(tx.date),
    toText(tx.billPath),
    toText(tx.createdAt),
    toText(tx.updatedAt)
  ];
}

async function getAllData() {
  const { projectSheet, transactionSheet } = await openWorkbook();
  return {
    projects: readProjects(projectSheet),
    transactions: readTransactions(transactionSheet)
  };
}

function nextProjectNo(projects) {
  return projects.reduce((max, item) => Math.max(max, toNumber(item.no)), 0) + 1;
}

function nextProjectCode(projects) {
  const max = projects.reduce((current, item) => {
    const match = String(item.projectCode || '').match(/GB-(\d+)/i);
    const num = match ? Number(match[1]) : 0;
    return Math.max(current, num);
  }, 0);

  return `GB-${String(max + 1).padStart(5, '0')}`;
}

function nextTransactionNo(transactions, projectId) {
  return (
    transactions
      .filter((tx) => tx.projectId === projectId)
      .reduce((max, item) => Math.max(max, toNumber(item.no)), 0) + 1
  );
}

function validateProject(project) {
  if (!project.projectName) return 'Project name is required';
  if (!project.category) return 'Category is required';
  return '';
}

function validateTransaction(tx) {
  if (!tx.projectId) return 'Project is required';
  if (!['income', 'investment', 'expense'].includes(tx.type)) return 'Type is invalid';
  if (!tx.category) return 'Category is required';
  if (toNumber(tx.amount) <= 0) return 'Amount must be greater than 0';
  if (!tx.date) return 'Date is required';
  return '';
}

function calcTotalWithVat(totalPrice, vatPercent = DEFAULT_VAT_PERCENT) {
  const total = toNumber(totalPrice);
  const vat = toNumber(vatPercent);
  return total + (total * vat) / 100;
}

function calcActualCost(transactions) {
  return transactions.reduce((sum, tx) => {
    if (tx.type === 'investment' || tx.type === 'expense') {
      sum += toNumber(tx.amount);
    }
    return sum;
  }, 0);
}

function calcProfit(totalWithVat, actualCost) {
  return toNumber(totalWithVat) - toNumber(actualCost);
}

function calculateProjectNumbers(project, transactions) {
  const related = transactions.filter((tx) => tx.projectId === project.id);

  const totals = related.reduce(
    (sum, tx) => {
      const amount = toNumber(tx.amount);
      if (tx.type === 'income') sum.income += amount;
      if (tx.type === 'investment') sum.investment += amount;
      if (tx.type === 'expense') sum.expense += amount;
      return sum;
    },
    { income: 0, investment: 0, expense: 0 }
  );

  const totalPrice = toNumber(project.totalPrice);
  const vatPercent =
    project.vatPercent === 0
      ? 0
      : toNumber(project.vatPercent || DEFAULT_VAT_PERCENT);
  const totalWithVat = calcTotalWithVat(totalPrice, vatPercent);
  const actualCost = calcActualCost(related);
  const profit = calcProfit(totalWithVat, actualCost);

  return {
    totals,
    totalPrice,
    vatPercent,
    totalWithVat,
    actualCost,
    profit,
    estimatedProfit: profit,
    balance: totals.income - totals.investment - totals.expense,
    transactionCount: related.length
  };
}

function projectPayload(body, existing, req, projects, transactions) {
  const uploadedLogo = publicPathFromFile(req.files?.companyLogo?.[0]);

  const totalPrice = toNumber(body.totalPrice ?? existing?.totalPrice);
  const vatPercent =
    body.vatPercent !== undefined && body.vatPercent !== null && body.vatPercent !== ''
      ? toNumber(body.vatPercent)
      : existing?.vatPercent === 0
        ? 0
        : toNumber(existing?.vatPercent || DEFAULT_VAT_PERCENT);

  const totalWithVat = calcTotalWithVat(totalPrice, vatPercent);

  const baseProject = {
    id: existing?.id || uuidv4(),
    no: existing?.no || nextProjectNo(projects),
    projectCode: existing?.projectCode || nextProjectCode(projects),
    projectName: toText(body.projectName ?? existing?.projectName),
    category: toText(body.category ?? existing?.category),
    owner: toText(body.owner ?? existing?.owner),
    startDate: normalizeDate(body.startDate ?? existing?.startDate),
    endDate: normalizeDate(body.endDate ?? existing?.endDate),
    remark: toText(body.remark ?? existing?.remark),
    logoPath: uploadedLogo || toText(body.keepLogoPath ?? existing?.logoPath),
    contractCurrency: toText(body.contractCurrency ?? existing?.contractCurrency ?? 'LAK').toUpperCase(),
    status: normalizeStatus(body.status ?? existing?.status ?? 'draft'),
    totalPrice,
    vatPercent,
    totalWithVat,
    profit: 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const relatedTransactions = (transactions || []).filter(
    (tx) => tx.projectId === baseProject.id
  );

  const actualCost = calcActualCost(relatedTransactions);
  const profit = calcProfit(totalWithVat, actualCost);

  return {
    ...baseProject,
    profit
  };
}

function transactionPayload(projectId, body, req, transactions) {
  return {
    id: uuidv4(),
    no: nextTransactionNo(transactions, projectId),
    projectId,
    type: toText(body.type).toLowerCase(),
    category: toText(body.category),
    description: toText(body.description),
    currency: toText(body.currency || 'LAK').toUpperCase(),
    amount: toNumber(body.amount),
    date: normalizeDate(body.date),
    billPath: publicPathFromFile(req.files?.billFile?.[0]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildProjectSummary(project, transactions) {
  const related = transactions
    .filter((tx) => tx.projectId === project.id)
    .sort((a, b) => {
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

  const numbers = calculateProjectNumbers(project, related);

  return {
    ...project,
    contractCurrency: project.contractCurrency || 'LAK',
    status: normalizeStatus(project.status),
    totalPrice: numbers.totalPrice,
    vatPercent: numbers.vatPercent,
    totalWithVat: numbers.totalWithVat,
    profit: numbers.profit,
    transactions: related.map(({ _rowNumber, ...tx }) => tx),
    totals: numbers.totals,
    actualCost: numbers.actualCost,
    estimatedProfit: numbers.estimatedProfit,
    balance: numbers.balance,
    transactionCount: numbers.transactionCount
  };
}

function syncProjectFinancials(projectSheet, project, transactions) {
  if (!project?._rowNumber) return project;

  const numbers = calculateProjectNumbers(project, transactions);
  const row = projectSheet.getRow(project._rowNumber);

  const updatedProject = {
    ...project,
    totalPrice: numbers.totalPrice,
    vatPercent: numbers.vatPercent,
    totalWithVat: numbers.totalWithVat,
    profit: numbers.profit,
    updatedAt: new Date().toISOString()
  };

  row.values = projectToRow(updatedProject);
  row.commit();

  return updatedProject;
}

app.get('/', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/index.html');
  }
  return res.sendFile(LOGIN_HTML);
});

app.get('/login.html', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/index.html');
  }
  return res.sendFile(LOGIN_HTML);
});

app.get('/index.html', requireAuth, (req, res) => {
  return res.sendFile(INDEX_HTML);
});

app.post('/api/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'Username and password are required' });
    }

    const user = USERS.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid username or password' });
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return res.status(401).json({ ok: false, message: 'Invalid username or password' });
    }

    req.session.user = { username: user.username };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ ok: false, message: 'Login failed' });
      }
      return res.json({ ok: true, user: req.session.user });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, message: 'Login failed' });
  }
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ ok: false, message: 'Logout failed' });
    }

    res.clearCookie('glori.sid', {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax'
    });

    return res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false });
  }
  return res.json({ ok: true, user: req.session.user });
});

app.get("/api/files", (req, res) => {
  const uploads = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
  const dataFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [];
  res.json({ dataDir: DATA_DIR, dataFiles, uploadCount: uploads.length, uploads });
});

app.get("/api/health", async (req, res) => {
  try {
    const excelExists = fs.existsSync(EXCEL_FILE);
    return res.status(200).json({
      ok: true,
      app: 'Glori Budget Manager',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      excelExists
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const { projects, transactions } = await getAllData();
    const items = projects
      .map((project) => buildProjectSummary(project, transactions))
      .sort((a, b) => toNumber(b.no) - toNumber(a.no));

    return res.json(items);
  } catch (error) {
    console.error('Cannot read projects:', error);
    return sendError(res, 'Cannot read projects');
  }
});

app.get('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { projects, transactions } = await getAllData();
    const project = projects.find((item) => item.id === req.params.id);
    if (!project) return sendError(res, 'Project not found', 404);

    return res.json(buildProjectSummary(project, transactions));
  } catch (error) {
    console.error('Cannot read project:', error);
    return sendError(res, 'Cannot read project');
  }
});

app.get('/api/next-project-code', requireAuth, async (req, res) => {
  try {
    const { projects } = await getAllData();
    return res.json({
      no: nextProjectNo(projects),
      projectCode: nextProjectCode(projects)
    });
  } catch (error) {
    console.error('Cannot generate project code:', error);
    return sendError(res, 'Cannot generate project code');
  }
});

app.post('/api/projects', requireAuth, projectUpload, async (req, res) => {
  try {
    const result = await queueWrite(async () => {
      const { workbook, projectSheet, transactionSheet } = await openWorkbook();

      const projects = readProjects(projectSheet);
      const transactions = readTransactions(transactionSheet);

      const project = projectPayload(req.body, null, req, projects, transactions);
      const validation = validateProject(project);
      if (validation) {
        return { status: 400, body: { ok: false, error: validation } };
      }

      projectSheet.addRow(projectToRow(project));
      await saveWorkbook(workbook);

      return {
        status: 200,
        body: { ok: true, project: buildProjectSummary(project, transactions) }
      };
    });

    scheduleImageUpload(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot save project:', error);
    return sendError(res, 'Cannot save project');
  }
});

app.put('/api/projects/:id', requireAuth, projectUpload, async (req, res) => {
  try {
    const result = await queueWrite(async () => {
      const { workbook, projectSheet, transactionSheet } = await openWorkbook();

      const projects = readProjects(projectSheet);
      const transactions = readTransactions(transactionSheet);

      const existing = projects.find((item) => item.id === req.params.id);
      if (!existing) {
        return { status: 404, body: { ok: false, error: 'Project not found' } };
      }

      const updated = projectPayload(req.body, existing, req, projects, transactions);

      updated.id = existing.id;
      updated.no = existing.no;
      updated.projectCode = existing.projectCode;
      updated.createdAt = existing.createdAt;
      updated.updatedAt = new Date().toISOString();

      const validation = validateProject(updated);
      if (validation) {
        return { status: 400, body: { ok: false, error: validation } };
      }

      if (req.files?.companyLogo?.[0] && existing.logoPath && existing.logoPath !== updated.logoPath) {
        removePublicFile(existing.logoPath);
      }

      const row = projectSheet.getRow(existing._rowNumber);
      row.values = projectToRow(updated);
      row.commit();

      await saveWorkbook(workbook);

      return {
        status: 200,
        body: {
          ok: true,
          project: buildProjectSummary(updated, transactions)
        }
      };
    });

    scheduleImageUpload(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot update project:', error);
    return sendError(res, 'Cannot update project');
  }
});

// ── Quick status update (used by card dropdown) ─────────
app.patch('/api/projects/:id/status', requireAuth, async (req, res) => {
  try {
    const newStatus = normalizeStatus(req.body?.status);

    const result = await queueWrite(async () => {
      const { workbook, projectSheet } = await openWorkbook();
      const projects = readProjects(projectSheet);

      const existing = projects.find((item) => item.id === req.params.id);
      if (!existing) {
        return { status: 404, body: { ok: false, error: 'Project not found' } };
      }

      const updated = {
        ...existing,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      const row = projectSheet.getRow(existing._rowNumber);
      row.values = projectToRow(updated);
      row.commit();

      await saveWorkbook(workbook);

      return { status: 200, body: { ok: true, status: newStatus } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot update status:', error);
    return sendError(res, 'Cannot update status');
  }
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const result = await queueWrite(async () => {
      const { workbook, projectSheet, transactionSheet } = await openWorkbook();

      const projects = readProjects(projectSheet);
      const transactions = readTransactions(transactionSheet);

      const existing = projects.find((item) => item.id === req.params.id);
      if (!existing) {
        return { status: 404, body: { ok: false, error: 'Project not found' } };
      }

      if (!existing._rowNumber) {
        return { status: 400, body: { ok: false, error: 'Project row number is missing' } };
      }

      if (existing.logoPath) {
        removePublicFile(existing.logoPath);
      }

      const related = transactions.filter((tx) => tx.projectId === existing.id);

      related.forEach((tx) => {
        if (tx.billPath) removePublicFile(tx.billPath);
      });

      related
        .map((tx) => tx._rowNumber)
        .filter(Boolean)
        .sort((a, b) => b - a)
        .forEach((rowNumber) => {
          transactionSheet.spliceRows(rowNumber, 1);
        });

      projectSheet.spliceRows(existing._rowNumber, 1);

      await saveWorkbook(workbook);

      return { status: 200, body: { ok: true } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot delete project:', error);
    return sendError(res, 'Cannot delete project');
  }
});

app.post('/api/projects/:id/transactions', requireAuth, transactionUpload, async (req, res) => {
  try {
    const result = await queueWrite(async () => {
      const { workbook, projectSheet, transactionSheet } = await openWorkbook();
      const { projects, transactions } = await getAllData();

      const project = projects.find((item) => item.id === req.params.id);
      if (!project) {
        return { status: 404, body: { ok: false, error: 'Project not found' } };
      }

      const tx = transactionPayload(project.id, req.body, req, transactions);
      const validation = validateTransaction(tx);
      if (validation) {
        return { status: 400, body: { ok: false, error: validation } };
      }

      transactionSheet.addRow(transactionToRow(tx));

      const updatedProject = syncProjectFinancials(projectSheet, project, [...transactions, tx]);

      await saveWorkbook(workbook);

      return {
        status: 200,
        body: {
          ok: true,
          transaction: tx,
          project: buildProjectSummary(updatedProject, [...transactions, tx])
        }
      };
    });

    scheduleImageUpload(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot save transaction:', error);
    return sendError(res, 'Cannot save transaction');
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const result = await queueWrite(async () => {
      const { workbook, projectSheet, transactionSheet } = await openWorkbook();
      const { projects, transactions } = await getAllData();

      const tx = transactions.find((item) => item.id === req.params.id);
      if (!tx) {
        return { status: 404, body: { ok: false, error: 'Transaction not found' } };
      }

      const remainingTransactions = transactions.filter((item) => item.id !== tx.id);
      const project = projects.find((item) => item.id === tx.projectId);

      if (tx.billPath) removePublicFile(tx.billPath);
      transactionSheet.spliceRows(tx._rowNumber, 1);

      if (project) {
        syncProjectFinancials(projectSheet, project, remainingTransactions);
      }

      await saveWorkbook(workbook);

      return { status: 200, body: { ok: true } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Cannot delete transaction:', error);
    return sendError(res, 'Cannot delete transaction');
  }
});

app.get('/api/download-excel', requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      await queueWrite(async () => {
        const { workbook } = await openWorkbook();
        await saveWorkbook(workbook);
      });
    }

    return res.download(EXCEL_FILE, 'glori-budget.xlsx');
  } catch (error) {
    console.error('Cannot download Excel:', error);
    return sendError(res, 'Cannot download Excel');
  }
});

app.use('/api', (req, res) => {
  return res.status(404).json({ ok: false, error: 'API route not found' });
});

app.use((req, res) => {
  if (isPageRequest(req)) {
    return res.redirect('/');
  }
  return res.status(404).send('Page not found');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, '0.0.0.0', async () => {
  await downloadFromDrive();
  await downloadUploadsFromDrive();
  console.log(`Glori Budget Manager running on port ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`PUBLIC_DIR=${PUBLIC_DIR}`);
  console.log(`DATA_DIR=${DATA_DIR}`);
  console.log(`UPLOAD_DIR=${UPLOAD_DIR}`);
  console.log(`EXCEL_FILE=${EXCEL_FILE}`);
});