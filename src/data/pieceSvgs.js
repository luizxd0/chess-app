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
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM15.5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22.5 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM29.5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM37 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L38 11l-3.5 14-1.5 5-6-10-6 10-1.5-5L7 11l4.5 14L9 26z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" stroke="#000" stroke-width="1" fill="none"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM15.5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22.5 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM29.5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM37 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L38 11l-3.5 14-1.5 5-6-10-6 10-1.5-5L7 11l4.5 14L9 26z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" stroke="#fff" stroke-width="1" fill="none" opacity="0.4"/>
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
      <g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25.5 8A2.5 2.5 0 1 1 20.5 8a2.5 2.5 0 0 1 5 0z"/>
      </g>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25.5 8A2.5 2.5 0 1 1 20.5 8a2.5 2.5 0 0 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15" stroke="#fff" stroke-width="1" opacity="0.3"/>
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
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    black: `<svg viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  }
};

export function getPieceSvg(type, colorClass) {
  const color = colorClass === "white-piece" ? "white" : "black";
  return SVGS[type]?.[color] || "";
}
