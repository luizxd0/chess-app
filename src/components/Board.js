import { BOARD_SIZE, FILES, RANKS } from "../config/boardConfig.js";
import { createPiece } from "./Piece.js";
import {
  WHITE, BLACK, getLegalMoves, makeMove, getPieceColor,
  isInCheck, isCheckmate, isStalemate, findKing
} from "../game/chess.js";
import { createClock, startClock, stopClock, switchClock } from "../game/clock.js";
import { createSingleClock } from "./ClockDisplay.js";
import { createReplay } from "./Replay.js";
import { createArrowOverlay } from "./ArrowOverlay.js";
import { createCapturedRow } from "./CapturedPieces.js";

function parseBestMove(msg) {
  const parts = msg.split(" ");
  if (parts[0] !== "bestmove" || !parts[1]) return null;
  return parts[1];
}

export function createBoard(rootElement, pieces, config, engine, callbacks) {
  const playerSide = config.playerSide;

  const state = {
    pieces: { ...pieces },
    turn: WHITE,
    selected: null,
    legalMoves: [],
    inCheck: null,
    gameOver: false,
    winner: null,
    result: null,
    checkmateKing: null,
    castlingRights: {
      whiteKingSide: true, whiteQueenSide: true,
      blackKingSide: true, blackQueenSide: true,
    },
    enPassantTarget: null,
    moveHistory: [],
    lastMove: null,
    engineThinking: false,
    capturedByWhite: [],
    capturedByBlack: [],
  };

  let dragState = null;
  let handledByDrag = false;
  let gameEnded = false;
  let replay = null;
  let inReplay = false;
  let liveState = null;

  const history = [];
  function pushSnapshot() {
    history.push({
      pieces: { ...state.pieces },
      castlingRights: { ...state.castlingRights },
      enPassantTarget: state.enPassantTarget,
      turn: state.turn,
      capturedByWhite: [...state.capturedByWhite],
      capturedByBlack: [...state.capturedByBlack],
      lastMove: state.lastMove ? { from: { ...state.lastMove.from }, to: { ...state.lastMove.to } } : null,
    });
  }
  pushSnapshot();

  const clock = createClock(
    config.timeControl.initial * 1000,
    config.timeControl.increment * 1000,
    (side) => {
      gameEnded = true;
      const winner = side === WHITE ? BLACK : WHITE;
      endGame(winner, "time");
    }
  );

  let opponentLabel = "Player";
  let opponentElo = "";
  if (config.isOnline) {
    opponentLabel = config.opponentName;
    opponentElo = config.opponentElo;
  } else if (config.engine && config.engine.enabled) {
    opponentLabel = "Bot";
    opponentElo = config.engine.elo;
  }
  const opponentSide = playerSide === WHITE ? BLACK : WHITE;

  const topBar = document.createElement("div");
  topBar.className = "player-bar";
  const topInfo = document.createElement("div");
  topInfo.className = "player-info";
  const topAvatar = document.createElement("div");
  topAvatar.className = "player-avatar";
  topAvatar.textContent = opponentLabel[0]?.toUpperCase() || "?";
  const topDetails = document.createElement("div");
  topDetails.className = "player-details";
  const topName = document.createElement("div");
  topName.className = "player-name";
  topName.textContent = opponentLabel;
  topDetails.appendChild(topName);
  if (opponentElo) {
    const topElo = document.createElement("div");
    topElo.className = "player-elo";
    topElo.textContent = opponentElo;
    topDetails.appendChild(topElo);
  }
  topInfo.appendChild(topAvatar);
  topInfo.appendChild(topDetails);
  const topCaptured = createCapturedRow();
  topInfo.appendChild(topCaptured.el);
  const topClock = createSingleClock(clock, opponentSide, playerSide);
  topBar.appendChild(topInfo);
  topBar.appendChild(topClock);

  // Board
  const boardWrapper = document.createElement("div");
  boardWrapper.className = "board-wrap";

  const board = document.createElement("div");
  board.className = "chess-board";

  boardWrapper.appendChild(board);
  const arrowOverlay = createArrowOverlay(boardWrapper, (row, col) => state.pieces[`${row}-${col}`] || null);
  boardWrapper.appendChild(arrowOverlay.svg);

  // Bottom player bar (you)
  const bottomBar = document.createElement("div");
  bottomBar.className = "player-bar";
  const bottomInfo = document.createElement("div");
  bottomInfo.className = "player-info";
  const bottomAvatar = document.createElement("div");
  bottomAvatar.className = "player-avatar";
  bottomAvatar.textContent = (config.playerName || "You")[0].toUpperCase();
  const bottomDetails = document.createElement("div");
  bottomDetails.className = "player-details";
  const bottomName = document.createElement("div");
  bottomName.className = "player-name";
  bottomName.textContent = `${config.playerName} (You)`;
  bottomDetails.appendChild(bottomName);
  const bottomElo = document.createElement("div");
  bottomElo.className = "player-elo";
  bottomElo.textContent = config.playerElo;
  bottomDetails.appendChild(bottomElo);
  bottomInfo.appendChild(bottomAvatar);
  bottomInfo.appendChild(bottomDetails);
  const bottomCaptured = createCapturedRow();
  bottomInfo.appendChild(bottomCaptured.el);
  const bottomClock = createSingleClock(clock, playerSide, playerSide);
  bottomBar.appendChild(bottomInfo);
  bottomBar.appendChild(bottomClock);

  function render() {
    board.innerHTML = "";
    board.style.height = "";

    const vw = window.innerWidth || 360;
    const boardRect = boardWrapper.getBoundingClientRect();
    let availW = boardRect.width - 16;
    let availH = boardRect.height - 8;
    if (availW < 100 || availH < 100) {
      availW = vw - 16;
      const vh = window.innerHeight || 600;
      availH = vh - 160;
    }
    const px = Math.max(Math.min(availW, availH), 200);
    board.style.width = px + "px";
    board.style.height = px + "px";
    const cellSize = px / 8;
    board.style.setProperty("--piece-size", (cellSize * 0.82) + "px");

    const rows = [...Array(BOARD_SIZE).keys()];
    const cols = [...Array(BOARD_SIZE).keys()];
    const renderRows = playerSide === BLACK ? rows.reverse() : rows;
    const renderCols = playerSide === BLACK ? cols.reverse() : cols;

    for (const row of renderRows) {
      for (const col of renderCols) {
        const squareColor = (row + col) % 2 === 0 ? "light" : "dark";
        const cell = document.createElement("div");
        cell.className = `cell ${squareColor}`;
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (state.selected && state.selected.row === row && state.selected.col === col) {
          cell.classList.add("selected");
        }

        const isLegal = state.legalMoves.some(([r, c]) => r === row && c === col);
        if (isLegal) {
          cell.classList.add(state.pieces[`${row}-${col}`] ? "capture-move" : "legal-move");
        }

        if (state.inCheck && state.inCheck.row === row && state.inCheck.col === col) {
          cell.classList.add("in-check");
        }

        if (state.checkmateKing && state.checkmateKing.row === row && state.checkmateKing.col === col) {
          cell.classList.add("checkmated");
        }

        if (state.lastMove) {
          if (state.lastMove.from.row === row && state.lastMove.from.col === col) {
            cell.classList.add("last-move-from");
          }
          if (state.lastMove.to.row === row && state.lastMove.to.col === col) {
            cell.classList.add("last-move-to");
          }
        }

        const key = `${row}-${col}`;
        const pieceData = state.pieces[key];
        if (pieceData) {
          cell.appendChild(createPiece(pieceData));
        }

        if (col === (playerSide === BLACK ? 7 : 0)) {
          const label = document.createElement("span");
          label.className = "coord rank-coord";
          label.textContent = RANKS[row];
          cell.appendChild(label);
        }
        if (row === (playerSide === BLACK ? 0 : BOARD_SIZE - 1)) {
          const label = document.createElement("span");
          label.className = "coord file-coord";
          label.textContent = FILES[col];
          cell.appendChild(label);
        }

        board.appendChild(cell);
      }
    }
    const topPieces = playerSide === WHITE ? state.capturedByBlack : state.capturedByWhite;
    const bottomPieces = playerSide === WHITE ? state.capturedByWhite : state.capturedByBlack;
    const topVal = topPieces.reduce((s, p) => s + ({pawn:1,knight:3,bishop:3,rook:5,queen:9}[p.type]||0), 0);
    const bottomVal = bottomPieces.reduce((s, p) => s + ({pawn:1,knight:3,bishop:3,rook:5,queen:9}[p.type]||0), 0);
    topCaptured.render(topPieces, topVal - bottomVal);
    bottomCaptured.render(bottomPieces, bottomVal - topVal);
  }

  function endGame(winner, result) {
    if (gameEnded) return;
    gameEnded = true;
    stopClock(clock);
    state.gameOver = true;
    state.winner = winner;
    state.result = result;

    if (result === "checkmate") {
      const loser = winner === WHITE ? BLACK : WHITE;
      state.checkmateKing = findKing(state.pieces, loser);
      render();
      const wk = findKing(state.pieces, winner);
      showEndLabel(state.checkmateKing.row, state.checkmateKing.col, "Checkmate!", "label-checkmate");
      showEndLabel(wk.row, wk.col, "Winner!", "label-winner");
    } else if (result === "stalemate") {
      render();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = state.pieces[`${r}-${c}`];
          if (p && p.type === "king") {
            showEndLabel(r, c, "Stalemate", "label-stalemate");
          }
        }
      }
    } else if (result === "resign") {
      render();
      const loser = winner === WHITE ? BLACK : WHITE;
      const loserKing = findKing(state.pieces, loser);
      const winnerKing = findKing(state.pieces, winner);
      if (loserKing) showEndLabel(loserKing.row, loserKing.col, "\uD83C\uDFF3 Resigned", "label-resigned");
      if (winnerKing) showEndLabel(winnerKing.row, winnerKing.col, "Winner!", "label-winner");
    } else {
      render();
    }

    if (callbacks.onGameOver) {
      callbacks.onGameOver({
        winner,
        result,
        playerSide,
        moveCount: Math.floor(state.moveHistory.length / 2),
      });
    }
  }

  function showEndLabel(row, col, text, className) {
    const cell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    const boardRect = board.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const label = document.createElement("div");
    label.className = `endgame-label ${className}`;
    label.textContent = text;
    label.style.position = "absolute";
    label.style.left = (cellRect.left - boardRect.left + cellRect.width / 2) + "px";
    label.style.top = (cellRect.top - boardRect.top) + "px";
    label.style.transform = "translateX(-50%) translateY(-110%)";
    label.style.zIndex = 50;
    label.style.pointerEvents = "none";
    boardWrapper.appendChild(label);
  }

  function afterMove(fromRow, fromCol, toRow, toCol) {
    const opponent = state.turn;
    state.moveHistory.push(`${FILES[fromCol]}${RANKS[fromRow]}${FILES[toCol]}${RANKS[toCol]}`);

    if (isCheckmate(state.pieces, opponent, state.castlingRights, state.enPassantTarget)) {
      endGame(opponent === WHITE ? BLACK : WHITE, "checkmate");
      return;
    }

    if (isStalemate(state.pieces, opponent, state.castlingRights, state.enPassantTarget)) {
      endGame(null, "stalemate");
      return;
    }

    if (isInCheck(state.pieces, opponent)) {
      state.inCheck = findKing(state.pieces, opponent);
    } else {
      state.inCheck = null;
    }

    render();
    if (!clock.active) {
      const justMoved = state.turn === WHITE ? BLACK : WHITE;
      startClock(clock, justMoved);
    }
    switchClock(clock);

    if (!gameEnded) {
      requestEngineMove();
    }
  }

  function getAllMoves() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = state.pieces[`${r}-${c}`];
        if (p && getPieceColor(p) === state.turn) {
          const m = getLegalMoves(state.pieces, r, c, state.castlingRights, state.enPassantTarget);
          m.forEach(([tr, tc]) => moves.push([r, c, tr, tc]));
        }
      }
    }
    return moves;
  }

  function requestEngineMove() {
    if (inReplay) return;
    if (!engine || !engine.available || !config.engine.enabled) return;
    if (state.gameOver || gameEnded) return;
    if (state.turn === playerSide) return;

    state.engineThinking = true;

    // Random move chance for weaker bots
    const randomChance = config.engine.randomMoveChance || 0;
    if (Math.random() < randomChance) {
      const allMoves = getAllMoves();
      if (allMoves.length > 0) {
        setTimeout(() => {
          if (gameEnded) return;
          state.engineThinking = false;
          const [fr, fc, tr, tc] = allMoves[Math.floor(Math.random() * allMoves.length)];
          executeMove(fr, fc, tr, tc);
        }, calcThinkDelay());
        return;
      }
    }

    const fen = boardToFen(state.pieces, state.turn, state.castlingRights, state.enPassantTarget);
    const timeLeft = clock[state.turn];
    const thinkTime = Math.min(timeLeft / 30, 2000);
    const engineDepth = config.engine.depth || null;

    // Thinking delay before engine starts (human-like pause)
    setTimeout(() => {
      if (!state.engineThinking || inReplay || gameEnded) return;

      engine.setPosition(fen);

      const safetyTimer = setTimeout(() => {
        if (state.engineThinking && !inReplay) {
          state.engineThinking = false;
          const allMoves = getAllMoves();
          if (allMoves.length > 0) {
            const [fr, fc, tr, tc] = allMoves[Math.floor(Math.random() * allMoves.length)];
            executeMove(fr, fc, tr, tc);
          }
        }
      }, 8000);

      engine.goTime(Math.max(100, thinkTime), engineDepth).then((msg) => {
        clearTimeout(safetyTimer);
        if (state.engineThinking && !inReplay) {
          state.engineThinking = false;
          const move = parseBestMove(msg);
          if (move && move.length >= 4) {
            const fr = 8 - parseInt(move[1], 10);
            const fc = move.charCodeAt(0) - 97;
            const tr = 8 - parseInt(move[3], 10);
            const tc = move.charCodeAt(2) - 97;
            executeMove(fr, fc, tr, tc);
          }
        }
      });
    }, calcThinkDelay());
  }

  function calcThinkDelay() {
    const d = config.engine.depth || 10;
    const base = Math.max(400, 3500 - d * 120);
    return base + Math.random() * 800;
  }

  function executeMove(fromRow, fromCol, toRow, toCol) {
    if (gameEnded) return;

    const fenBefore = boardToFen(state.pieces, state.turn, state.castlingRights, state.enPassantTarget);
    const turnBefore = state.turn;
    const piecesBefore = state.pieces;
    const uci = `${FILES[fromCol]}${RANKS[fromRow]}${FILES[toCol]}${RANKS[toRow]}`;

    const movedPiece = state.pieces[`${fromRow}-${fromCol}`];
    let captured = state.pieces[`${toRow}-${toCol}`];
    if (!captured && movedPiece && movedPiece.type === "pawn" && fromCol !== toCol) {
      captured = state.pieces[`${fromRow}-${toCol}`];
    }
    if (captured) {
      const capturingColor = getPieceColor(movedPiece);
      if (capturingColor === WHITE) {
        state.capturedByWhite.push(captured);
      } else {
        state.capturedByBlack.push(captured);
      }
    }

    const result = makeMove(state.pieces, fromRow, fromCol, toRow, toCol, state.castlingRights, state.enPassantTarget);
    state.pieces = result.pieces;
    state.castlingRights = result.castlingRights;
    state.enPassantTarget = result.enPassantTarget;
    state.turn = state.turn === WHITE ? BLACK : WHITE;
    state.selected = null;
    state.legalMoves = [];
    state.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    pushSnapshot();

    afterMove(fromRow, fromCol, toRow, toCol);
  }

  function doMove(fromRow, fromCol, toRow, toCol) {
    if (gameEnded || state.engineThinking) return;
    executeMove(fromRow, fromCol, toRow, toCol);
    if (callbacks.onPlayerMove && !gameEnded) {
      callbacks.onPlayerMove(fromRow, fromCol, toRow, toCol);
    }
  }

  board.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (inReplay) { exitReplay(); return; }
    if (state.gameOver || gameEnded || state.engineThinking) return;
    const pieceEl = e.target.closest(".piece");
    if (!pieceEl) return;
    const cell = pieceEl.closest(".cell");
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = state.pieces[`${row}-${col}`];
    if (!piece || getPieceColor(piece) !== state.turn) return;
    if (state.turn !== playerSide && config.engine.enabled) return;

    handledByDrag = false;
    const legalMoves = getLegalMoves(state.pieces, row, col, state.castlingRights, state.enPassantTarget);
    dragState = { row, col, legalMoves, dragging: false, clone: null, piece };

    const onMouseMove = (e2) => {
      if (!dragState.dragging) {
        const dx = e2.clientX - e.clientX;
        const dy = e2.clientY - e.clientY;
        if (dx * dx + dy * dy > 25) {
          dragState.dragging = true;
          pieceEl.style.opacity = "0";
          const cellRect = cell.getBoundingClientRect();
          const clone = document.createElement("span");
          clone.className = `piece ${piece.colorClass} dragging`;
          clone.textContent = piece.symbol;
          clone.style.position = "fixed";
          clone.style.pointerEvents = "none";
          clone.style.zIndex = 1000;
          clone.style.left = (e2.clientX - cellRect.width / 2) + "px";
          clone.style.top = (e2.clientY - cellRect.height / 2) + "px";
          clone.style.width = cellRect.width + "px";
          clone.style.height = cellRect.height + "px";
          clone.style.display = "flex";
          clone.style.alignItems = "center";
          clone.style.justifyContent = "center";
          clone.style.fontSize = getComputedStyle(pieceEl).fontSize || "40px";
          document.body.appendChild(clone);
          dragState.clone = clone;
          state.selected = { row, col };
          state.legalMoves = legalMoves;
  render();

  function onResize() {
    render();
  }
  window.addEventListener("resize", onResize);
          const freshCell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
          const freshPiece = freshCell?.querySelector(".piece");
          if (freshPiece) freshPiece.style.opacity = "0";
        }
      }
      if (dragState.clone) {
        dragState.clone.style.left = (e2.clientX - dragState.clone.offsetWidth / 2) + "px";
        dragState.clone.style.top = (e2.clientY - dragState.clone.offsetHeight / 2) + "px";
      }
    };

    const onMouseUp = (e2) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (dragState && dragState.dragging) {
        handledByDrag = true;
        if (dragState.clone) dragState.clone.remove();
        pieceEl.style.opacity = "";
        const target = document.elementFromPoint(e2.clientX, e2.clientY);
        const targetCell = target?.closest(".cell");
        if (targetCell) {
          const tr = parseInt(targetCell.dataset.row);
          const tc = parseInt(targetCell.dataset.col);
          if (dragState.legalMoves.some(([r, c]) => r === tr && c === tc)) {
            doMove(row, col, tr, tc);
          }
        }
        state.selected = null;
        state.legalMoves = [];
        render();
      }
      dragState = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  board.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    if (inReplay) { exitReplay(); return; }
    if (state.gameOver || gameEnded || state.engineThinking) return;
    const touch = e.touches[0];
    const pieceEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".piece");
    if (!pieceEl) return;
    const cell = pieceEl.closest(".cell");
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = state.pieces[`${row}-${col}`];
    if (!piece || getPieceColor(piece) !== state.turn) return;
    if (state.turn !== playerSide && config.engine.enabled) return;

    e.preventDefault();
    handledByDrag = false;
    const legalMoves = getLegalMoves(state.pieces, row, col, state.castlingRights, state.enPassantTarget);
    const cellRect = cell.getBoundingClientRect();
    dragState = { row, col, legalMoves, dragging: false, clone: null, piece, cellRect };

    const onTouchMove = (e2) => {
      e2.preventDefault();
      if (!dragState) return;
      const t = e2.touches[0];
      if (!dragState.dragging) {
        const dx = t.clientX - dragState.cellRect.left - dragState.cellRect.width / 2;
        const dy = t.clientY - dragState.cellRect.top - dragState.cellRect.height / 2;
        if (dx * dx + dy * dy > 100) {
          dragState.dragging = true;
          pieceEl.style.opacity = "0";
          const clone = document.createElement("span");
          clone.className = `piece ${piece.colorClass} dragging`;
          clone.textContent = piece.symbol;
          clone.style.position = "fixed";
          clone.style.pointerEvents = "none";
          clone.style.zIndex = 1000;
          clone.style.left = (t.clientX - cellRect.width / 2) + "px";
          clone.style.top = (t.clientY - cellRect.height / 2) + "px";
          clone.style.width = cellRect.width + "px";
          clone.style.height = cellRect.height + "px";
          clone.style.display = "flex";
          clone.style.alignItems = "center";
          clone.style.justifyContent = "center";
          clone.style.fontSize = getComputedStyle(pieceEl).fontSize || "40px";
          document.body.appendChild(clone);
          dragState.clone = clone;
        }
      }
      if (dragState.clone) {
        dragState.clone.style.left = (t.clientX - dragState.clone.offsetWidth / 2) + "px";
        dragState.clone.style.top = (t.clientY - dragState.clone.offsetHeight / 2) + "px";
      }
    };

    const onTouchEnd = (e2) => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      if (!dragState) return;
      if (dragState.dragging) {
        handledByDrag = true;
        if (dragState.clone) dragState.clone.remove();
        pieceEl.style.opacity = "";
        const t = e2.changedTouches[0];
        const target = document.elementFromPoint(t.clientX, t.clientY);
        const targetCell = target?.closest(".cell");
        if (targetCell) {
          const tr = parseInt(targetCell.dataset.row);
          const tc = parseInt(targetCell.dataset.col);
          if (dragState.legalMoves.some(([r, c]) => r === tr && c === tc)) {
            doMove(row, col, tr, tc);
          }
        }
        state.selected = null;
        state.legalMoves = [];
      } else {
        if (!handledByDrag) {
          state.selected = { row, col };
          state.legalMoves = legalMoves;
        }
      }
      dragState = null;
      render();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  });

  board.addEventListener("click", (e) => {
    if (e.button !== 0) return;
    if (inReplay) { exitReplay(); return; }
    if (state.gameOver || gameEnded || state.engineThinking) return;
    if (handledByDrag) { handledByDrag = false; return; }
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (state.selected && state.legalMoves.some(([r, c]) => r === row && c === col)) {
      doMove(state.selected.row, state.selected.col, row, col);
      return;
    }

    const piece = state.pieces[`${row}-${col}`];
    if (piece && getPieceColor(piece) === state.turn) {
      if (state.turn !== playerSide && config.engine.enabled) return;
      if (state.selected && state.selected.row === row && state.selected.col === col) {
        state.selected = null;
        state.legalMoves = [];
      } else {
        state.selected = { row, col };
        state.legalMoves = getLegalMoves(state.pieces, row, col, state.castlingRights, state.enPassantTarget);
      }
      render();
      return;
    }

    if (state.selected) {
      state.selected = null;
      state.legalMoves = [];
      render();
    }
  });

  rootElement.appendChild(topBar);
  rootElement.appendChild(boardWrapper);
  rootElement.appendChild(bottomBar);

  render();

  function navigateReplay(idx, snapshot) {
    if (!inReplay) {
      liveState = {
        pieces: { ...state.pieces },
        castlingRights: { ...state.castlingRights },
        enPassantTarget: state.enPassantTarget,
        turn: state.turn,
        capturedByWhite: [...state.capturedByWhite],
        capturedByBlack: [...state.capturedByBlack],
        lastMove: state.lastMove ? { from: { ...state.lastMove.from }, to: { ...state.lastMove.to } } : null,
      };
    }
    inReplay = true;
    state.pieces = { ...snapshot.pieces };
    state.castlingRights = { ...snapshot.castlingRights };
    state.enPassantTarget = snapshot.enPassantTarget;
    state.turn = snapshot.turn;
    state.capturedByWhite = [...snapshot.capturedByWhite];
    state.capturedByBlack = [...snapshot.capturedByBlack];
    state.lastMove = snapshot.lastMove ? { from: { ...snapshot.lastMove.from }, to: { ...snapshot.lastMove.to } } : null;
    state.selected = null;
    state.legalMoves = [];
    state.inCheck = null;
    topName.textContent = `${opponentLabel} — Replay ${idx}/${history.length - 1}`;
    render();
  }

  function exitReplay() {
    if (!inReplay || !liveState) return;
    if (replay) replay.reset();
    inReplay = false;
    state.pieces = { ...liveState.pieces };
    state.castlingRights = { ...liveState.castlingRights };
    state.enPassantTarget = liveState.enPassantTarget;
    state.turn = liveState.turn;
    state.capturedByWhite = [...liveState.capturedByWhite];
    state.capturedByBlack = [...liveState.capturedByBlack];
    state.lastMove = liveState.lastMove ? { from: { ...liveState.lastMove.from }, to: { ...liveState.lastMove.to } } : null;
    liveState = null;
    state.selected = null;
    state.legalMoves = [];
    state.inCheck = null;
    topName.textContent = opponentLabel;
    render();
    if (state.turn !== playerSide && !state.gameOver && !gameEnded) {
      requestEngineMove();
    }
  }

  replay = createReplay(history, { onNavigate: navigateReplay, onExit: exitReplay });

  if (playerSide === BLACK && config.engine.enabled && engine && engine.available) {
    state.turn = WHITE;
    render();
    setTimeout(() => requestEngineMove(), 300);
  }

  return {
    cleanup() {
      window.removeEventListener("resize", onResize);
      boardWrapper.querySelectorAll(".endgame-label").forEach(el => el.remove());
      if (replay) replay.destroy();
      arrowOverlay.destroy();
      stopClock(clock);
      if (topClock._timer) clearInterval(topClock._timer);
      if (bottomClock._timer) clearInterval(bottomClock._timer);
    },
    resign(loosingSide) {
      if (gameEnded) return;
      const winningSide = loosingSide === WHITE ? BLACK : WHITE;
      endGame(winningSide, "resign");
    },
    applyMove(fromRow, fromCol, toRow, toCol) {
      if (gameEnded || inReplay) return;
      state.engineThinking = false;
      executeMove(fromRow, fromCol, toRow, toCol);
    },
    opponentResigned() {
      if (gameEnded) return;
      endGame(playerSide, "resign");
    },
  };
}

const FEN_MAP = {
  king: "k", queen: "q", rook: "r", bishop: "b", knight: "n", pawn: "p",
};

function boardToFen(pieces, turn, castlingRights, enPassantTarget) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = pieces[`${r}-${c}`];
      if (!p) {
        empty++;
      } else {
        if (empty > 0) { row += empty; empty = 0; }
        const base = FEN_MAP[p.type] || "?";
        row += p.colorClass === "white-piece" ? base.toUpperCase() : base;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  let fen = rows.join("/");
  fen += turn === WHITE ? " w" : " b";

  let castle = "";
  if (castlingRights.whiteKingSide) castle += "K";
  if (castlingRights.whiteQueenSide) castle += "Q";
  if (castlingRights.blackKingSide) castle += "k";
  if (castlingRights.blackQueenSide) castle += "q";
  fen += " " + (castle || "-");

  fen += enPassantTarget
    ? ` ${FILES[enPassantTarget.col]}${RANKS[enPassantTarget.row]}`
    : " -";

  fen += " 0 1";
  return fen;
}
