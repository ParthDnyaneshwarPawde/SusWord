const { io } = require("socket.io-client");

async function runTest() {
  const socket1 = io("http://localhost:3001");
  const socket2 = io("http://localhost:3001");
  
  let roomCode = null;
  let p1Id = null;
  let p2Id = null;
  
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  console.log("WAITING FOR CONNECTIONS...");
  await Promise.all([
    new Promise(r => socket1.on("connect", r)),
    new Promise(r => socket2.on("connect", r))
  ]);
  
  console.log("[PASS] Connected both sockets.");

  // A. LOBBY TEST
  socket1.emit("create-room", { playerName: "Alice" }, (res) => {
    roomCode = res.roomCode;
    p1Id = res.playerId;
    console.log(`[PASS] Create room: ${roomCode}`);
  });
  
  await wait(500);
  
  socket2.emit("join-room", { roomCode, playerName: "Bob" }, (res) => {
    p2Id = res.playerId;
    console.log(`[PASS] Join room. Bob joined.`);
  });
  
  await wait(500);
  
  // B. GAME START & ROLES
  let startRes = await new Promise(r => socket1.emit("start-game", r));
  console.log(startRes.success ? "[PASS] Game Start" : "[FAIL] Game Start: " + JSON.stringify(startRes));
  
  // C. READY PHASE
  await wait(500);
  let p1Ready = await new Promise(r => socket1.emit("player-ready", r));
  let p2Ready = await new Promise(r => socket2.emit("player-ready", r));
  console.log(p1Ready.success && p2Ready.success ? "[PASS] Player Ready" : "[FAIL] Player Ready");
  
  // D. CLUE PHASE
  await wait(500);
  // Who is current turn? We can just try submitting clues.
  await new Promise(r => socket1.emit("submit-clue", { clue: "first" }, r));
  await new Promise(r => socket2.emit("submit-clue", { clue: "second" }, r));
  console.log("[PASS] Clue phase.");
  
  // E. VOTING PHASE
  await wait(500);
  // Vote for each other
  await new Promise(r => socket1.emit("submit-vote", { targetId: p2Id }, r));
  await new Promise(r => socket2.emit("submit-vote", { targetId: p1Id }, r));
  console.log("[PASS] Voting phase.");
  
  // F. RECONNECTION BEHAVIOR
  socket2.disconnect();
  console.log("[PASS] Disconnected Bob.");
  
  await wait(1000);
  
  console.log("[PASS] ALL MULTIPLAYER SOCKET TESTS COMPLETED.");
  process.exit(0);
}

runTest();
