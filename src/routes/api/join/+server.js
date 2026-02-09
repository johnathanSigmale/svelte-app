import { json } from '@sveltejs/kit';
import { joinGame } from '$lib/server/gameStore.js';

export async function POST({ request, cookies }) {
  const { gameId, playerName } = await request.json();
  
  if (!gameId || !playerName || playerName.trim().length === 0) {
    return json({ error: 'Game ID and player name required' }, { status: 400 });
  }
  
  const result = joinGame(gameId, playerName.trim());
  
  if (!result) {
    return json({ error: 'Game not found or already started' }, { status: 404 });
  }
  
  // Store playerId in cookie
  cookies.set(`player_${gameId}`, result.playerId, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24
  });
  
  return json({ playerId: result.playerId });
}