import { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function Home() {
  const { actions } = useGame()
  const [name, setName] = useState(() => localStorage.getItem('susword_name') || '')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState(null) // null | 'create' | 'join'
  const [gameMode, setGameMode] = useState('normal') // 'normal' | 'shuffle'

  const canCreate = name.trim().length >= 2
  const canJoin = name.trim().length >= 2 && roomCode.trim().length === 4

  const handleCreate = () => {
    if (canCreate) {
      localStorage.setItem('susword_name', name.trim())
      actions.clearError()
      actions.createRoom(name.trim(), gameMode)
    }
  }

  const handleJoin = () => {
    if (canJoin) {
      localStorage.setItem('susword_name', name.trim())
      actions.clearError()
      actions.joinRoom(name.trim(), roomCode.trim())
    }
  }

  return (
    <div className="text-center">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-accent">Sus</span>
          <span className="text-text-primary">Word</span>
        </h1>
        <p className="text-text-muted text-sm mt-2 tracking-wide">
          Find the imposter. Guard your word.
        </p>
      </div>



      {/* Name input */}
      <div className="mb-6">
        <input
          id="player-name-input"
          type="text"
          className="input text-center"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={16}
          autoComplete="off"
        />
      </div>

      {/* Mode selection */}
      {!mode && (
        <div className="flex flex-col gap-3">
          <button
            id="create-room-btn"
            className="btn btn-primary"
            disabled={!canCreate}
            onClick={() => setMode('create')}
          >
            ✦ Create Room
          </button>
          <button
            id="join-room-btn"
            className="btn btn-secondary"
            disabled={!canCreate}
            onClick={() => setMode('join')}
          >
            → Join Room
          </button>
        </div>
      )}

      {/* Create confirm */}
      {mode === 'create' && (
        <div className="card-elevated mt-4">
          <p className="text-text-muted text-sm mb-4">
            You'll be the host of a new room.
          </p>

          <div className="mb-4 text-left">
            <label className="text-sm font-bold text-text-primary block mb-1">Game Mode</label>
            <select 
              className="input text-sm mb-1" 
              value={gameMode} 
              onChange={e => setGameMode(e.target.value)}
            >
              <option value="normal">Normal Mode</option>
              <option value="shuffle">Shuffle Mode</option>
            </select>
            <p className="text-xs text-text-muted mt-1 leading-snug">
              {gameMode === 'normal' 
                ? 'When someone is eliminated, keep the same word pair.' 
                : 'When someone is eliminated, draw a new word pair.'}
            </p>
          </div>

          <button
            id="confirm-create-btn"
            className="btn btn-primary mb-3 w-full"
            onClick={handleCreate}
          >
            ✦ Start Room
          </button>
          <button
            className="btn btn-ghost w-full"
            onClick={() => { setMode(null); actions.clearError() }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div className="card-elevated mt-4">
          <input
            id="room-code-input"
            type="text"
            className="input text-center text-xl font-bold tracking-[0.3em] uppercase mb-4"
            placeholder="ROOM CODE"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4}
            autoComplete="off"
          />
          <button
            id="confirm-join-btn"
            className="btn btn-primary mb-3"
            disabled={!canJoin}
            onClick={handleJoin}
          >
            → Join Room
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setMode(null); actions.clearError() }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 opacity-60">
        <p className="text-text-muted text-xs">
          🌐 Multiplayer — open in multiple tabs to test
        </p>
        <p className="text-text-muted text-xs mt-2 font-medium">
          Made by Tururu ✨
        </p>
      </div>
    </div>
  )
}
