const socket = io();

// --- Web Audio Synthesizer (Zero external audio files needed) ---
class SoundEngine {
  constructor() {
    this.muted = localStorage.getItem('rs_muted') === 'true';
    this.volume = Number(localStorage.getItem('rs_vol') ?? 0.7);
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, duration = 0.2, type = 'sine', delay = 0) {
    if (this.muted || this.volume <= 0) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(this.volume * 0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPaperShuffle() {
    this.playTone(320, 0.08, 'triangle', 0);
    this.playTone(480, 0.09, 'triangle', 0.07);
    this.playTone(620, 0.12, 'sine', 0.14);
  }

  playTick(urgent = false) {
    this.playTone(urgent ? 920 : 660, 0.06, 'sine', 0);
  }

  playConfirm() {
    this.playTone(523.25, 0.12, 'sine', 0);
    this.playTone(659.25, 0.18, 'sine', 0.1);
  }

  playSuspense() {
    this.playTone(146.83, 0.9, 'sawtooth', 0);
    this.playTone(220.0, 0.9, 'sine', 0.1);
  }

  playWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, 0.35, 'triangle', idx * 0.12);
    });
  }

  playWrong() {
    this.playTone(311.13, 0.25, 'sawtooth', 0);
    this.playTone(233.08, 0.4, 'sawtooth', 0.2);
  }
}

const sfx = new SoundEngine();

// --- App State ---
const state = {
  roomCode: localStorage.getItem('rs_roomCode') || '',
  playerId: localStorage.getItem('rs_playerId') || '',
  playerToken: localStorage.getItem('rs_playerToken') || '',
  room: null,
  privateChit: null,
  isRamudu: false,
  selectedTargetId: null,
  lastPhaseKey: '',
  lastTickSec: -1,
};

// --- DOM Helpers ---
const $ = (id) => document.getElementById(id);

function showToast(msg, durationMs = 3500) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), durationMs);
}

function showScreen(screenId) {
  [
    'screenHome',
    'screenLobby',
    'screenCharView',
    'screenGuessing',
    'screenSuspense',
    'screenResults',
    'screenLeaderboard',
  ].forEach((id) => {
    $(id).classList.toggle('hidden', id !== screenId);
  });
}

function saveSession(roomCode, playerId, playerToken) {
  state.roomCode = roomCode;
  state.playerId = playerId;
  state.playerToken = playerToken;
  localStorage.setItem('rs_roomCode', roomCode);
  localStorage.setItem('rs_playerId', playerId);
  localStorage.setItem('rs_playerToken', playerToken);
}

// --- Audio UI Setup ---
$('btnMute').textContent = sfx.muted ? '🔇' : '🔊';
$('volSlider').value = sfx.volume;

$('btnMute').addEventListener('click', () => {
  sfx.muted = !sfx.muted;
  localStorage.setItem('rs_muted', sfx.muted);
  $('btnMute').textContent = sfx.muted ? '🔇' : '🔊';
});

$('volSlider').addEventListener('input', (e) => {
  sfx.volume = Number(e.target.value);
  localStorage.setItem('rs_vol', sfx.volume);
  if (sfx.volume > 0 && sfx.muted) {
    sfx.muted = false;
    $('btnMute').textContent = '🔊';
  }
});

// Unlock audio on first tap anywhere
document.body.addEventListener('pointerdown', () => sfx.ensureContext(), { once: true });

// --- URL Invite Code Auto-Fill ---
const urlParams = new URLSearchParams(window.location.search);
const inviteCode = urlParams.get('room');
if (inviteCode) {
  $('inputRoomCode').value = inviteCode.toUpperCase().slice(0, 6);
  $('tabJoin').classList.add('active');
  $('tabCreate').classList.remove('active');
  $('panelJoin').classList.remove('hidden');
  $('panelCreate').classList.add('hidden');
}

// --- Home Screen Tabs & Actions ---
$('tabCreate').addEventListener('click', () => {
  $('tabCreate').classList.add('active');
  $('tabJoin').classList.remove('active');
  $('panelCreate').classList.remove('hidden');
  $('panelJoin').classList.add('hidden');
});

$('tabJoin').addEventListener('click', () => {
  $('tabJoin').classList.add('active');
  $('tabCreate').classList.remove('active');
  $('panelJoin').classList.remove('hidden');
  $('panelCreate').classList.add('hidden');
});

$('btnCreateRoom').addEventListener('click', () => {
  const name = $('inputName').value.trim();
  const totalRounds = Number($('inputRounds').value);
  const guessTimeSec = Number($('inputTimer').value);

  socket.emit('room:create', { name, totalRounds, guessTimeSec }, (res) => {
    if (!res?.ok) return showToast(res?.error || 'Could not create room.');
    saveSession(res.roomCode, res.playerId, res.playerToken);
    sfx.playConfirm();
  });
});

$('btnJoinRoom').addEventListener('click', () => {
  const name = $('inputName').value.trim();
  const roomCode = $('inputRoomCode').value.trim().toUpperCase();

  socket.emit('room:join', { roomCode, name }, (res) => {
    if (!res?.ok) return showToast(res?.error || 'Could not join room.');
    saveSession(res.roomCode, res.playerId, res.playerToken);
    sfx.playConfirm();
  });
});

// --- Auto-Reconnect on Page Refresh / Network Drop ---
socket.on('connect', () => {
  if (state.roomCode && state.playerToken) {
    socket.emit(
      'room:join',
      { roomCode: state.roomCode, playerToken: state.playerToken },
      (res) => {
        if (!res?.ok) {
          localStorage.clear();
          state.roomCode = '';
          state.playerToken = '';
          showScreen('screenHome');
        }
      }
    );
  }
});

// --- Lobby Controls ---
$('btnCopyCode').addEventListener('click', () => {
  navigator.clipboard?.writeText(state.roomCode);
  showToast(`Room code ${state.roomCode} copied!`);
});

$('btnCopyLink').addEventListener('click', () => {
  const inviteUrl = `${window.location.origin}/?room=${state.roomCode}`;
  if (navigator.share) {
    navigator.share({ title: 'Join Ramudu–Sita Game', url: inviteUrl }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(inviteUrl);
    showToast('Invitation link copied!');
  }
});

$('btnToggleReady').addEventListener('click', () => {
  socket.emit('lobby:toggle_ready', {}, (res) => {
    if (res?.ok) sfx.playConfirm();
  });
});

$('btnStartGame').addEventListener('click', () => {
  socket.emit('game:start', {}, (res) => {
    if (!res?.ok) showToast(res?.error || 'Cannot start game yet.');
  });
});

// --- Guessing Controls ---
$('btnProceedGuess').addEventListener('click', () => {
  if (!state.selectedTargetId) return;
  $('btnProceedGuess').disabled = true;
  socket.emit('round:submit_guess', { targetPlayerId: state.selectedTargetId }, (res) => {
    if (!res?.ok) {
      showToast(res?.error || 'Could not submit guess.');
      $('btnProceedGuess').disabled = false;
    } else {
      sfx.playConfirm();
    }
  });
});

// --- Next Round & Reset ---
$('btnNextRound').addEventListener('click', () => {
  socket.emit('game:next_round', {}, (res) => {
    if (!res?.ok) showToast(res?.error || 'Unable to advance round.');
  });
});

$('btnPlayAgainHome').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/';
});

// --- Socket Event Listeners ---
socket.on('round:private_chit', ({ round, character }) => {
  state.privateChit = character;
  state.isRamudu = character.id === 'ramudu';
  state.selectedTargetId = null;

  $('chitPortrait').innerHTML = `<img src="/images/${character.id}.webp" onerror="this.onerror=null;this.src='/images/${character.id}.jpg'" alt="${character.en}" />`;
  $('chitTe').textContent = character.te;
  $('chitEn').textContent = character.en;

  if (character.id === 'ramudu') {
    $('chitHint').textContent = 'You are Ramudu! Find Sita (సీత) next.';
  } else if (character.id === 'sita') {
    $('chitHint').textContent = 'You are Sita! Stay hidden from Ramudu.';
  } else {
    $('chitHint').textContent = 'Keep a poker face! Fool Ramudu into picking you (+900 pts).';
  }

  sfx.playPaperShuffle();
});

socket.on('round:ramudu_prompt', ({ isRamudu }) => {
  state.isRamudu = Boolean(isRamudu);
  if (state.room) renderGuessing(state.room);
});

socket.on('room:state', (room) => {
  state.room = room;
  const phaseKey = `${room.currentRound}_${room.phase}`;
  const isNewPhase = phaseKey !== state.lastPhaseKey;
  state.lastPhaseKey = phaseKey;

  if (room.phase === 'LOBBY') {
    renderLobby(room);
  } else if (room.phase === 'CHAR_VIEW') {
    showScreen('screenCharView');
    $('cvRound').textContent = room.currentRound;
    $('cvTotalRounds').textContent = room.totalRounds;
  } else if (room.phase === 'GUESSING') {
    if (isNewPhase) {
      state.privateChit = null; // Clear chit after 10s
      state.selectedTargetId = null;
    }
    renderGuessing(room);
  } else if (room.phase === 'SUSPENSE') {
    showScreen('screenSuspense');
    if (isNewPhase) sfx.playSuspense();
  } else if (room.phase === 'RESULTS') {
    renderResults(room, isNewPhase);
  } else if (room.phase === 'LEADERBOARD') {
    renderLeaderboard(room, isNewPhase);
  }
});

// --- Screen Renderers ---
function renderLobby(room) {
  showScreen('screenLobby');
  $('lobbyCode').textContent = room.code;
  $('lobbySettings').textContent = `${room.totalRounds} Rounds • ${room.guessTimeSec}s Guess`;
  $('lobbyCount').textContent = `${room.players.length} / 10 Players`;

  const me = room.players.find((p) => p.id === state.playerId);
  const isHost = room.hostId === state.playerId;

  const list = $('lobbyPlayerList');
  list.innerHTML = '';
  room.players.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    const hostTag = p.id === room.hostId ? ' 👑' : '';
    const youTag = p.id === state.playerId ? ' (You)' : '';

    let badgeHtml = '';
    if (!p.isConnected) {
      badgeHtml = `<span class="badge badge-offline">Offline</span>`;
    } else if (p.isReady) {
      badgeHtml = `<span class="badge badge-ready">Ready ✓</span>`;
    } else {
      badgeHtml = `<span class="badge badge-wait">Waiting</span>`;
    }

    li.innerHTML = `<span><strong>${escapeHtml(p.name)}</strong>${hostTag}${youTag}</span>${badgeHtml}`;
    list.appendChild(li);
  });

  if (me) {
    $('btnToggleReady').textContent = me.isReady ? 'Ready ✓ (Tap to Unready)' : 'Mark Ready';
    $('btnToggleReady').classList.toggle('ready-on', me.isReady);
  }

  const allReady =
    room.players.length >= 4 &&
    room.players.length <= 10 &&
    room.players.every((p) => p.isReady && p.isConnected);

  $('btnStartGame').classList.toggle('hidden', !isHost);
  $('btnStartGame').disabled = !allReady;
  $('btnStartGame').textContent = allReady
    ? `Start Round 1 (${room.players.length} Players)`
    : `Waiting for 4+ Ready Players (${room.players.length}/4)`;
}

function renderGuessing(room) {
  showScreen('screenGuessing');
  $('gRound').textContent = room.currentRound;
  $('gTotalRounds').textContent = room.totalRounds;

  if (state.isRamudu) {
    $('ramuduView').classList.remove('hidden');
    $('waitingView').classList.add('hidden');

    const grid = $('targetGrid');
    grid.innerHTML = '';
    room.players
      .filter((p) => p.id !== state.playerId)
      .forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'target-btn' + (state.selectedTargetId === p.id ? ' selected' : '');
        btn.textContent = p.name;
        btn.addEventListener('click', () => {
          state.selectedTargetId = p.id;
          $('btnProceedGuess').disabled = false;
          renderGuessing(room);
        });
        grid.appendChild(btn);
      });

    $('btnProceedGuess').disabled = !state.selectedTargetId;
  } else {
    $('ramuduView').classList.add('hidden');
    $('waitingView').classList.remove('hidden');
  }
}

function renderResults(room, playSound) {
  showScreen('screenResults');
  state.isRamudu = false;
  $('rRound').textContent = room.currentRound;
  $('rTotalRounds').textContent = room.totalRounds;

  const out = room.roundOutcome;
  const playerMap = new Map(room.players.map((p) => [p.id, p]));
  const ramudu = playerMap.get(out.ramuduId);
  const sita = playerMap.get(out.sitaId);
  const guessed = out.guessedPlayerId ? playerMap.get(out.guessedPlayerId) : null;

  const banner = $('outcomeBanner');
  banner.className = 'outcome-banner card ' + (out.isCorrect ? 'correct' : 'wrong');

  if (out.isTimeout) {
    banner.innerHTML = `<strong>⏰ Time Expired!</strong><br>
      Ramudu (<strong>${escapeHtml(ramudu?.name)}</strong>) failed to guess in time.<br>
      Actual Sita (సీత) was <strong>${escapeHtml(sita?.name)}</strong>!`;
    if (playSound) sfx.playWrong();
  } else if (out.isCorrect) {
    banner.innerHTML = `<strong>🎯 Correct Guess!</strong><br>
      Ramudu (<strong>${escapeHtml(ramudu?.name)}</strong>) found Sita (<strong>${escapeHtml(sita?.name)}</strong>)!`;
    if (playSound) sfx.playWin();
  } else {
    banner.innerHTML = `<strong>❌ Wrong Guess!</strong><br>
      Ramudu (<strong>${escapeHtml(ramudu?.name)}</strong>) picked <strong>${escapeHtml(guessed?.name)}</strong> (+900),<br>
      but actual Sita (సీత) was <strong>${escapeHtml(sita?.name)}</strong>!`;
    if (playSound) sfx.playWrong();
  }

  const tbody = $('resultsBody');
  tbody.innerHTML = '';
  room.players.forEach((p) => {
    const pts = out.roundPoints[p.id] ?? 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td><span class="char-cell-te">${p.character?.te || ''}</span>${p.character?.en || ''}</td>
      <td><strong>+${pts}</strong></td>
      <td>${p.totalScore}</td>
    `;
    tbody.appendChild(tr);
  });

  const isHost = room.hostId === state.playerId;
  const isFinal = room.currentRound >= room.totalRounds;
  $('btnNextRound').classList.toggle('hidden', !isHost);
  $('btnNextRound').textContent = isFinal ? 'View Final Leaderboard 🏆' : 'Next Round ➔';
  $('waitingHostNext').classList.toggle('hidden', isHost);
}

function renderLeaderboard(room, playSound) {
  showScreen('screenLeaderboard');
  if (playSound) sfx.playWin();

  const board = room.leaderboard || [];
  const topScore = board[0]?.totalScore ?? 0;
  const winners = board.filter((p) => p.totalScore === topScore);

  $('winnerHighlight').innerHTML = `
    <div class="muted-label">CHAMPION${winners.length > 1 ? 'S (TIE)' : ''}</div>
    <h3 class="phase-heading">${winners.map((w) => escapeHtml(w.name)).join(' & ')}</h3>
    <strong>${topScore} Total Points</strong>
  `;

  const tbody = $('leaderboardBody');
  tbody.innerHTML = '';
  board.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${p.rank}</strong></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td style="font-size:0.75rem;color:var(--ink-muted)">${p.roundScores.join(', ')}</td>
      <td><strong>${p.totalScore}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- Synchronized Client Countdown Loop ---
setInterval(() => {
  const room = state.room;
  if (!room || !room.phaseEndsAt) return;

  const remainingMs = Math.max(0, room.phaseEndsAt - Date.now());
  const sec = Math.ceil(remainingMs / 1000);

  if (room.phase === 'CHAR_VIEW') {
    $('cvCountdown').textContent = sec;
  } else if (room.phase === 'GUESSING') {
    $('gCountdown').textContent = sec;
    const urgent = sec <= 5 && sec > 0;
    $('gTimerBadge').classList.toggle('urgent', urgent);
    if (sec !== state.lastTickSec && sec > 0 && sec <= 10) {
      state.lastTickSec = sec;
      sfx.playTick(urgent);
    }
  } else if (room.phase === 'SUSPENSE') {
    $('sCountdown').textContent = sec;
  }
}, 200);