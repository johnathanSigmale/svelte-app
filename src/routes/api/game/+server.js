import { json } from '@sveltejs/kit';
import { createGame } from '$lib/server/gameStore.js';

export async function POST({ request, cookies }) {
  const { playerName } = await request.json();
  
  if (!playerName || playerName.trim().length === 0) {
    return json({ error: 'Player name required' }, { status: 400 });
  }
  
  const { gameId, playerId } = createGame(playerName.trim());
  
  // Store playerId in cookie
  cookies.set(`player_${gameId}`, playerId, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  return json({ gameId, playerId });
}