<script>
  export let game;
  export let currentPlayer;
  export let sendAction;
  
  let questionText = '';
  let choices = ['', ''];
  let correctIndex = 0;
  let showForm = false;
  
  $: myTeam = game.teams[currentPlayer.teamId];
  $: myProposals = game.questionProposals[currentPlayer.teamId] || [];
  $: timeRemaining = Math.max(0, Math.floor((game.timerEndsAt - Date.now()) / 1000));
  $: minutes = Math.floor(timeRemaining / 60);
  $: seconds = timeRemaining % 60;
  $: mySkipVote = game.skipVotes?.teams[currentPlayer.teamId];
  $: hasVotedToSkip = mySkipVote?.skipVoters?.includes(currentPlayer.id);
  
  // Update timer
  let interval;
  $: if (game.status === 'submitting_questions') {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      timeRemaining = Math.max(0, Math.floor((game.timerEndsAt - Date.now()) / 1000));
    }, 1000);
  }
  
  function addChoice() {
    if (choices.length < game.config.maxChoices) {
      choices = [...choices, ''];
    }
  }
  
  function removeChoice(index) {
    if (choices.length > 2) {
      choices = choices.filter((_, i) => i !== index);
      if (correctIndex >= choices.length) {
        correctIndex = choices.length - 1;
      }
    }
  }
  
  async function submitQuestion() {
    if (!questionText.trim() || choices.some(c => !c.trim())) {
      return;
    }
    
    await sendAction('submit_question', {
      text: questionText.trim(),
      choices: choices.map(c => c.trim()),
      correctIndex
    });
    
    // Reset form
    questionText = '';
    choices = ['', ''];
    correctIndex = 0;
    showForm = false;
  }
  
  async function upvoteProposal(proposalId) {
    await sendAction('upvote_question', { proposalId });
  }
  
  async function toggleSkipVote() {
    await sendAction('vote_skip');
  }
  
  $: sortedProposals = [...myProposals].sort((a, b) => b.upvotes.length - a.upvotes.length);
  $: selectedCount = Math.min(game.config.questionsPerTeam, sortedProposals.length);
</script>

<div class="question-submission">
  <div class="header">
    <h2>Submit Questions - Team {myTeam.name}</h2>
    <div class="timer" class:urgent={timeRemaining < 60}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  </div>
  
  <div class="info-box">
    <p>Your team needs to submit <strong>{game.config.questionsPerTeam}</strong> questions.</p>
    <p>Team members can propose questions and vote on them. The top {game.config.questionsPerTeam} will be selected.</p>
    <p class="selected-count">
      Currently selected: <strong>{selectedCount}</strong> / {game.config.questionsPerTeam}
    </p>
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
  
  {#if !showForm}
    <button on:click={() => showForm = true} class="new-question-btn">
      + Propose New Question
    </button>
  {:else}
    <div class="question-form">
      <h3>New Question Proposal</h3>
      
      <label>
        Question Text
        <textarea 
          bind:value={questionText} 
          placeholder="Enter your question..."
          rows="3"
        ></textarea>
      </label>
      
      <div class="choices-section">
        <h4>Answer Choices</h4>
        {#each choices as choice, i}
          <div class="choice-row">
            <input 
              type="radio" 
              name="correct" 
              checked={correctIndex === i}
              on:change={() => correctIndex = i}
            />
            <input 
              type="text" 
              bind:value={choices[i]} 
              placeholder="Choice {i + 1}"
              class="choice-input"
            />
            {#if choices.length > 2}
              <button on:click={() => removeChoice(i)} class="remove-choice">×</button>
            {/if}
          </div>
        {/each}
        
        {#if choices.length < game.config.maxChoices}
          <button on:click={addChoice} class="add-choice-btn">+ Add Choice</button>
        {/if}
      </div>
      
      <div class="form-actions">
        <button 
          on:click={submitQuestion} 
          class="submit-btn"
          disabled={!questionText.trim() || choices.some(c => !c.trim())}
        >
          Submit Proposal
        </button>
        <button on:click={() => showForm = false} class="cancel-btn">Cancel</button>
      </div>
    </div>
  {/if}
  
  <div class="proposals-section">
    <h3>Team Proposals ({myProposals.length})</h3>
    
    {#if myProposals.length === 0}
      <p class="empty">No proposals yet. Be the first to propose a question!</p>
    {:else}
      <div class="proposals-list">
        {#each sortedProposals as proposal, index}
          <div 
            class="proposal-card"
            class:selected={index < game.config.questionsPerTeam}
          >
            <div class="proposal-header">
              <span class="rank">#{index + 1}</span>
              <span class="author">by {game.players[proposal.submittedBy].name}</span>
              {#if index < game.config.questionsPerTeam}
                <span class="selected-badge">✓ Selected</span>
              {/if}
            </div>
            
            <div class="question-text">{proposal.text}</div>
            
            <div class="choices-list">
              {#each proposal.choices as choice, i}
                <div class="choice-display" class:correct={i === proposal.correctIndex}>
                  {choice}
                  {#if i === proposal.correctIndex}
                    <span class="correct-indicator">✓ Correct</span>
                  {/if}
                </div>
              {/each}
            </div>
            
            <div class="proposal-footer">
              <button 
                on:click={() => upvoteProposal(proposal.id)}
                class="upvote-btn"
                class:voted={proposal.upvotes.includes(currentPlayer.id)}
              >
                👍 {proposal.upvotes.length}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .question-submission {
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
  
  .selected-count {
    font-weight: 600;
    color: #4ECDC4;
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
  
  .new-question-btn {
    width: 100%;
    padding: 1rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 1.5rem;
  }
  
  .new-question-btn:hover {
    background: #45b7b8;
  }
  
  .question-form {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }
  
  .question-form h3 {
    margin: 0 0 1.5rem 0;
    color: #333;
  }
  
  .question-form label {
    display: block;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }
  
  .question-form textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
    margin-top: 0.5rem;
    box-sizing: border-box;
  }
  
  .choices-section h4 {
    margin: 0 0 1rem 0;
    color: #555;
  }
  
  .choice-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .choice-row input[type="radio"] {
    cursor: pointer;
  }
  
  .choice-input {
    flex: 1;
    padding: 0.6rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .remove-choice {
    padding: 0.4rem 0.8rem;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.2rem;
  }
  
  .add-choice-btn {
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    border: 2px dashed #ddd;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    font-weight: 500;
    width: 100%;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .submit-btn, .cancel-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .submit-btn {
    background: #4ECDC4;
    color: white;
  }
  
  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .cancel-btn {
    background: #ddd;
    color: #333;
  }
  
  .proposals-section h3 {
    color: #333;
    margin-bottom: 1rem;
  }
  
  .empty {
    text-align: center;
    color: #999;
    padding: 2rem;
    background: white;
    border-radius: 8px;
  }
  
  .proposals-list {
    display: grid;
    gap: 1rem;
  }
  
  .proposal-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-left: 4px solid #ddd;
  }
  
  .proposal-card.selected {
    border-left-color: #4ECDC4;
    background: #f0fffe;
  }
  
  .proposal-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: #666;
  }
  
  .rank {
    font-weight: bold;
    color: #4ECDC4;
  }
  
  .selected-badge {
    margin-left: auto;
    background: #4ECDC4;
    color: white;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .question-text {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 1rem;
    color: #333;
  }
  
  .choices-list {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .choice-display {
    padding: 0.6rem;
    background: #f5f5f5;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .choice-display.correct {
    background: #d4edda;
    border-left: 3px solid #28a745;
  }
  
  .correct-indicator {
    color: #28a745;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .proposal-footer {
    display: flex;
    justify-content: flex-end;
  }
  
  .upvote-btn {
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    border: 2px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  
  .upvote-btn.voted {
    background: #4ECDC4;
    color: white;
    border-color: #4ECDC4;
  }
  
  .upvote-btn:hover {
    transform: scale(1.05);
  }
</style>