const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const https = require('https');

const CLIENT_ID = '416096251316-ksp0m60vhheicqvb4jcngs5a226r96gg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive']
});

console.log('\n=== Open this URL in your browser (only click once!) ===\n');
console.log(authUrl);
console.log('\n=== Waiting... ===\n');

let handled = false;
const server = http.createServer(async (req, res) => {
  if (handled) return res.end('Already handled');
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/callback' || !parsed.query.code) return res.end('Waiting...');
  handled = true;

  try {
    const { tokens } = await oauth2Client.getToken(parsed.query.code);
    const refreshToken = tokens.refresh_token;

    // Test refresh token directly against Google
    const postData = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString();

    const testReq = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (testRes) => {
      let data = '';
      testRes.on('data', c => data += c);
      testRes.on('end', () => {
        const json = JSON.parse(data);
        server.close();
        if (json.access_token) {
          res.end('<h2>Success! Refresh token verified. Check terminal.</h2>');
          console.log('\n=== REFRESH TOKEN VERIFIED ✓ ===');
          console.log('\nYOUR REFRESH TOKEN:\n');
          console.log(refreshToken);
          console.log('\n=== Copy this to Railway GOOGLE_REFRESH_TOKEN ===\n');
        } else {
          res.end(`<h2>Token invalid: ${json.error}</h2>`);
          console.log('FAILED:', json.error, '-', json.error_description);
        }
      });
    });
    testReq.write(postData);
    testReq.end();
  } catch (err) {
    res.end(`<h2>Error: ${err.message}</h2>`);
    server.close();
    console.error('ERROR:', err.message);
  }
});

server.listen(3333);
