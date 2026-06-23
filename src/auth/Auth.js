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
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const SESSION_KEY = "chess_session";
const SESSION_LOCK_KEY = "chess_session_lock";

let _auth = null;
let _firestore = null;
let _heartbeatInterval = null;
let _sessionId = null;
let _cleanupFns = [];

function getAuthInstance() {
  if (!_auth) _auth = getAuth();
  return _auth;
}

function getFirestoreInstance() {
  if (!_firestore) _firestore = getFirestore();
  return _firestore;
}

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
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

async function acquireSessionLock(uid) {
  const db = getFirestoreInstance();
  const lockRef = doc(db, "activeSessions", uid);
  const lockSnap = await getDoc(lockRef);

  if (lockSnap.exists()) {
    const lockData = lockSnap.data();
    const lockAge = lockData.heartbeat?.toMillis?.() || 0;
    const now = Date.now();
    const staleThreshold = 30000;

    if (lockAge && now - lockAge < staleThreshold) {
      const storedId = localStorage.getItem(SESSION_LOCK_KEY);
      if (storedId && storedId === lockData.sessionId) {
        return { ok: true };
      }
      return { ok: false, error: "This account is already logged in on another tab or device." };
    }
  }

  _sessionId = generateSessionId();
  localStorage.setItem(SESSION_LOCK_KEY, _sessionId);

  await setDoc(lockRef, {
    sessionId: _sessionId,
    heartbeat: serverTimestamp(),
  }, { merge: false });

  return { ok: true };
}

function startHeartbeat(uid) {
  stopHeartbeat();

  const db = getFirestoreInstance();
  const lockRef = doc(db, "activeSessions", uid);

  const tick = async () => {
    try {
      const storedId = localStorage.getItem(SESSION_LOCK_KEY);
      if (!storedId) { stopHeartbeat(); return; }
      const snap = await getDoc(lockRef);
      if (snap.exists() && snap.data().sessionId !== storedId) {
        stopHeartbeat();
        clearSession();
        window.location.reload();
        return;
      }
      await setDoc(lockRef, {
        sessionId: storedId,
        heartbeat: serverTimestamp(),
      }, { merge: false });
    } catch {}
  };

  const releaseLock = async () => {
    try {
      const storedId = localStorage.getItem(SESSION_LOCK_KEY);
      if (storedId) {
        localStorage.removeItem(SESSION_LOCK_KEY);
        await deleteDoc(lockRef).catch(() => {});
      }
    } catch {}
  };

  tick();
  _heartbeatInterval = setInterval(tick, 15000);

  _cleanupFns = [];

  window.addEventListener("beforeunload", releaseLock);
  _cleanupFns.push(() => window.removeEventListener("beforeunload", releaseLock));

  const onVisChange = () => {
    if (document.visibilityState === "hidden") {
      tick();
    }
  };
  document.addEventListener("visibilitychange", onVisChange);
  _cleanupFns.push(() => document.removeEventListener("visibilitychange", onVisChange));
}

function stopHeartbeat() {
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval);
    _heartbeatInterval = null;
  }
  _cleanupFns.forEach(fn => fn());
  _cleanupFns = [];
  localStorage.removeItem(SESSION_LOCK_KEY);
  _sessionId = null;
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

    const lock = await acquireSessionLock(uid);
    if (!lock.ok) {
      await signOut(auth);
      clearSession();
      return { success: false, error: lock.error };
    }
    startHeartbeat(uid);

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

    let userData;
    if (snap.exists()) {
      userData = snap.data();
    } else {
      userData = { uid, username: email.split("@")[0], elo: 500, stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 } };
      await setDoc(doc(db, "users", uid), userData);
    }
    cacheSession(userData);

    const lock = await acquireSessionLock(uid);
    if (!lock.ok) {
      await signOut(auth);
      clearSession();
      return { success: false, error: lock.error };
    }
    startHeartbeat(uid);

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
  const user = getCurrentUser();
  if (user) {
    try {
      const db = getFirestoreInstance();
      await deleteDoc(doc(db, "activeSessions", user.uid)).catch(() => {});
    } catch {}
  }
  stopHeartbeat();
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
      stopHeartbeat();
      callback(null);
    }
  });
}

export async function initSession() {
  const user = getSession();
  if (!user) return;

  _sessionId = localStorage.getItem(SESSION_LOCK_KEY);
  if (_sessionId) {
    startHeartbeat(user.uid);
    return;
  }

  const lock = await acquireSessionLock(user.uid);
  if (!lock.ok) {
    clearSession();
    await signOut(getAuthInstance()).catch(() => {});
    return lock;
  }
  startHeartbeat(user.uid);
  return { ok: true };
}
