import React, { useState } from 'react';
import { Navbar } from 'react-bootstrap';
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

export default function Header({
  auth = {},
  clearAuth,
  roomID
}) {
  const history = useHistory();
  const [playerSound, setPlayerSound] = useState(true);

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
      <Navbar>
        <div className="navbar-left">
          <Navbar.Brand>
            <Logo /> Multibuzzer
          </Navbar.Brand>
          {roomID && (
            <div className="room-id">
              Room: {roomID}
            </div>
          )}
        </div>
        <div className="nav-buttons">
          <button
            className={`text-button sound-button ${playerSound ? 'active' : ''}`}
            onClick={() => setPlayerSound(!playerSound)}
            title={playerSound ? "Sound On" : "Sound Off"}
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
        </div>
      </Navbar>
    </header>
  );
}
