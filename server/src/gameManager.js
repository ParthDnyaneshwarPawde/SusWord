/**
 * Game manager — handles round creation, word assignment, reveal readiness,
 * and clue round state.
 * Keeps round data on the room object in memory.
 */

const { WORD_PAIRS } = require('./wordPairs')

// ── Fisher-Yates shuffle (returns a NEW shuffled array) ────
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Initialise (or refill) the word pool for a room.
 * Call once when the room is created and again when pool is exhausted.
 */
function refillWordPool(room) {
  room.wordPool = shuffleArray(WORD_PAIRS)
}

/**
 * Pick the next word pair from the room's pool.
 * Automatically reshuffles if the pool is empty.
 */
function pickWordPair(room) {
  if (!room.wordPool || room.wordPool.length === 0) {
    refillWordPool(room)
  }
  return room.wordPool.shift()
}

/**
 * Start a new round for the given room.
 */
function startRound(room) {
  const wordPair = pickWordPair(room)
  const imposterIdx = Math.floor(Math.random() * room.players.length)
  const imposterId = room.players[imposterIdx].id

  const assignments = {}
  room.players.forEach(p => {
    assignments[p.id] = {
      word: p.id === imposterId ? wordPair.imposterWord : wordPair.mainWord,
    }
  })

  const turnOrder = room.players
    .map(p => p.id)
    .sort(() => Math.random() - 0.5)

  room.roundData = {
    wordPair,
    imposterId,
    assignments,
    turnOrder,
    readyPlayers: [],
    // Clue round state
    clues: [],
    currentTurnIdx: 0,
    clueRoundComplete: false,
    // Voting state
    votes: {},            // { voterId: targetId }
    votedPlayers: [],
    votedOutId: null,
    voteTally: null,
    winner: null,
    finalGuess: null,
  }

  room.gameState = 'REVEAL'
  return room.roundData
}

/**
 * Get the PRIVATE reveal payload for a specific player.
 */
function getPlayerRevealData(room, socketId) {
  const rd = room.roundData
  if (!rd || !rd.assignments[socketId]) return null

  return {
    word: rd.assignments[socketId].word,
    isImposter: socketId === rd.imposterId,
    gameState: room.gameState,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.id === room.hostId,
    })),
  }
}

/**
 * Mark a player as ready after viewing their card.
 */
function setPlayerReady(room, socketId) {
  const rd = room.roundData
  if (!rd) return null

  if (!rd.readyPlayers.includes(socketId)) {
    rd.readyPlayers.push(socketId)
  }

  const totalCount = room.players.length
  const readyCount = rd.readyPlayers.length
  const allReady = readyCount >= totalCount

  return { allReady, readyCount, totalCount }
}

// ── Clue Round Logic ───────────────────────────────────────

function submitClue(room, socketId, clueText) {
  const rd = room.roundData
  if (!rd) return { error: 'No round data' }
  if (room.gameState !== 'CLUE_ROUND') return { error: 'Not in clue round' }

  const currentPlayerId = rd.turnOrder[rd.currentTurnIdx]
  if (socketId !== currentPlayerId) return { error: 'Not your turn' }
  if (rd.clues.some(c => c.playerId === socketId)) return { error: 'Already submitted' }

  const trimmed = clueText?.trim()
  if (!trimmed) return { error: 'Clue cannot be empty' }

  const player = room.players.find(p => p.id === socketId)
  rd.clues.push({ playerId: socketId, playerName: player?.name || 'Unknown', clue: trimmed })

  rd.currentTurnIdx++
  if (rd.currentTurnIdx >= rd.turnOrder.length) {
    rd.clueRoundComplete = true
    // Delayed state transition will be handled in index.js
  }

  return { success: true, clueRoundComplete: rd.clueRoundComplete }
}

function getClueRoundState(room) {
  const rd = room.roundData
  if (!rd) return null

  return {
    gameState: room.gameState,
    turnOrder: rd.turnOrder,
    currentTurnIdx: rd.currentTurnIdx,
    currentTurnPlayerId: rd.clueRoundComplete ? null : rd.turnOrder[rd.currentTurnIdx],
    clues: rd.clues,
    clueRoundComplete: rd.clueRoundComplete,
    players: room.players.map(p => ({ id: p.id, name: p.name, isHost: p.id === room.hostId })),
  }
}

function handleClueDisconnect(room, disconnectedId) {
  const rd = room.roundData
  if (!rd || room.gameState !== 'CLUE_ROUND') return false

  const idx = rd.turnOrder.indexOf(disconnectedId)
  if (idx !== -1) {
    rd.turnOrder.splice(idx, 1)
    if (idx < rd.currentTurnIdx) rd.currentTurnIdx--
  }

  if (rd.currentTurnIdx >= rd.turnOrder.length) {
    rd.clueRoundComplete = true
    // Delayed state transition will be handled in index.js
  }
  return true
}

// ── Voting Logic ───────────────────────────────────────────

/**
 * Submit a vote. Returns { error } or { success, allVoted }
 */
function submitVote(room, voterId, targetId) {
  const rd = room.roundData
  if (!rd) return { error: 'No round data' }
  if (room.gameState !== 'VOTING') return { error: 'Not in voting phase' }
  if (rd.votedPlayers.includes(voterId)) return { error: 'Already voted' }

  // Cannot vote for yourself
  if (voterId === targetId) return { error: 'Cannot vote for yourself' }

  // Cannot vote if eliminated
  if (rd.eliminatedPlayers && rd.eliminatedPlayers.includes(voterId)) return { error: 'Eliminated players cannot vote' }

  // Target must be a valid active player
  if (!room.players.some(p => p.id === targetId)) return { error: 'Invalid target' }
  if (rd.eliminatedPlayers && rd.eliminatedPlayers.includes(targetId)) return { error: 'Target is already eliminated' }

  rd.votes[voterId] = targetId
  rd.votedPlayers.push(voterId)

  const activePlayerCount = room.players.filter(p => !(rd.eliminatedPlayers || []).includes(p.id)).length
  const allVoted = rd.votedPlayers.length >= activePlayerCount

  return { success: true, allVoted, votedCount: rd.votedPlayers.length, totalCount: activePlayerCount }
}

/**
 * Count votes and determine who is voted out.
 * Tie rule: If tie, no one is eliminated -> Imposter wins.
 */
function resolveVotes(room) {
  const rd = room.roundData
  if (!rd) return null

  // Tally votes
  const tally = {}
  Object.values(rd.votes).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1
  })

  const voteValues = Object.values(tally)
  const maxVotes = voteValues.length > 0 ? Math.max(...voteValues) : 0
  const tied = Object.keys(tally).filter(id => tally[id] === maxVotes)

  let votedOutId = null
  let imposterCaught = false
  let gameOver = false

  // Initialize eliminated players if not present
  if (!rd.eliminatedPlayers) rd.eliminatedPlayers = []

  // If there's a tie for the highest votes (and more than 0 votes cast), no one is eliminated
  if (tied.length > 1 || maxVotes === 0) {
    votedOutId = null
    imposterCaught = false
    // No one eliminated, round continues
  } else {
    votedOutId = tied[0]
    imposterCaught = votedOutId === rd.imposterId

    if (imposterCaught) {
      // Imposter caught — they get a chance to guess the main word
      gameOver = true
      rd.winner = null
    } else {
      // Civilian voted out
      rd.eliminatedPlayers.push(votedOutId)
      
      const activePlayers = room.players.filter(p => !rd.eliminatedPlayers.includes(p.id))
      
      // Imposter wins if only 2 players remain (imposter + 1 civilian)
      if (activePlayers.length <= 2) {
        gameOver = true
        rd.winner = 'IMPOSTER'
      }
    }
  }

  rd.votedOutId = votedOutId
  rd.voteTally = tally
  
  if (gameOver) {
    room.gameState = 'RESULT'
  } else {
    room.gameState = 'ROUND_CONTINUE'
  }

  return {
    gameState: room.gameState,
    votedOutId,
    voteTally: tally,
    imposterCaught,
    imposterId: gameOver ? rd.imposterId : null,
    winner: rd.winner,
    wordPair: gameOver ? rd.wordPair : null,
    eliminatedPlayers: rd.eliminatedPlayers,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.id === room.hostId,
      // Only reveal imposter if game is over!
      isImposter: gameOver ? (p.id === rd.imposterId) : undefined,
    })),
  }
}

/**
 * Submit the imposter's final guess of the main word.
 */
function submitFinalGuess(room, guess) {
  const rd = room.roundData
  if (!rd || rd.winner !== null) return { error: 'No final guess needed' }

  const trimmed = guess?.trim()
  if (!trimmed) return { error: 'Guess cannot be empty' }

  rd.finalGuess = trimmed
  const correct = trimmed.toLowerCase() === rd.wordPair.mainWord.toLowerCase()
  rd.winner = correct ? 'IMPOSTER' : 'CIVILIANS'

  return {
    success: true,
    finalGuess: trimmed,
    correct,
    winner: rd.winner,
    wordPair: rd.wordPair,
  }
}

function startNextClueRound(room) {
  const rd = room.roundData
  if (!rd || room.gameState !== 'ROUND_CONTINUE') return null

  if (room.settings?.mode === 'shuffle') {
    rd.wordPair = pickWordPair(room)
  }

  // Reset clue round & voting state
  rd.clues = []
  rd.votes = {}
  rd.votedPlayers = []
  rd.votedOutId = null
  rd.voteTally = null
  rd.currentTurnIdx = 0
  rd.clueRoundComplete = false
  
  // Update turn order to only include active (not eliminated) players
  rd.turnOrder = room.players
    .filter(p => !rd.eliminatedPlayers.includes(p.id))
    .map(p => p.id)
    .sort(() => Math.random() - 0.5)

  room.gameState = 'CLUE_ROUND'
  return getClueRoundState(room)
}

module.exports = {
  startRound,
  getPlayerRevealData,
  setPlayerReady,
  submitClue,
  getClueRoundState,
  handleClueDisconnect,
  submitVote,
  resolveVotes,
  submitFinalGuess,
  refillWordPool,
  startNextClueRound,
}

