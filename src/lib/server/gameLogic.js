import { getGame } from './gameStore.js';
import { broadcastGameUpdate } from './eventEmitter.js';

export function startGame(gameId, playerId) {
  const game = getGame(gameId);
  if (!game || game.adminId !== playerId || game.status !== 'lobby') {
    return { success: false, error: 'Cannot start game' };
  }
  
  // Check at least 2 players
  const playerCount = Object.keys(game.players).length;
  if (playerCount < 2) {
    return { success: false, error: 'Need at least 2 players' };
  }
  
  // Check all players are in teams
  const playersWithoutTeams = Object.values(game.players).filter(p => !p.teamId);
  if (playersWithoutTeams.length > 0) {
    return { success: false, error: 'All players must join a team' };
  }
  
  // Remove empty teams
  const emptyTeamIds = Object.keys(game.teams).filter(
    teamId => game.teams[teamId].playerIds.length === 0
  );
  emptyTeamIds.forEach(teamId => delete game.teams[teamId]);
  
  // Initialize question proposals for each team
  Object.keys(game.teams).forEach(teamId => {
    game.questionProposals[teamId] = [];
  });
  
  game.status = 'submitting_questions';
  game.timerStartedAt = Date.now(); // Add this
  game.timerDuration = game.config.questionSubmitTimer; // Add this
  game.timerEndsAt = Date.now() + (game.config.questionSubmitTimer * 1000);
  
  broadcastGameUpdate(gameId, game);
  
  // Auto-end question submission after timer
  setTimeout(() => endQuestionSubmission(gameId), game.config.questionSubmitTimer * 1000);
  
  return { success: true };
}

export function submitQuestionProposal(gameId, playerId, questionData) {
  const game = getGame(gameId);
  if (!game || game.status !== 'submitting_questions') {
    return { success: false, error: 'Not in question submission phase' };
  }
  
  const player = game.players[playerId];
  if (!player || !player.teamId) {
    return { success: false, error: 'Player not in a team' };
  }
  
  const { text, choices, correctIndex } = questionData;
  
  // Validation
  if (!text || !choices || choices.length < 2 || choices.length > game.config.maxChoices) {
    return { success: false, error: 'Invalid question format' };
  }
  
  if (correctIndex < 0 || correctIndex >= choices.length) {
    return { success: false, error: 'Invalid correct answer index' };
  }
  
  const proposalId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const proposal = {
    id: proposalId,
    text: text.trim(),
    choices: choices.map(c => c.trim()),
    correctIndex,
    submittedBy: playerId,
    upvotes: new Set([playerId]) // Auto-upvote own proposal
  };
  
  game.questionProposals[player.teamId].push(proposal);
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true, proposalId };
}

export function upvoteQuestionProposal(gameId, playerId, proposalId) {
  const game = getGame(gameId);
  if (!game || game.status !== 'submitting_questions') {
    return { success: false };
  }
  
  const player = game.players[playerId];
  if (!player || !player.teamId) {
    return { success: false };
  }
  
  const proposals = game.questionProposals[player.teamId];
  const proposal = proposals.find(p => p.id === proposalId);
  
  if (!proposal) {
    return { success: false };
  }
  
  // Toggle upvote
  if (proposal.upvotes.has(playerId)) {
    proposal.upvotes.delete(playerId);
  } else {
    proposal.upvotes.add(playerId);
  }
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true };
}

export function voteToSkip(gameId, playerId) {
  const game = getGame(gameId);
  if (!game || (game.status !== 'submitting_questions' && game.status !== 'answering_turn')) {
    return { success: false };
  }
  
  const player = game.players[playerId];
  if (!player || !player.teamId) {
    return { success: false };
  }
  
  if (!game.skipVotes) {
    game.skipVotes = { teams: {} };
    Object.keys(game.teams).forEach(teamId => {
      game.skipVotes.teams[teamId] = { voted: false, skipVoters: new Set() };
    });
  }
  
  const teamVote = game.skipVotes.teams[player.teamId];
  
  // Toggle skip vote
  if (teamVote.skipVoters.has(playerId)) {
    teamVote.skipVoters.delete(playerId);
  } else {
    teamVote.skipVoters.add(playerId);
  }
  
  // Check if team reached majority
  const team = game.teams[player.teamId];
  const votesNeeded = Math.ceil(team.playerIds.length * game.config.skipMemberMajority);
  teamVote.voted = teamVote.skipVoters.size >= votesNeeded;
  
  // Check if enough teams voted to skip
  const teamsVotedToSkip = Object.values(game.skipVotes.teams).filter(tv => tv.voted).length;
  const teamsNeeded = Math.ceil(Object.keys(game.teams).length * game.config.skipTeamMajority);
  
  if (teamsVotedToSkip >= teamsNeeded) {
    // Skip timer
    if (game.status === 'submitting_questions') {
      endQuestionSubmission(gameId);
    } else if (game.status === 'answering_turn') {
      endAnsweringPhase(gameId, game.currentTurn.number);
    }
  }
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true };
}

export function endQuestionSubmission(gameId) {
  const game = getGame(gameId);
  if (!game || game.status !== 'submitting_questions') {
    return;
  }
  
  // Select top voted questions for each team
  Object.keys(game.teams).forEach(teamId => {
    const proposals = game.questionProposals[teamId];
    
    // Sort by upvotes (descending)
    const sorted = proposals.sort((a, b) => b.upvotes.size - a.upvotes.size);
    
    // Take top questionsPerTeam
    let selectedQuestions = sorted
      .slice(0, game.config.questionsPerTeam)
      .map(p => ({
        id: p.id,
        text: p.text,
        choices: p.choices,
        correctIndex: p.correctIndex
      }));
    
    // Fill with default questions if not enough
    while (selectedQuestions.length < game.config.questionsPerTeam) {
      const questionNum = selectedQuestions.length + 1;
      selectedQuestions.push({
        id: `default_${teamId}_${questionNum}`,
        text: `Default Question ${questionNum} for ${game.teams[teamId].name}`,
        choices: ['Correct Answer'],
        correctIndex: 0
      });
    }
    
    game.questions[teamId] = selectedQuestions;
    
    // Shuffle questions
    shuffleArray(game.questions[teamId]);
  });
  
  // Start first turn
  startNextTurn(gameId);
}

function startNextTurn(gameId) {
  const game = getGame(gameId);
  
  const turnNumber = game.currentTurn ? game.currentTurn.number + 1 : 1;
  const totalTurns = Math.ceil(game.config.questionsPerTeam / game.config.questionsPerTurn);
  
  if (turnNumber > totalTurns) {
    // Game over
    finishGame(gameId);
    return;
  }
  
  // Pick m questions from each team
  const questionsInPlay = [];
  const startIdx = (turnNumber - 1) * game.config.questionsPerTurn;
  
  Object.keys(game.teams).forEach(teamId => {
    const teamQuestions = game.questions[teamId].slice(
      startIdx,
      startIdx + game.config.questionsPerTurn
    );
    
    teamQuestions.forEach(q => {
      questionsInPlay.push({ questionId: q.id, fromTeam: teamId });
    });
  });
  
  // Shuffle questions for this turn
  shuffleArray(questionsInPlay);
  
  game.currentTurn = {
    number: turnNumber,
    questionsInPlay,
    timerStartedAt: Date.now(), // Add this
    timerDuration: game.config.answerTimer, // Add this
    timerEndsAt: Date.now() + (game.config.answerTimer * 1000)
  };
  
  game.status = 'answering_turn';
  game.skipVotes = { teams: {} };
  Object.keys(game.teams).forEach(teamId => {
    game.skipVotes.teams[teamId] = { voted: false, skipVoters: new Set() };
  });
  
  // Initialize answer proposals
  game.answerProposals = {};
  Object.keys(game.teams).forEach(teamId => {
    game.answerProposals[teamId] = {};
  });
  
  broadcastGameUpdate(gameId, game);
  
  // Auto-end after timer
  let turn = game.currentTurn.number;
  setTimeout(() => endAnsweringPhase(gameId, turn), game.config.answerTimer * 1000);
}

export function submitAnswerProposal(gameId, playerId, questionId, choiceIndex) {
  const game = getGame(gameId);
  if (!game || game.status !== 'answering_turn') {
    return { success: false };
  }
  
  const player = game.players[playerId];
  if (!player || !player.teamId) {
    return { success: false };
  }
  
  const proposalId = `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (!game.answerProposals[player.teamId][questionId]) {
    game.answerProposals[player.teamId][questionId] = [];
  }
  
  const proposal = {
    id: proposalId,
    choiceIndex,
    submittedBy: playerId,
    upvotes: new Set([playerId])
  };
  
  game.answerProposals[player.teamId][questionId].push(proposal);
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true, proposalId };
}

export function upvoteAnswerProposal(gameId, playerId, questionId, proposalId) {
  const game = getGame(gameId);
  if (!game || game.status !== 'answering_turn') {
    return { success: false };
  }
  
  const player = game.players[playerId];
  if (!player || !player.teamId) {
    return { success: false };
  }
  
  const proposals = game.answerProposals[player.teamId][questionId];
  if (!proposals) {
    return { success: false };
  }
  
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return { success: false };
  }
  
  // Toggle upvote
  if (proposal.upvotes.has(playerId)) {
    proposal.upvotes.delete(playerId);
  } else {
    proposal.upvotes.add(playerId);
  }
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true };
}

function endAnsweringPhase(gameId, turn) {
  const game = getGame(gameId);
  if (!game || game.status !== 'answering_turn' || game.currentTurn.number != turn) {
    return;
  }

  // Select top voted answer for each team/question
  Object.keys(game.teams).forEach(teamId => {
    if (!game.answers[teamId]) {
      game.answers[teamId] = {};
    }
    
    game.currentTurn.questionsInPlay.forEach(({ questionId, fromTeam }) => {
      // Don't answer own questions
      if (fromTeam === teamId) return;
      
      const proposals = game.answerProposals[teamId][questionId] || [];
      
      if (proposals.length === 0) {
        game.answers[teamId][questionId] = null; // No answer
      } else {
        // Get top voted
        const sorted = proposals.sort((a, b) => b.upvotes.size - a.upvotes.size);
        game.answers[teamId][questionId] = sorted[0].choiceIndex;
      }
    });
  });
  
  // Start next turn
  startNextTurn(gameId);
}

function finishGame(gameId) {
  const game = getGame(gameId);
  
  game.status = 'finished';
  
  // Calculate scores
  const results = {
    questions: [],
    finalScores: {}
  };
  
  // Initialize scores
  Object.keys(game.teams).forEach(teamId => {
    results.finalScores[teamId] = 0;
  });
  
  // Process each question
Object.keys(game.teams).forEach(teamId => {
  game.questions[teamId].forEach(question => {
    const questionResult = {
      question,
      fromTeam: teamId,
      teamAnswers: {},
      correctCount: 0,
      totalAnswering: 0
    };
    
    // Check each team's answer
    Object.keys(game.teams).forEach(answeringTeamId => {
      if (answeringTeamId === teamId) return; // Don't answer own questions
      
      questionResult.totalAnswering++;
      const answer = game.answers[answeringTeamId]?.[question.id];
      
      if (answer !== null && answer !== undefined) {
        const correct = answer === question.correctIndex;
        
        questionResult.teamAnswers[answeringTeamId] = {
          choiceIndex: answer,
          correct
        };
        
        if (correct) {
          questionResult.correctCount++;
          // Award points for correct answer
          results.finalScores[answeringTeamId] += game.config.scoring.correctAnswer;
        }
      } else {
        questionResult.teamAnswers[answeringTeamId] = {
          choiceIndex: null,
          correct: false
        };
      }
    });
    
    // Calculate Gaussian distribution score for question-submitting team
    const correctPercentage = questionResult.totalAnswering > 0 
      ? questionResult.correctCount / questionResult.totalAnswering 
      : 0;
    
    let questionPoints;
    if (correctPercentage >= 0.33 && correctPercentage <= 0.66) {
      // Sweet spot: 33% to 66% - award points
      // Scale from questionAnswered at edges to max at 50%
      const distanceFrom50 = Math.abs(correctPercentage - 0.5);
      const maxDistance = 0.16; // Distance from 50% to edge (33% or 66%)
      const scoreMultiplier = 1 - (distanceFrom50 / maxDistance) * 0.5; // 0.5 to 1.0
      questionPoints = Math.round(game.config.scoring.questionAnswered * scoreMultiplier);
    } else if (correctPercentage < 0.33) {
      // Too easy - negative points
      questionPoints = game.config.scoring.questionUnanswered;
    } else {
      // Too hard (> 66% got it wrong) - negative points
      questionPoints = game.config.scoring.questionUnanswered;
    }
    
    results.finalScores[teamId] += questionPoints;
    questionResult.questionPoints = questionPoints;
    questionResult.correctPercentage = correctPercentage;
    
    results.questions.push(questionResult);
    });
  });
  
  game.results = results;
  
  broadcastGameUpdate(gameId, game);
}

// ... existing code ...

export function replay(gameId, playerId) {
  const game = getGame(gameId);
  if (!game || game.adminId !== playerId || game.status !== 'finished') {
    return { success: false, error: 'Cannot replay game' };
  }
  
  // Reset game state but keep players and teams
  game.status = 'lobby';
  game.questionProposals = {};
  game.questions = {};
  game.currentTurn = null;
  game.answerProposals = {};
  game.answers = {};
  game.results = null;
  game.skipVotes = null;
  
  // Reset team scores
  Object.values(game.teams).forEach(team => {
    team.score = 0;
  });
  
  broadcastGameUpdate(gameId, game);
  
  return { success: true };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}