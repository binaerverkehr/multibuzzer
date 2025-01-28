import { ActivePlayers } from 'boardgame.io/core';

function resetBuzzers(G) {
  G.queue = {};
}

function resetBuzzer(G, ctx, id) {
  const newQueue = { ...G.queue };
  delete newQueue[id];
  G.queue = newQueue;
}

function toggleLock(G) {
  G.locked = !G.locked;
}

function toggleTextInputMode(G) {
  G.textInputMode = !G.textInputMode;
  // Reset text answers when toggling mode
  G.textAnswers = {};
}

function toggleTextInputLock(G) {
  G.textInputLocked = !G.textInputLocked;
}

function submitTextAnswer(G, ctx, playerID, answer) {
  if (!G.textInputLocked) {
    G.textAnswers = {
      ...G.textAnswers,
      [playerID]: answer
    };
  }
}

function clearTextAnswers(G) {
  G.textAnswers = {};
}

function buzz(G, ctx, id) {
  const newQueue = {
    ...G.queue,
  };
  if (!newQueue[id]) {
    // buzz on server will overwrite the client provided timestamp
    newQueue[id] = { id, timestamp: new Date().getTime() };
  }
  G.queue = newQueue;
}

function incrementScore(G, ctx, playerID) {
  if (ctx.playerID === '0') {
    // Only host can modify scores
    const player = ctx.playOrder.find((p) => p === playerID);
    if (player) {
      G.scores = G.scores || {};
      G.scores[playerID] = (G.scores[playerID] || 0) + 1;
    }
  }
}

function decrementScore(G, ctx, playerID) {
  if (ctx.playerID === '0') {
    // Only host can modify scores
    const player = ctx.playOrder.find((p) => p === playerID);
    if (player) {
      G.scores = G.scores || {};
      G.scores[playerID] = Math.max((G.scores[playerID] || 0) - 1, 0);
    }
  }
}

export const Buzzer = {
  name: 'buzzer',
  minPlayers: 2,
  maxPlayers: 200,
  setup: () => ({
    queue: {},
    locked: false,
    scores: {},
    textInputMode: false,
    textInputLocked: false,
    textAnswers: {},
  }),
  phases: {
    play: {
      start: true,
      moves: {
        buzz,
        resetBuzzer,
        resetBuzzers,
        toggleLock,
        toggleTextInputMode,
        toggleTextInputLock,
        submitTextAnswer,
        clearTextAnswers,
        incrementScore,
        decrementScore,
      },
      turn: {
        activePlayers: ActivePlayers.ALL,
      },
    },
  },
};
