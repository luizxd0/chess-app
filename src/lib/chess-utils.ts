import { Chess } from 'chess.js';

export function getMaterialDifference(chess: Chess) {
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let w = 0;
  let b = 0;

  chess.board().forEach(row => {
    row.forEach(piece => {
      if (piece) {
        if (piece.color === 'w') w += pieceValues[piece.type];
        else b += pieceValues[piece.type];
      }
    });
  });

  return { white: w, black: b, advantage: w - b };
}
