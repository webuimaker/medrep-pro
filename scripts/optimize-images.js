// ══════════════════════════════════════════════════════════════
// scripts/optimize-images.js
//
// Runs automatically on every Netlify build (see netlify.toml's build
// command) — including the deploy triggered right after someone uploads
// an image through /admin. Whatever size or format a rep/marketing
// person uploads, this brings it down to a sane web size before the site
// is published, so nobody has to remember to compress anything by hand.
//
// What it does to every .jpg/.jpeg/.png under images/uploads:
//   - Auto-rotates based on EXIF orientation (fixes sideways phone photos)
//   - Resizes so the longest side is at most MAX_WIDTH px (never enlarges)
//   - Re-encodes as a compressed, progressive JPEG (or optimized PNG)
//   - Skips the file if the "optimized" version wouldn't actually be
//     smaller (e.g. it's already been through this before)
//
// This only affects what gets deployed/served — it does not rewrite
// history or touch anything already committed to the repo beyond this
// build's output.
// ══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'images', 'uploads');
const MAX_WIDTH = 1800;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 82;

async function optimizeFile(filePath) {
  const before = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();
  const original = fs.readFileSync(filePath);

  let pipeline = sharp(original).rotate();
  const meta = await sharp(original).metadata();

  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  let outBuffer;
  if (ext === '.png') {
    outBuffer = await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 }).toBuffer();
  } else {
    outBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true }).toBuffer();
  }

  if (outBuffer.length < before) {
    fs.writeFileSync(filePath, outBuffer);
    return { changed: true, before, after: outBuffer.length };
  }
  return { changed: false, before, after: before };
}

async function run() {
  if (!fs.existsSync(DIR)) {
    console.log(`No ${DIR} folder found — nothing to optimize.`);
    return;
  }

  const files = fs.readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  console.log(`Optimizing ${files.length} image(s) in images/uploads ...`);

  let totalBefore = 0;
  let totalAfter = 0;
  let changedCount = 0;

  for (const file of files) {
    const filePath = path.join(DIR, file);
    try {
      const result = await optimizeFile(filePath);
      totalBefore += result.before;
      totalAfter += result.after;
      if (result.changed) {
        changedCount++;
        console.log(`  ✓ ${file}: ${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB`);
      } else {
        console.log(`  – ${file}: already optimized, left as-is`);
      }
    } catch (err) {
      console.error(`  ✗ ${file}: could not process (${err.message}) — left untouched`);
    }
  }

  console.log(`Done. ${changedCount} file(s) optimized. Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
}

run();