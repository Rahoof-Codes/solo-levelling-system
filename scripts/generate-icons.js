const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const imagesDir = path.join(rootDir, 'assets', 'images');
const publicDir = path.join(rootDir, 'public');
const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

// Use source avatar if available, otherwise fallback to existing solo-app-icon
const srcCandidates = [
  path.join(imagesDir, 'source-avatar.jpg'),
  path.join(imagesDir, 'solo-app-icon.png'),
  path.join(publicDir, 'solo-app-icon.png'),
];

const srcPath = srcCandidates.find((p) => fs.existsSync(p));

async function main() {
  if (!srcPath) {
    throw new Error('No source icon image found in assets/images or public!');
  }

  console.log(`Using source image: ${srcPath}`);

  // 1. Prepare base circular masked PNG (736x736) with transparent outside
  const circleMaskSvg = Buffer.from(
    '<svg width="736" height="736"><circle cx="368" cy="368" r="366.5" fill="#ffffff" /></svg>'
  );

  const circularAvatarBuffer = await sharp(srcPath)
    .resize(736, 736)
    .ensureAlpha()
    .composite([{ input: circleMaskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Save circular avatar and raw copy for UI / app usage
  await sharp(circularAvatarBuffer)
    .png()
    .toFile(path.join(imagesDir, 'solo-app-icon.png'));
  await sharp(circularAvatarBuffer)
    .png()
    .toFile(path.join(publicDir, 'solo-app-icon.png'));
  console.log('✓ solo-app-icon.png (in assets/images and public) updated');

  // 2. Favicon (64x64)
  await sharp(circularAvatarBuffer)
    .resize(64, 64, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(imagesDir, 'favicon.png'));
  await sharp(circularAvatarBuffer)
    .resize(64, 64, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ favicon.png (assets/images and public) generated (64x64)');

  // 3. Master Expo / iOS App Icon (1024x1024 PNG)
  const iconAvatarResized = await sharp(circularAvatarBuffer)
    .resize(880, 880, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: iconAvatarResized,
        top: 72,
        left: 72,
      },
    ])
    .png()
    .toFile(path.join(imagesDir, 'icon.png'));
  console.log('✓ icon.png generated (1024x1024, centered badge with black background)');

  // 4. Splash Icon (512x512)
  const splashAvatar = await sharp(circularAvatarBuffer)
    .resize(440, 440, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: splashAvatar,
        top: 36,
        left: 36,
      },
    ])
    .png()
    .toFile(path.join(imagesDir, 'splash-icon.png'));
  console.log('✓ splash-icon.png generated (512x512)');

  // 5. Android Adaptive Icon Background (1024x1024)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(imagesDir, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png generated (1024x1024)');

  // 6. Android Adaptive Icon Foreground (1024x1024)
  const adaptiveFgBadge = await sharp(circularAvatarBuffer)
    .resize(660, 660, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: adaptiveFgBadge,
        top: 182,
        left: 182,
      },
    ])
    .png()
    .toFile(path.join(imagesDir, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png generated (1024x1024, 660px safe zone)');

  // 7. Android Adaptive Icon Monochrome (1024x1024)
  const monoBadge = await sharp(circularAvatarBuffer)
    .resize(660, 660, { kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .threshold(128)
    .toBuffer();

  const monoBadgeRaw = await sharp(monoBadge).raw().toBuffer({ resolveWithObject: true });
  const whiteMonoData = Buffer.alloc(660 * 660 * 4);
  for (let i = 0; i < 660 * 660; i++) {
    const val = monoBadgeRaw.data[i];
    whiteMonoData[i * 4] = 255;
    whiteMonoData[i * 4 + 1] = 255;
    whiteMonoData[i * 4 + 2] = 255;
    whiteMonoData[i * 4 + 3] = val;
  }

  const whiteMonoBadge = await sharp(whiteMonoData, {
    raw: { width: 660, height: 660, channels: 4 },
  }).png().toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: whiteMonoBadge,
        top: 182,
        left: 182,
      },
    ])
    .png()
    .toFile(path.join(imagesDir, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png generated (1024x1024)');

  // 8. Native Android Mipmaps
  const densities = [
    { name: 'mdpi', launcher: 48, adaptive: 108 },
    { name: 'hdpi', launcher: 72, adaptive: 162 },
    { name: 'xhdpi', launcher: 96, adaptive: 216 },
    { name: 'xxhdpi', launcher: 144, adaptive: 324 },
    { name: 'xxxhdpi', launcher: 192, adaptive: 432 },
  ];

  if (fs.existsSync(resDir)) {
    console.log('Updating native Android mipmaps...');
    for (const d of densities) {
      const folder = path.join(resDir, `mipmap-${d.name}`);
      if (!fs.existsSync(folder)) continue;

      const badgeSize = Math.round(d.launcher * (880 / 1024));
      const badgeOffset = Math.round((d.launcher - badgeSize) / 2);
      const launcherBadge = await sharp(circularAvatarBuffer)
        .resize(badgeSize, badgeSize, { kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      await sharp({
        create: {
          width: d.launcher,
          height: d.launcher,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      })
        .composite([{ input: launcherBadge, top: badgeOffset, left: badgeOffset }])
        .webp({ quality: 95 })
        .toFile(path.join(folder, 'ic_launcher.webp'));

      await sharp(circularAvatarBuffer)
        .resize(d.launcher, d.launcher, { kernel: sharp.kernel.lanczos3 })
        .webp({ quality: 95 })
        .toFile(path.join(folder, 'ic_launcher_round.webp'));

      const fgBadgeSize = Math.round(d.adaptive * (660 / 1024));
      const fgOffset = Math.round((d.adaptive - fgBadgeSize) / 2);
      const fgBadge = await sharp(circularAvatarBuffer)
        .resize(fgBadgeSize, fgBadgeSize, { kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      await sharp({
        create: {
          width: d.adaptive,
          height: d.adaptive,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: fgBadge, top: fgOffset, left: fgOffset }])
        .webp({ quality: 95 })
        .toFile(path.join(folder, 'ic_launcher_foreground.webp'));

      await sharp({
        create: {
          width: d.adaptive,
          height: d.adaptive,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      })
        .webp({ quality: 95 })
        .toFile(path.join(folder, 'ic_launcher_background.webp'));

      const monoSize = Math.round(d.adaptive * (660 / 1024));
      const monoOffset = Math.round((d.adaptive - monoSize) / 2);
      const monoResized = await sharp(whiteMonoBadge)
        .resize(monoSize, monoSize, { kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      await sharp({
        create: {
          width: d.adaptive,
          height: d.adaptive,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: monoResized, top: monoOffset, left: monoOffset }])
        .webp({ quality: 95 })
        .toFile(path.join(folder, 'ic_launcher_monochrome.webp'));

      console.log(`  ✓ mipmap-${d.name} icons updated (${d.launcher}x${d.launcher} / ${d.adaptive}x${d.adaptive})`);
    }
  }

  console.log('All Solo Leveling icons and favicons generated successfully!');
}

main().catch((err) => {
  console.error('Error in generate-icons:', err);
  process.exit(1);
});
