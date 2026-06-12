/**
 * fix-images.js
 * Run once: node fix-images.js
 * 
 * Finds all logos/bills in Google Drive, makes them public,
 * then updates budget.xlsx to store Drive URLs instead of /uploads/... paths.
 */

require('dotenv').config();
const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '';
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data');
const XLSX_PATH = path.join(DATA_DIR, 'budget.xlsx');

async function main() {
  // 1. Init Drive
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken || !DRIVE_FOLDER_ID) {
    console.error('Missing Google Drive credentials in .env — aborting.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:3333/callback');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  console.log('[Drive] Connected OK');

  // 2. Find logos and bills subfolders
  async function getFolderId(name) {
    const res = await drive.files.list({
      q: `name='${name}' and '${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)', spaces: 'drive'
    });
    return res.data.files?.[0]?.id || null;
  }

  const logosFolderId = await getFolderId('logos');
  const billsFolderId = await getFolderId('bills');
  console.log('[Drive] logos folder:', logosFolderId);
  console.log('[Drive] bills folder:', billsFolderId);

  // 3. List all files in a folder, make them public, return name→url map
  async function buildUrlMap(folderId) {
    if (!folderId) return {};
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)', spaces: 'drive', pageSize: 1000
    });
    const map = {};
    for (const file of (res.data.files || [])) {
      try {
        await drive.permissions.create({
          fileId: file.id,
          requestBody: { role: 'reader', type: 'anyone' }
        });
      } catch (e) {
        // already public or error — ignore
      }
      map[file.name] = `https://lh3.googleusercontent.com/d/${file.id}`;
    }
    console.log(`[Drive] Mapped ${Object.keys(map).length} files`);
    return map;
  }

  const logosMap = await buildUrlMap(logosFolderId);
  const billsMap = await buildUrlMap(billsFolderId);

  // Also check root uploads folder for any files not in subfolders
  const rootRes = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)', spaces: 'drive', pageSize: 1000
  });
  const rootMap = {};
  for (const file of (rootRes.data.files || [])) {
    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (e) {}
    rootMap[file.name] = `https://lh3.googleusercontent.com/d/${file.id}`;
  }
  console.log(`[Drive] Mapped ${Object.keys(rootMap).length} root files`);

  // 4. Helper: resolve an old /uploads/... path to a Drive URL
  function resolveOldPath(oldPath) {
    if (!oldPath || !oldPath.startsWith('/uploads/')) return oldPath;
    const fileName = path.basename(oldPath);
    return logosMap[fileName] || billsMap[fileName] || rootMap[fileName] || oldPath;
  }

  // 5. Update budget.xlsx
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);

  const projectSheet = wb.getWorksheet('Projects');
  const txSheet = wb.getWorksheet('Transactions');

  let projectFixed = 0, txFixed = 0;

  projectSheet.eachRow((row, i) => {
    if (i === 1) return; // skip header
    const cell = row.getCell(10); // logoPath column
    const old = String(cell.value || '');
    if (old.startsWith('/uploads/')) {
      const newVal = resolveOldPath(old);
      if (newVal !== old) {
        cell.value = newVal;
        row.commit();
        projectFixed++;
        console.log(`[Projects] Row ${i}: ${path.basename(old)} → Drive URL`);
      } else {
        console.warn(`[Projects] Row ${i}: no Drive match for ${path.basename(old)}`);
      }
    }
  });

  txSheet.eachRow((row, i) => {
    if (i === 1) return;
    const cell = row.getCell(10); // billPath column
    const old = String(cell.value || '');
    if (old.startsWith('/uploads/')) {
      const newVal = resolveOldPath(old);
      if (newVal !== old) {
        cell.value = newVal;
        row.commit();
        txFixed++;
        console.log(`[Transactions] Row ${i}: ${path.basename(old)} → Drive URL`);
      } else {
        console.warn(`[Transactions] Row ${i}: no Drive match for ${path.basename(old)}`);
      }
    }
  });

  await wb.xlsx.writeFile(XLSX_PATH);
  console.log(`\n✅ Done! Fixed ${projectFixed} project logos, ${txFixed} transaction bills.`);
  console.log('Restart your server to see the changes.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
