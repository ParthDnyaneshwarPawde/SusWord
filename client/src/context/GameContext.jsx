import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { GAME_STATES } from '@shared/constants'
import { getSocket, connectSocket, disconnectSocket } from '../hooks/useSocket'

const GameContext = createContext(null)

const initialState = {
  gameState: GAME_STATES.HOME,
  room: null,
  players: [],
  currentPlayerId: null,
  roundData: null,
  myWord: null,
  readyCount: 0,
  totalCount: 0,
  readyPlayerIds: [],
  error: null,
}

function gameReducer(state, action) {
  switch (action.type) {
    // ── Room / Lobby ───────────────────────────────────────
    case 'ROOM_JOINED':
      return {
        ...state,
        gameState: GAME_STATES.LOBBY,
        room: { roomCode: action.roomCode },
        players: action.players,
        currentPlayerId: action.playerId,
        error: null,
      }

    case 'LOBBY_UPDATE':
      return {
        ...state,
        players: action.players.map(p => ({
          ...p,
          isHost: p.id === action.hostId,
        })),
      }

    case 'BACK_TO_LOBBY':
      return {
        ...state,
        gameState: GAME_STATES.LOBBY,
        players: action.players.map(p => ({
          ...p,
          isHost: p.id === action.hostId,
        })),
        roundData: null,
        myWord: null,
        readyCount: 0,
        totalCount: 0,
        readyPlayerIds: [],
        error: null,
      }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    // ── Reveal ─────────────────────────────────────────────
    case 'GAME_STARTED':
      return {
        ...state,
        gameState: GAME_STATES.REVEAL,
        myWord: action.word,
        isImposter: action.isImposter,
        players: action.players,
        readyCount: 0,
        totalCount: action.players.length,
        readyPlayerIds: [],
        roundData: null, // Clear stale data from previous round
        error: null,
      }

    case 'READY_UPDATE':
      return {
        ...state,
        readyCount: action.readyCount,
        totalCount: action.totalCount,
        readyPlayerIds: action.readyPlayerIds,
      }

    // ── Clue Round ─────────────────────────────────────────
    case 'CLUE_ROUND_STARTED':
    case 'CLUE_ROUND_UPDATE':
      return {
        ...state,
        gameState: GAME_STATES.CLUE_ROUND,
        roundData: {
          ...state.roundData,
          turnOrder: action.turnOrder,
          currentTurnIdx: action.currentTurnIdx,
          currentTurnPlayerId: action.currentTurnPlayerId,
          clues: action.clues,
          clueRoundComplete: action.clueRoundComplete,
        },
        players: action.players || state.players,
      }

    case 'CLUE_ROUND_COMPLETE':
      return {
        ...state,
        gameState: GAME_STATES.VOTING,
        roundData: {
          ...state.roundData,
          clues: action.clues,
          clueRoundComplete: true,
        },
        players: action.players || state.players,
      }

    // ── Voting ─────────────────────────────────────────────
    case 'VOTE_UPDATE':
      return {
        ...state,
        roundData: {
          ...state.roundData,
          votedCount: action.votedCount,
          totalCount: action.totalCount,
        },
      }

    case 'VOTE_RESULT':
      return {
        ...state,
        gameState: action.gameState || GAME_STATES.RESULT,
        roundData: {
          ...state.roundData,
          votedOutId: action.votedOutId,
          voteTally: action.voteTally,
          imposterCaught: action.imposterCaught,
          imposterId: action.imposterId,
          winner: action.winner,
          wordPair: action.wordPair,
          eliminatedPlayers: action.eliminatedPlayers,
        },
        players: action.players || state.players,
      }

    case 'FINAL_GUESS_RESULT':
      return {
        ...state,
        roundData: {
          ...state.roundData,
          finalGuess: action.finalGuess,
          correct: action.correct,
          winner: action.winner,
          wordPair: action.wordPair,
        },
      }

    case 'ROUND_RESTARTED':
      return {
        ...state,
        gameState: action.gameState,
        players: action.players,
        myWord: null, // Reset and wait for individual game-started
        readyCount: 0,
        totalCount: action.players.length,
        readyPlayerIds: [],
        roundData: null,
        error: null,
      }

    case 'LEAVE_ROOM':
      return { ...initialState }

    case 'DISCONNECTED':
      if (state.gameState !== GAME_STATES.HOME) {
        return {
          ...initialState,
          error: 'Connection lost. Please rejoin the room.',
        }
      }
      return state

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  useEffect(() => {
    const socket = getSocket()

    socket.on('lobby-update', ({ players, hostId }) => {
      console.log('📥 LOBBY_UPDATE:', players.length, 'players')
      dispatch({ type: 'LOBBY_UPDATE', players, hostId })
    })

    socket.on('game-started', ({ word, isImposter, players }) => {
      console.log('📥 GAME_STARTED! Word received.')
      dispatch({ type: 'GAME_STARTED', word, isImposter, players })
    })

    socket.on('ready-update', ({ readyCount, totalCount, readyPlayerIds }) => {
      dispatch({ type: 'READY_UPDATE', readyCount, totalCount, readyPlayerIds })
    })

    socket.on('clue-round-started', (data) => {
      dispatch({ type: 'CLUE_ROUND_STARTED', ...data })
    })

    socket.on('clue-round-update', (data) => {
      dispatch({ type: 'CLUE_ROUND_UPDATE', ...data })
    })

    socket.on('clue-round-complete', (data) => {
      dispatch({ type: 'CLUE_ROUND_COMPLETE', ...data })
    })

    socket.on('vote-update', (data) => {
      dispatch({ type: 'VOTE_UPDATE', ...data })
    })

    socket.on('vote-result', (data) => {
      dispatch({ type: 'VOTE_RESULT', ...data })
    })

    socket.on('final-guess-result', (data) => {
      dispatch({ type: 'FINAL_GUESS_RESULT', ...data })
    })

    socket.on('round_restarted', (data) => {
      dispatch({ type: 'ROUND_RESTARTED', ...data })
    })

    const onDisconnect = () => {
      dispatch({ type: 'DISCONNECTED' })
    }
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('lobby-update')
      socket.off('game-started')
      socket.off('ready-update')
      socket.off('clue-round-started')
      socket.off('clue-round-update')
      socket.off('clue-round-complete')
      socket.off('vote-update')
      socket.off('vote-result')
      socket.off('final-guess-result')
      socket.off('round_restarted')
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const actions = {
    createRoom: useCallback(async (playerName) => {
      try {
        const socket = await connectSocket()
        socket.emit('create-room', { playerName }, (response) => {
          if (response.error) return dispatch({ type: 'SET_ERROR', error: response.error })
          dispatch({
            type: 'ROOM_JOINED',
            roomCode: response.roomCode,
            playerId: response.playerId,
            players: response.players.map(p => ({ ...p, isHost: p.id === response.hostId })),
          })
        })
      } catch (err) {
        console.error(err)
        dispatch({ type: 'SET_ERROR', error: 'Failed to connect to server. Is it running?' })
      }
    }, []),

    joinRoom: useCallback(async (playerName, roomCode) => {
      try {
        const socket = await connectSocket()
        socket.emit('join-room', { roomCode, playerName }, (response) => {
          if (response.error) return dispatch({ type: 'SET_ERROR', error: response.error })
          dispatch({
            type: 'ROOM_JOINED',
            roomCode: response.roomCode,
            playerId: response.playerId,
            players: response.players.map(p => ({ ...p, isHost: p.id === response.hostId })),
          })
        })
      } catch (err) {
        console.error(err)
        dispatch({ type: 'SET_ERROR', error: 'Failed to connect to server. Is it running?' })
      }
    }, []),

    startGame: useCallback(() => {
      console.log('🔘 Sending start-game event')
      const socket = getSocket()
      socket.emit('start-game', (r) => { 
        console.log('📥 start-game ack:', r)
        if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error }) 
      })
    }, []),

    markReady: useCallback(() => {
      const socket = getSocket()
      socket.emit('player-ready', (r) => { if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error }) })
    }, []),

    submitClue: useCallback((clue) => {
      const socket = getSocket()
      socket.emit('submit-clue', { clue }, (r) => { if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error }) })
    }, []),

    submitVote: useCallback((targetId) => {
      const socket = getSocket()
      socket.emit('submit-vote', { targetId }, (r) => { if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error }) })
    }, []),

    submitFinalGuess: useCallback((guess) => {
      const socket = getSocket()
      socket.emit('final-guess', { guess }, (r) => { if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error }) })
    }, []),

    restartRound: useCallback((callback) => {
      const socket = getSocket()
      socket.emit('restart_round', (r) => {
        if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error })
        if (callback) callback(r)
      })
    }, []),

    startNextRound: useCallback((callback) => {
      const socket = getSocket()
      socket.emit('start-next-round', (r) => {
        if (r?.error) dispatch({ type: 'SET_ERROR', error: r.error })
        if (callback) callback(r)
      })
    }, []),

    leaveRoom: useCallback(() => {
      const socket = getSocket()
      socket.emit('leave-room')
      disconnectSocket()
      dispatch({ type: 'LEAVE_ROOM' })
    }, []),

    clearError: useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []),
  }

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within GameProvider')
  return context
}
