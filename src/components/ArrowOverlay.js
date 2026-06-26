export function createArrowOverlay(boardEl) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "5";
  // NOTE: an svg-wide `filter: drop-shadow(...)` was previously set here, but
  // mutating the engine-arrow children many times per search (interim depth
  // updates) intermittently left the filter region un-repainted, so the arrow
  // ended up in the DOM but invisible until a reflow (e.g. toggling arrows).
  // The (purely cosmetic) shadow is dropped; the solid arrows remain clear.

  const manualLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const engineLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(manualLayer);
  svg.appendChild(engineLayer);

  const arrows = [];
  let dragStart = null;
  let tempPath = null;
  let boardRectCache = null;
  let cellCenterCache = new Map();
  let rafMouseEvent = null;
  let rafId = 0;
  let lastEngineSig = null;   // dedupe identical engine-arrow redraws

  function getSquareSize() {
    const first = boardEl.querySelector("[data-row]");
    if (!first) return 60;
    return first.offsetWidth || 60;
  }

  function cellCenter(cell) {
    const rect = boardRectCache || boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top + cellRect.height / 2,
    };
  }

  function refreshGeometry() {
    boardRectCache = boardEl.getBoundingClientRect();
    const next = new Map();
    const cells = boardEl.querySelectorAll("[data-row]");
    cells.forEach((cell) => {
      const key = `${cell.dataset.row}-${cell.dataset.col}`;
      next.set(key, cellCenter(cell));
    });
    cellCenterCache = next;
  }

  function getCachedCenter(row, col) {
    const key = `${row}-${col}`;
    if (!cellCenterCache.has(key)) refreshGeometry();
    return cellCenterCache.get(key) || null;
  }

  function createArrowEl(x1, y1, x2, y2, corner, color = "#ffd700", opacity = 0.7, dashed = false) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return g;

    const ux = dx / len, uy = dy / len;
    const squareSize = getSquareSize();
    const sw = Math.max(10, Math.round(squareSize * 0.12));
    const headLen = Math.max(12, Math.round(squareSize * 0.35));
    const headWidth = Math.max(14, Math.round(squareSize * 0.4));
    const hx = x2 - ux * headLen, hy = y2 - uy * headLen;

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
        `${cx + (dx2 / len2) * (len2 - headLen) - uy2 * headWidth * 0.5},${cy + (dy2 / len2) * (len2 - headLen) + ux2 * headWidth * 0.5}`,
        `${cx + (dx2 / len2) * (len2 - headLen) + uy2 * headWidth * 0.5},${cy + (dy2 / len2) * (len2 - headLen) - ux2 * headWidth * 0.5}`,
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
        `${x1 + (dx / len) * (len - headLen) - uy * headWidth * 0.5},${y1 + (dy / len) * (len - headLen) + ux * headWidth * 0.5}`,
        `${x1 + (dx / len) * (len - headLen) + uy * headWidth * 0.5},${y1 + (dy / len) * (len - headLen) - ux * headWidth * 0.5}`,
      ].join(" ");
      head.setAttribute("points", pts);
      head.setAttribute("fill", color);
      head.setAttribute("opacity", opacity);
      g.appendChild(head);
    }

    return g;
  }

  function drawAllArrows() {
    while (manualLayer.firstChild) manualLayer.removeChild(manualLayer.firstChild);
    for (const a of arrows) {
      manualLayer.appendChild(createArrowEl(a.x1, a.y1, a.x2, a.y2, a.corner));
    }
  }

  function clearArrows() {
    arrows.length = 0;
    drawAllArrows();
  }

  function removeArrowAt(row, col) {
    const pt = getCachedCenter(row, col);
    if (!pt) return false;
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
    const cell = el?.closest?.("[data-row]") || null;
    if (!cell || !boardEl.contains(cell)) return null;
    return cell;
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

    boardRectCache = boardEl.getBoundingClientRect();
    const rect = boardRectCache;
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
    const rect = boardRectCache || boardEl.getBoundingClientRect();
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

      if (isKnightMove(dr, dc)) {
        corner = computeKnightCorner(dragStart.x, dragStart.y, endX, endY, dr, dc);
      }
    }

    tempPath = createArrowEl(dragStart.x, dragStart.y, endX, endY, corner, "#ffd700", 0.5, true);
    manualLayer.appendChild(tempPath);
  }

  function handleMouseMoveRaf(e) {
    rafMouseEvent = e;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!rafMouseEvent) return;
      handleMouseMove(rafMouseEvent);
      rafMouseEvent = null;
    });
  }

  function handleMouseUp(e) {
    if (e.button !== 2) {
      if (tempPath && tempPath.parentNode) tempPath.remove();
      tempPath = null;
      return;
    }

    if (!dragStart) {
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
        // Right-click on same square: remove arrow pointing here, or clear all
        if (!removeArrowAt(dragStart.row, dragStart.col)) {
          clearArrows();
        }
      } else {
        // Draw an arrow from dragStart square to any target square
        const end = cellCenter(targetCell);
        const dr = tr - dragStart.row;
        const dc = tc - dragStart.col;
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

  boardEl.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMoveRaf);
  document.addEventListener("mouseup", handleMouseUp);
  boardEl.addEventListener("contextmenu", handleContextMenu);

  function destroy() {
    boardEl.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMoveRaf);
    document.removeEventListener("mouseup", handleMouseUp);
    boardEl.removeEventListener("contextmenu", handleContextMenu);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    rafMouseEvent = null;
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  function cancelDrag() {
    dragStart = null;
    if (tempPath && tempPath.parentNode) tempPath.remove();
    tempPath = null;
  }

  return {
    svg,
    destroy,
    cancelDrag,
    clearArrows,
    drawEngineArrows,
    clearEngineArrows,
    refreshGeometry,
  };

  function drawEngineArrows(moves) {
    if (!moves || moves.length === 0) { clearEngineArrows(); return; }
    refreshGeometry();

    // Skip redundant redraws: the engine emits the same best move many times
    // per search (interim depth updates). Re-clearing/re-appending the SVG on
    // each one caused repaint flicker where the arrow could end up invisible.
    // The signature includes the board width so a genuine resize still redraws.
    const widthKey = boardRectCache ? Math.round(boardRectCache.width) : 0;
    const sig = widthKey + "|" + moves.map((m) => m && m.move).join(",");
    if (sig === lastEngineSig && engineLayer.firstChild) return;

    clearEngineArrows();

    const colors = ["#6BBF59", "#3B82F6"];
    const opacities = [0.85, 0.6];

    moves.forEach((m, i) => {
      if (!m.move || m.move.length < 4) return;
      const fromCol = m.move.charCodeAt(0) - 97;
      const fromRow = 8 - parseInt(m.move[1], 10);
      const toCol = m.move.charCodeAt(2) - 97;
      const toRow = 8 - parseInt(m.move[3], 10);

      const from = getCachedCenter(fromRow, fromCol);
      const to = getCachedCenter(toRow, toCol);
      if (!from || !to) return;

      const dr = toRow - fromRow;
      const dc = toCol - fromCol;
      let corner = null;
      if (Math.abs(dc) === 2 && Math.abs(dr) === 1 || Math.abs(dc) === 1 && Math.abs(dr) === 2) {
        corner = computeKnightCorner(from.x, from.y, to.x, to.y, dr, dc);
      }

      const arrow = createArrowEl(from.x, from.y, to.x, to.y, corner, colors[i], opacities[i]);
      arrow.classList.add("engine-arrow");
      engineLayer.appendChild(arrow);
    });

    lastEngineSig = sig;
  }

  function clearEngineArrows() {
    while (engineLayer.firstChild) engineLayer.removeChild(engineLayer.firstChild);
    lastEngineSig = null;
  }
}
