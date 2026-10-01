// Shared constants for SusWord

export const GAME_STATES = {
  HOME: 'HOME',           // Initial screen (Create/Join)
  LOBBY: 'LOBBY',         // Waiting for players
  REVEAL: 'REVEAL',       // Showing secret words/roles
  CLUE_ROUND: 'CLUE_ROUND', // Players giving clues (turn-based)
  VOTING: 'VOTING',       // Selecting the imposter
  ROUND_CONTINUE: 'ROUND_CONTINUE', // Mid-game round results (tie or civilian eliminated)
  RESULT: 'RESULT',       // Final outcome reveal
};

export const PLAYER_ROLES = {
  CIVILIAN: 'CIVILIAN',
  IMPOSTER: 'IMPOSTER',
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export const ROOM_CODE_LENGTH = 4;
