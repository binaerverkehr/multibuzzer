import React, { useState } from 'react';
import { Navbar } from 'react-bootstrap';
import { isNil } from 'lodash';
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
  sound = null,
  setSound,
}) {
  const history = useHistory();
  const [volume, setVolume] = useState(50);
  const [showVolume, setShowVolume] = useState(false);

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

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    // Here you would typically update the Howler volume
    // This will be handled by the parent component
    if (setSound) {
      setSound(newVolume / 100);
    }
  };

  return (
    <header>
      <Navbar>
        <Navbar.Brand>
          <Logo /> Multibuzzer
        </Navbar.Brand>
        <div className="nav-buttons">
          {!isNil(sound) && (
            <div className="sound-controls">
              <button 
                className="text-button sound-button" 
                onClick={() => setShowVolume(!showVolume)}
                aria-label={sound ? 'Sound enabled' : 'Sound disabled'}
                title="Toggle sound settings"
              >
                {sound ? <BsSoundwave /> : <BsVolumeMute />}
              </button>
              {showVolume && (
                <div className="volume-slider">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-range"
                    aria-label="Volume control"
                  />
                  <span className="volume-value">{volume}%</span>
                </div>
              )}
            </div>
          )}
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
