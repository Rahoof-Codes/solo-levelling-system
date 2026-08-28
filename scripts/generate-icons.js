const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0E1A33"/>
      <stop offset="50%" stop-color="#080E1C"/>
      <stop offset="100%" stop-color="#04060C"/>
    </radialGradient>

    <!-- Glowing Cyan/Blue Gradients -->
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="50%" stop-color="#00A8FF"/>
      <stop offset="100%" stop-color="#0066FF"/>
    </linearGradient>

    <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#00F0FF"/>
      <stop offset="80%" stop-color="#0077FF"/>
      <stop offset="100%" stop-color="#051535"/>
    </linearGradient>

    <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#00D2FF"/>
      <stop offset="80%" stop-color="#0055EE"/>
      <stop offset="100%" stop-color="#051535"/>
    </linearGradient>

    <!-- Glow Filters -->
    <filter id="glowHigh" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" result="blur1"/>
      <feGaussianBlur stdDeviation="32" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="glowIntense" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur1"/>
      <feGaussianBlur stdDeviation="24" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bgGrad)"/>

  <!-- Subtle Cybernetic Grid Pattern -->
  <g opacity="0.12" stroke="#00A8FF" stroke-width="1.5">
    <line x1="128" y1="0" x2="128" y2="1024"/>
    <line x1="256" y1="0" x2="256" y2="1024"/>
    <line x1="384" y1="0" x2="384" y2="1024"/>
    <line x1="512" y1="0" x2="512" y2="1024"/>
    <line x1="640" y1="0" x2="640" y2="1024"/>
    <line x1="768" y1="0" x2="768" y2="1024"/>
    <line x1="896" y1="0" x2="896" y2="1024"/>
    <line x1="0" y1="128" x2="1024" y2="128"/>
    <line x1="0" y1="256" x2="1024" y2="256"/>
    <line x1="0" y1="384" x2="1024" y2="384"/>
    <line x1="0" y1="512" x2="1024" y2="512"/>
    <line x1="0" y1="640" x2="1024" y2="640"/>
    <line x1="0" y1="768" x2="1024" y2="768"/>
    <line x1="0" y1="896" x2="1024" y2="896"/>
  </g>

  <!-- Outer Energy Circle & Runes -->
  <circle cx="512" cy="512" r="380" fill="none" stroke="#00A8FF" stroke-width="3" opacity="0.3"/>
  <circle cx="512" cy="512" r="370" fill="none" stroke="#00F0FF" stroke-width="1.5" stroke-dasharray="16 12" opacity="0.5"/>
  <circle cx="512" cy="512" r="290" fill="none" stroke="#00F0FF" stroke-width="2" opacity="0.4"/>
  <circle cx="512" cy="512" r="280" fill="none" stroke="#0077FF" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/>

  <!-- Futuristic HUD Brackets -->
  <path d="M 220 320 L 220 220 L 320 220" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" opacity="0.85" filter="url(#glowIntense)"/>
  <path d="M 804 320 L 804 220 L 704 220" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" opacity="0.85" filter="url(#glowIntense)"/>
  <path d="M 220 704 L 220 804 L 320 804" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" opacity="0.85" filter="url(#glowIntense)"/>
  <path d="M 804 704 L 804 804 L 704 804" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" opacity="0.85" filter="url(#glowIntense)"/>

  <!-- Central Aura Glow -->
  <circle cx="512" cy="512" r="180" fill="#00A8FF" opacity="0.25" filter="url(#glowHigh)"/>
  <circle cx="512" cy="512" r="120" fill="#00F0FF" opacity="0.35" filter="url(#glowHigh)"/>

  <!-- Left Shadow Dagger -->
  <g transform="rotate(-30 512 512)" filter="url(#glowIntense)">
    <!-- Blade Back Shadow -->
    <path d="M 512 180 L 536 490 L 512 540 L 488 490 Z" fill="url(#bladeGrad1)"/>
    <!-- Blade Edge Glow Core -->
    <path d="M 512 180 L 522 490 L 512 540 Z" fill="#FFFFFF" opacity="0.9"/>
    <!-- Crossguard -->
    <path d="M 450 540 L 574 540 L 550 565 L 474 565 Z" fill="#00F0FF"/>
    <circle cx="512" cy="552" r="7" fill="#FFFFFF"/>
    <!-- Hilt & Pommel -->
    <rect x="502" y="565" width="20" height="90" rx="6" fill="#0A1E3D" stroke="#00F0FF" stroke-width="2"/>
    <circle cx="512" cy="670" r="16" fill="#00F0FF"/>
    <circle cx="512" cy="670" r="8" fill="#FFFFFF"/>
  </g>

  <!-- Right Shadow Dagger -->
  <g transform="rotate(30 512 512)" filter="url(#glowIntense)">
    <!-- Blade Back Shadow -->
    <path d="M 512 180 L 536 490 L 512 540 L 488 490 Z" fill="url(#bladeGrad2)"/>
    <!-- Blade Edge Glow Core -->
    <path d="M 512 180 L 502 490 L 512 540 Z" fill="#FFFFFF" opacity="0.9"/>
    <!-- Crossguard -->
    <path d="M 450 540 L 574 540 L 550 565 L 474 565 Z" fill="#00D2FF"/>
    <circle cx="512" cy="552" r="7" fill="#FFFFFF"/>
    <!-- Hilt & Pommel -->
    <rect x="502" y="565" width="20" height="90" rx="6" fill="#0A1E3D" stroke="#00D2FF" stroke-width="2"/>
    <circle cx="512" cy="670" r="16" fill="#00D2FF"/>
    <circle cx="512" cy="670" r="8" fill="#FFFFFF"/>
  </g>

  <!-- Level Up System Chevrons (Top & Bottom) -->
  <g filter="url(#glowIntense)">
    <path d="M 470 140 L 512 100 L 554 140" fill="none" stroke="#00F0FF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 480 170 L 512 140 L 544 170" fill="none" stroke="#00A8FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>
  </g>

  <!-- Bottom "SOLO" Monogram Tag -->
  <g filter="url(#glowIntense)">
    <rect x="424" y="870" width="176" height="42" rx="10" fill="#071224" stroke="#00F0FF" stroke-width="2.5"/>
    <text x="512" y="899" font-family="monospace, sans-serif" font-size="22" font-weight="900" fill="#00F0FF" text-anchor="middle" letter-spacing="4">SYSTEM</text>
  </g>
</svg>
`;

const foregroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="neonCyanF" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="50%" stop-color="#00A8FF"/>
      <stop offset="100%" stop-color="#0066FF"/>
    </linearGradient>

    <linearGradient id="bladeGrad1F" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#00F0FF"/>
      <stop offset="80%" stop-color="#0077FF"/>
      <stop offset="100%" stop-color="#051535"/>
    </linearGradient>

    <linearGradient id="bladeGrad2F" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#00D2FF"/>
      <stop offset="80%" stop-color="#0055EE"/>
      <stop offset="100%" stop-color="#051535"/>
    </linearGradient>

    <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="blur1"/>
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Energy Ring -->
  <circle cx="512" cy="512" r="320" fill="none" stroke="#00F0FF" stroke-width="4" stroke-dasharray="16 12" opacity="0.6"/>

  <!-- Left Shadow Dagger -->
  <g transform="rotate(-30 512 512)" filter="url(#glowF)">
    <path d="M 512 210 L 534 490 L 512 535 L 490 490 Z" fill="url(#bladeGrad1F)"/>
    <path d="M 512 210 L 521 490 L 512 535 Z" fill="#FFFFFF" opacity="0.9"/>
    <path d="M 455 535 L 569 535 L 547 558 L 477 558 Z" fill="#00F0FF"/>
    <circle cx="512" cy="546" r="6" fill="#FFFFFF"/>
    <rect x="503" y="558" width="18" height="80" rx="5" fill="#0A1E3D" stroke="#00F0FF" stroke-width="2"/>
    <circle cx="512" cy="650" r="14" fill="#00F0FF"/>
    <circle cx="512" cy="650" r="7" fill="#FFFFFF"/>
  </g>

  <!-- Right Shadow Dagger -->
  <g transform="rotate(30 512 512)" filter="url(#glowF)">
    <path d="M 512 210 L 534 490 L 512 535 L 490 490 Z" fill="url(#bladeGrad2F)"/>
    <path d="M 512 210 L 503 490 L 512 535 Z" fill="#FFFFFF" opacity="0.9"/>
    <path d="M 455 535 L 569 535 L 547 558 L 477 558 Z" fill="#00D2FF"/>
    <circle cx="512" cy="546" r="6" fill="#FFFFFF"/>
    <rect x="503" y="558" width="18" height="80" rx="5" fill="#0A1E3D" stroke="#00D2FF" stroke-width="2"/>
    <circle cx="512" cy="650" r="14" fill="#00D2FF"/>
    <circle cx="512" cy="650" r="7" fill="#FFFFFF"/>
  </g>

  <!-- Level Up Chevron -->
  <path d="M 475 160 L 512 120 L 549 160" fill="none" stroke="#00F0FF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowF)"/>
</svg>
`;

const backgroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0E1A33"/>
      <stop offset="50%" stop-color="#080E1C"/>
      <stop offset="100%" stop-color="#04060C"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
</svg>
`;

const splashSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bladeG1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#0055FF"/>
    </linearGradient>
    <linearGradient id="bladeG2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#00D2FF"/>
      <stop offset="100%" stop-color="#0055FF"/>
    </linearGradient>
  </defs>

  <g transform="rotate(-30 256 256)">
    <path d="M 256 90 L 268 250 L 256 275 L 244 250 Z" fill="url(#bladeG1)"/>
    <path d="M 226 275 L 286 275 L 274 288 L 238 288 Z" fill="#00F0FF"/>
    <rect x="251" y="288" width="10" height="42" rx="3" fill="#0A1E3D" stroke="#00F0FF" stroke-width="1.5"/>
    <circle cx="256" cy="336" r="8" fill="#00F0FF"/>
  </g>

  <g transform="rotate(30 256 256)">
    <path d="M 256 90 L 268 250 L 256 275 L 244 250 Z" fill="url(#bladeG2)"/>
    <path d="M 226 275 L 286 275 L 274 288 L 238 288 Z" fill="#00D2FF"/>
    <rect x="251" y="288" width="10" height="42" rx="3" fill="#0A1E3D" stroke="#00D2FF" stroke-width="1.5"/>
    <circle cx="256" cy="336" r="8" fill="#00D2FF"/>
  </g>

  <path d="M 235 60 L 256 40 L 277 60" fill="none" stroke="#00F0FF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

async function main() {
  const imagesDir = path.join(__dirname, '..', 'assets', 'images');

  console.log('Generating Solo Leveling app icons...');

  // 1. Main App Icon (1024x1024)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'icon.png'));
  console.log('✓ icon.png generated');

  // 2. Android Adaptive Icon Foreground
  await sharp(Buffer.from(foregroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png generated');

  // 3. Android Adaptive Icon Background
  await sharp(Buffer.from(backgroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png generated');

  // 4. Splash Icon
  await sharp(Buffer.from(splashSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(imagesDir, 'splash-icon.png'));
  console.log('✓ splash-icon.png generated');

  // 5. Favicon
  await sharp(Buffer.from(iconSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(imagesDir, 'favicon.png'));
  console.log('✓ favicon.png generated');

  console.log('All Solo Leveling icons generated successfully!');
}

main().catch(console.error);
