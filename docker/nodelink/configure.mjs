// Derives config.js from NodeLink's defaults with the settings Melofy needs.
// Fails the image build when an expected setting is missing, so an upstream
// config change can never silently ship a broken streaming setup.
import fs from 'node:fs';

let config = fs.readFileSync('config.default.js', 'utf8');

function replaceOrFail(pattern, replacement, description) {
  if (!pattern.test(config)) {
    console.error(`[configure] Could not find ${description} in config.default.js`);
    process.exit(1);
  }
  config = config.replace(pattern, replacement);
}

// /v4/trackstream hands the API a direct audio URL to relay to browsers.
replaceOrFail(/enableTrackStreamEndpoint:\s*false/, 'enableTrackStreamEndpoint: true', 'enableTrackStreamEndpoint');

// YouTube serves AndroidVR (the upstream default first client) URLs only up
// to ~1MB without a proof-of-origin token: the browser's open-range request
// gets 403 and songs never start or cut out after a minute. TVCast URLs serve
// complete files, so it goes first; the others remain as fallbacks.
replaceOrFail(
  /playback:\s*\[[^\]]*\]/,
  "playback: ['TVCast', 'AndroidVR', 'TV', 'WebEmbedded', 'WebParentTools', 'Web', 'IOS']",
  'the YouTube playback client list',
);

fs.writeFileSync('config.js', config);
console.log('[configure] config.js written');
