import { getPieceSvg } from "../data/pieceSvgs.js";

export function createPiece(pieceData) {
  const el = document.createElement("span");
  el.className = `piece ${pieceData.colorClass}`;
  el.dataset.type = pieceData.type;

  const svg = getPieceSvg(pieceData.type, pieceData.colorClass);
  if (svg) {
    el.innerHTML = svg;
  } else {
    el.textContent = pieceData.symbol;
  }

  return el;
}
