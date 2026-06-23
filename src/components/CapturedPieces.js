const PIECE_VALUES = {
  pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0,
};

const PIECE_ORDER = { pawn: 0, knight: 1, bishop: 2, rook: 3, queen: 4, king: 5 };

export function createCapturedRow() {
  const container = document.createElement("div");
  container.className = "captured-row";

  function render(pieces, netAdvantage) {
    container.innerHTML = "";
    const sorted = [...pieces].sort((a, b) => PIECE_ORDER[a.type] - PIECE_ORDER[b.type]);
    if (netAdvantage > 0) {
      const badge = document.createElement("span");
      badge.className = "material-adv";
      badge.textContent = `+${netAdvantage}`;
      container.appendChild(badge);
    }
    for (const p of sorted) {
      const span = document.createElement("span");
      span.className = `captured-piece ${p.colorClass}`;
      span.textContent = p.symbol;
      container.appendChild(span);
    }
  }

  render([]);
  return { el: container, render };
}
