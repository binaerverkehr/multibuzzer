import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { Container, Form, Table as BootstrapTable } from 'react-bootstrap';
import Header from '../components/Header';
import '../styles/components/score.css';

export default function Table(game) {
  const [loaded, setLoaded] = useState(false);
  const [buzzed, setBuzzer] = useState(
    some(game.G.queue, (o) => o.id === game.playerID)
  );
  const [lastBuzz, setLastBuzz] = useState(null);
  const [showScorePopup, setShowScorePopup] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [scoreAnimations, setScoreAnimations] = useState({});
  const buzzButton = useRef(null);
  const queueRef = useRef(null);
  const lastQueueLength = useRef(0);
  const scoresRef = useRef(game.G.scores || {});

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

  // Play sound when someone buzzes
  useEffect(() => {
    const currentQueueLength = Object.keys(game.G.queue).length;
    const savedSound = localStorage.getItem('playerSound');
    const soundEnabled = savedSound === null ? true : savedSound === 'true';

    // Only play sound when queue length increases (new buzz)
    if (currentQueueLength > lastQueueLength.current && soundEnabled) {
      const audio = new Audio('/shortBuzz.mp3');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.log('Audio play error:', error);
      });
    }
    lastQueueLength.current = currentQueueLength;
  }, [game.G.queue]);

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

    if (!loaded) {
      setLoaded(true);
    }

    queueRef.current = game.G.queue;
  }, [game.G.queue, game.playerID, lastBuzz, loaded]);

  // Track score changes and trigger animations
  useEffect(() => {
    const currentScores = game.G.scores || {};
    const previousScores = scoresRef.current;
    
    Object.keys(currentScores).forEach(playerId => {
      const currentScore = currentScores[playerId] || 0;
      const previousScore = previousScores[playerId] || 0;
      
      if (currentScore > previousScore) {
        setScoreAnimations(prev => ({
          ...prev,
          [playerId]: true
        }));
        
        setTimeout(() => {
          setScoreAnimations(prev => ({
            ...prev,
            [playerId]: false
          }));
        }, 500);
      }
    });
    
    scoresRef.current = currentScores;
  }, [game.G.scores]);

  const attemptBuzz = () => {
    if (!buzzed) {
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
  const hostId = get(firstPlayer, 'id');

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
    .filter((p) => p.name)
    .filter((p) => !game.G.hideHost || p.id !== hostId);
  // Sort all players by score for leaderboard
  const allPlayersSorted = orderBy(
    players.filter(p => !game.G.hideHost || p.id !== hostId),
    [(p) => (game.G.scores && game.G.scores[p.id]) || 0],
    ['desc']
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
    </div>
  );

  const renderScoreControls = (id) => (
    <div className="points-controls">
      <button
        className="point-button"
        onClick={() => game.moves.decrementScore(id)}
        title="Decrease points by 1"
      >
        -1
      </button>
      <div className={`score ${scoreAnimations[id] ? 'score-increased' : ''}`}>
        {(game.G.scores && game.G.scores[id]) || 0}
      </div>
      <button
        className="point-button"
        onClick={() => game.moves.incrementScore(id)}
        title="Increase points by 1"
      >
        +1
      </button>
      <button
        className="point-button reset"
        onClick={() => game.moves.setScore(id, 0)}
        title="Reset points to 0"
      >
        Reset
      </button>
    </div>
  );

  const renderPlayerAnswers = () => {
    const connectedPlayers = players
      .filter(p => p.connected)
      .filter(p => !game.G.hideHost || p.id !== hostId);

    return (
      <div className="game-section">
        <h3>Player Answers</h3>
        <BootstrapTable striped bordered hover variant="dark">
          <thead>
            <tr>
              <th>Order</th>
              <th>Player</th>
              <th>Answer</th>
              {isHost && <th>Visibility</th>}
            </tr>
          </thead>
          <tbody>
            {connectedPlayers.map(({ id, name }, index) => {
              const answer = game.G.textAnswers[id];
              const isVisible = game.G.answerVisibility[id];
              const showAnswer = isHost || id === game.playerID || isVisible;

              return (
                <tr key={id}>
                  <td>{index + 1}</td>
                  <td>{renderPlayerName(id, name, true)}</td>
                  <td>{showAnswer ? (answer || '-') : '***'}</td>
                  {isHost && (
                    <td>
                      <button
                        className="visibility-toggle"
                        onClick={() => game.moves.toggleAnswerVisibility(id)}
                        title={isVisible ? "Hide answer from participants" : "Show answer to participants"}
                      >
                        {isVisible ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </BootstrapTable>
      </div>
    );
  };

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
        roomID={game.gameID}
        playerName={players.find(p => p.id === game.playerID)?.name}
      />
      <Container>
        {!game.isConnected && (
          <p className="warning">Disconnected - attempting to reconnect...</p>
        )}

        {/* Leaderboard Section */}
        <div className="game-section">
          <h3>Leaderboard</h3>
          <BootstrapTable striped bordered hover variant="dark">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Points</th>
                {isHost && <th>Points Control</th>}
              </tr>
            </thead>
            <tbody>
              {allPlayersSorted.map(({ id, name, connected }, index) => (
                <tr key={id} className={!connected ? 'dim' : ''}>
                  <td>{index + 1}</td>
                  <td>{renderPlayerName(id, name, connected)}</td>
                  <td className={`score ${scoreAnimations[id] ? 'score-increased' : ''}`}>
                    {(game.G.scores && game.G.scores[id]) || 0}
                  </td>
                  {isHost && <td>{renderScoreControls(id)}</td>}
                </tr>
              ))}
            </tbody>
          </BootstrapTable>
        </div>

        {/* Game Sections Grid */}
        <div className="game-sections-grid">
          {/* Players Buzzed Section */}
          {game.G.textInputMode ? (
            renderPlayerAnswers()
          ) : (
            <div className="game-section" role="region" aria-label="Buzzed players list">
              <h3>Players Buzzed ({buzzedPlayers.length})</h3>
              <BootstrapTable striped bordered hover variant="dark">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Player</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
                    <tr 
                      key={id} 
                      className={`${i === 0 ? 'first-buzz' : ''} ${!connected ? 'dim' : ''}`}
                      onClick={() => {
                        if (isHost) {
                          game.moves.resetBuzzer(id);
                        }
                      }}
                    >
                      <td>{i + 1}</td>
                      <td>{renderPlayerName(id, name, connected)}</td>
                      <td>
                        {i > 0 ? timeDisplay(timestamp - queue[0].timestamp) : 'First'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </BootstrapTable>
            </div>
          )}

          {/* Buzzer/Input Section */}
          <div className="game-section">
            {!game.G.textInputMode ? (
              <div id="buzzer">
                <button
                  ref={buzzButton}
                  disabled={buzzed || game.G.locked}
                  onClick={() => {
                    if (!buzzed && !game.G.locked) {
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
            ) : !isHost ? (
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
          </div>
        </div>
      </Container>

      {/* Host Administration Panel */}
      {isHost && (
        <div className="admin-panel">
          <div className="settings-grid">
            <div className="mode-switch-container">
              <span className="mode-label">Eingabe-Modus</span>
              <Form.Check
                type="switch"
                id="text-input-mode"
                checked={game.G.textInputMode}
                onChange={() => game.moves.toggleTextInputMode()}
                aria-label="Toggle between text input and buzzer mode"
              />
              <span className="mode-label">Buzzer-Modus</span>
            </div>
            <div className="mode-switch-container">
              <span className="mode-label">Host anzeigen</span>
              <Form.Check
                type="switch"
                id="show-host"
                checked={!game.G.hideHost}
                onChange={() => game.moves.toggleHostVisibility()}
                aria-label="Toggle host visibility in lists"
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
                  onClick={() => game.moves.clearTextAnswers()}
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
                    onClick={() => game.moves.resetBuzzers()}
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
      )}
    </div>
  );
}
