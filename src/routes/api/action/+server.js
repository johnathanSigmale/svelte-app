import { json } from '@sveltejs/kit';
import { getGame, switchTeam, updateConfig } from '$lib/server/gameStore.js';
import {
  startGame,
  submitQuestionProposal,
  upvoteQuestionProposal,
  submitAnswerProposal,
  upvoteAnswerProposal,
  voteToSkip,
  replay
} from '$lib/server/gameLogic.js';

export async function POST({ request, cookies }) {
  const { gameId, action, data } = await request.json();
  
  const playerId = cookies.get(`player_${gameId}`);
  if (!playerId) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const game = getGame(gameId);
  if (!game) {
    return json({ error: 'Game not found' }, { status: 404 });
  }
  
  let result;
  
  switch (action) {
    case 'switch_team':
      result = switchTeam(gameId, playerId, data.teamId);
      break;
      
    case 'update_config':
      result = updateConfig(gameId, playerId, data.config);
      break;
      
    case 'start_game':
      result = startGame(gameId, playerId);
      break;
      
    case 'submit_question':
      result = submitQuestionProposal(gameId, playerId, data);
      break;
      
    case 'upvote_question':
      result = upvoteQuestionProposal(gameId, playerId, data.proposalId);
      break;
      
    case 'submit_answer':
      result = submitAnswerProposal(gameId, playerId, data.questionId, data.choiceIndex);
      break;
      
    case 'upvote_answer':
      result = upvoteAnswerProposal(gameId, playerId, data.questionId, data.proposalId);
      break;
      
    case 'vote_skip':
      result = voteToSkip(gameId, playerId);
      break;
      
    case 'replay':
      result = replay(gameId, playerId);
      break;
      
    default:
      return json({ error: 'Unknown action' }, { status: 400 });
  }
  
  if (result && result.success === false) {
    return json({ error: result.error || 'Action failed' }, { status: 400 });
  }
  
  return json({ success: true, result });
}