import { useState } from 'react'
import { useGame } from '../context/GameContext'
import Card3D from '../components/Card3D'

export default function Result() {
  const { state, actions } = useGame()
  const { players, currentPlayerId, roundData } = state
  const {
    votedOutId, voteTally, winner, wordPair, imposterId,
    imposterCaught, finalGuess,
  } = roundData || {}

  const votedOutPlayer = players.find(p => p.id === votedOutId)
  const isCurrentPlayerImposter = currentPlayerId === imposterId
  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isHost = currentPlayer?.isHost

  // Final guess input
  const [guessInput, setGuessInput] = useState('')
  const [guessSubmitted, setGuessSubmitted] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)

  const needsFinalGuess = imposterCaught && winner === null
  const showFinalGuessInput = needsFinalGuess && isCurrentPlayerImposter && !guessSubmitted

  const handleGuess = () => {
    if (guessInput.trim()) {
      setGuessSubmitted(true)
      actions.submitFinalGuess(guessInput.trim())
    }
  }

  const handleRestart = () => {
    console.log('🔄 Requesting restart...')
    setIsRestarting(true)

    actions.restartRound((response) => {
      if (response?.error) {
        console.error('❌ Restart failed:', response.error)
        setIsRestarting(false)
      } else {
        console.log('✅ Restart command accepted by server')
      }
    })

    setTimeout(() => {
      setIsRestarting(prev => {
        if (prev) console.warn('⚠️ Restart timed out')
        return false
      })
    }, 5000)
  }

  const winnerLabel = winner === 'IMPOSTER' ? '🕵️ Imposter Wins!' : '🎉 Civilians Win!'
  const winnerColor = winner === 'IMPOSTER' ? 'text-danger' : 'text-accent'
  const winnerGlow = winner === 'IMPOSTER'
    ? '0 0 24px rgba(244,63,94,0.35)'
    : '0 0 24px rgba(163,230,53,0.35)'

  const isRoundContinue = state.gameState === 'ROUND_CONTINUE'
  const showResults = winner || isRoundContinue

  const handleNextRound = () => {
    console.log('🔄 Requesting next round...')
    setIsRestarting(true)

    actions.startNextRound((response) => {
      if (response?.error) {
        console.error('❌ Start next round failed:', response.error)
        setIsRestarting(false)
      }
    })
  }

  return (
    <div>
      {/* Winner announcement */}
      {winner && (
        <div className="text-center mb-6">
          <p
            className={`text-3xl font-extrabold ${winnerColor} mb-2`}
            style={{ textShadow: winnerGlow }}
          >
            {winnerLabel}
          </p>
        </div>
      )}

      {/* Round Continue announcement */}
      {isRoundContinue && (
        <div className="text-center mb-6">
          <p className="text-2xl font-extrabold text-accent mb-2">
            The Game Continues!
          </p>
          <p className="text-text-muted text-sm">
            {votedOutId ? 'An innocent civilian was eliminated.' : 'It was a tie! No one was eliminated.'}
          </p>
        </div>
      )}

      {/* Final guess (imposter caught, awaiting guess) */}
      {showFinalGuessInput && (
        <div className="card-elevated text-center mb-6 border-danger/40"
             style={{ boxShadow: '0 0 0 1px rgba(244,63,94,0.2), 0 4px 20px rgba(0,0,0,0.35)' }}>
          <p className="text-danger font-bold text-lg mb-1">You were caught!</p>
          <p className="text-text-muted text-sm mb-4">
            Guess the main word to steal the win.
          </p>
          {/* Stack vertically on mobile, side by side on wider */}
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              id="final-guess-input"
              type="text"
              className="input flex-1 text-center"
              placeholder="Guess the main word..."
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              autoFocus
            />
            <button
              id="submit-guess-btn"
              className="btn btn-primary sm:!w-auto sm:px-5"
              disabled={!guessInput.trim()}
              onClick={handleGuess}
            >
              Guess
            </button>
          </div>
        </div>
      )}

      {/* Waiting for imposter guess */}
      {needsFinalGuess && !isCurrentPlayerImposter && (
        <div className="text-center mb-6 animate-pulse">
          <p className="text-text-muted">Imposter is making their final guess...</p>
        </div>
      )}

      {/* Result details */}
      {showResults && (
        <>
          {/* Voted out info */}
          <div className="card-elevated mb-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
              {votedOutId ? 'Voted Out' : 'Voting Result'}
            </p>
            <p className="text-xl font-bold">
              {votedOutId ? votedOutPlayer?.name : 'No one was eliminated! (Tie)'}
              {votedOutId && winner && (
                <span className={`ml-2 badge ${imposterCaught ? 'badge-danger' : 'badge-muted'}`}>
                  {imposterCaught ? 'IMPOSTER' : 'CIVILIAN'}
                </span>
              )}
            </p>
            {finalGuess && (
              <p className="text-sm text-text-muted mt-2">
                Final guess: <span className="font-medium text-text-primary">"{finalGuess}"</span>
                {' '}
                <span className={finalGuess.toLowerCase().trim() === wordPair?.mainWord?.toLowerCase().trim() ? 'text-accent' : 'text-danger'}>
                  {finalGuess.toLowerCase().trim() === wordPair?.mainWord?.toLowerCase().trim() ? '✓ Correct!' : '✗ Wrong'}
                </span>
              </p>
            )}
          </div>

          {/* Words reveal (only if game over) */}
          {winner && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card text-center"
                   style={{ boxShadow: '0 0 12px rgba(163,230,53,0.08)' }}>
                <p className="text-text-muted text-xs mb-1">Main Word</p>
                <p className="text-lg font-bold text-accent">{wordPair?.mainWord}</p>
              </div>
              <div className="card text-center"
                   style={{ boxShadow: '0 0 12px rgba(244,63,94,0.08)' }}>
                <p className="text-text-muted text-xs mb-1">Imposter Word</p>
                <p className="text-lg font-bold text-danger">{wordPair?.imposterWord}</p>
              </div>
            </div>
          )}

          {/* All players */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-semibold mb-3 px-1">
              All Players
            </p>
            <div className="flex flex-col gap-2.5">
              {players.map(player => {
                const votesReceived = voteTally?.[player.id] || 0
                // ONLY show imposter if game is over. If continuing, no one is revealed as imposter.
                const isImposter = winner ? (player.id === imposterId || player.isImposter) : false
                const isMe = player.id === currentPlayerId
                const isVotedOut = player.id === votedOutId || roundData?.eliminatedPlayers?.includes(player.id)

                return (
                  <Card3D
                    key={player.id}
                    className="flex items-center gap-3.5 px-4 py-3.5"
                    style={
                      isImposter
                        ? {
                            background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.03))',
                            border: '1.5px solid rgba(244,63,94,0.3)',
                            boxShadow: '0 0 18px rgba(244,63,94,0.08), 0 3px 12px rgba(0,0,0,0.25)',
                          }
                        : isMe
                          ? {
                              background: 'linear-gradient(135deg, rgba(163,230,53,0.07), rgba(163,230,53,0.02))',
                              border: '1.5px solid rgba(163,230,53,0.2)',
                              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                            }
                          : {
                              background: 'rgba(31,41,55,0.7)',
                              border: '1px solid rgba(55,65,81,0.7)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                            }
                    }
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                      style={
                        isImposter
                          ? {
                              background: 'linear-gradient(135deg, rgba(244,63,94,0.3), rgba(244,63,94,0.1))',
                              color: 'var(--color-danger)',
                              border: '1.5px solid rgba(244,63,94,0.4)',
                              boxShadow: '0 0 12px rgba(244,63,94,0.2)',
                            }
                          : {
                              background: 'rgba(51,65,85,0.9)',
                              color: 'var(--color-text-muted)',
                              border: '1px solid rgba(71,85,105,0.5)',
                            }
                      }
                    >
                      {isImposter ? '🕵️' : player.name[0]}
                    </div>

                    {/* Name + label */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isImposter ? 'text-danger' : 'text-text-primary'}`}>
                        {player.name}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] font-normal text-text-muted">(you)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {isImposter ? 'The Imposter' : isVotedOut ? 'Eliminated' : (winner ? 'Civilian' : 'Unknown')}
                      </p>
                    </div>

                    {/* Right side: votes + badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {votesReceived > 0 && (
                        <div
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: isImposter ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)',
                            color: isImposter ? 'var(--color-danger)' : 'var(--color-text-muted)',
                            border: isImposter ? '1px solid rgba(244,63,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {votesReceived}🗳
                        </div>
                      )}
                      {winner && (
                        <div
                          className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest"
                          style={
                            isImposter
                              ? {
                                  background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.05))',
                                  color: 'var(--color-danger)',
                                  border: '1px solid rgba(244,63,94,0.3)',
                                }
                              : {
                                  background: 'linear-gradient(135deg, rgba(163,230,53,0.15), rgba(163,230,53,0.04))',
                                  color: 'var(--color-accent)',
                                  border: '1px solid rgba(163,230,53,0.22)',
                                }
                          }
                        >
                          {isImposter ? 'SPY' : 'SAFE'}
                        </div>
                      )}
                    </div>
                  </Card3D>
                )
              })}
            </div>
          </div>


          {/* Actions */}
          <div className="flex flex-col gap-3 mt-6">
            {isHost ? (
              <button
                id="play-again-btn"
                className="btn btn-primary"
                onClick={isRoundContinue ? handleNextRound : handleRestart}
                disabled={isRestarting}
              >
                {isRestarting ? '⌛ Starting...' : (isRoundContinue ? 'Next Clue Round' : '↻ Play Again')}
              </button>
            ) : (
              <div className="text-center text-text-muted text-sm py-2 animate-pulse">
                Waiting for host to start {isRoundContinue ? 'next round' : 'new game'}...
              </div>
            )}
            <button
              id="leave-room-btn"
              className="btn btn-ghost"
              onClick={actions.leaveRoom}
            >
              ← Leave Room
            </button>
          </div>
        </>
      )}
    </div>
  )
}
