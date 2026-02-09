<script>
  export let game;
  export let currentPlayer;
  export let isAdmin;
  export let sendAction;
  
  let editingConfig = false;
  let configForm = { ...game.config };
  
  $: teamsArray = Object.values(game.teams);
  $: playersArray = Object.values(game.players);
  
  async function switchTeam(teamId) {
    await sendAction('switch_team', { teamId });
  }
  
  async function startGame() {
    await sendAction('start_game');
  }
  
  async function saveConfig() {
    await sendAction('update_config', { config: configForm });
    editingConfig = false;
  }
  
  function copyGameId() {
    navigator.clipboard.writeText(game.id);
  }
</script>

<div class="lobby">
  <div class="share-section">
    <h2>Share Game ID</h2>
    <div class="game-id-box">
      <span class="game-id">{game.id}</span>
      <button on:click={copyGameId} class="copy-btn">Copy</button>
    </div>
    <p class="help-text">Share this ID with your friends to join the game</p>
  </div>
  
  <div class="teams-section">
    <h2>Teams ({teamsArray.length})</h2>
    <div class="teams-grid">
      {#each teamsArray as team}
        <div class="team-card" style="border-left: 4px solid {team.color}">
          <h3>{team.name}</h3>
          <div class="team-players">
            {#if team.playerIds.length === 0}
              <em class="empty">No players yet</em>
            {:else}
              {#each team.playerIds as playerId}
                <div class="player-chip" style="background: {team.color}20">
                  {game.players[playerId].name}
                  {#if playerId === game.adminId}
                    <span class="admin-badge">👑</span>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
          {#if currentPlayer.teamId !== team.id}
            <button on:click={() => switchTeam(team.id)} class="join-btn">
              Join Team
            </button>
          {:else}
            <div class="current-team">✓ Your team</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  
  {#if isAdmin}
    <div class="admin-section">
      <h2>Game Settings</h2>
      
      {#if !editingConfig}
        <div class="config-display">
          <div class="config-item">
            <strong>Questions per team:</strong> {game.config.questionsPerTeam}
          </div>
          <div class="config-item">
            <strong>Questions per turn:</strong> {game.config.questionsPerTurn}
          </div>
          <div class="config-item">
            <strong>Question submit time:</strong> {game.config.questionSubmitTimer}s
          </div>
          <div class="config-item">
            <strong>Answer time:</strong> {game.config.answerTimer}s
          </div>
          <div class="config-item">
            <strong>Max choices:</strong> {game.config.maxChoices}
          </div>
          <div class="config-item">
            <strong>Points for correct answer:</strong> {game.config.scoring.correctAnswer}
          </div>
          <div class="config-item">
            <strong>Points if question answered:</strong> {game.config.scoring.questionAnswered}
          </div>
          <div class="config-item">
            <strong>Points if question unanswered:</strong> {game.config.scoring.questionUnanswered}
          </div>
          <button on:click={() => editingConfig = true} class="edit-btn">Edit Settings</button>
        </div>
      {:else}
        <div class="config-form">
          <label>
            Questions per team
            <input type="number" bind:value={configForm.questionsPerTeam} min="1" max="20" />
          </label>
          
          <label>
            Questions per turn
            <input type="number" bind:value={configForm.questionsPerTurn} min="1" max="10" />
          </label>
          
          <label>
            Question submit time (seconds)
            <input type="number" bind:value={configForm.questionSubmitTimer} min="30" max="600" />
          </label>
          
          <label>
            Answer time (seconds)
            <input type="number" bind:value={configForm.answerTimer} min="15" max="300" />
          </label>
          
          <label>
            Max choices per question
            <input type="number" bind:value={configForm.maxChoices} min="2" max="6" />
          </label>
          
          <h3>Scoring</h3>
          
          <label>
            Points for correct answer
            <input type="number" bind:value={configForm.scoring.correctAnswer} />
          </label>
          
          <label>
            Points if someone answered your question
            <input type="number" bind:value={configForm.scoring.questionAnswered} />
          </label>
          
          <label>
            Points if nobody answered your question
            <input type="number" bind:value={configForm.scoring.questionUnanswered} />
          </label>
          
          <div class="button-group">
            <button on:click={saveConfig} class="save-btn">Save</button>
            <button on:click={() => { editingConfig = false; configForm = {...game.config}; }} class="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="start-section">
      <button 
        on:click={startGame} 
        class="start-btn"
        disabled={playersArray.length < 2 || playersArray.some(p => !p.teamId)}
      >
        Start Game
      </button>
      {#if playersArray.length < 2}
        <p class="warning">Need at least 2 players to start</p>
      {:else if playersArray.some(p => !p.teamId)}
        <p class="warning">All players must join a team</p>
      {/if}
    </div>
  {:else}
    <div class="waiting">
      <p>Waiting for {game.players[game.adminId].name} to start the game...</p>
    </div>
  {/if}
</div>

<style>
  .lobby {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .share-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .game-id-box {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    margin: 1rem 0;
  }
  
  .game-id {
    font-size: 2rem;
    font-weight: bold;
    font-family: monospace;
    color: #4ECDC4;
    letter-spacing: 0.1em;
  }
  
  .copy-btn {
    padding: 0.5rem 1rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .copy-btn:hover {
    background: #45b7b8;
  }
  
  .help-text {
    color: #666;
    margin: 0;
  }
  
  .teams-section {
    margin-bottom: 2rem;
  }
  
  h2 {
    color: #333;
    margin-bottom: 1rem;
  }
  
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }
  
  .team-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .team-card h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  .team-players {
    min-height: 60px;
    margin-bottom: 1rem;
  }
  
  .empty {
    color: #999;
  }
  
  .player-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    margin: 0.2rem;
    font-size: 0.9rem;
  }
  
  .admin-badge {
    font-size: 0.8rem;
  }
  
  .join-btn {
    width: 100%;
    padding: 0.6rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .join-btn:hover {
    background: #45b7b8;
  }
  
  .current-team {
    text-align: center;
    color: #4ECDC4;
    font-weight: 600;
    padding: 0.6rem;
  }
  
  .admin-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  
  .config-display {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .config-item {
    padding: 0.75rem;
    background: #f5f5f5;
    border-radius: 4px;
  }
  
  .edit-btn {
    grid-column: 1 / -1;
    padding: 0.75rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 1rem;
  }
  
  .config-form {
    display: grid;
    gap: 1rem;
  }
  
  .config-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-weight: 500;
  }
  
  .config-form input {
    padding: 0.6rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .config-form h3 {
    margin: 1rem 0 0.5rem 0;
    color: #555;
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .save-btn, .cancel-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .save-btn {
    background: #4ECDC4;
    color: white;
  }
  
  .cancel-btn {
    background: #ddd;
    color: #333;
  }
  
  .start-section {
    text-align: center;
  }
  
  .start-btn {
    padding: 1rem 3rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .start-btn:hover:not(:disabled) {
    background: #45b7b8;
  }
  
  .start-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .warning {
    color: #ff6b6b;
    margin-top: 0.5rem;
  }
  
  .waiting {
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .waiting p {
    color: #666;
    font-size: 1.1rem;
  }
</style>