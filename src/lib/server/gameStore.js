import { nanoid } from 'nanoid';
import { broadcastGameUpdate } from './eventEmitter.js';

const games = new Map();

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

export function createGame(adminName) {
  const gameId = nanoid(8);
  const playerId = nanoid();
  
  const game = {
    id: gameId,
    adminId: playerId,
    status: 'lobby',
    createdAt: Date.now(),
    
    config: {
      questionsPerTeam: 6,
      questionsPerTurn: 2,
      questionSubmitTimer: 300,
      answerTimer: 60,
      skipMemberMajority: 0.67,
      skipTeamMajority: 0.75,
      maxChoices: 4,
      scoring: {
        correctAnswer: 10,           // Points for answering correctly
        questionAnswered: 5,         // Max points for question in sweet spot (33%-66%)
        questionUnanswered: -3       // Penalty for too easy (<33%) or too hard (>66%)
      }
    },
    
    players: {},
    teams: {},
    questionProposals: {},
    questions: {},
    currentTurn: null,
    answerProposals: {},
    answers: {},
    results: null
  };
  
  // Add admin as first player
  addPlayerToGame(game, playerId, adminName);
  
  games.set(gameId, game);
  return { gameId, playerId };
}

export function joinGame(gameId, playerName) {
  const game = games.get(gameId);
  if (!game) return null;
  if (game.status !== 'lobby') return null;
  
  const playerId = nanoid();
  addPlayerToGame(game, playerId, playerName);
  
  // Broadcast the update
  broadcastGameUpdate(gameId, game);
  
  return { playerId };
}

function addPlayerToGame(game, playerId, playerName) {
  // Create a new team for this player
  const teamId = nanoid(6);
  const teamColor = COLORS[Object.keys(game.teams).length % COLORS.length];
  
  game.teams[teamId] = {
    id: teamId,
    name: `Team ${Object.keys(game.teams).length + 1}`,
    color: teamColor,
    playerIds: [],
    score: 0
  };
  
  game.players[playerId] = {
    id: playerId,
    name: playerName,
    teamId: null // Not assigned yet
  };
}

export function switchTeam(gameId, playerId, newTeamId) {
  const game = games.get(gameId);
  if (!game || game.status !== 'lobby') return false;
  
  const player = game.players[playerId];
  if (!player) return false;
  
  // Remove from old team
  if (player.teamId) {
    const oldTeam = game.teams[player.teamId];
    oldTeam.playerIds = oldTeam.playerIds.filter(id => id !== playerId);
  }
  
  // Add to new team
  player.teamId = newTeamId;
  game.teams[newTeamId].playerIds.push(playerId);
  
  // Broadcast the update
  broadcastGameUpdate(gameId, game);
  
  return true;
}

export function updateConfig(gameId, playerId, newConfig) {
  const game = games.get(gameId);
  if (!game || game.adminId !== playerId || game.status !== 'lobby') {
    return false;
  }
  
  game.config = { ...game.config, ...newConfig };
  
  // Broadcast the update
  broadcastGameUpdate(gameId, game);
  
  return true;
}

export function getGame(gameId) {
  return games.get(gameId);
}

export function deleteGame(gameId) {
  games.delete(gameId);
}