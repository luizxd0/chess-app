import { Chess } from 'chess.js';
const chess = new Chess();
const dests = new Map();
chess.moves({ verbose: true }).forEach(m => {
  const list = dests.get(m.from) || [];
  list.push(m.to);
  dests.set(m.from, list);
});
console.log(Array.from(dests.entries()));
