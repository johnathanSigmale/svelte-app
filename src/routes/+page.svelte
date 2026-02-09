<script>
  let playerName = '';
  let gameIdToJoin = '';
  let error = '';
  
  async function createGame() {
    if (!playerName.trim()) {
      error = 'Please enter your name';
      return;
    }
    
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() })
      });
      
      const data = await res.json();
      
      if (data.error) {
        error = data.error;
        return;
      }
      
      window.location.href = `/${data.gameId}`;
    } catch (err) {
      error = 'Failed to create game';
    }
  }
  
  async function joinGame() {
    if (!playerName.trim() || !gameIdToJoin.trim()) {
      error = 'Please enter your name and game ID';
      return;
    }
    
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: gameIdToJoin.trim(), 
          playerName: playerName.trim() 
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        error = data.error;
        return;
      }
      
      window.location.href = `/${gameIdToJoin.trim()}`;
    } catch (err) {
      error = 'Failed to join game';
    }
  }
</script>

<div class="container">
  <h1>Quiz Team Battle</h1>
  
  <div class="card">
    <h2>Your Name</h2>
    <input 
      type="text" 
      bind:value={playerName} 
      placeholder="Enter your name"
      on:keydown={(e) => e.key === 'Enter' && createGame()}
    />
  </div>
  
  <div class="actions">
    <div class="card">
      <h2>Create New Game</h2>
      <button on:click={createGame} disabled={!playerName.trim()}>
        Create Game
      </button>
    </div>
    
    <div class="card">
      <h2>Join Existing Game</h2>
      <input 
        type="text" 
        bind:value={gameIdToJoin} 
        placeholder="Enter game ID"
        on:keydown={(e) => e.key === 'Enter' && joinGame()}
      />
      <button on:click={joinGame} disabled={!playerName.trim() || !gameIdToJoin.trim()}>
        Join Game
      </button>
    </div>
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 2rem;
  }
  
  .card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
  }
  
  h2 {
    font-size: 1.2rem;
    margin: 0 0 1rem 0;
    color: #555;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  input:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  button {
    width: 100%;
    padding: 0.75rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
    font-weight: 600;
  }
  
  button:hover:not(:disabled) {
    background: #45b7b8;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .actions {
    display: grid;
    gap: 1rem;
  }
  
  .error {
    background: #ff6b6b;
    color: white;
    padding: 1rem;
    border-radius: 4px;
    text-align: center;
    margin-top: 1rem;
  }
</style>