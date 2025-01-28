import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { BsSoundwave, BsVolumeMute } from 'react-icons/bs';
import { Container, Form } from 'react-bootstrap';
import Header from '../components/Header';

export default function Table(game) {
  const [loaded, setLoaded] = useState(false);
  const [buzzed, setBuzzer] = useState(
    some(game.G.queue, (o) => o.id === game.playerID)
  );
  const [lastBuzz, setLastBuzz] = useState(null);
  const [showScorePopup, setShowScorePopup] = useState(null);
  const [playerSound, setPlayerSound] = useState(true);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const buzzButton = useRef(null);
  const queueRef = useRef(null);

  const buzzSound = new Howl({
    src: [
      `${process.env.PUBLIC_URL}/shortBuzz.webm`,
      `${process.env.PUBLIC_URL}/shortBuzz.mp3`,
    ],
    volume: 0.5,
    rate: 1.5,
  });

  const playSound = () => {
    if (playerSound && !soundPlayed) {
      buzzSound.play();
      setSoundPlayed(true);
    }
  };

  // Close score popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showScorePopup && !event.target.closest('.score-popup')) {
        setShowScorePopup(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScorePopup]);

  useEffect(() => {
    console.log(game.G.queue, Date.now());
    // reset buzzer based on game
    if (!game.G.queue[game.playerID]) {
      // delay the reset, in case game state hasn't reflected your buzz yet
      if (lastBuzz && Date.now() - lastBuzz < 500) {
        setTimeout(() => {
          const queue = queueRef.current;
          if (queue && !queue[game.playerID]) {
            setBuzzer(false);
          }
        }, 500);
      } else {
        // immediate reset, if it's been awhile
        setBuzzer(false);
      }
    }

    // reset ability to play sound if there is no pending buzzer
    if (isEmpty(game.G.queue)) {
      setSoundPlayed(false);
    } else if (loaded) {
      playSound();
    }

    if (!loaded) {
      setLoaded(true);
    }

    queueRef.current = game.G.queue;
  }, [game.G.queue]);

  const attemptBuzz = () => {
    if (!buzzed) {
      playSound();
      game.moves.buzz(game.playerID);
      setBuzzer(true);
      setLastBuzz(Date.now());
    }
  };

  // Clear text answer when host clears answers
  useEffect(() => {
    if (isEmpty(game.G.textAnswers)) {
      setTextAnswer('');
    }
  }, [game.G.textAnswers]);

  // spacebar will buzz only when not in text input mode
  useEffect(() => {
    function onKeydown(e) {
      if (e.keyCode === 32 && !e.repeat && !game.G.textInputMode && e.target.tagName !== 'INPUT') {
        buzzButton.current.click();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [game.G.textInputMode]);

  const players = !game.gameMetadata
    ? []
    : game.gameMetadata
        .filter((p) => p.name)
        .map((p) => ({ ...p, id: String(p.id) }));
  // host is lowest active user
  const firstPlayer =
    get(
      sortBy(players, (p) => parseInt(p.id, 10)).filter((p) => p.connected),
      '0'
    ) || null;
  const isHost = get(firstPlayer, 'id') === game.playerID;

  const queue = sortBy(values(game.G.queue), ['timestamp']);
  const buzzedPlayers = queue
    .map((p) => {
      const player = players.find((player) => player.id === p.id);
      if (!player) {
        return {};
      }
      return {
        ...p,
        name: player.name,
        connected: player.connected,
      };
    })
    .filter((p) => p.name);
  // active players who haven't buzzed
  const activePlayers = orderBy(
    players.filter((p) => !some(queue, (q) => q.id === p.id)),
    ['connected', 'name'],
    ['desc', 'asc']
  );

  const timeDisplay = (delta) => {
    if (delta > 1000) {
      return `+${round(delta / 1000, 2)} s`;
    }
    return `+${delta} ms`;
  };

  const renderPlayerName = (id, name, connected) => (
    <div className={`name ${!connected ? 'dim' : ''}`}>
      <div className="name-content">
        {name}
        {!connected && <AiOutlineDisconnect className="disconnected" />}
      </div>
      {id === game.playerID && (
        <div 
          className="sound-toggle" 
          onClick={(e) => {
            e.stopPropagation();
            setPlayerSound(!playerSound);
          }}
          title={playerSound ? "Turn off buzzer sound" : "Turn on buzzer sound"}
        >
          {playerSound ? <BsSoundwave /> : <BsVolumeMute />}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Header
        auth={game.headerData}
        clearAuth={() =>
          game.headerData.setAuth({
            playerID: null,
            credentials: null,
            roomID: null,
          })
        }
      />
      <Container>
        <section>
          <p id="room-title">Room {game.gameID}</p>
          {!game.isConnected ? (
            <p className="warning">Disconnected - attempting to reconnect...</p>
          ) : null}
          <div className="sound-control">
            <button
              className={`sound-button ${playerSound ? 'active' : ''}`}
              onClick={() => setPlayerSound(!playerSound)}
              title={playerSound ? "Turn off buzzer sound" : "Turn on buzzer sound"}
            >
              {playerSound ? <BsSoundwave /> : <BsVolumeMute />}
              {playerSound ? "Sound On" : "Sound Off"}
            </button>
          </div>
          <div id="buzzer">
            <button
              ref={buzzButton}
              disabled={buzzed || game.G.locked || game.G.textInputMode}
              onClick={() => {
                if (!buzzed && !game.G.locked && !game.G.textInputMode) {
                  attemptBuzz();
                }
              }}
              className={`${buzzed ? 'buzzed' : ''} ${game.G.locked ? 'locked' : ''}`}
              aria-label={game.G.locked ? 'Buzzer locked' : buzzed ? 'Already buzzed' : 'Click to buzz'}
              title={game.G.locked ? 'Buzzer is locked by host' : buzzed ? 'You have already buzzed' : 'Click or press spacebar to buzz'}
            >
              {game.G.locked ? 'Locked' : buzzed ? 'Buzzed' : 'Buzz'}
            </button>
          </div>
          {isHost ? (
            <div className="settings" role="group" aria-label="Host controls">
              <div className="settings-grid">
              <div className="button-container settings-item">
                <Form.Check
                  type="switch"
                  id="text-input-mode"
                  label="Text Input Mode"
                  checked={game.G.textInputMode}
                  onChange={() => {
                    if (window.confirm('Switching modes will clear all current buzzes. Continue?')) {
                      game.moves.toggleTextInputMode();
                    }
                  }}
                  aria-label="Toggle text input mode"
                />
              </div>
              {game.G.textInputMode ? (
                <div className="button-container settings-item">
                    <button
                      className="text-button"
                      onClick={() => game.moves.toggleTextInputLock()}
                      aria-label={game.G.textInputLocked ? 'Unlock text answers' : 'Lock text answers'}
                      title={game.G.textInputLocked ? 'Allow participants to submit answers' : 'Prevent new answer submissions'}
                    >
                    {game.G.textInputLocked ? 'Unlock answers' : 'Lock answers'}
                  </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all answers?')) {
                          game.moves.clearTextAnswers();
                        }
                      }}
                      aria-label="Clear all text answers"
                      title="Remove all submitted answers"
                    >
                    Clear answers
                  </button>
                </div>
              ) : (
                <>
                  <div className="button-container settings-item">
                    <button
                      className="text-button"
                      onClick={() => game.moves.toggleLock()}
                      aria-label={game.G.locked ? 'Unlock buzzers' : 'Lock buzzers'}
                      title={game.G.locked ? 'Allow participants to buzz in' : 'Prevent new buzzes'}
                    >
                      {game.G.locked ? 'Unlock buzzers' : 'Lock buzzers'}
                    </button>
                  </div>
                  <div className="button-container">
                    <button
                      disabled={isEmpty(game.G.queue)}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to reset all buzzers?')) {
                          game.moves.resetBuzzers();
                        }
                      }}
                      aria-label="Reset all buzzers"
                      title="Clear all current buzzes"
                    >
                      Reset all buzzers
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          ) : null}
          
          {game.G.textInputMode && !isHost ? (
            <div className="text-input-container">
              <Form.Control
                type="text"
                placeholder="Enter your answer..."
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !game.G.textInputLocked) {
                    game.moves.submitTextAnswer(game.playerID, textAnswer);
                  }
                }}
                disabled={game.G.textInputLocked}
              />
              <button
                className="submit-answer"
                disabled={game.G.textInputLocked || !textAnswer.trim()}
                onClick={() => game.moves.submitTextAnswer(game.playerID, textAnswer)}
              >
                Submit Answer
              </button>
            </div>
          ) : null}
        </section>
        {game.G.textInputMode && isHost ? (
          <div className="queue">
            <p>Player Answers</p>
            <ul>
              {players
                .filter(p => p.connected)
                .map(({ id, name }) => (
                  <li key={id}>
                    <div className="player-info">
                      {renderPlayerName(id, name, true)}
                      <div className="answer">
                        {game.G.textAnswers[id] || '-'}
                      </div>
                      <div 
                        className="score clickable" 
                        onClick={() => isHost && setShowScorePopup(id)}
                        title={isHost ? "Click to adjust score" : undefined}
                      >
                        {(game.G.scores && game.G.scores[id]) || 0}
                      </div>
                      {showScorePopup === id && (
                        <div className="score-popup">
                          <div className="score-display">
                            {(game.G.scores && game.G.scores[id]) || 0}
                          </div>
                          <div className="score-controls">
                            <button
                              className="score-button"
                              onClick={() => game.moves.decrementScore(id)}
                            >
                              -
                            </button>
                            <button
                              className="score-button"
                              onClick={() => game.moves.incrementScore(id)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
              ))}
            </ul>
          </div>
        ) : !game.G.textInputMode ? (
          <div className="queue" role="region" aria-label="Buzzed players list">
            <p>Players Buzzed ({buzzedPlayers.length})</p>
            <ul>
              {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
                <li key={id} className={isHost ? 'resettable' : null}>
                  <div
                    className="player-sign"
                    onClick={() => {
                      if (isHost) {
                        game.moves.resetBuzzer(id);
                      }
                    }}
                  >
                    <div className="player-info">
                      {renderPlayerName(id, name, connected)}
                      <div 
                        className="score clickable" 
                        onClick={(e) => {
                          e.stopPropagation();
                          isHost && setShowScorePopup(id);
                        }}
                        title={isHost ? "Click to adjust score" : undefined}
                      >
                        {(game.G.scores && game.G.scores[id]) || 0}
                      </div>
                      {showScorePopup === id && (
                        <div className="score-popup">
                          <div className="score-display">
                            {(game.G.scores && game.G.scores[id]) || 0}
                          </div>
                          <div className="score-controls">
                            <button
                              className="score-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                game.moves.decrementScore(id);
                              }}
                            >
                              -
                            </button>
                            <button
                              className="score-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                game.moves.incrementScore(id);
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {i > 0 ? (
                      <div className="mini">
                        {timeDisplay(timestamp - queue[0].timestamp)}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
          <div className="queue" role="region" aria-label="Other players list">
            <p>Other Players ({activePlayers.length})</p>
          <ul>
            {activePlayers.map(({ id, name, connected }) => (
              <li key={id}>
                <div className="player-info">
                  {renderPlayerName(id, name, connected)}
                  <div 
                    className="score clickable" 
                    onClick={() => isHost && setShowScorePopup(id)}
                    title={isHost ? "Click to adjust score" : undefined}
                  >
                    {(game.G.scores && game.G.scores[id]) || 0}
                  </div>
                  {showScorePopup === id && (
                    <div className="score-popup">
                      <div className="score-display">
                        {(game.G.scores && game.G.scores[id]) || 0}
                      </div>
                      <div className="score-controls">
                        <button
                          className="score-button"
                          onClick={() => game.moves.decrementScore(id)}
                        >
                          -
                        </button>
                        <button
                          className="score-button"
                          onClick={() => game.moves.incrementScore(id)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
