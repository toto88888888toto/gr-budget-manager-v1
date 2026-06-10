const { google } = require('googleapis');

const CLIENT_ID = '416096251316-ksp0m60vhheicqvb4jcngs5a226r96gg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const DRIVE_FOLDER_ID = '14zwZ7CCau3cA_lbXRI_dmE8xly099LZ2';

async function test() {
  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Try to list files in the folder
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });
    console.log('SUCCESS! Files in folder:', res.data.files);
  } catch (err) {
    console.error('FAILED:', err.message);
  }
}

test();
