import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import Card3D from '../components/Card3D'

export default function ClueRound() {
  const { state, actions } = useGame()
  const { players, currentPlayerId, roundData, isImposter } = state
  const { turnOrder, currentTurnIdx, currentTurnPlayerId, clues, clueRoundComplete } = roundData || {}

  const [clueInput, setClueInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [suspenseIdx, setSuspenseIdx] = useState(0)

  const isMyTurn = currentTurnPlayerId === currentPlayerId
  const currentTurnPlayer = players.find(p => p.id === currentTurnPlayerId)

  const placeholders = [
    "Type your clue...",
    "Be subtle...",
    "Don't expose yourself..."
  ]

  const suspenseTexts = [
    "Analyzing clues...",
    "Is someone lying?",
    "Pay close attention...",
    "Trust your instincts..."
  ]

  useEffect(() => {
    if (isMyTurn && !submitted) {
      const interval = setInterval(() => {
        setPlaceholderIdx(p => (p + 1) % placeholders.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isMyTurn, submitted])

  useEffect(() => {
    if (!isMyTurn || submitted) {
      const interval = setInterval(() => {
        setSuspenseIdx(s => (s + 1) % suspenseTexts.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isMyTurn, submitted])

  const handleSubmit = () => {
    const trimmed = clueInput.trim()
    if (trimmed && isMyTurn && !submitted) {
      setSubmitted(true)
      actions.submitClue(trimmed)
      setClueInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // Reset submitted when it's my turn (shouldn't normally re-trigger, safety net)
  if (isMyTurn && submitted) {
    setSubmitted(false)
  }

  return (
    <div className="flex flex-col gap-2 pb-6">
      <div className="text-center mb-4">
        <h2 className="text-xs uppercase tracking-widest text-text-muted mb-1">
          Clue Phase
        </h2>
        {!clueRoundComplete && (
          <p className={`text-[13px] font-bold tracking-wide mt-2 ${isImposter ? 'text-danger/90' : 'text-accent/90'}`}>
            {roundData?.eliminatedPlayers?.includes(currentPlayerId) 
              ? "You are eliminated. Observe the remaining players."
              : isImposter 
                ? "Fake it. You don't know the word" 
                : "Give a clue without revealing too much"}
          </p>
        )}
      </div>

      {/* Whose turn it is */}
      {!clueRoundComplete && currentTurnPlayer && (
        <Card3D className="text-center mb-5 p-4"
          style={
            isMyTurn
              ? {
                  background: 'linear-gradient(135deg, rgba(163,230,53,0.1), rgba(163,230,53,0.02))',
                  border: '1.5px solid rgba(163,230,53,0.3)',
                  boxShadow: '0 0 20px rgba(163,230,53,0.12), 0 4px 16px rgba(0,0,0,0.3)',
                }
              : {
                  background: 'rgba(31,41,55,0.6)',
                  border: '1px solid rgba(55,65,81,0.6)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }
          }
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1.5 font-bold">
            {isMyTurn ? "✦ It's your turn!" : 'Waiting for...'}
          </p>
          <p className={`text-2xl font-black ${isMyTurn ? 'text-accent' : 'text-text-primary'}`}>
            {currentTurnPlayer.name}
            {isMyTurn && <span className="text-text-muted text-sm ml-1.5 font-medium">(you)</span>}
          </p>
        </Card3D>
      )}

      {/* Input (only on my turn) */}
      {isMyTurn && (
        <div className="mb-6 relative">
          <div className="flex gap-2 items-stretch">
            <input
              id="clue-input"
              type="text"
              className={`input flex-1 transition-all duration-300 focus:shadow-[0_0_20px_rgba(163,230,53,0.15)] focus:scale-[1.02] ${
                submitted ? 'opacity-50 bg-surface/50 border-slate-700/50 cursor-not-allowed scale-[0.98]' : ''
              }`}
              placeholder={placeholders[placeholderIdx]}
              value={clueInput}
              onChange={e => setClueInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={60}
              autoFocus
              disabled={submitted}
            />
            <button
              id="submit-clue-btn"
              className={`btn !w-auto px-5 flex-shrink-0 transition-all duration-300 ${
                submitted 
                  ? 'bg-slate-700 text-slate-400 border border-slate-600 opacity-80 cursor-not-allowed scale-[0.98]' 
                  : 'btn-primary active:scale-[0.94]'
              }`}
              disabled={!clueInput.trim() || submitted}
              onClick={handleSubmit}
            >
              {submitted ? 'Submitted ✓' : 'Send'}
            </button>
          </div>
          {!submitted && (
            <p className="text-text-muted text-[11px] mt-2.5 text-center tracking-wide uppercase font-semibold opacity-70">
              Don't use your exact word!
            </p>
          )}
        </div>
      )}

      {/* Waiting state and Progress */}
      {(!isMyTurn || submitted) && !clueRoundComplete && (
        <div className="flex flex-col items-center justify-center gap-3 mb-6 mt-1 opacity-0 animate-[fade-in_0.5s_ease-out_forwards]">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <div className="h-4 relative w-full flex justify-center overflow-hidden">
            <p className="absolute text-[11px] uppercase tracking-[0.15em] text-slate-400 font-bold transition-opacity duration-500 text-center">
              {suspenseTexts[suspenseIdx]}
            </p>
          </div>
          <div className="mt-1 px-3.5 py-1.5 rounded-full border border-slate-700/50 bg-slate-800/40 text-[10px] uppercase tracking-[0.15em] text-slate-300 font-bold shadow-inner">
            {clues?.length || 0} / {turnOrder?.length || 0} submitted
          </div>
        </div>
      )}

      {/* Clues collected so far */}
      {clues && clues.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-semibold mb-3 px-1">
            Clues so far
          </p>
          <div className="flex flex-col gap-2.5">
            {clues.map((c, i) => {
              return (
                <Card3D key={i} className="flex items-center gap-3.5 px-4 py-3.5"
                  style={{
                    background: 'rgba(31,41,55,0.7)',
                    border: '1px solid rgba(55,65,81,0.7)',
                    borderLeft: '4px solid rgba(163,230,53,0.5)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                    style={{
                      background: 'rgba(51,65,85,0.9)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {c.playerName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-accent/80 font-bold uppercase tracking-widest mb-0.5">
                      {c.playerName}
                    </p>
                    <p className="text-[15px] font-semibold text-text-primary truncate">
                      "{c.clue}"
                    </p>
                  </div>
                </Card3D>
              )
            })}
          </div>
        </div>
      )}

      {/* Auto-transition message */}
      {clueRoundComplete && (
        <div className="text-center text-text-muted text-sm animate-pulse py-2">
          Moving to voting...
        </div>
      )}
    </div>
  )
}
