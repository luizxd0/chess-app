import { readFileSync } from 'fs';
const src = readFileSync('./public/stockfish.js', 'utf8');
if (src.includes('UCI_LimitStrength')) {
  console.log('Supports UCI_LimitStrength');
} else {
  console.log('Does not support UCI_LimitStrength');
}
