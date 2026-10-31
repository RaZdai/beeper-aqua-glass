// Builds the "Apple-style glyphs" CSS block from a readable table and splices it into custom.css
// between the BEGIN/END markers. Glyphs are original line drawings on a 24x24 grid in the spirit of
// SF Symbols: even 1.8 stroke, round caps and joins, filled only where Apple fills.
import fs from 'fs';

const S = (body, sw = 1.8) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const G = {
  tray: S('<path d="M5.4 5h13.2l2.9 8.3V18a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-4.7z"/><path d="M2.6 13.3h4.9l1.4 2.6h6.2l1.4-2.6h4.9"/>'),
  archivebox: S('<rect x="3" y="4" width="18" height="4.6" rx="1.3"/><path d="M4.6 8.6V18a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2V8.6"/><path d="M10 12.6h4"/>'),
  ellipsis: S('<circle cx="5.5" cy="12" r="1.6" fill="#000" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="#000" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="#000" stroke="none"/>'),
  photo: S('<rect x="3" y="4.5" width="18" height="15" rx="2.6"/><circle cx="8.6" cy="9.6" r="1.6"/><path d="m3.4 17.2 5-4.6 3.6 3.2 3.4-3 5.2 4.7"/>'),
  plusSquare: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  plusBubble: S('<path d="M12 3.5c4.9 0 8.5 3.4 8.5 7.6s-3.6 7.6-8.5 7.6c-1 0-2-.1-2.9-.4L5 20.3l.9-3.6C4.4 15.3 3.5 13.3 3.5 11.1c0-4.2 3.6-7.6 8.5-7.6z"/><path d="M12 8v6.4M8.8 11.2h6.4"/>'),
  upDown: S('<path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4"/>', 2.2),
  filter: S('<path d="M4 7h16M7 12h10M10 17h4"/>'),
  search: S('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 5.1 5.1"/>'),
  compose: S('<path d="M19.5 13v5a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V7A2.5 2.5 0 0 1 6 4.5h5"/><path d="M17.8 3.4a1.9 1.9 0 0 1 2.8 2.8L12.5 14.3l-3.6.8.8-3.6z"/>'),
  chevronRight: S('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', 2.4),
  chevronDown: S('<path d="m6 9.5 6 6 6-6"/>', 2.2),
  reply: S('<path d="M9.5 5.5 3.5 11l6 5.5"/><path d="M3.8 11h9.7c4 0 7 2.6 7 7.5"/>'),
  smile: S('<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.4c.8 1.3 2 2 3.4 2s2.6-.7 3.4-2"/><circle cx="9.2" cy="9.8" r="1.1" fill="#000" stroke="none"/><circle cx="14.8" cy="9.8" r="1.1" fill="#000" stroke="none"/>'),
  play: S('<path d="M7.5 5.2v13.6a1 1 0 0 0 1.5.9l11-6.8a1 1 0 0 0 0-1.8L9 4.3a1 1 0 0 0-1.5.9z" fill="#000"/>', 1.2),
  // Same visual weight and footprint as play, so the button doesn't jump when it toggles
  pause: S('<rect x="6.6" y="5" width="3.8" height="14" rx="1.3" fill="#000" stroke="none"/><rect x="13.6" y="5" width="3.8" height="14" rx="1.3" fill="#000" stroke="none"/>'),
  download: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v8.5M8.4 12.6 12 16.2l3.6-3.6"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>', 2),
  paperclip: S('<path d="m20 11.3-7.6 7.6a5 5 0 0 1-7.1-7.1l7.9-7.9a3.4 3.4 0 0 1 4.8 4.8l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>'),
  chart: S('<path d="M6 20v-6M12 20V5M18 20v-9"/>', 2.2),
  // Drawn ~0.6 lower than geometric centre: the arrowhead carries most of the visual weight
  arrowUp: S('<path d="M12 19.2V6.2M6.6 11.6 12 6.2l5.4 5.4"/>', 2.5),
  // The iOS keyboard emoji key (Apple's own 'Emoji button' image as reference): round outline,
  // two small slightly tall eyes set high, and a solid filled open grin with a gently curved top
  emojiKey: S('<circle cx="12" cy="12" r="9.6"/><ellipse cx="9.3" cy="10" rx="1.05" ry="1.3" fill="#000" stroke="none"/><ellipse cx="14.7" cy="10" rx="1.05" ry="1.3" fill="#000" stroke="none"/><path d="M6.1 13.1Q12 14.3 17.9 13.1C17.6 16.4 15.1 18.4 12 18.4S6.4 16.4 6.1 13.1Z" fill="#000" stroke-width="0.9"/>', 1.7),
  xmark: S('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>', 2),
  phone: S('<path d="M7.6 3.8 9.5 8a1.3 1.3 0 0 1-.3 1.5L7.8 10.8a11 11 0 0 0 5.4 5.4l1.3-1.4a1.3 1.3 0 0 1 1.5-.3l4.2 1.9a1.2 1.2 0 0 1 .7 1.4l-.5 2a2 2 0 0 1-2 1.5C10.7 21 3 13.3 2.7 5.6a2 2 0 0 1 1.5-2l2-.5a1.2 1.2 0 0 1 1.4.7z"/>'),
  waveform: S('<path d="M4 10.5v3M8 7v10M12 4v16M16 8v8M20 10.5v3"/>', 2),
  at: S('<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.6a2.7 2.7 0 0 0 5.4 0V12a9 9 0 1 0-3.6 7.2"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2.8l1.6 2.3 2.7-.8.4 2.8 2.6 1.1-1 2.6 1.9 2-2.3 1.6.4 2.8-2.8.2-1 2.6-2.5-1.3-2.5 1.3-1-2.6-2.8-.2.4-2.8-2.3-1.6 1.9-2-1-2.6 2.6-1.1.4-2.8 2.7.8z"/>', 1.6),
  paintbrush: S('<path d="M20.5 3.5c-1.6-.4-7.6 5.7-10 8.9l1.1 1.1c3.2-2.4 9.3-8.4 8.9-10z"/><path d="M9.6 13.3c-2.1-.4-3.9 1-4.1 3.1-.1 1.3-.7 2.3-2 3.1 3.4.9 6.9.4 7.4-3.1.1-1.4-.4-2.6-1.3-3.1z"/>', 1.6),
  bell: S('<path d="M6 16.8V11a6 6 0 0 1 12 0v5.8l1.6 1.7H4.4z"/><path d="M10 21h4"/>'),
  keyboard: S('<rect x="2.5" y="6" width="19" height="12" rx="2.6"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>', 2),
  iphone: S('<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.8"/><path d="M10.6 5.6h2.8"/>'),
  sparkles: S('<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M17.5 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>', 1.6),
  starCircle: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6l1.3 2.8 3 .3-2.3 2 .7 3-2.7-1.6-2.7 1.6.7-3-2.3-2 3-.3z"/>', 1.5),
  puzzle: S('<path d="M5 8.5h3.2a1.9 1.9 0 1 1 3.6 0H15a1 1 0 0 1 1 1v3.2a1.9 1.9 0 1 1 0 3.6V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/>', 1.7),
  drive: S('<path d="M5.8 5h12.4l2.8 8v4.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13z"/><path d="M3 13h18M16.5 16.2h.01"/>', 1.8),
  question: S('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.5v.5"/><circle cx="12" cy="16.6" r=".9" fill="#000" stroke="none"/>'),
  info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r="1" fill="#000" stroke="none"/>'),
  gif: S('<rect x="2.8" y="5.8" width="18.4" height="12.4" rx="3.2"/><path d="M10.4 10.1a2 2 0 1 0 .3 3.4v-1.4H9.6M13 9.9v4.2M15.6 14.1V9.9h2.6M15.6 12h2.1"/>', 1.6),
  backwardEnd: S('<rect x="5.2" y="5.6" width="2.4" height="12.8" rx="1.1" fill="#000" stroke="none"/><path d="M18.6 6.4v11.2a1 1 0 0 1-1.6.8L9.6 12.8a1 1 0 0 1 0-1.6L17 5.6a1 1 0 0 1 1.6.8z" fill="#000" stroke="none"/>'),
  forwardEnd: S('<rect x="16.4" y="5.6" width="2.4" height="12.8" rx="1.1" fill="#000" stroke="none"/><path d="M5.4 6.4v11.2a1 1 0 0 0 1.6.8l7.4-5.6a1 1 0 0 0 0-1.6L7 5.6a1 1 0 0 0-1.6.8z" fill="#000" stroke="none"/>'),
  tag: S('<path d="M3.5 12.2V4.8a1.3 1.3 0 0 1 1.3-1.3h7.4l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4" fill="#000" stroke="none"/>'),
};

// Target selector -> glyph. Every entry matches the exact glyph it replaces by its path data, never
// just the button around it: buttons that swap their icon by state (play/pause, and any icon
// Beeper changes later) then show the right drawing, or Beeper's own if it is not mapped here.
// Descendant match: Beeper nests many glyphs inside <mask>/<g> (the composer "+", record, GIF,
// player skip buttons). The path prefixes are unique, so this cannot catch another glyph.
const P = (prefix) => `svg:has(path[d^="${prefix}"])`;
const PD = P;
const MAP = [
  // Sidebar header
  [P('M400-240v-80h160v80H40'), 'filter'],
  [P('M384.03-336Q284'), 'search'],
  [P('M216-144q-29.7 0-5'), 'compose'],
  [P('m480-246 85.91-85.91'), 'upDown'],
  // Account rail
  [P('M216-144q-29 0-50.'), 'tray'],
  [P('M216-96q-29.7 0-50'), 'archivebox'],
  [P('M263.79-408Q234-40'), 'ellipsis'],
  [P('M360-400h400L622-5'), 'photo'],
  [P('M520-400h80v-120h1'), 'plusSquare'],
  [P('m40-40 78-268q-19-41'), 'tag'],
  // Chat list preview tags
  [P('M798-120q-125 0-24'), 'phone'],
  [P('M200-120q-33 0-56.'), 'photo'],
  // Chat header and messages
  [P('M504-480 320-664l56-56'), 'chevronRight'],
  [P('M760-200v-160q0-50'), 'reply'],
  [P('M620-520q25 0 42.5'), 'emojiKey'],
  [P('M6.667 15.834V4.167L15'), 'play'],
  [P('M11.667 15.834V4.167H1'), 'pause'],
  [P('M10 13.333 5.833 9.166'), 'download'],
  // Scroll-to-bottom is not swapped: its <svg> is the round button itself, so a mask would cut
  // away the glass circle. Beeper's own chevron there is already a plain, even-weight stroke.
  [P('M6 18L18 6M6 6l12'), 'xmark'],
  // Mini audio player (appears while a voice note plays)
  [PD('M4.75 15V5h1.667v10zm10.'), 'backwardEnd'],
  [PD('M14.25 15V5h1.667v10zm-9'), 'forwardEnd'],
  [P('m5.333 15.834-1.166-1.16'), 'xmark'],
  [P('M6.855 14.08a.35.35 0 0 '), 'sparkles'],
  // Composer
  [PD('M9.167 10.833h-5V9.166'), 'plus'],
  [PD('M4.167 17.5q-.688 0-1.17'), 'gif'],
  [P('M9.583 18.333q-1.9'), 'paperclip'],
  [P('M10 11.667a2.4 2.4'), 'mic'],
  [P('M4.697 15.303A7.5 '), 'clock'],
  [P('M4.214 8.874q.65 0'), 'chart'],
  [P('M14.167 14.5v-9H12.5'), 'waveform'],
  [P('M1.55556 14C1.1277'), 'archivebox'],
  [P('M12.917 9.167q.52 0 .8'), 'emojiKey'],
  [P('m6.52 10.833 4.668 4.6'), 'arrowUp'],
  // Settings categories
  [`.pref-icon ${P('M12 2C6.48 2 2 6.48 2')}`, 'at'],
  [`.pref-icon ${P('M5.90837 12.6666L5.585')}`, 'gear'],
  [`.pref-icon ${P('M3.12126 10.9239C2.731')}`, 'paintbrush'],
  [`.pref-icon ${P('M0.859375 8.43848C0.59')}`, 'bell'],
  [`.pref-icon ${P('M1.65527 8.03125C1.114')}`, 'keyboard'],
  [`.pref-icon ${P('M3.5 11.5C3.225 11.5 2')}`, 'iphone'],
  [`.pref-icon ${P('M4.95605 9.91113C4.838')}`, 'sparkles'],
  [`.pref-icon ${P('M4.51369 7.85022L3.335')}`, 'starCircle'],
  [`.pref-icon ${P('M11 4a2 2 0 114 0v1a1')}`, 'puzzle'],
  [`.pref-icon ${P('M4.318 2.687C5.234 2.2')}`, 'drive'],
  [`.pref-icon ${P('M2.56348 6.55078C2.348')}`, 'question'],
  [`.pref-icon ${P('M0 9.26074C0 9.1403 0.')}`, 'info'],
];

const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;

let css = `/* BEGIN apple-glyphs (generated by gen-icons.mjs; edit the table there, not here) */
/* ================= Apple-style glyphs ================= */
/* Beeper draws Google Material glyphs. Each one below is swapped for an Apple-style line glyph:
   the original paths are hidden and the svg box is painted in the current text colour through a
   mask of the new drawing (scaled to fit, never stretched), so colour, hover and click targets stay Beeper's own. */
`;
for (const [sel, name] of MAP) {
  css += `
${sel} > * {
  visibility: hidden !important;
}

${sel} {
  background-color: currentColor !important;
  -webkit-mask: var(--glyph-${name}) center / contain no-repeat !important;
  mask: var(--glyph-${name}) center / contain no-repeat !important;
}

${sel}[style*="transform"] {
  transform: none !important;
}
`;
}
const vars = Object.entries(G).map(([k, v]) => `  --glyph-${k}: ${uri(v)};`).join('\n');
css = css.replace('/* ================= Apple-style glyphs ================= */', `/* ================= Apple-style glyphs ================= */\n:root {\n${vars}\n}`);
css += `
/* Settings category glyphs come in odd sizes (6x10, 8x8, 13x9); give every one the same 18px box */
.pref-icon svg {
  width: 18px !important;
  height: 18px !important;
}

/* Beeper scales each glyph with an inline transform (scale(1.2); rotate(90deg) on send) and sizes
   their wrappers non-square (e.g. 20x14). Replaced glyphs carry their own optical sizing, so the
   generated rules above cancel only those inline transforms (stylesheet ones, like the "+" turning
   into an "x", still run), and the wrappers size to their square glyph. Display is left to Beeper,
   so icons it hides stay hidden. */
[class*="PlatformIcon-module__materialIcon"]:has(> svg) {
  width: auto !important;
  height: auto !important;
}
/* END apple-glyphs */
`;

const file = 'custom.css';
let s = fs.readFileSync(file, 'utf8');
// Remove every earlier generated block (not just the first), then append exactly one fresh copy
const re = /\n*\/\* BEGIN apple-glyphs[\s\S]*?\/\* END apple-glyphs \*\/\n?/g;
s = s.replace(re, '\n').trimEnd() + '\n\n' + css;
fs.writeFileSync(file, s);
console.log('glyphs:', Object.keys(G).length, 'targets:', MAP.length, 'bytes:', css.length);
