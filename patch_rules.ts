import fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  "return data.keys().hasAll(['uid', 'elo', 'displayName']) &&",
  "return data.keys().hasAll(['uid', 'elo', 'displayName']) && (!('maxBotUnlocked' in data) || data.maxBotUnlocked is number) &&"
);

content = content.replace(
  "incoming().diff(existing()).affectedKeys().hasOnly(['elo']) && incoming().elo is number",
  "incoming().diff(existing()).affectedKeys().hasOnly(['elo', 'maxBotUnlocked']) && incoming().elo is number && (!('maxBotUnlocked' in incoming()) || incoming().maxBotUnlocked is number)"
);

fs.writeFileSync('firestore.rules', content);
