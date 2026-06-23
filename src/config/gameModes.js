export const TIME_CONTROLS = [
  { id: "bullet1", label: "Bullet 1", initial: 60, increment: 0, category: "bullet" },
  { id: "bullet2", label: "Bullet 2|1", initial: 120, increment: 1, category: "bullet" },
  { id: "blitz3",  label: "Blitz 3",   initial: 180, increment: 0, category: "blitz" },
  { id: "blitz32", label: "Blitz 3|2", initial: 180, increment: 2, category: "blitz" },
  { id: "blitz5",  label: "Blitz 5",   initial: 300, increment: 0, category: "blitz" },
  { id: "blitz53", label: "Blitz 5|3", initial: 300, increment: 3, category: "blitz" },
  { id: "rapid10",  label: "Rapid 10",    initial: 600,  increment: 0,  category: "rapid" },
  { id: "rapid105", label: "Rapid 10|5",  initial: 600,  increment: 5,  category: "rapid" },
  { id: "rapid1510",label: "Rapid 15|10", initial: 900,  increment: 10, category: "rapid" },
  { id: "classic30",  label: "Classic 30|20", initial: 1800, increment: 20, category: "classic" },
  { id: "classic60",  label: "Classic 60",    initial: 3600, increment: 0,  category: "classic" },
];

export const SIDES = [
  { id: "random", label: "Random" },
  { id: "white",  label: "White" },
  { id: "black",  label: "Black" },
];

export const BOT_LEVELS = [
  { id: "beginner",     label: "Beginner",     elo: 500,  depth: 2,  randomMoveChance: 0.5 },
  { id: "intermediate", label: "Intermediate", elo: 1000, depth: 6,  randomMoveChance: 0.2 },
  { id: "advanced",     label: "Advanced",     elo: 2000, depth: 14, randomMoveChance: 0 },
  { id: "expert",       label: "Expert",       elo: 3000, depth: 22, randomMoveChance: 0 },
];

export const GAME_TYPES = [
  { id: "online", label: "Play vs Player", icon: "👥", desc: "Match with a player at your level" },
  { id: "casual_bot", label: "Play vs Bot", icon: "🤖", desc: "Pick a difficulty — no rating change" },
  { id: "ranked_bot", label: "Ranked Bot", icon: "🏆", desc: "Bot matched to your rating" },
];
