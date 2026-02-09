import { getGame } from '$lib/server/gameStore.js';
import { error } from '@sveltejs/kit';

export function load({ params, cookies }) {
  const { gameId } = params;
  
  const game = getGame(gameId);
  if (!game) {
    throw error(404, 'Game not found');
  }
  
  const playerId = cookies.get(`player_${gameId}`);
  
  return {
    gameId,
    playerId
  };
}