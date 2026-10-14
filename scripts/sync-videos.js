// ============================================================
// Sync Videos Script — Solo Leveling System
// Syncs uploaded videos from assets/videos/ to public/videos/ (for Web)
// and displays a status report for all training & recovery videos.
// ============================================================

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'videos');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'videos');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

console.log('⚡ Solo System Video Sync & Verification');
console.log('--------------------------------------------------');

const files = [
  'intro-1.mp4',
  'intro-2.mp4',
  'intro-3.mp4',
  'intro-4.mp4',
  'intro-5.mp4',
  'intro-6.mp4',
  'intro-7.mp4',
  'intro-8.mp4',
  'recovery.mp4',
];

let syncCount = 0;

function syncFile(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.log(`[WARN]   ${label} is MISSING in assets/videos/`);
    return;
  }

  const srcStat = fs.statSync(src);
  let needsCopy = true;

  if (fs.existsSync(dest)) {
    const destStat = fs.statSync(dest);
    if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) {
      needsCopy = false;
    }
  }

  const sizeMb = (srcStat.size / (1024 * 1024)).toFixed(2);
  if (needsCopy) {
    fs.copyFileSync(src, dest);
    syncCount++;
    console.log(`[SYNCED] ${label} (${sizeMb} MB)`);
  } else {
    console.log(`[OK]     ${label} (${sizeMb} MB)`);
  }
}

for (const file of files) {
  syncFile(path.join(ASSETS_DIR, file), path.join(PUBLIC_DIR, file), file);
}

// Sync splash screen intro.mp4 to public/intro.mp4 (root)
syncFile(
  path.join(ASSETS_DIR, 'intro.mp4'),
  path.join(__dirname, '..', 'public', 'intro.mp4'),
  'intro.mp4 -> public/intro.mp4'
);

console.log('--------------------------------------------------');
console.log(`Sync complete. ${syncCount} file(s) updated.`);
