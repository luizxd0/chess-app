const moveSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
const captureSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
const notifySound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3');

export const playMoveSound = () => {
  moveSound.currentTime = 0;
  moveSound.play().catch(() => {});
};

export const playCaptureSound = () => {
  captureSound.currentTime = 0;
  captureSound.play().catch(() => {});
};

export const playGenericNotifySound = () => {
  notifySound.currentTime = 0;
  notifySound.play().catch(() => {});
};
