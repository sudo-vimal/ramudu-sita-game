// Royal SVG Portraits matched 1:1 with gameLogic.js CHARACTER_POOL IDs
// To use custom AI artwork later, place 10 .webp files in public/images/<id>.webp and set USE_CUSTOM_IMAGES = true
const USE_CUSTOM_IMAGES = false;

const CHARACTER_PORTRAITS = {
  ramudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <defs>
        <radialGradient id="bgRam" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#2b4c7e"/><stop offset="100%" stop-color="#111927"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#bgRam)" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Kodanda Bow -->
      <path d="M 88 22 Q 108 60 88 98" fill="none" stroke="#e5b84b" stroke-width="3" stroke-linecap="round"/>
      <line x1="88" y1="22" x2="88" y2="98" stroke="#f7e2a0" stroke-width="1"/>
      <!-- Kirita Crown -->
      <path d="M 44 42 L 48 22 L 60 14 L 72 22 L 76 42 Z" fill="#e5b84b"/>
      <circle cx="60" cy="26" r="3" fill="#b91c1c"/>
      <!-- Face & Tilak -->
      <path d="M 44 42 Q 44 70 60 74 Q 76 70 76 42 Z" fill="#7dd3fc"/>
      <path d="M 58 46 L 58 55 M 62 46 L 62 55 M 57 55 Q 60 58 63 55" stroke="#fef08a" stroke-width="1.6" fill="none"/>
      <path d="M 30 104 Q 36 78 60 78 Q 84 78 90 104 Z" fill="#d97706" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  sita: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <defs>
        <radialGradient id="bgSita" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#1f0a0a"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#bgSita)" stroke="#e5b84b" stroke-width="2.5"/>
      <path d="M 38 72 Q 36 32 60 28 Q 84 32 82 72 Z" fill="#18181b"/>
      <path d="M 44 38 L 60 22 L 76 38 Z" fill="#e5b84b"/>
      <circle cx="60" cy="38" r="2.5" fill="#ef4444"/>
      <path d="M 45 42 Q 45 68 60 72 Q 75 68 75 42 Z" fill="#fde68a"/>
      <circle cx="60" cy="50" r="2" fill="#dc2626"/>
      <!-- Lotus -->
      <path d="M 84 76 Q 90 64 96 76 Q 90 82 84 76 Z" fill="#f472b6"/>
      <path d="M 30 104 Q 36 76 60 76 Q 84 76 90 104 Z" fill="#b91c1c" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  lakshmanudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#291d12" stroke="#e5b84b" stroke-width="2.5"/>
      <path d="M 45 42 L 50 24 L 60 18 L 70 24 L 75 42 Z" fill="#e5b84b"/>
      <path d="M 45 42 Q 45 69 60 73 Q 75 69 75 42 Z" fill="#fed7aa"/>
      <line x1="60" y1="46" x2="60" y2="55" stroke="#dc2626" stroke-width="2"/>
      <path d="M 32 104 Q 38 78 60 78 Q 82 78 88 104 Z" fill="#b45309" stroke="#e5b84b" stroke-width="1.5"/>
      <!-- Quiver & Bow Staff -->
      <line x1="28" y1="24" x2="28" y2="96" stroke="#e5b84b" stroke-width="2.5"/>
    </svg>`,

  bharathudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#1e1b4b" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Ascetic Jata Hair Bun -->
      <path d="M 48 40 Q 60 20 72 40 Z" fill="#78350f"/>
      <path d="M 45 42 Q 45 69 60 73 Q 75 69 75 42 Z" fill="#fde68a"/>
      <path d="M 32 104 Q 38 78 60 78 Q 82 78 88 104 Z" fill="#9a3412" stroke="#e5b84b" stroke-width="1.5"/>
      <!-- Royal Paduka Emblem -->
      <rect x="51" y="84" width="18" height="8" rx="3" fill="#e5b84b"/>
    </svg>`,

  hanumanthudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#431407" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Gada (Mace) -->
      <line x1="90" y1="36" x2="90" y2="96" stroke="#e5b84b" stroke-width="3"/>
      <circle cx="90" cy="32" r="10" fill="#e5b84b"/>
      <path d="M 44 40 L 50 22 L 60 16 L 70 22 L 76 40 Z" fill="#e5b84b"/>
      <path d="M 42 42 Q 40 70 60 74 Q 80 70 78 42 Z" fill="#fdba74"/>
      <path d="M 48 56 Q 60 68 72 56 Q 72 72 60 74 Q 48 72 48 56 Z" fill="#fed7aa"/>
      <line x1="60" y1="44" x2="60" y2="53" stroke="#dc2626" stroke-width="2.5"/>
      <path d="M 30 104 Q 36 78 60 78 Q 84 78 90 104 Z" fill="#ea580c" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  ravanudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#2e1065" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Multi-tiered Lanka Crown -->
      <path d="M 38 42 L 44 18 L 60 10 L 76 18 L 82 42 Z" fill="#e5b84b"/>
      <path d="M 42 42 Q 42 70 60 74 Q 78 70 78 42 Z" fill="#d97706"/>
      <!-- Tripundra & Royal Mustache -->
      <line x1="52" y1="46" x2="68" y2="46" stroke="#fff" stroke-width="1.5"/>
      <line x1="52" y1="49" x2="68" y2="49" stroke="#fff" stroke-width="1.5"/>
      <path d="M 46 62 Q 54 58 60 62 Q 66 58 74 62" stroke="#18181b" stroke-width="2.5" fill="none"/>
      <path d="M 28 104 Q 36 78 60 78 Q 84 78 92 104 Z" fill="#581c87" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  jatayuvu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#1c1917" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Spread Garuda Wings -->
      <path d="M 16 54 Q 36 32 50 56 L 34 74 Z" fill="#b45309" stroke="#e5b84b" stroke-width="1.2"/>
      <path d="M 104 54 Q 84 32 70 56 L 86 74 Z" fill="#b45309" stroke="#e5b84b" stroke-width="1.2"/>
      <!-- Noble Eagle Head & Golden Beak -->
      <circle cx="60" cy="52" r="15" fill="#fef3c7"/>
      <path d="M 54 54 L 60 68 L 66 54 Z" fill="#f59e0b"/>
      <path d="M 36 104 Q 44 76 60 76 Q 76 76 84 104 Z" fill="#78350f" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  surpanaka: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#3b0764" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Flowing Dark Hair & Crescent Ornament -->
      <path d="M 36 76 Q 34 30 60 26 Q 86 30 84 76 Z" fill="#09090b"/>
      <path d="M 48 34 Q 60 24 72 34" fill="none" stroke="#e5b84b" stroke-width="2.5"/>
      <circle cx="60" cy="34" r="3" fill="#ec4899"/>
      <!-- Face & Bold Tilak -->
      <path d="M 45 42 Q 45 68 60 72 Q 75 68 75 42 Z" fill="#e9d5ff"/>
      <path d="M 56 48 L 60 53 L 64 48" stroke="#be185d" stroke-width="2" fill="none"/>
      <!-- Royal Crimson-Violet Attire -->
      <path d="M 30 104 Q 36 76 60 76 Q 84 76 90 104 Z" fill="#86198f" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  shathragnudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#172554" stroke="#e5b84b" stroke-width="2.5"/>
      <path d="M 46 42 L 52 24 L 60 18 L 68 24 L 74 42 Z" fill="#e5b84b"/>
      <path d="M 45 42 Q 45 69 60 73 Q 75 69 75 42 Z" fill="#fed7aa"/>
      <line x1="60" y1="46" x2="60" y2="54" stroke="#e5b84b" stroke-width="2"/>
      <!-- Royal Sword Hilt -->
      <line x1="90" y1="30" x2="90" y2="92" stroke="#cbd5e1" stroke-width="2.5"/>
      <line x1="83" y1="74" x2="97" y2="74" stroke="#e5b84b" stroke-width="3"/>
      <path d="M 32 104 Q 38 78 60 78 Q 82 78 88 104 Z" fill="#1d4ed8" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,

  dasharathudu: `
    <svg viewBox="0 0 120 120" class="chit-portrait">
      <circle cx="60" cy="60" r="56" fill="#271a0c" stroke="#e5b84b" stroke-width="2.5"/>
      <!-- Grand Ayodhya Emperor Crown -->
      <path d="M 40 42 L 46 18 L 60 12 L 74 18 L 80 42 Z" fill="#e5b84b"/>
      <circle cx="60" cy="24" r="3.5" fill="#dc2626"/>
      <!-- Face with White Royal Beard & Mustache -->
      <path d="M 44 42 Q 44 68 60 72 Q 76 68 76 42 Z" fill="#fde68a"/>
      <path d="M 44 58 Q 60 78 76 58 Q 72 76 60 78 Q 48 76 44 58 Z" fill="#f8fafc"/>
      <path d="M 28 104 Q 36 78 60 78 Q 84 78 92 104 Z" fill="#7c2d12" stroke="#e5b84b" stroke-width="1.5"/>
    </svg>`,
};

function renderCharacterPortrait(characterId, characterName) {
  if (USE_CUSTOM_IMAGES) {
    return `<img src="/images/${characterId}.webp" alt="${characterName}" class="chit-portrait-img" />`;
  }
  return CHARACTER_PORTRAITS[characterId] || CHARACTER_PORTRAITS.ramudu;
}
