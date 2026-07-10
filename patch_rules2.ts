import fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  "allow read: if isSignedIn();\n      allow create: if isSignedIn() && isValidId(userId) && userId == request.auth.uid && isValidQueue(incoming());\n      allow delete: if isSignedIn();",
  "allow read, delete: if isSignedIn();\n      allow create: if isSignedIn() && isValidId(userId) && userId == request.auth.uid && isValidQueue(incoming());"
);

content = content.replace(
  "allow read: if isSignedIn();\n      allow create: if isSignedIn() && isValidId(gameId) && \n         (incoming().whiteId == request.auth.uid || incoming().blackId == request.auth.uid) && \n         isValidGame(incoming());",
  "allow read: if isSignedIn();\n      allow create: if isSignedIn() && isValidId(gameId) && (incoming().whiteId == request.auth.uid || incoming().blackId == request.auth.uid) && isValidGame(incoming());"
);

fs.writeFileSync('firestore.rules', content);
