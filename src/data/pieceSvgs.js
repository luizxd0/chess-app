const SVGS = {
  king: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 11.63V6M20 8h5" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10.5 5 10.5v7z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" stroke="#000" stroke-width="1"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 11.63V6M20 8h5" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10.5 5 10.5v7z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" stroke="#fff" stroke-width="1" opacity="0.4"/>
    </svg>`
  },
  queen: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="9" r="2.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <circle cx="15" cy="6" r="2.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <circle cx="22.5" cy="4.5" r="2.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <circle cx="30" cy="6" r="2.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <circle cx="37" cy="9" r="2.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <path d="M8 12L5 24l4.5 2 3-10 5 10 3-10 5 10 3-10 4.5 2L40 12 34 26H11L8 12z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 28c5 2 18 2 23 0v4c-7.5 2-15.5 2-23 0v-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M9 37c6-1.5 21-1.5 27 0v-4c-7.5 2.5-19.5 2.5-27 0v4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 28h23M9 33h27" stroke="#000" stroke-width="0.8" fill="none" opacity="0.3"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="9" r="2.5" fill="#333" stroke="#000" stroke-width="1.2"/>
      <circle cx="15" cy="6" r="2.5" fill="#333" stroke="#000" stroke-width="1.2"/>
      <circle cx="22.5" cy="4.5" r="2.5" fill="#333" stroke="#000" stroke-width="1.2"/>
      <circle cx="30" cy="6" r="2.5" fill="#333" stroke="#000" stroke-width="1.2"/>
      <circle cx="37" cy="9" r="2.5" fill="#333" stroke="#000" stroke-width="1.2"/>
      <path d="M8 12L5 24l4.5 2 3-10 5 10 3-10 5 10 3-10 4.5 2L40 12 34 26H11L8 12z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 28c5 2 18 2 23 0v4c-7.5 2-15.5 2-23 0v-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M9 37c6-1.5 21-1.5 27 0v-4c-7.5 2.5-19.5 2.5-27 0v4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 28h23M9 33h27" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.3"/>
    </svg>`
  },
  rook: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 29.5v-13h17v13H14z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 35.5v.5h21v-.5" stroke="#000" stroke-width="1" fill="none"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 29.5v-13h17v13H14z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 16.5h17M14 29.5h17" stroke="#fff" stroke-width="1" fill="none" opacity="0.3"/>
    </svg>`
  },
  bishop: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 2L20 9h5L22.5 2z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="22.5" cy="5.5" r="1.5" fill="#000"/>
      <path d="M17 14c0-4 2.5-8 5.5-8s5.5 4 5.5 8c0 2.5-1 4-2 5.5l-1.5 2h-4l-1.5-2c-1-1.5-2-3-2-5.5z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M16 23c2.5 1.5 10.5 1.5 13 0l1 3c-4 2-11 2-15 0l1-3z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M14 30h17l-1 4H15l-1-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 37c4.5-1 18.5-1 23 0v-3H11v3z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M20 20h5" stroke="#000" stroke-width="1" stroke-linecap="round"/>
      <path d="M22.5 16v4" stroke="#000" stroke-width="1" stroke-linecap="round"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 2L20 9h5L22.5 2z" fill="#333" stroke="#000" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="22.5" cy="5.5" r="1.5" fill="#000"/>
      <path d="M17 14c0-4 2.5-8 5.5-8s5.5 4 5.5 8c0 2.5-1 4-2 5.5l-1.5 2h-4l-1.5-2c-1-1.5-2-3-2-5.5z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M16 23c2.5 1.5 10.5 1.5 13 0l1 3c-4 2-11 2-15 0l1-3z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M14 30h17l-1 4H15l-1-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 37c4.5-1 18.5-1 23 0v-3H11v3z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M20 20h5" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <path d="M22.5 16v4" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    </svg>`
  },
  knight: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#000" stroke="#000"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000" stroke="#000" transform="rotate(22.5 14.5 15)"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#000" stroke="#000"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000" stroke="#000" transform="rotate(22.5 14.5 15)"/>
    </svg>`
  },
  pawn: {
    white: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22.5" cy="11" r="4.5" fill="#fff" stroke="#000" stroke-width="1.5"/>
      <path d="M19 17h7l1.5 5c1 2 1.5 3 1.5 5h-12c0-2 .5-3 1.5-5l1.5-5z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M14 30h17l-2 4H16l-2-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 37c5-1 18-1 23 0v-3H11v3z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22.5" cy="11" r="4.5" fill="#333" stroke="#000" stroke-width="1.5"/>
      <path d="M19 17h7l1.5 5c1 2 1.5 3 1.5 5h-12c0-2 .5-3 1.5-5l1.5-5z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M14 30h17l-2 4H16l-2-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 37c5-1 18-1 23 0v-3H11v3z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`
  }
};

export function getPieceSvg(type, colorClass) {
  const color = colorClass === "white-piece" ? "white" : "black";
  return SVGS[type]?.[color] || "";
}
