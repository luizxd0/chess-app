export const WHITE = "white";
export const BLACK = "black";

export function getPieceColor(piece) {
  return piece.colorClass === "white-piece" ? WHITE : BLACK;
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getPieceAt(pieces, row, col) {
  return pieces[`${row}-${col}`] || null;
}

function isEnemy(a, b) {
  return a && b && getPieceColor(a) !== getPieceColor(b);
}

function getPawnMoves(pieces, row, col, color, enPassantTarget) {
  const moves = [];
  const dir = color === WHITE ? -1 : 1;
  const startRow = color === WHITE ? 6 : 1;
  const nr = row + dir;

  if (inBounds(nr, col) && !getPieceAt(pieces, nr, col)) {
    moves.push([nr, col]);
    if (row === startRow) {
      const nr2 = row + 2 * dir;
      if (!getPieceAt(pieces, nr2, col)) moves.push([nr2, col]);
    }
  }

  for (const dc of [-1, 1]) {
    const nc = col + dc;
    if (inBounds(nr, nc)) {
      const target = getPieceAt(pieces, nr, nc);
      if (target && isEnemy(getPieceAt(pieces, row, col), target)) {
        moves.push([nr, nc]);
      }
      if (!target && enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
        moves.push([nr, nc]);
      }
    }
  }

  return moves;
}

function getSlidingMoves(pieces, row, col, directions) {
  const piece = getPieceAt(pieces, row, col);
  if (!piece) return [];
  const moves = [];

  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = getPieceAt(pieces, r, c);
      if (!target) {
        moves.push([r, c]);
      } else {
        if (isEnemy(piece, target)) moves.push([r, c]);
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return moves;
}

function getKnightMoves(pieces, row, col) {
  const piece = getPieceAt(pieces, row, col);
  if (!piece) return [];
  const moves = [];
  const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

  for (const [dr, dc] of offsets) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const target = getPieceAt(pieces, r, c);
      if (!target || isEnemy(piece, target)) moves.push([r, c]);
    }
  }

  return moves;
}

function getKingMoves(pieces, row, col) {
  const piece = getPieceAt(pieces, row, col);
  if (!piece) return [];
  const moves = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        const target = getPieceAt(pieces, r, c);
        if (!target || isEnemy(piece, target)) moves.push([r, c]);
      }
    }
  }

  return moves;
}

function getCastlingMoves(pieces, row, col, color, castlingRights) {
  const moves = [];
  if (!castlingRights) return moves;

  const opponent = color === WHITE ? BLACK : WHITE;

  if (color === WHITE && row === 7 && col === 4) {
    if (castlingRights.whiteKingSide &&
        !getPieceAt(pieces, 7, 5) && !getPieceAt(pieces, 7, 6) &&
        !isSquareAttacked(pieces, 7, 4, opponent) &&
        !isSquareAttacked(pieces, 7, 5, opponent) &&
        !isSquareAttacked(pieces, 7, 6, opponent)) {
      moves.push([7, 6]);
    }
    if (castlingRights.whiteQueenSide &&
        !getPieceAt(pieces, 7, 3) && !getPieceAt(pieces, 7, 2) && !getPieceAt(pieces, 7, 1) &&
        !isSquareAttacked(pieces, 7, 4, opponent) &&
        !isSquareAttacked(pieces, 7, 3, opponent) &&
        !isSquareAttacked(pieces, 7, 2, opponent)) {
      moves.push([7, 2]);
    }
  }

  if (color === BLACK && row === 0 && col === 4) {
    if (castlingRights.blackKingSide &&
        !getPieceAt(pieces, 0, 5) && !getPieceAt(pieces, 0, 6) &&
        !isSquareAttacked(pieces, 0, 4, opponent) &&
        !isSquareAttacked(pieces, 0, 5, opponent) &&
        !isSquareAttacked(pieces, 0, 6, opponent)) {
      moves.push([0, 6]);
    }
    if (castlingRights.blackQueenSide &&
        !getPieceAt(pieces, 0, 3) && !getPieceAt(pieces, 0, 2) && !getPieceAt(pieces, 0, 1) &&
        !isSquareAttacked(pieces, 0, 4, opponent) &&
        !isSquareAttacked(pieces, 0, 3, opponent) &&
        !isSquareAttacked(pieces, 0, 2, opponent)) {
      moves.push([0, 2]);
    }
  }

  return moves;
}

function getPseudoLegalMoves(pieces, row, col, castlingRights, enPassantTarget) {
  const piece = getPieceAt(pieces, row, col);
  if (!piece) return [];

  const color = getPieceColor(piece);
  const type = piece.type;
  let moves = [];

  switch (type) {
    case "pawn":   moves = getPawnMoves(pieces, row, col, color, enPassantTarget); break;
    case "rook":   moves = getSlidingMoves(pieces, row, col, [[-1,0],[1,0],[0,-1],[0,1]]); break;
    case "knight": moves = getKnightMoves(pieces, row, col); break;
    case "bishop": moves = getSlidingMoves(pieces, row, col, [[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case "queen":  moves = getSlidingMoves(pieces, row, col, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case "king": {
      moves = getKingMoves(pieces, row, col);
      moves = moves.concat(getCastlingMoves(pieces, row, col, color, castlingRights));
      break;
    }
  }

  return moves;
}

export function makeMove(pieces, fromRow, fromCol, toRow, toCol, castlingRights, enPassantTarget, promotionType) {
  const key = `${fromRow}-${fromCol}`;
  const targetKey = `${toRow}-${toCol}`;
  const piece = pieces[key];
  const captured = pieces[targetKey];
  const newPieces = { ...pieces };
  const newRights = { ...castlingRights };

  let newEnPassant = null;
  let promotion = null;

  newPieces[targetKey] = piece;
  delete newPieces[key];

  if (piece.type === "king") {
    const color = getPieceColor(piece);
    if (color === WHITE) {
      newRights.whiteKingSide = false;
      newRights.whiteQueenSide = false;
    } else {
      newRights.blackKingSide = false;
      newRights.blackQueenSide = false;
    }

    if (Math.abs(fromCol - toCol) === 2) {
      if (toCol === 6) {
        const rookKey = `${fromRow}-7`;
        const rookTarget = `${fromRow}-5`;
        newPieces[rookTarget] = newPieces[rookKey];
        delete newPieces[rookKey];
      } else if (toCol === 2) {
        const rookKey = `${fromRow}-0`;
        const rookTarget = `${fromRow}-3`;
        newPieces[rookTarget] = newPieces[rookKey];
        delete newPieces[rookKey];
      }
    }
  }

  if (piece.type === "rook") {
    if (fromRow === 7 && fromCol === 7) newRights.whiteKingSide = false;
    if (fromRow === 7 && fromCol === 0) newRights.whiteQueenSide = false;
    if (fromRow === 0 && fromCol === 7) newRights.blackKingSide = false;
    if (fromRow === 0 && fromCol === 0) newRights.blackQueenSide = false;
  }

  if (captured && captured.type === "rook") {
    if (toRow === 7 && toCol === 7) newRights.whiteKingSide = false;
    if (toRow === 7 && toCol === 0) newRights.whiteQueenSide = false;
    if (toRow === 0 && toCol === 7) newRights.blackKingSide = false;
    if (toRow === 0 && toCol === 0) newRights.blackQueenSide = false;
  }

  if (piece.type === "pawn") {
    if (Math.abs(fromRow - toRow) === 2) {
      newEnPassant = { row: (fromRow + toRow) / 2, col: fromCol };
    }

    if (fromCol !== toCol && !captured) {
      const epCapturedKey = `${fromRow}-${toCol}`;
      delete newPieces[epCapturedKey];
    }

    if (toRow === 0 || toRow === 7) {
      const color = getPieceColor(piece);
      const sym = color === WHITE ? "♕" : "♛";
      const pType = promotionType || "queen";
      const promoMap = {
        queen:  { white: "♕", black: "♛" },
        rook:   { white: "♖", black: "♜" },
        bishop: { white: "♗", black: "♝" },
        knight: { white: "♘", black: "♞" },
      };
      const chosen = promoMap[pType] || promoMap.queen;
      newPieces[targetKey] = {
        symbol: color === WHITE ? chosen.white : chosen.black,
        colorClass: piece.colorClass,
        type: pType,
      };
      promotion = { row: toRow, col: toCol, type: pType };
    }
  }

  return { pieces: newPieces, castlingRights: newRights, enPassantTarget: newEnPassant, promotion };
}

export function findKing(pieces, color) {
  for (const key in pieces) {
    if (!Object.hasOwn(pieces, key)) continue;
    const piece = pieces[key];
    if (piece.type === "king" && getPieceColor(piece) === color) {
      const [row, col] = key.split("-").map(Number);
      return { row, col };
    }
  }
  return null;
}

export function isSquareAttacked(pieces, row, col, byColor) {
  const pawnDir = byColor === WHITE ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = row + pawnDir;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = getPieceAt(pieces, r, c);
      if (p && getPieceColor(p) === byColor && p.type === "pawn") return true;
    }
  }

  const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightOffsets) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = getPieceAt(pieces, r, c);
      if (p && getPieceColor(p) === byColor && p.type === "knight") return true;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        const p = getPieceAt(pieces, r, c);
        if (p && getPieceColor(p) === byColor && p.type === "king") return true;
      }
    }
  }

  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = getPieceAt(pieces, r, c);
      if (p) {
        if (getPieceColor(p) === byColor && (p.type === "bishop" || p.type === "queen")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = getPieceAt(pieces, r, c);
      if (p) {
        if (getPieceColor(p) === byColor && (p.type === "rook" || p.type === "queen")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isInCheck(pieces, color) {
  const king = findKing(pieces, color);
  if (!king) return false;
  const opponent = color === WHITE ? BLACK : WHITE;
  return isSquareAttacked(pieces, king.row, king.col, opponent);
}

export function getLegalMoves(pieces, row, col, castlingRights, enPassantTarget) {
  const piece = getPieceAt(pieces, row, col);
  if (!piece) return [];

  const color = getPieceColor(piece);
  const pseudoMoves = getPseudoLegalMoves(pieces, row, col, castlingRights, enPassantTarget);
  const kingPos = findKing(pieces, color);
  if (!kingPos) return [];
  const opponent = color === WHITE ? BLACK : WHITE;

  return pseudoMoves.filter(([toRow, toCol]) => {
    const result = makeMove(pieces, row, col, toRow, toCol, castlingRights, enPassantTarget, "queen");
    const kr = piece.type === "king" ? toRow : kingPos.row;
    const kc = piece.type === "king" ? toCol : kingPos.col;
    return !isSquareAttacked(result.pieces, kr, kc, opponent);
  });
}

function hasAnyLegalMove(pieces, color, castlingRights, enPassantTarget) {
  for (const key in pieces) {
    if (!Object.hasOwn(pieces, key)) continue;
    const piece = pieces[key];
    if (getPieceColor(piece) === color) {
      const [row, col] = key.split("-").map(Number);
      if (getLegalMoves(pieces, row, col, castlingRights, enPassantTarget).length > 0) return true;
    }
  }
  return false;
}

export function isCheckmate(pieces, color, castlingRights, enPassantTarget) {
  if (!isInCheck(pieces, color)) return false;
  return !hasAnyLegalMove(pieces, color, castlingRights, enPassantTarget);
}

export function isStalemate(pieces, color, castlingRights, enPassantTarget) {
  if (isInCheck(pieces, color)) return false;
  return !hasAnyLegalMove(pieces, color, castlingRights, enPassantTarget);
}
