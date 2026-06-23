export function createPiece(pieceData) {
  const piece = document.createElement("span");

  piece.className = `piece ${pieceData.colorClass}`;
  piece.textContent = pieceData.symbol;
  piece.dataset.type = pieceData.type;

  return piece;
}