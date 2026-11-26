import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateRoomCode,
  generateToken,
  dealCharacters,
  calculateRoundScores,
  buildFinalLeaderboard,
} from './gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint for free-tier wakeups
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', activeRooms: rooms.size });
});

/** @type {Map<string, any>} */
const rooms = new Map();

const ALLOWED_TIMERS = new Set([15, 30, 60]);
const REVEAL_DURATION_MS = 10_000;
const SUSPENSE_DURATION_MS = 5_000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // Auto-cleanup abandoned rooms after 2 hrs

function clearRoomTimer(room) {
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }
}

/**
 * Builds a sanitized public state object.
 * Secret characters are NEVER included until phase is 'REVEAL' or 'RESULTS'.
 */
function getPublicRoomState(room) {
  const showSecretChars = room.phase === 'REVEAL' || room.phase === 'RESULTS';

  return {
    code: room.code,
    hostId: room.hostId,
    totalRounds: room.totalRounds,
    guessTimeSec: room.guessTimeSec,
    currentRound: room.currentRound,
    phase: room.phase, // 'LOBBY' | 'CHAR_VIEW' | 'GUESSING' | 'SUSPENSE' | 'REVEAL' | 'RESULTS' | 'LEADERBOARD'
    phaseEndsAt: room.phaseEndsAt,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      isConnected: p.isConnected,
      totalScore: p.totalScore,
      roundScores: p.roundScores,
      character: showSecretChars ? room.assignments.get(p.id) || null : null,
    })),
    roundOutcome: showSecretChars ? room.lastOutcome : null,
    leaderboard: room.phase === 'LEADERBOARD' ? buildFinalLeaderboard(room.players) : null,
  };
}

function broadcastState(room) {
  room.lastActivity = Date.now();
  io.to(room.code).emit('room:state', getPublicRoomState(room));
}

function sendPrivateCharacterToPlayer(room, player) {
  if (!player.socketId) return;
  const assigned = room.assignments.get(player.id);
  if (!assigned) return;

  // Send private character ONLY if still inside the 10-second CHAR_VIEW window,
  // OR tell Ramudu his role so he knows he is the guesser during GUESSING.
  if (room.phase === 'CHAR_VIEW') {
    io.to(player.socketId).emit('round:private_chit', {
      round: room.currentRound,
      character: assigned,
      expiresAt: room.phaseEndsAt,
    });
  } else if (room.phase === 'GUESSING' && assigned.id === 'ramudu') {
    io.to(player.socketId).emit('round:ramudu_prompt', {
      round: room.currentRound,
      isRamudu: true,
    });
  }
}

function startRound(room) {
  clearRoomTimer(room);
  room.currentRound += 1;
  room.guessSubmittedBy = null;
  room.guessedPlayerId = null;
  room.lastOutcome = null;
  room.scoredRound = null;

  const playerIds = room.players.map((p) => p.id);
  room.assignments = dealCharacters(playerIds);

  // Phase 1: 10-second private character view
  room.phase = 'CHAR_VIEW';
  room.phaseEndsAt = Date.now() + REVEAL_DURATION_MS;
  broadcastState(room);

  // Privately emit each player's chit ONLY to their socket
  for (const player of room.players) {
    sendPrivateCharacterToPlayer(room, player);
  }

  room.timerHandle = setTimeout(() => {
    startGuessingPhase(room);
  }, REVEAL_DURATION_MS);
}

function startGuessingPhase(room) {
  clearRoomTimer(room);
  room.phase = 'GUESSING';
  room.phaseEndsAt = Date.now() + room.guessTimeSec * 1000;
  broadcastState(room);

  // Notify Ramudu privately so his UI unlocks the selection controls
  for (const player of room.players) {
    const char = room.assignments.get(player.id);
    if (char && char.id === 'ramudu' && player.socketId) {
      io.to(player.socketId).emit('round:ramudu_prompt', {
        round: room.currentRound,
        isRamudu: true,
      });
    }
  }

  room.timerHandle = setTimeout(() => {
    // Timer expired without a guess -> Timeout
    startSuspensePhase(room, null);
  }, room.guessTimeSec * 1000);
}

function startSuspensePhase(room, selectedPlayerId) {
  if (room.phase !== 'GUESSING') return; // Prevent double-submission or race with timeout
  clearRoomTimer(room);

  room.guessedPlayerId = selectedPlayerId;
  room.phase = 'SUSPENSE';
  room.phaseEndsAt = Date.now() + SUSPENSE_DURATION_MS;
  broadcastState(room);

  room.timerHandle = setTimeout(() => {
    finalizeRound(room);
  }, SUSPENSE_DURATION_MS);
}

function finalizeRound(room) {
  clearRoomTimer(room);

  // Guard: ensure scores are awarded ONLY ONCE per round
  if (room.scoredRound === room.currentRound) return;
  room.scoredRound = room.currentRound;

  const outcome = calculateRoundScores(
    room.players,
    room.assignments,
    room.guessedPlayerId
  );

  for (const player of room.players) {
    const earned = outcome.roundPoints.get(player.id) || 0;
    player.totalScore += earned;
    player.roundScores.push(earned);
  }

  room.lastOutcome = {
    ramuduId: outcome.ramuduId,
    sitaId: outcome.sitaId,
    guessedPlayerId: outcome.guessedPlayerId,
    isTimeout: outcome.isTimeout,
    isCorrect: outcome.isCorrect,
    roundPoints: Object.fromEntries(outcome.roundPoints),
  };

  room.phase = 'RESULTS';
  room.phaseEndsAt = null;
  broadcastState(room);
}

io.on('connection', (socket) => {
  // 1. Create Room
  socket.on('room:create', ({ name, totalRounds, guessTimeSec }, ack) => {
    try {
      const cleanName = String(name || '').trim().slice(0, 20);
      if (!cleanName) return ack?.({ ok: false, error: 'Display name is required.' });

      const rounds = Math.min(50, Math.max(5, Number(totalRounds) || 5));
      const timer = ALLOWED_TIMERS.has(Number(guessTimeSec)) ? Number(guessTimeSec) : 30;

      const code = generateRoomCode(rooms);
      const playerId = generateToken();
      const playerToken = generateToken();

      const hostPlayer = {
        id: playerId,
        token: playerToken,
        name: cleanName,
        socketId: socket.id,
        isReady: true,
        isConnected: true,
        totalScore: 0,
        roundScores: [],
      };

      const room = {
        code,
        hostId: playerId,
        totalRounds: rounds,
        guessTimeSec: timer,
        currentRound: 0,
        phase: 'LOBBY',
        phaseEndsAt: null,
        players: [hostPlayer],
        assignments: new Map(),
        guessedPlayerId: null,
        lastOutcome: null,
        scoredRound: null,
        timerHandle: null,
        lastActivity: Date.now(),
      };

      rooms.set(code, room);
      socket.join(code);
      socket.data = { roomCode: code, playerId };

      ack?.({ ok: true, roomCode: code, playerId, playerToken });
      broadcastState(room);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // 2. Join or Reconnect Room
  socket.on('room:join', ({ roomCode, name, playerToken }, ack) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return ack?.({ ok: false, error: 'Room not found. Check the code.' });

    // Check if returning player via playerToken
    if (playerToken) {
      const existing = room.players.find((p) => p.token === playerToken);
      if (existing) {
        existing.socketId = socket.id;
        existing.isConnected = true;
        socket.join(code);
        socket.data = { roomCode: code, playerId: existing.id };

        ack?.({
          ok: true,
          roomCode: code,
          playerId: existing.id,
          playerToken: existing.token,
          reconnected: true,
        });

        broadcastState(room);
        sendPrivateCharacterToPlayer(room, existing);
        return;
      }
    }

    // New player joining: strictly blocked once Round 1 has started
    if (room.phase !== 'LOBBY') {
      return ack?.({ ok: false, error: 'Game already in progress. Room is locked.' });
    }

    if (room.players.length >= 10) {
      return ack?.({ ok: false, error: 'Room is full (maximum 10 players).' });
    }

    const cleanName = String(name || '').trim().slice(0, 20);
    if (!cleanName) return ack?.({ ok: false, error: 'Display name is required.' });

    const duplicateName = room.players.some(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      return ack?.({ ok: false, error: 'That name is already taken in this room.' });
    }

    const playerId = generateToken();
    const newToken = generateToken();

    room.players.push({
      id: playerId,
      token: newToken,
      name: cleanName,
      socketId: socket.id,
      isReady: false,
      isConnected: true,
      totalScore: 0,
      roundScores: [],
    });

    socket.join(code);
    socket.data = { roomCode: code, playerId };

    ack?.({ ok: true, roomCode: code, playerId, playerToken: newToken });
    broadcastState(room);
  });

  // 3. Toggle Ready in Lobby
  socket.on('lobby:toggle_ready', (_payload, ack) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'LOBBY') return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.isReady = !player.isReady;
    ack?.({ ok: true, isReady: player.isReady });
    broadcastState(room);
  });

  // 4. Host Starts Game (Round 1)
  socket.on('game:start', (_payload, ack) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'LOBBY') return;
    if (room.hostId !== playerId) {
      return ack?.({ ok: false, error: 'Only the host can start the game.' });
    }
    if (room.players.length < 4 || room.players.length > 10) {
      return ack?.({ ok: false, error: 'Need 4 to 10 players to start.' });
    }
    const allReadyAndConnected = room.players.every((p) => p.isReady && p.isConnected);
    if (!allReadyAndConnected) {
      return ack?.({ ok: false, error: 'All players must be connected and ready.' });
    }

    ack?.({ ok: true });
    startRound(room);
  });

  // 5. Ramudu Submits Guess
  socket.on('round:submit_guess', ({ targetPlayerId }, ack) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'GUESSING') {
      return ack?.({ ok: false, error: 'Guessing phase is not active.' });
    }

    const senderChar = room.assignments.get(playerId);
    if (!senderChar || senderChar.id !== 'ramudu') {
      return ack?.({ ok: false, error: 'Only Ramudu can submit a guess.' });
    }

    if (targetPlayerId === playerId) {
      return ack?.({ ok: false, error: 'Ramudu cannot select himself.' });
    }

    const validTarget = room.players.some((p) => p.id === targetPlayerId);
    if (!validTarget) {
      return ack?.({ ok: false, error: 'Invalid player selected.' });
    }

    ack?.({ ok: true });
    startSuspensePhase(room, targetPlayerId);
  });

  // 6. Host Advances to Next Round or Final Leaderboard
  socket.on('game:next_round', (_payload, ack) => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'RESULTS') return;
    if (room.hostId !== playerId) {
      return ack?.({ ok: false, error: 'Only the host can advance the round.' });
    }

    ack?.({ ok: true });

    if (room.currentRound >= room.totalRounds) {
      room.phase = 'LEADERBOARD';
      room.phaseEndsAt = null;
      broadcastState(room);
    } else {
      startRound(room);
    }
  });

  // 7. Handle Disconnect (Preserve player identity for reconnection)
  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data || {};
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player && player.socketId === socket.id) {
      player.isConnected = false;
      player.socketId = null;

      // Transfer host if host disconnects while still in LOBBY
      if (room.phase === 'LOBBY' && room.hostId === player.id) {
        const nextConnected = room.players.find((p) => p.isConnected);
        if (nextConnected) {
          room.hostId = nextConnected.id;
          nextConnected.isReady = true;
        }
      }
      broadcastState(room);
    }
  });
});

// Clean up stale rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TTL_MS) {
      clearRoomTimer(room);
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Ramudu-Sita server running on http://localhost:${PORT}`);
});