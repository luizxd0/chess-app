import { BOARD_SIZE, FILES, RANKS } from "../config/boardConfig.js";
import { createPiece } from "./Piece.js";
import { getPieceSvg } from "../data/pieceSvgs.js";
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
    showPlayerArrows: true,
    showEnemyArrows: false,
  };

  let dragState = null;
  let handledByDrag = false;
  let gameEnded = false;
  let replay = null;
  let inReplay = false;
  let liveState = null;
  let pendingMoveAnimations = [];
  // ── Suggestion-arrow state (simple token pattern) ──────────────────────
  let suggToken = null;      // opaque object; replaced on every new search
  let lastSuggFen = null;    // fen+turn key of the last completed search
  let lastSuggMoves = null;  // moves of the last completed search
  let lastSuggDepth = null;  // depth reached in the last completed search

  function getSuggestionDepth() {
    return Math.max(10, config.engine?.depth || 10);
  }

  function reportSuggestionDepth(depth, side) {
    if (!callbacks || typeof callbacks.onSuggestionDepth !== "function") return;
    callbacks.onSuggestionDepth({ depth, targetDepth: getSuggestionDepth(), side, playerSide });
  }

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
  const arrowOverlay = createArrowOverlay(boardWrapper);
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

  function onResize() {
    render();
  }
  window.addEventListener("resize", onResize);

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
    arrowOverlay.refreshGeometry();

    // Re-anchor engine arrows after any DOM rebuild (selection, resize, etc.).
    if (lastSuggMoves && lastSuggFen) {
      const fenNow = boardToFen(state.pieces, state.turn, state.castlingRights, state.enPassantTarget);
      const keyNow = JSON.stringify([state.turn, fenNow]);
      if (shouldShowSuggestionsForCurrentTurn() && keyNow === lastSuggFen) {
        arrowOverlay.drawEngineArrows(lastSuggMoves);
      } else {
        arrowOverlay.clearEngineArrows();
      }
    }

    playPendingMoveAnimations();
  }

  function queueMoveAnimation(fromRow, fromCol, toRow, toCol, animate) {
    if (!animate || fromRow === toRow && fromCol === toCol) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const fromCell = board.querySelector(`.cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
    const toCell = board.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);
    if (!fromCell || !toCell) return;

    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    pendingMoveAnimations.push({
      row: toRow,
      col: toCol,
      dx: fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2),
      dy: fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2),
    });
  }

  function playPendingMoveAnimations() {
    if (pendingMoveAnimations.length === 0) return;
    const animations = pendingMoveAnimations;
    pendingMoveAnimations = [];

    animations.forEach(({ row, col, dx, dy }) => {
      const cell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      const pieceEl = cell?.querySelector(".piece");
      if (!pieceEl || Math.abs(dx) + Math.abs(dy) < 1) return;

      pieceEl.classList.add("piece-moving");
      pieceEl.style.transition = "none";
      pieceEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
      pieceEl.getBoundingClientRect();

      const cleanup = () => {
        pieceEl.classList.remove("piece-moving");
        pieceEl.style.transition = "";
        pieceEl.style.transform = "";
      };

      requestAnimationFrame(() => {
        pieceEl.style.transition = "transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        pieceEl.style.transform = "translate(0, 0) scale(1)";
        pieceEl.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, 480);
      });
    });
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

    clearSuggestionArrows();
    arrowOverlay.clearArrows();

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
      if (config.gameType === "coach_bot") {
        // Visible enemy suggestions share the same engine worker; wait for the
        // final arrow before starting the bot search so the bot cannot abort it.
        const suggestionsDone = requestEngineSuggestions();
        if (state.turn !== playerSide) {
          Promise.resolve(suggestionsDone).finally(() => {
            if (!gameEnded && !state.gameOver && !inReplay && state.turn !== playerSide) {
              requestEngineMove();
            }
          });
        }
      } else {
        requestEngineMove();
      }
    }
  }

  function shouldShowSuggestionsForCurrentTurn() {
    return state.turn === playerSide ? state.showPlayerArrows : state.showEnemyArrows;
  }

  // A suggestion arrow must always belong to the side whose turn it is. This
  // guards against ever drawing the opponent's move on your turn even if a
  // stale/garbled engine result slips through.
  function moveBelongsToSideToMove(uciMove) {
    if (!uciMove || uciMove.length < 4) return false;
    const fromCol = uciMove.charCodeAt(0) - 97;
    const fromRow = 8 - parseInt(uciMove[1], 10);
    const piece = state.pieces[`${fromRow}-${fromCol}`];
    return !!piece && getPieceColor(piece) === state.turn;
  }

  function clearSuggestionArrows() {
    suggToken = null;
    lastSuggFen = null;
    lastSuggMoves = null;
    lastSuggDepth = null;
    arrowOverlay.clearEngineArrows();
    reportSuggestionDepth(null, state.turn);
  }

  function requestEngineSuggestions(force = false) {
    if (config.gameType !== "coach_bot") return Promise.resolve(null);
    if (!engine || !engine.available) return Promise.resolve(null);
    if (state.gameOver || gameEnded || inReplay) return Promise.resolve(null);

    // The bot move and the suggestion analysis share a single engine worker.
    // Never start a suggestion search while the bot is computing its move, or
    // the two searches corrupt each other. Suggestions are recomputed right
    // after every move, so they will refresh once the engine is free.
    if (state.engineThinking) return Promise.resolve(null);

    if (!shouldShowSuggestionsForCurrentTurn()) {
      clearSuggestionArrows();
      return Promise.resolve(null);
    }

    const fen = boardToFen(state.pieces, state.turn, state.castlingRights, state.enPassantTarget);
    const key = JSON.stringify([state.turn, fen]);

    // Already have arrows for this exact position — just redraw (e.g. after resize).
    if (!force && key === lastSuggFen && lastSuggMoves) {
      arrowOverlay.drawEngineArrows(lastSuggMoves);
      reportSuggestionDepth(lastSuggDepth, state.turn);
      return Promise.resolve(lastSuggMoves);
    }

    // Start a fresh search. Any result arriving for a previous token is ignored.
    const tok = {};          // new object reference = unique cancellation token
    suggToken = tok;
    lastSuggFen = null;
    lastSuggMoves = null;
    lastSuggDepth = null;
    arrowOverlay.clearEngineArrows();

    const suggestDepth = getSuggestionDepth();
    const captureTurn = state.turn;   // snapshot so closures can check staleness
    const captureFen  = fen;
    reportSuggestionDepth(0, captureTurn);

    const commit = (moves) => {
      // `null` means the search was superseded by a newer one — leave the
      // currently-displayed arrows untouched.
      if (moves === null) return null;
      // Stale if a new search was started, or game/turn state changed.
      if (tok !== suggToken) return null;
      if (state.turn !== captureTurn) return null;
      if (gameEnded || state.gameOver || inReplay) return null;
      if (!shouldShowSuggestionsForCurrentTurn()) { clearSuggestionArrows(); return null; }
      const fenNow = boardToFen(state.pieces, state.turn, state.castlingRights, state.enPassantTarget);
      if (fenNow !== captureFen) return null;

      const normalized = (moves || [])
        .filter((m) => m?.move?.length >= 4 && moveBelongsToSideToMove(m.move))
        .slice(0, 1);
      if (normalized.length === 0) { arrowOverlay.clearEngineArrows(); return []; }

      const depth = normalized.reduce((d, m) => Math.max(d, m.depth || 0), 0) || null;
      lastSuggFen   = key;
      lastSuggMoves = normalized;
      lastSuggDepth = depth;
      arrowOverlay.drawEngineArrows(normalized);
      reportSuggestionDepth(depth, captureTurn);
      return normalized;
    };

    return engine.goMultiPV(captureFen, suggestDepth, 1, null, 1000)
      .then(commit)
      .catch(() => { if (tok === suggToken) arrowOverlay.clearEngineArrows(); return null; });
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

  function executeUciMove(move) {
    if (!move || move.length < 4 || move === "0000") return false;
    const fr = 8 - parseInt(move[1], 10);
    const fc = move.charCodeAt(0) - 97;
    const tr = 8 - parseInt(move[3], 10);
    const tc = move.charCodeAt(2) - 97;
    return executeMove(fr, fc, tr, tc);
  }

  function requestEngineMove(skipCachedCoachMove = false) {
    if (inReplay) return;
    if (!config.engine.enabled) return;
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
    const key = JSON.stringify([state.turn, fen]);
    const timeLeft = clock[state.turn];
    const searchTimeMs = getBotSearchTimeMs(timeLeft);
    const thinkDelayMs = calcThinkDelay();

    if (!engine || !engine.available) {
      setTimeout(() => {
        if (!state.engineThinking || inReplay || gameEnded) return;
        state.engineThinking = false;
        const allMoves = getAllMoves();
        if (allMoves.length > 0) {
          const [fr, fc, tr, tc] = allMoves[Math.floor(Math.random() * allMoves.length)];
          executeMove(fr, fc, tr, tc);
        }
      }, thinkDelayMs);
      return;
    }

    const cachedCoachMove = (
      config.gameType === "coach_bot" &&
      state.showEnemyArrows &&
      !skipCachedCoachMove &&
      randomChance === 0 &&
      key === lastSuggFen &&
      lastSuggMoves?.[0]?.move
    ) ? lastSuggMoves[0].move : null;

    if (cachedCoachMove) {
      setTimeout(() => {
        if (!state.engineThinking || inReplay || gameEnded) return;
        state.engineThinking = false;
        if (executeUciMove(cachedCoachMove)) return;
        requestEngineMove(true);
      }, calcThinkDelay());
      return;
    }

    // Thinking delay before engine starts (human-like pause)
    setTimeout(() => {
      if (!state.engineThinking || inReplay || gameEnded) return;

      engine.setPosition(fen);

      let done = false;
      const playBestOrFallback = (msg) => {
        if (done) return;
        done = true;
        clearTimeout(stopTimer);
        clearTimeout(safetyTimer);
        if (!state.engineThinking || inReplay) return;
        state.engineThinking = false;
        const move = parseBestMove(msg);
        if (executeUciMove(move)) return;
        // Engine returned no usable move — last-resort fallback.
        const allMoves = getAllMoves();
        if (allMoves.length > 0) {
          const [fr, fc, tr, tc] = allMoves[Math.floor(Math.random() * allMoves.length)];
          executeMove(fr, fc, tr, tc);
        }
      };

      // `go movetime` should finish on its own; this is only a nudge for a stuck
      // worker so the safety fallback below remains exceptional.
      const stopTimer = setTimeout(() => {
        if (!done && state.engineThinking && !inReplay) engine.stop();
      }, searchTimeMs + 250);

      // Absolute last resort if the engine never replies (e.g. it died).
      const safetyTimer = setTimeout(() => {
        if (done) return;
        if (state.engineThinking && !inReplay) {
          done = true;
          state.engineThinking = false;
          const allMoves = getAllMoves();
          if (allMoves.length > 0) {
            const [fr, fc, tr, tc] = allMoves[Math.floor(Math.random() * allMoves.length)];
            executeMove(fr, fc, tr, tc);
          }
        }
      }, searchTimeMs + 3000);

      engine.goTime(searchTimeMs)
        .then(playBestOrFallback)
        .catch(() => playBestOrFallback("bestmove 0000"));
    }, thinkDelayMs);
  }

  function calcThinkDelay() {
    const d = config.engine.depth || 10;
    if (d >= 20) return 250 + Math.random() * 350;
    if (d >= 14) return 350 + Math.random() * 500;
    const base = Math.max(500, 2600 - d * 120);
    return base + Math.random() * 600;
  }

  function getBotSearchTimeMs(timeLeft) {
    const d = config.engine.depth || 10;
    const levelCap = d >= 20 ? 1200 : d >= 14 ? 1000 : d >= 8 ? 800 : 500;
    const clockCap = Math.max(250, timeLeft / 40);
    return Math.round(Math.max(250, Math.min(levelCap, clockCap)));
  }

  function executeMove(fromRow, fromCol, toRow, toCol, options = {}) {
    if (gameEnded) return;
    const shouldAnimate = options.animate !== false;

    const movedPiece = state.pieces[`${fromRow}-${fromCol}`];
    if (!movedPiece) return false;
    if (getPieceColor(movedPiece) !== state.turn) return false;

    const legalMoves = getLegalMoves(
      state.pieces,
      fromRow,
      fromCol,
      state.castlingRights,
      state.enPassantTarget
    );
    if (!legalMoves.some(([r, c]) => r === toRow && c === toCol)) return false;

    queueMoveAnimation(fromRow, fromCol, toRow, toCol, shouldAnimate);

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
    return true;
  }

  function doMove(fromRow, fromCol, toRow, toCol, options = {}) {
    if (gameEnded || state.engineThinking) return;
    const ok = executeMove(fromRow, fromCol, toRow, toCol, options);
    if (!ok) return;
    if (callbacks.onPlayerMove && !gameEnded) {
      callbacks.onPlayerMove(fromRow, fromCol, toRow, toCol);
    }
  }

  function hideDraggedPieceAt(row, col) {
    const cellEl = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const currentPieceEl = cellEl?.querySelector(".piece");
    if (currentPieceEl) currentPieceEl.style.opacity = "0";
    return currentPieceEl || null;
  }

  // ─── Pointer-event drag & drop (covers mouse and touch uniformly) ──────────

  board.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (inReplay) { exitReplay(); return; }
    if (state.gameOver || gameEnded || state.engineThinking) return;
    if (dragState) return;

    const cell = e.target.closest(".cell");
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = state.pieces[`${row}-${col}`];
    if (!piece || getPieceColor(piece) !== state.turn) return;
    if (state.turn !== playerSide) return;

    const legalMoves = getLegalMoves(state.pieces, row, col, state.castlingRights, state.enPassantTarget);
    const cellRect = cell.getBoundingClientRect();

    try { board.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    dragState = {
      pointerId: e.pointerId,
      row, col, piece, legalMoves,
      cellW: cellRect.width, cellH: cellRect.height,
      startX: e.clientX, startY: e.clientY,
      clone: null, dragging: false,
    };
    handledByDrag = false;
  });

  board.addEventListener("pointermove", (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    e.preventDefault();

    if (!dragState.dragging) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (dx * dx + dy * dy < 36) return;   // 6px threshold (squared) before drag starts

      dragState.dragging = true;

      const clone = document.createElement("span");
      clone.className = `piece ${dragState.piece.colorClass} dragging`;
      const svgContent = getPieceSvg(dragState.piece.type, dragState.piece.colorClass);
      if (svgContent) clone.innerHTML = svgContent;
      else clone.textContent = dragState.piece.symbol;
      clone.style.cssText =
        `position:fixed;pointer-events:none;z-index:1000;` +
        `width:${dragState.cellW}px;height:${dragState.cellH}px;` +
        `display:flex;align-items:center;justify-content:center;` +
        `left:${e.clientX - dragState.cellW / 2}px;top:${e.clientY - dragState.cellH / 2}px`;
      document.body.appendChild(clone);
      dragState.clone = clone;

      state.selected = { row: dragState.row, col: dragState.col };
      state.legalMoves = dragState.legalMoves;
      render();

      // render() recreates DOM – hide the source piece in the new DOM.
      hideDraggedPieceAt(dragState.row, dragState.col);
      return;
    }

    if (dragState.clone) {
      const w = dragState.clone.offsetWidth  || dragState.cellW;
      const h = dragState.clone.offsetHeight || dragState.cellH;
      dragState.clone.style.left = (e.clientX - w / 2) + "px";
      dragState.clone.style.top  = (e.clientY - h / 2) + "px";
    }
  });

  board.addEventListener("pointerup", (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    _finishDrag(e.clientX, e.clientY, true);
  });

  board.addEventListener("pointercancel", (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    _finishDrag(0, 0, false);
  });

  function _finishDrag(cx, cy, tryCommit) {
    const drag = dragState;
    dragState = null;
    if (!drag) return;

    if (drag.clone) drag.clone.remove();

    // Never exceeded drag threshold: keep click-to-move enabled.
    if (!drag.dragging) {
      handledByDrag = false;
      return;
    }

    handledByDrag = true;
    state.selected = null;
    state.legalMoves = [];

    if (tryCommit) {
      const target = document.elementFromPoint(cx, cy);
      const targetCell = target?.closest(".cell");
      if (targetCell) {
        const tr = parseInt(targetCell.dataset.row);
        const tc = parseInt(targetCell.dataset.col);
        if (drag.legalMoves.some(([r, c]) => r === tr && c === tc)) {
          doMove(drag.row, drag.col, tr, tc, { animate: false });
          return;   // doMove → executeMove → afterMove → render()
        }
      }
    }
    render();
  }

  // ─── Click-to-move ───────────────────────────────────────────────────────

  board.addEventListener("click", (e) => {
    if (inReplay) { exitReplay(); return; }
    if (state.gameOver || gameEnded || state.engineThinking) return;
    if (handledByDrag) { handledByDrag = false; return; }

    // board.setPointerCapture() routes the click event's target to the board
    // element itself, so e.target.closest(".cell") would fail. Use the actual
    // cursor position to find the real cell underneath.
    const cellEl = e.target.closest(".cell") ||
                   document.elementFromPoint(e.clientX, e.clientY)?.closest(".cell");
    const cell = cellEl && board.contains(cellEl) ? cellEl : null;
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (state.selected && state.legalMoves.some(([r, c]) => r === row && c === col)) {
      doMove(state.selected.row, state.selected.col, row, col);
      return;
    }

    const piece = state.pieces[`${row}-${col}`];
    if (piece && getPieceColor(piece) === state.turn) {
      if (state.turn !== playerSide) return;
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
    arrowOverlay.cancelDrag();
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
    clearSuggestionArrows();
    render();
  }

  function exitReplay() {
    if (!inReplay || !liveState) return;
    arrowOverlay.cancelDrag();
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
    clearSuggestionArrows();
    render();
    if (state.turn !== playerSide && !state.gameOver && !gameEnded) {
      requestEngineMove();
    }
    requestEngineSuggestions();
  }

  replay = createReplay(history, { onNavigate: navigateReplay, onExit: exitReplay });

  if (playerSide === BLACK && config.engine.enabled && engine && engine.available) {
    state.turn = WHITE;
    render();
    setTimeout(() => requestEngineMove(), 300);
  }

  if (config.gameType === "coach_bot" && playerSide === WHITE) {
    setTimeout(() => requestEngineSuggestions(), 500);
  }

  return {
    cleanup() {
      window.removeEventListener("resize", onResize);
      clearSuggestionArrows();
      arrowOverlay.cancelDrag();
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
      const ok = executeMove(fromRow, fromCol, toRow, toCol);
      if (!ok) {
        console.warn("[Board] Rejected remote move", { fromRow, fromCol, toRow, toCol, turn: state.turn });
      }
      return ok;
    },
    opponentResigned() {
      if (gameEnded) return;
      endGame(playerSide, "resign");
    },
    togglePlayerArrows(show) {
      state.showPlayerArrows = show;
      requestEngineSuggestions(true);
    },
    toggleEnemyArrows(show) {
      state.showEnemyArrows = show;
      requestEngineSuggestions(true);
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
