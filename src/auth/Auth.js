import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

const SESSION_KEY = "chess_session";

let _auth = null;
let _firestore = null;

function getAuthInstance() {
  if (!_auth) _auth = getAuth();
  return _auth;
}

function getFirestoreInstance() {
  if (!_firestore) _firestore = getFirestore();
  return _firestore;
}

function cacheSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return getSession() !== null;
}

export function getCurrentUser() {
  return getSession();
}

export async function register(username, email, password) {
  try {
    const auth = getAuthInstance();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const userData = {
      uid,
      username,
      email,
      elo: 500,
      stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 },
    };

    const db = getFirestoreInstance();
    await setDoc(doc(db, "users", uid), userData);
    cacheSession(userData);
    return { success: true };
  } catch (e) {
    let msg = "Registration failed";
    if (e.code === "auth/email-already-in-use") msg = "Email already in use";
    else if (e.code === "auth/weak-password") msg = "Password must be at least 6 characters";
    else if (e.code === "auth/invalid-email") msg = "Invalid email address";
    else msg = e.message || String(e);
    return { success: false, error: msg };
  }
}

export async function login(email, password) {
  try {
    const auth = getAuthInstance();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const db = getFirestoreInstance();
    const snap = await getDoc(doc(db, "users", uid));

    if (snap.exists()) {
      cacheSession(snap.data());
    } else {
      const fallback = { uid, username: email.split("@")[0], elo: 500, stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 } };
      await setDoc(doc(db, "users", uid), fallback);
      cacheSession(fallback);
    }

    return { success: true };
  } catch (e) {
    let msg = "Login failed";
    if (e.code === "auth/user-not-found") msg = "Invalid email or password";
    else if (e.code === "auth/wrong-password") msg = "Invalid email or password";
    else if (e.code === "auth/invalid-credential") msg = "Invalid email or password";
    return { success: false, error: msg };
  }
}

export async function logout() {
  await signOut(getAuthInstance());
  clearSession();
}

export async function updateUserStats(elo, stats) {
  const user = getCurrentUser();
  if (!user) return;
  const updated = { ...user, elo, stats };
  cacheSession(updated);

  try {
    const db = getFirestoreInstance();
    await setDoc(doc(db, "users", user.uid), { elo, stats }, { merge: true });
  } catch {}
}

export function onAuthChange(callback) {
  return onAuthStateChanged(getAuthInstance(), (firebaseUser) => {
    if (firebaseUser) {
      const cached = getSession();
      if (cached && cached.uid === firebaseUser.uid) {
        callback(cached);
      } else {
        callback(null);
      }
    } else {
      clearSession();
      callback(null);
    }
  });
}
