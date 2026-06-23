import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

export function createMatchmaking(firestore, user) {
  const queueRef = doc(firestore, "queue", user.uid);
  let queueSnapUnsub = null;
  let ownUnsub = null;

  function joinQueue() {
    return setDoc(queueRef, {
      userId: user.uid,
      username: user.username,
      elo: user.elo,
      createdAt: serverTimestamp(),
      status: "waiting",
      matched: false,
    });
  }

  function stopListening() {
    if (queueSnapUnsub) queueSnapUnsub();
    if (ownUnsub) ownUnsub();
    queueSnapUnsub = null;
    ownUnsub = null;
  }

  function leaveQueue() {
    stopListening();
    return deleteDoc(queueRef).catch(() => {});
  }

  function startQueueListener(onMatched) {
    const q = query(
      collection(firestore, "queue"),
      orderBy("createdAt", "asc"),
      limit(2)
    );

    queueSnapUnsub = onSnapshot(q, async (snap) => {
      if (snap.docs.length < 2) return;

      const docs = snap.docs;
      const first = docs[0].data();
      const second = docs[1].data();

      if (first.status !== "waiting" || second.status !== "waiting") return;
      if (first.userId !== user.uid) return;

      try {
        await runTransaction(firestore, async (transaction) => {
          const fSnap = await transaction.get(docs[0].ref);
          const sSnap = await transaction.get(docs[1].ref);
          if (!fSnap.exists() || !sSnap.exists()) return;
          if (fSnap.data().status !== "waiting" || sSnap.data().status !== "waiting") return;

          const gameId = crypto.randomUUID().slice(0, 8);
          const side = Math.random() < 0.5 ? "white" : "black";
          const otherSide = side === "white" ? "black" : "white";

          transaction.set(doc(firestore, "games", gameId), {
            players: {
              [side]: { userId: first.userId, username: first.username, elo: first.elo },
              [otherSide]: { userId: second.userId, username: second.username, elo: second.elo },
            },
            status: "pending",
            offer: null,
            answer: null,
            iceWhite: [],
            iceBlack: [],
            createdAt: serverTimestamp(),
          });

          transaction.update(docs[1].ref, {
            status: "matched",
            gameId,
            mySide: otherSide,
          });
          transaction.delete(docs[0].ref);
          onMatched(gameId, side, true);
        });
      } catch (e) {}
    });

    ownUnsub = onSnapshot(queueRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.matched && data.gameId) {
        stopListening();
        deleteDoc(queueRef).catch(() => {});
        onMatched(data.gameId, data.mySide, false);
      }
    });
  }

  return { joinQueue, leaveQueue, startQueueListener };
}

export async function getGameData(firestore, gameId) {
  const snap = await getDoc(doc(firestore, "games", gameId));
  return snap.exists() ? snap.data() : null;
}

export function onGameUpdate(firestore, gameId, callback) {
  return onSnapshot(doc(firestore, "games", gameId), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

export async function setGameField(firestore, gameId, field, value) {
  await setDoc(doc(firestore, "games", gameId), { [field]: value }, { merge: true });
}

export async function deleteGame(firestore, gameId) {
  await deleteDoc(doc(firestore, "games", gameId)).catch(() => {});
}
