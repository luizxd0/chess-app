function isMoveValid(pieceType, pieceColor, dr, dc) {
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  switch (pieceType) {
    case "knight":
      return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    case "bishop":
      return adr === adc && adr > 0;
    case "rook":
      return (adr === 0 && adc > 0) || (adc === 0 && adr > 0);
    case "queen":
      return (adr === adc && adr > 0) || (adr === 0 && adc > 0) || (adc === 0 && adr > 0);
    case "king":
      return adr <= 1 && adc <= 1 && (adr + adc) > 0;
    case "pawn": {
      const forward = pieceColor === "white" ? -1 : 1;
      return (dr === forward && adc <= 1) || (dr === 2 * forward && dc === 0);
    }
    default:
      return false;
  }
}

export function createArrowOverlay(boardEl, getPiece) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "5";

  const arrows = [];
  let dragStart = null;
  let tempPath = null;

  function getSquareSize() {
    const first = boardEl.querySelector("[data-row]");
    if (!first) return 60;
    return first.offsetWidth || 60;
  }

  function cellCenter(cell) {
    const rect = boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top + cellRect.height / 2,
    };
  }

  function createArrowEl(x1, y1, x2, y2, corner, color = "#ffd700", opacity = 0.7, dashed = false) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return g;

    const ux = dx / len, uy = dy / len;
    const headLen = Math.min(14, len * 0.3);
    const hx = x2 - ux * headLen, hy = y2 - uy * headLen;
    const spread = 5;
    const sw = Math.min(5, Math.max(3, len * 0.035));

    if (corner) {
      const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", x1); line1.setAttribute("y1", y1);
      line1.setAttribute("x2", corner.x); line1.setAttribute("y2", corner.y);
      line1.setAttribute("stroke", color);
      line1.setAttribute("stroke-width", sw);
      line1.setAttribute("stroke-linecap", "round");
      line1.setAttribute("opacity", opacity);
      if (dashed) line1.setAttribute("stroke-dasharray", "6,4");
      g.appendChild(line1);

      const cx = corner.x, cy = corner.y;
      const dx2 = x2 - cx, dy2 = y2 - cy;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const ux2 = dx2 / len2, uy2 = dy2 / len2;
      const hx2 = x2 - ux2 * headLen, hy2 = y2 - uy2 * headLen;

      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", cx); line2.setAttribute("y1", cy);
      line2.setAttribute("x2", hx2); line2.setAttribute("y2", hy2);
      line2.setAttribute("stroke", color);
      line2.setAttribute("stroke-width", sw);
      line2.setAttribute("stroke-linecap", "round");
      line2.setAttribute("opacity", opacity);
      if (dashed) line2.setAttribute("stroke-dasharray", "6,4");
      g.appendChild(line2);

      const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      const pts = [
        `${x2},${y2}`,
        `${cx + (dx2 / len2) * (len2 - headLen) - uy2 * spread * 0.5},${cy + (dy2 / len2) * (len2 - headLen) + ux2 * spread * 0.5}`,
        `${cx + (dx2 / len2) * (len2 - headLen) + uy2 * spread * 0.5},${cy + (dy2 / len2) * (len2 - headLen) - ux2 * spread * 0.5}`,
      ].join(" ");
      head.setAttribute("points", pts);
      head.setAttribute("fill", color);
      head.setAttribute("opacity", opacity);
      g.appendChild(head);
    } else {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", hx); line.setAttribute("y2", hy);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", sw);
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", opacity);
      if (dashed) line.setAttribute("stroke-dasharray", "6,4");
      g.appendChild(line);

      const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      const pts = [
        `${x2},${y2}`,
        `${x1 + (dx / len) * (len - headLen) - uy * spread * 0.5},${y1 + (dy / len) * (len - headLen) + ux * spread * 0.5}`,
        `${x1 + (dx / len) * (len - headLen) + uy * spread * 0.5},${y1 + (dy / len) * (len - headLen) - ux * spread * 0.5}`,
      ].join(" ");
      head.setAttribute("points", pts);
      head.setAttribute("fill", color);
      head.setAttribute("opacity", opacity);
      g.appendChild(head);
    }

    return g;
  }

  function drawAllArrows() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (const a of arrows) {
      svg.appendChild(createArrowEl(a.x1, a.y1, a.x2, a.y2, a.corner));
    }
  }

  function clearArrows() {
    arrows.length = 0;
    drawAllArrows();
  }

  function removeArrowAt(row, col) {
    const cells = boardEl.querySelectorAll("[data-row]");
    let targetCell = null;
    for (const c of cells) {
      if (parseInt(c.dataset.row) === row && parseInt(c.dataset.col) === col) {
        targetCell = c; break;
      }
    }
    if (!targetCell) return false;
    const pt = cellCenter(targetCell);
    for (let i = arrows.length - 1; i >= 0; i--) {
      const dx = arrows[i].x2 - pt.x, dy = arrows[i].y2 - pt.y;
      if (dx * dx + dy * dy < 400) {
        arrows.splice(i, 1);
        drawAllArrows();
        return true;
      }
    }
    return false;
  }

  function getCellFromEl(el) {
    return el?.closest?.("[data-row]") || null;
  }

  function getPieceInfo(row, col) {
    return getPiece ? getPiece(row, col) : null;
  }

  function isKnightMove(dr, dc) {
    const adr = Math.abs(dr), adc = Math.abs(dc);
    return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
  }

  function computeKnightCorner(x1, y1, x2, y2, dr, dc) {
    if (Math.abs(dc) >= Math.abs(dr)) {
      return { x: x2, y: y1 };
    }
    return { x: x1, y: y2 };
  }

  function handleMouseDown(e) {
    if (e.button !== 2) return;
    const cell = getCellFromEl(e.target);
    if (!cell) return;

    const rect = boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    dragStart = {
      row: parseInt(cell.dataset.row),
      col: parseInt(cell.dataset.col),
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top + cellRect.height / 2,
    };

    if (tempPath && tempPath.parentNode) tempPath.remove();
    tempPath = null;
  }

  function handleMouseMove(e) {
    if (!dragStart) return;
    const rect = boardEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (tempPath && tempPath.parentNode) tempPath.remove();

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = getCellFromEl(targetEl);

    let endX = mx, endY = my;
    let corner = null;

    if (targetCell) {
      const center = cellCenter(targetCell);
      const tr = parseInt(targetCell.dataset.row);
      const tc = parseInt(targetCell.dataset.col);
      const dr = tr - dragStart.row;
      const dc = tc - dragStart.col;
      endX = center.x;
      endY = center.y;

      const piece = getPieceInfo(dragStart.row, dragStart.col);
      if (piece && isKnightMove(dr, dc)) {
        corner = computeKnightCorner(dragStart.x, dragStart.y, endX, endY, dr, dc);
      }
    }

    tempPath = createArrowEl(dragStart.x, dragStart.y, endX, endY, corner, "#ffd700", 0.5, true);
    svg.appendChild(tempPath);
  }

  function handleMouseUp(e) {
    if (e.button !== 2 || !dragStart) {
      if (e.button === 0) clearArrows();
      dragStart = null;
      if (tempPath && tempPath.parentNode) tempPath.remove();
      tempPath = null;
      return;
    }

    if (tempPath) { tempPath.remove(); tempPath = null; }

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = getCellFromEl(targetEl);

    if (targetCell) {
      const tr = parseInt(targetCell.dataset.row);
      const tc = parseInt(targetCell.dataset.col);
      if (tr === dragStart.row && tc === dragStart.col) {
        if (!removeArrowAt(dragStart.row, dragStart.col)) {
          clearArrows();
        }
      } else {
        const piece = getPieceInfo(dragStart.row, dragStart.col);
        if (!piece) { dragStart = null; return; }

        const color = piece.colorClass ? piece.colorClass.split("-")[0] : "";
        const dr = tr - dragStart.row;
        const dc = tc - dragStart.col;
        if (!isMoveValid(piece.type, color, dr, dc)) { dragStart = null; return; }

        const end = cellCenter(targetCell);
        let corner = null;
        if (isKnightMove(dr, dc)) {
          corner = computeKnightCorner(dragStart.x, dragStart.y, end.x, end.y, dr, dc);
        }
        arrows.push({ x1: dragStart.x, y1: dragStart.y, x2: end.x, y2: end.y, corner });
        drawAllArrows();
      }
    }

    dragStart = null;
  }

  function handleContextMenu(e) {
    e.preventDefault();
  }

  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  boardEl.addEventListener("contextmenu", handleContextMenu);

  function destroy() {
    document.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    boardEl.removeEventListener("contextmenu", handleContextMenu);
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  return { svg, destroy, clearArrows, drawEngineArrows, clearEngineArrows };

  function drawEngineArrows(moves) {
    clearEngineArrows();
    if (!moves || moves.length === 0) return;

    const cells = boardEl.querySelectorAll("[data-row]");
    const cellMap = {};
    cells.forEach(c => {
      cellMap[`${c.dataset.row}-${c.dataset.col}`] = c;
    });

    const colors = ["#15803d", "#2563eb"];
    const opacities = [0.75, 0.55];

    moves.forEach((m, i) => {
      if (!m.move || m.move.length < 4) return;
      const fromCol = m.move.charCodeAt(0) - 97;
      const fromRow = 8 - parseInt(m.move[1], 10);
      const toCol = m.move.charCodeAt(2) - 97;
      const toRow = 8 - parseInt(m.move[3], 10);

      const fromCell = cellMap[`${fromRow}-${fromCol}`];
      const toCell = cellMap[`${toRow}-${toCol}`];
      if (!fromCell || !toCell) return;

      const from = cellCenter(fromCell);
      const to = cellCenter(toCell);

      const dr = toRow - fromRow;
      const dc = toCol - fromCol;
      let corner = null;
      if (Math.abs(dc) === 2 && Math.abs(dr) === 1 || Math.abs(dc) === 1 && Math.abs(dr) === 2) {
        corner = computeKnightCorner(from.x, from.y, to.x, to.y, dr, dc);
      }

      const arrow = createArrowEl(from.x, from.y, to.x, to.y, corner, colors[i], opacities[i]);
      arrow.classList.add("engine-arrow");
      svg.appendChild(arrow);
    });
  }

  function clearEngineArrows() {
    svg.querySelectorAll(".engine-arrow").forEach(el => el.remove());
  }
}
