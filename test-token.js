// Test if refresh token works by calling Google's token endpoint directly
const https = require('https');

const CLIENT_ID = '416096251316-ksp0m60vhheicqvb4jcngs5a226r96gg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const postData = new URLSearchParams({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  refresh_token: REFRESH_TOKEN,
  grant_type: 'refresh_token'
}).toString();

const options = {
  hostname: 'oauth2.googleapis.com',
  path: '/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.access_token) {
      console.log('SUCCESS: Got access token!');
      console.log('Token type:', json.token_type);
      console.log('Expires in:', json.expires_in, 'seconds');
    } else {
      console.log('FAILED:', json.error, '-', json.error_description);
    }
  });
});

req.on('error', console.error);
req.write(postData);
req.end();
