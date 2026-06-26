import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
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
      const docs = snap.docs;
      if (docs.length < 2) return;

      const candidates = [docs[0].id, docs[1].id];
      if (!candidates.includes(user.uid)) return;

      const allWaiting = docs.every(d => d.data().status === "waiting");
      if (!allWaiting) return;

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
              [side]: { userId: docs[0].data().userId, username: docs[0].data().username, elo: docs[0].data().elo },
              [otherSide]: { userId: docs[1].data().userId, username: docs[1].data().username, elo: docs[1].data().elo },
            },
            status: "pending",
            offer: null,
            answer: null,
            iceWhite: [],
            iceBlack: [],
            createdAt: serverTimestamp(),
          });

          transaction.update(docs[0].ref, {
            status: "matched",
            gameId,
            mySide: side,
            isOfferer: docs[0].id === user.uid,
          });
          transaction.update(docs[1].ref, {
            status: "matched",
            gameId,
            mySide: otherSide,
            isOfferer: docs[1].id === user.uid,
          });
        });
      } catch (e) {
        console.warn("Matchmaking transaction failed:", e);
      }
    }, (err) => {
      console.error("Queue query error:", err);
    });

    ownUnsub = onSnapshot(queueRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === "matched" && data.gameId) {
        stopListening();
        deleteDoc(queueRef).catch(() => {});
        onMatched(data.gameId, data.mySide, !!data.isOfferer);
      }
    });
  }

  return { joinQueue, leaveQueue, startQueueListener };
}

export async function getGameData(firestore, gameId) {
  const snap = await getDoc(doc(firestore, "games", gameId));
  return snap.exists() ? snap.data() : null;
}

export async function deleteGame(firestore, gameId) {
  await deleteDoc(doc(firestore, "games", gameId)).catch(() => {});
}
