const Worker = require('worker_threads').Worker;
const worker = new Worker('./public/stockfish.js');
worker.on('message', m => console.log(m));
worker.postMessage('uci');
worker.postMessage('position startpos');
worker.postMessage('go depth 1 nodes 10');
setTimeout(() => process.exit(0), 1000);
