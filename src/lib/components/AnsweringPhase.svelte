<script>
  export let game;
  export let currentPlayer;
  export let sendAction;
  let turn = 0
  
  let timerEndsAt = Date.now() + (game.currentTurn.timerDuration * 1000);
  
  $: if (turn != game.currentTurn.number) {
    timerEndsAt = Date.now() + (game.currentTurn.timerDuration * 1000);
    turn = game.currentTurn.number;
  }
  $: myTeam = game.teams[currentPlayer.teamId];
  $: timeRemaining = Math.max(0, Math.floor((timerEndsAt - Date.now()) / 1000));
  $: minutes = Math.floor(timeRemaining / 60);
  $: seconds = timeRemaining % 60;
  $: mySkipVote = game.skipVotes?.teams[currentPlayer.teamId];
  $: hasVotedToSkip = mySkipVote?.skipVoters?.includes(currentPlayer.id);
  
  // Get questions with full data
  $: questionsToAnswer = game.currentTurn.questionsInPlay
    .filter(q => q.fromTeam !== currentPlayer.teamId)
    .map(q => {
      const question = game.questions[q.fromTeam].find(qu => qu.id === q.questionId);
      return { ...question, fromTeam: q.fromTeam };
    });
  
  // Update timer
  let interval;
  $: if (game.status === 'answering_turn') {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      timeRemaining = Math.max(0, Math.floor((timerEndsAt - Date.now()) / 1000));
    }, 1000);
  }
  
  async function submitAnswer(questionId, choiceIndex) {
    await sendAction('submit_answer', { questionId, choiceIndex });
  }
  
  async function upvoteAnswer(questionId, proposalId) {
    await sendAction('upvote_answer', { questionId, proposalId });
  }
  
  async function toggleSkipVote() {
    await sendAction('vote_skip');
  }
  
  function getProposalsForQuestion(questionId) {
    return game.answerProposals[currentPlayer.teamId]?.[questionId] || [];
  }
  
  function getTopAnswer(questionId) {
    const proposals = getProposalsForQuestion(questionId);
    if (proposals.length === 0) return null;
    const sorted = [...proposals].sort((a, b) => b.upvotes.length - a.upvotes.length);
    return sorted[0];
  }
</script>

<div class="answering-phase">
  <div class="header">
    <h2>Turn {game.currentTurn.number} - Answer Questions</h2>
    <div class="timer" class:urgent={timeRemaining < 30}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  </div>
  
  <div class="info-box">
    <p>Answer the questions from other teams. Team members can propose answers and vote on them.</p>
    <p>You cannot answer your own team's questions.</p>
  </div>
  
  <div class="skip-section">
    <button 
      on:click={toggleSkipVote} 
      class="skip-btn"
      class:active={hasVotedToSkip}
    >
      {hasVotedToSkip ? '✓ Voted to Skip' : 'Vote to Skip Timer'}
    </button>
    <p class="skip-info">
      {mySkipVote?.skipVoters?.length || 0} / {myTeam.playerIds.length} team members voted
      {#if mySkipVote?.voted}
        <span class="team-ready">✓ Team ready!</span>
      {/if}
    </p>
  </div>
  
  <div class="questions-list">
    {#each questionsToAnswer as question}
      {@const proposals = getProposalsForQuestion(question.id)}
      {@const topAnswer = getTopAnswer(question.id)}
      {@const fromTeam = game.teams[question.fromTeam]}
      
      <div class="question-card" style="border-left: 4px solid {fromTeam.color}">
        <div class="question-header">
          <span class="team-badge" style="background: {fromTeam.color}20; color: {fromTeam.color}">
            {fromTeam.name}
          </span>
        </div>
        
        <div class="question-text">{question.text}</div>
        
        <div class="choices-section">
          {#each question.choices as choice, i}
            <button
              on:click={() => submitAnswer(question.id, i)}
              class="choice-btn"
              class:selected={topAnswer?.choiceIndex === i}
            >
              <span class="choice-letter">{String.fromCharCode(65 + i)}</span>
              <span class="choice-text">{choice}</span>
              {#if topAnswer?.choiceIndex === i}
                <span class="votes-badge">
                  👍 {topAnswer.upvotes.length}
                </span>
              {/if}
            </button>
          {/each}
        </div>
        
        {#if proposals.length > 0}
          <div class="proposals-summary">
            <h4>Team Proposals</h4>
            <div class="proposal-list">
              {#each proposals.sort((a, b) => b.upvotes.length - a.upvotes.length) as proposal}
                <div class="proposal-item">
                  <button
                    on:click={() => upvoteAnswer(question.id, proposal.id)}
                    class="proposal-vote-btn"
                    class:voted={proposal.upvotes.includes(currentPlayer.id)}
                  >
                    <span class="choice-letter">{String.fromCharCode(65 + proposal.choiceIndex)}</span>
                    <span class="proposal-by">by {game.players[proposal.submittedBy].name}</span>
                    <span class="votes">👍 {proposal.upvotes.length}</span>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .answering-phase {
    max-width: 900px;
    margin: 0 auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }
  
  .header h2 {
    margin: 0;
    color: #333;
  }
  
  .timer {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4ECDC4;
  }
  
  .timer.urgent {
    color: #ff6b6b;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .info-box {
    background: #e3f2fd;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    border-left: 4px solid #4ECDC4;
  }
  
  .info-box p {
    margin: 0.5rem 0;
    color: #333;
  }
  
  .skip-section {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .skip-btn {
    padding: 0.75rem 1.5rem;
    background: #ddd;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  
  .skip-btn.active {
    background: #4ECDC4;
    color: white;
  }
  
  .skip-info {
    margin: 0.5rem 0 0 0;
    color: #666;
    font-size: 0.9rem;
  }
  
  .team-ready {
    color: #4ECDC4;
    font-weight: 600;
    margin-left: 0.5rem;
  }
  
  .questions-list {
    display: grid;
    gap: 1.5rem;
  }
  
  .question-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .question-header {
    margin-bottom: 1rem;
  }
  
  .team-badge {
    display: inline-block;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .question-text {
    font-size: 1.2rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    color: #333;
  }
  
  .choices-section {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .choice-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border: 2px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }
  
  .choice-btn:hover {
    background: #e8e8e8;
    border-color: #4ECDC4;
  }
  
  .choice-btn.selected {
    background: #d4f4f1;
    border-color: #4ECDC4;
    font-weight: 500;
  }
  
  .choice-letter {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: white;
    border-radius: 50%;
    font-weight: bold;
    color: #4ECDC4;
    flex-shrink: 0;
  }
  
  .choice-text {
    flex: 1;
  }
  
  .votes-badge {
    background: #4ECDC4;
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  .proposals-summary {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #f0f0f0;
  }
  
  .proposals-summary h4 {
    margin: 0 0 1rem 0;
    color: #555;
    font-size: 0.95rem;
  }
  
  .proposal-list {
    display: grid;
    gap: 0.5rem;
  }
  
  .proposal-vote-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #fafafa;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .proposal-vote-btn:hover {
    background: #f0f0f0;
  }
  
  .proposal-vote-btn.voted {
    background: #d4f4f1;
    border-color: #4ECDC4;
  }
  
  .proposal-by {
    flex: 1;
    color: #666;
    font-size: 0.9rem;
  }
  
  .votes {
    font-weight: 600;
    color: #4ECDC4;
  }
</style>