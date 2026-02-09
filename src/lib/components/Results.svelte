<script>
  export let game;
  export let currentPlayer;
  export let sendAction;
  
  $: sortedTeams = Object.values(game.teams).sort(
    (a, b) => game.results.finalScores[b.id] - game.results.finalScores[a.id]
  );
  
  $: winner = sortedTeams[0];
  
  /**
     * @type {{ fromTeam: string | number; anyoneAnswered: any; question: { text: any; choices: { [x: string]: any; }; correctIndex: number; }; teamAnswers: ArrayLike<any> | { [s: string]: any; }; } | null}
     */
  let selectedQuestion = null;
  
  /**
     * @param {{ fromTeam: string | number; anyoneAnswered: any; question: { text: any; choices: { [x: string]: any; }; correctIndex: number; }; teamAnswers: ArrayLike<any> | { [s: string]: any; }; } | null} question
     */
  function selectQuestion(question) {
    selectedQuestion = question;
  }

  async function replayGame() {
    await sendAction('replay');
  }
</script>

<div class="results">
  <div class="winner-section">
    <h1>🏆 Game Over! 🏆</h1>
    <div class="winner-card" style="border: 4px solid {winner.color}">
      <h2>{winner.name} Wins!</h2>
      <div class="winner-score">{game.results.finalScores[winner.id]} points</div>
    </div>
  </div>
  
  <div class="scoreboard">
    <h2>Final Scores</h2>
    <div class="scores-list">
      {#each sortedTeams as team, index}
        <div 
          class="score-card" 
          style="border-left: 4px solid {team.color}"
          class:my-team={team.id === currentPlayer.teamId}
        >
          <div class="rank">#{index + 1}</div>
          <div class="team-info">
            <h3>{team.name}</h3>
            <div class="team-members">
              {#each team.playerIds as playerId}
                <span class="member">{game.players[playerId].name}</span>
              {/each}
            </div>
          </div>
          <div class="score">{game.results.finalScores[team.id]}</div>
        </div>
      {/each}
    </div>
  </div>
  
  {#if game.adminId === currentPlayer.id}
    <div class="admin-actions">
      <button on:click={replayGame} class="replay-btn">
        🔄 Play Again (Same Players)
      </button>
      <p class="replay-info">This will reset the game and return to the lobby with the same players and teams.</p>
    </div>
  {/if}
  
  <div class="questions-review">
    <h2>Questions Review</h2>
    <p class="review-info">Click on any question to see detailed results</p>
    
    <div class="questions-grid">
      {#each game.results.questions as questionResult}
        {@const fromTeam = game.teams[questionResult.fromTeam]}
        <button
          on:click={() => selectQuestion(questionResult)}
          class="question-preview"
          style="border-left: 4px solid {fromTeam.color}"
          class:answered={questionResult.anyoneAnswered}
        >
          <div class="question-preview-header">
            <span class="team-badge" style="background: {fromTeam.color}20; color: {fromTeam.color}">
              {fromTeam.name}
            </span>
            {#if questionResult.anyoneAnswered}
              <span class="status-badge answered">✓ Answered</span>
            {:else}
              <span class="status-badge unanswered">✗ Unanswered</span>
            {/if}
          </div>
          <div class="question-preview-text">{questionResult.question.text}</div>
        </button>
      {/each}
    </div>
  </div>
  
  {#if selectedQuestion}
    {@const fromTeam = game.teams[selectedQuestion.fromTeam]}
    <div class="modal-overlay" on:click={() => selectedQuestion = null} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedQuestion = null)} tabindex="0" role="button">
      <div class="modal" on:click|stopPropagation style="border-top: 4px solid {fromTeam.color}" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedQuestion = null)} tabindex="0" role="button">
        <button class="close-btn" on:click={() => selectedQuestion = null}>x</button>
        
        <div class="modal-header">
          <span class="team-badge" style="background: {fromTeam.color}20; color: {fromTeam.color}">
            {fromTeam.name}
          </span>
          {#if selectedQuestion.anyoneAnswered}
            <span class="status-badge answered">✓ At least one team answered correctly</span>
          {:else}
            <span class="status-badge unanswered">✗ No team answered correctly</span>
          {/if}
        </div>
        
        <h3 class="modal-question">{selectedQuestion.question.text}</h3>
        
        <div class="modal-choices">
          {#each selectedQuestion.question.choices as choice, i}
            <div 
              class="modal-choice"
              class:correct={i === selectedQuestion.question.correctIndex}
            >
              <span class="choice-letter">{String.fromCharCode(65 + i)}</span>
              <span class="choice-text">{choice}</span>
              {#if i === selectedQuestion.question.correctIndex}
                <span class="correct-badge">✓ Correct Answer</span>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="team-answers">
          <h4>Team Answers</h4>
          {#each Object.entries(selectedQuestion.teamAnswers) as [teamId, answer]}
            {@const team = game.teams[teamId]}
            <div class="team-answer-row">
              <span class="team-name" style="color: {team.color}">{team.name}</span>
              {#if answer.choiceIndex !== null}
                <span class="team-answer-choice">
                  {String.fromCharCode(65 + answer.choiceIndex)}: {selectedQuestion.question.choices[answer.choiceIndex]}
                </span>
                {#if answer.correct}
                  <span class="result correct">✓ Correct</span>
                {:else}
                  <span class="result incorrect">✗ Wrong</span>
                {/if}
              {:else}
                <span class="team-answer-choice no-answer">No answer submitted</span>
                <span class="result incorrect">✗</span>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="scoring-info">
          <h4>Points Awarded</h4>
          <div class="scoring-breakdown">
            <div class="score-item">
              <strong>{fromTeam.name}:</strong>
              {#if selectedQuestion.anyoneAnswered}
                +{game.config.scoring.questionAnswered} (question answered)
              {:else}
                {game.config.scoring.questionUnanswered} (question unanswered)
              {/if}
            </div>
            {#each Object.entries(selectedQuestion.teamAnswers) as [teamId, answer]}
              {#if answer.correct}
                <div class="score-item">
                  <strong>{game.teams[teamId].name}:</strong> +{game.config.scoring.correctAnswer} (correct answer)
                </div>
              {/if}
            {/each}
          </div>
        </div>
    </div>
</div>
  {/if}
  
  <div class="actions">
    <a href="/" class="home-btn">Back to Home</a>
  </div>
</div>

<style>
  .results {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .winner-section {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .winner-section h1 {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
    color: #333;
  }
  
  .winner-card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    max-width: 500px;
    margin: 0 auto;
  }
  
  .winner-card h2 {
    font-size: 2rem;
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  .winner-score {
    font-size: 3rem;
    font-weight: bold;
    color: #4ECDC4;
  }
  
  .scoreboard {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  
  .scoreboard h2 {
    margin: 0 0 1.5rem 0;
    color: #333;
  }
  
  .scores-list {
    display: grid;
    gap: 1rem;
  }
  
  .score-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 8px;
  }
  
  .score-card.my-team {
    background: #d4f4f1;
  }
  
  .rank {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4ECDC4;
    min-width: 50px;
  }
  
  .team-info {
    flex: 1;
  }
  
  .team-info h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .team-members {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .member {
    background: white;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.85rem;
    color: #666;
  }
  
  .score {
    font-size: 2rem;
    font-weight: bold;
    color: #333;
  }
  
  .questions-review {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  
  .questions-review h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .review-info {
    color: #666;
    margin: 0 0 1.5rem 0;
  }
  
  .questions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .question-preview {
    background: #f9f9f9;
    padding: 1rem;
    border: none;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .question-preview:hover {
    background: #f0f0f0;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
  .question-preview.answered {
    background: #d4edda;
  }
  
  .question-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .team-badge {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .status-badge {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .status-badge.answered {
    background: #28a745;
    color: white;
  }
  
  .status-badge.unanswered {
    background: #dc3545;
    color: white;
  }
  
  .question-preview-text {
    font-size: 0.95rem;
    color: #333;
    line-height: 1.4;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
    border: none;  
    cursor: pointer;
}
  
  .modal {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
  }
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #999;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .modal-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .modal-question {
    font-size: 1.3rem;
    color: #333;
    margin-bottom: 1.5rem;
  }
  
  .modal-choices {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  
  .modal-choice {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .modal-choice.correct {
    background: #d4edda;
    border: 2px solid #28a745;
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
  
  .correct-badge {
    background: #28a745;
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  .team-answers h4 {
    margin: 0 0 1rem 0;
    color: #555;
  }
  
  .team-answer-row {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: #f9f9f9;
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }
  
  .team-name {
    font-weight: 600;
  }
  
  .team-answer-choice {
    color: #666;
  }
  
  .no-answer {
    font-style: italic;
    color: #999;
  }
  
  .result {
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
  
  .result.correct {
    color: #28a745;
  }
  
  .result.incorrect {
    color: #dc3545;
  }
  
  .scoring-info {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #f0f0f0;
  }
  
  .scoring-info h4 {
    margin: 0 0 1rem 0;
    color: #555;
  }
  
  .scoring-breakdown {
    display: grid;
    gap: 0.5rem;
  }
  
  .score-item {
    padding: 0.5rem;
    background: #f9f9f9;
    border-radius: 4px;
  }
  
  .actions {
    text-align: center;
    padding: 2rem 0;
  }
  
  .home-btn {
    display: inline-block;
    padding: 1rem 2rem;
    background: #4ECDC4;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .home-btn:hover {
    background: #45b7b8;
  }

  /* Add after .scoreboard styles */
  
  .admin-actions {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .replay-btn {
    padding: 1rem 2rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .replay-btn:hover {
    background: #45b7b8;
    transform: scale(1.05);
  }
  
  .replay-info {
    margin: 1rem 0 0 0;
    color: #666;
    font-size: 0.95rem;
  }
</style>