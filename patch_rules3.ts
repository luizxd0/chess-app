import fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  "allow read, delete: if isSignedIn();\n      allow create: if isSignedIn() && isValidId(userId) && userId == request.auth.uid && isValidQueue(incoming());",
  "allow read, delete: if isSignedIn();\n      allow create, update: if isSignedIn() && isValidId(userId) && userId == request.auth.uid && isValidQueue(incoming());"
);

fs.writeFileSync('firestore.rules', content);
