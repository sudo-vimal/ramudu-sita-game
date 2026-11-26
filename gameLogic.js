import crypto from 'node:crypto';

export const CHARACTERS = [
  { id: 'ramudu', en: 'Ramudu', te: 'రాముడు', role: 'seeker' },
  { id: 'sita', en: 'Sita', te: 'సీత', role: 'target' },
  { id: 'lakshmanudu', en: 'Lakshmanudu', te: 'లక్ష్మణుడు', role: 'companion' },
  { id: 'bharathudu', en: 'Bharathudu', te: 'భరతుడు', role: 'companion' },
  { id: 'hanumanthudu', en: 'Hanumanthudu', te: 'హనుమంతుడు', role: 'companion' },
  { id: 'ravanudu', en: 'Ravanudu', te: 'రావణుడు', role: 'companion' },
  { id: 'jatayuvu', en: 'Jatayuvu', te: 'జటాయువు', role: 'companion' },
  { id: 'surpanaka', en: 'Surpanaka', te: 'శూర్పణఖ', role: 'companion' },
  { id: 'shathragnudu', en: 'Shathragnudu', te: 'శత్రుఘ్నుడు', role: 'companion' },
  { id: 'dasharathudu', en: 'Dasharathudu', te: 'దశరథుడు', role: 'companion' },
];

// Excludes O, 0, I, 1 to prevent visual confusion
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(existingRooms) {
  let code = '';
  do {
    code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
  } while (existingRooms.has(code));
  return code;
}

export function generateToken() {
  return crypto.randomUUID();
}

function fisherYatesShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deals unique characters: Ramudu & Sita always included,
 * remaining (playerCount - 2) randomly picked from the other 8.
 */
export function dealCharacters(playerIds) {
  const count = playerIds.length;
  if (count < 4 || count > 10) {
    throw new Error('Player count must be between 4 and 10');
  }

  const mandatory = CHARACTERS.slice(0, 2); // Ramudu & Sita
  const optionalPool = fisherYatesShuffle(CHARACTERS.slice(2));
  const selectedPool = fisherYatesShuffle([
    ...mandatory,
    ...optionalPool.slice(0, count - 2),
  ]);

  const assignments = new Map();
  playerIds.forEach((id, idx) => {
    assignments.set(id, selectedPool[idx]);
  });
  return assignments;
}

/**
 * Computes round points according to Scenarios A, B, and C.
 */
export function calculateRoundScores(players, assignments, guessedPlayerId) {
  let ramuduId = null;
  let sitaId = null;

  for (const [playerId, char] of assignments.entries()) {
    if (char.id === 'ramudu') ramuduId = playerId;
    if (char.id === 'sita') sitaId = playerId;
  }

  const isTimeout = !guessedPlayerId;
  const isCorrect = !isTimeout && guessedPlayerId === sitaId;

  const roundPoints = new Map();

  for (const player of players) {
    const pid = player.id;
    let pts = 0;

    if (isCorrect) {
      // Scenario A: Ramudu guesses Sita correctly
      if (pid === ramuduId) pts = 1000;
      else if (pid === sitaId) pts = 0;
      else pts = 800;
    } else if (!isTimeout) {
      // Scenario B: Ramudu guesses wrongly
      if (pid === ramuduId) pts = 0;
      else if (pid === sitaId) pts = 1000;
      else if (pid === guessedPlayerId) pts = 900;
      else pts = 800;
    } else {
      // Scenario C: Timeout (no player selected)
      if (pid === ramuduId) pts = 0;
      else if (pid === sitaId) pts = 1000;
      else pts = 800;
    }

    roundPoints.set(pid, pts);
  }

  return {
    ramuduId,
    sitaId,
    guessedPlayerId: guessedPlayerId || null,
    isTimeout,
    isCorrect,
    roundPoints,
  };
}

/**
 * Computes final leaderboard with equal ranks for equal cumulative scores.
 */
export function buildFinalLeaderboard(players) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  return sorted.map((p, index) => {
    const rank =
      index > 0 && p.totalScore === sorted[index - 1].totalScore
        ? sorted[index - 1]._rank
        : index + 1;
    p._rank = rank;
    return {
      rank,
      id: p.id,
      name: p.name,
      totalScore: p.totalScore,
      roundScores: p.roundScores,
    };
  });
}