import { doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";

export function createWebRTC(firestore, gameId, mySide, isOfferer) {
  const myIce = mySide === "white" ? "iceWhite" : "iceBlack";
  const peerIce = mySide === "white" ? "iceBlack" : "iceWhite";

  let pc = null;
  let channel = null;
  let onMove = null;
  let onOpponentResigned = null;
  let onConnected = null;
  let onIceFailure = null;
  let unsub = null;
  let remoteDescSet = false;
  let destroyed = false;

  const gameRef = doc(firestore, "games", gameId);

  function init() {
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && !destroyed) {
        updateDoc(gameRef, {
          [myIce]: arrayUnion(e.candidate.toJSON()),
        }).catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" && onIceFailure) onIceFailure();
    };

    pc.ondatachannel = (e) => {
      channel = e.channel;
      setupChannel();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && onConnected) onConnected();
    };

    if (isOfferer) {
      channel = pc.createDataChannel("chess");
      setupChannel();
      createOffer();
    }

    unsub = onSnapshot(gameRef, (snap) => {
      const data = snap.data();
      if (!data || !pc || destroyed) return;

      if (data.offer && !remoteDescSet && !isOfferer) {
        remoteDescSet = true;
        pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            updateDoc(gameRef, {
              answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
            });
          })
          .catch(() => {});
      }

      if (data.answer && !remoteDescSet && isOfferer) {
        remoteDescSet = true;
        pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
      }

      const candidates = data[peerIce] || [];
      for (const c of candidates) {
        try { pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
    });
  }

  function setupChannel() {
    if (!channel) return;
    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "move" && onMove) onMove(msg);
        else if (msg.type === "resign" && onOpponentResigned) onOpponentResigned();
      } catch {}
    };
  }

  function createOffer() {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        updateDoc(gameRef, {
          offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
        });
      })
      .catch(() => {});
  }

  function sendMove(from, to) {
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "move", from, to }));
    }
  }

  function sendResign() {
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "resign" }));
    }
  }

  function destroy() {
    destroyed = true;
    if (unsub) unsub();
    if (channel) channel.close();
    if (pc) pc.close();
    pc = null;
    channel = null;
  }

  return {
    init,
    sendMove,
    sendResign,
    destroy,
    set onMove(v) { onMove = v; },
    set onOpponentResigned(v) { onOpponentResigned = v; },
    set onConnected(v) { onConnected = v; },
    set onIceFailure(v) { onIceFailure = v; },
  };
}
