import { useState } from 'react'
import { useGame } from '../context/GameContext'
import Card3D from '../components/Card3D'

export default function Voting() {
  const { state, actions } = useGame()
  const { players, currentPlayerId, roundData } = state
  const [selectedId, setSelectedId] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)

  const isEliminated = roundData?.eliminatedPlayers?.includes(currentPlayerId)
  const otherPlayers = players.filter(p => 
    p.id !== currentPlayerId && 
    !(roundData?.eliminatedPlayers?.includes(p.id))
  )
  const votedCount = roundData?.votedCount || 0
  const totalCount = roundData?.totalCount || otherPlayers.length + 1

  const isTransitioning = (hasVoted || isEliminated) && votedCount === totalCount;

  const handleVote = () => {
    if (selectedId && !hasVoted && !isEliminated) {
      setHasVoted(true)
      actions.submitVote(selectedId)
    }
  }

  return (
    <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-30 blur-[2px] scale-[0.98]' : 'opacity-100'}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
          Voting Round
        </p>
        <p className="text-sm text-text-muted">
          {isEliminated
            ? 'You were eliminated. Waiting for others to vote...'
            : hasVoted
              ? `Waiting for others to vote...`
              : 'Who do you think is the imposter?'
          }
        </p>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-3 mb-6">
        {otherPlayers.map(player => {
          const isSelected = selectedId === player.id
          return (
            <Card3D
              as={isEliminated ? "div" : "button"}
              key={player.id}
              id={`vote-player-${player.id}`}
              disabled={hasVoted || isEliminated}
              onClick={() => !hasVoted && !isEliminated && setSelectedId(player.id)}
              className={`w-full flex items-center gap-3.5 text-left px-4 py-3.5 ${
                isSelected ? 'player-card--selected' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 transition-all duration-150"
                style={
                  isSelected
                    ? {
                        background: 'linear-gradient(135deg, rgba(244,63,94,0.3), rgba(244,63,94,0.1))',
                        color: 'var(--color-danger)',
                        border: '1.5px solid rgba(244,63,94,0.45)',
                        boxShadow: '0 0 14px rgba(244,63,94,0.2)',
                        transform: 'scale(1.08)',
                      }
                    : {
                        background: selectedId && !isSelected ? 'rgba(30,41,59,0.5)' : 'rgba(51,65,85,0.9)',
                        color: selectedId && !isSelected ? 'rgba(148,163,184,0.3)' : 'var(--color-text-muted)',
                        border: '1px solid rgba(71,85,105,0.2)',
                      }
                }
              >
                {player.name[0].toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0 transition-opacity duration-300" style={{ opacity: selectedId && !isSelected ? 0.4 : 1 }}>
                <p className={`font-bold text-sm truncate transition-colors duration-150 ${
                  isSelected ? 'text-danger' : 'text-text-primary'
                }`}>
                  {player.name}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {isSelected ? '⚠ Marked as suspect' : hasVoted ? '' : 'Tap to select'}
                </p>
              </div>

              {/* SUS badge */}
              {isSelected && (
                <div
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.05))',
                    color: 'var(--color-danger)',
                    border: '1px solid rgba(244,63,94,0.35)',
                  }}
                >
                  SUS
                </div>
              )}
            </Card3D>
          )
        })}
      </div>

      {/* Action Area */}
      <div className="flex flex-col gap-3">
        {/* Confirm vote button */}
        {!isEliminated && (
        <button
          id="confirm-vote-btn"
          disabled={!selectedId || hasVoted}
          onClick={handleVote}
          className="relative w-full rounded-2xl font-extrabold text-[15px] min-h-[56px] overflow-hidden transition-all duration-300 select-none"
          style={
            hasVoted
              ? {
                  background: 'rgba(51,65,85,0.5)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'default',
                }
              : selectedId
              ? {
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  color: 'white',
                  boxShadow: '0 4px 24px rgba(244,63,94,0.35), 0 2px 8px rgba(0,0,0,0.2)',
                  WebkitTapHighlightColor: 'transparent',
                }
              : {
                  background: 'rgba(244,63,94,0.07)',
                  color: 'rgba(244,63,94,0.3)',
                  border: '1px solid rgba(244,63,94,0.12)',
                  cursor: 'not-allowed',
                }
          }
        >
          {selectedId && !hasVoted && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 55%)' }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {hasVoted ? (
              <>🔒 Vote Locked</>
            ) : selectedId ? (
              <>🗳 Confirm Vote for {players.find(p => p.id === selectedId)?.name}</>
            ) : (
              'Select a player to vote'
            )}
          </span>
        </button>
        )}

        {/* Vote Progress / Waiting state */}
        <div
          className={`flex items-center justify-center gap-3 py-3 rounded-xl text-sm transition-all duration-300 ${
            hasVoted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-text-muted font-medium">
            {votedCount} / {totalCount} players voted
          </span>
        </div>
      </div>
    </div>
  )
}
