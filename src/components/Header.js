import React, { useState, useEffect } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { useHistory } from 'react-router';
import { leaveRoom } from '../lib/endpoints';
import { BsSoundwave, BsVolumeMute } from 'react-icons/bs';

function Logo({ size = 25 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 95 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill="#F2994A" />
      <circle cx="75" cy="20" r="20" fill="#348DF5" />
      <circle cx="20" cy="75" r="20" fill="#348DF5" />
      <circle cx="75" cy="75" r="20" fill="#348DF5" />
    </svg>
  );
}

export default function Header({ auth = {}, clearAuth, roomID, playerName }) {
  const history = useHistory();
  const [playerSound, setPlayerSound] = useState(() => {
    const savedSound = localStorage.getItem('playerSound');
    return savedSound === null ? true : savedSound === 'true';
  });

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('playerSound', playerSound);
  }, [playerSound]);

  // leave current game
  async function leave() {
    try {
      await leaveRoom(auth.roomID, auth.playerID, auth.credentials);
      clearAuth();
      history.push('/');
    } catch (error) {
      console.log('leave error', error);
      clearAuth();
      history.push('/');
    }
  }

  return (
    <header>
      <Navbar expand="md">
        <Navbar.Brand>
          <Logo /> Multibuzzer
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav">
          <Nav className="me-auto header-info">
            {roomID && <div className="room-id">Room: {roomID}</div>}
            {playerName && <div className="player-name">Player: {playerName}</div>}
          </Nav>
          <Nav className="nav-buttons">
            <button
              className={`text-button sound-button ${playerSound ? 'active' : ''
                }`}
              onClick={() => setPlayerSound(!playerSound)}
              title={playerSound ? 'Sound On' : 'Sound Off'}
            >
              {playerSound ? <BsSoundwave /> : <BsVolumeMute />}
            </button>
            {clearAuth && (
              <button
                className="text-button"
                onClick={() => leave()}
                aria-label="Leave current game"
              >
                Leave game
              </button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}
