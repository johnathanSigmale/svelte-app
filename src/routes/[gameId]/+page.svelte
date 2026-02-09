<script>
  import { onMount, onDestroy } from 'svelte';
  import Lobby from '$lib/components/Lobby.svelte';
  import QuestionSubmission from '$lib/components/QuestionSubmission.svelte';
  import AnsweringPhase from '$lib/components/AnsweringPhase.svelte';
  import Results from '$lib/components/Results.svelte';
  
  export let data;
  
  let game = null;
  let eventSource = null;
  let error = '';
  let showJoinForm = false;
  let playerName = '';
  let joiningGame = false;
  
  $: currentPlayer = game && data.playerId ? game.players[data.playerId] : null;
  $: isAdmin = game && data.playerId === game.adminId;
  $: canJoin = game && game.status === 'lobby' && !currentPlayer;
  
  onMount(() => {
    // Connect to SSE
    eventSource = new EventSource(`/api/events/${data.gameId}`);
    
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'game_update') {
        game = message.game;
        
        // If game started and we're not in it, show error
        if (game.status !== 'lobby' && !currentPlayer) {
          error = 'Game has already started';
        }
      }
    };
    
    eventSource.onerror = () => {
      error = 'Lost connection to game';
    };
  });
  
  onDestroy(() => {
    if (eventSource) {
      eventSource.close();
    }
  });
  
  async function joinGame() {
    if (!playerName.trim()) {
      error = 'Please enter your name';
      setTimeout(() => error = '', 3000);
      return;
    }
    
    joiningGame = true;
    
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: data.gameId, 
          playerName: playerName.trim() 
        })
      });
      
      const result = await res.json();
      
      if (result.error) {
        error = result.error;
        setTimeout(() => error = '', 3000);
      } else {
        // Reload page to get new cookie
        window.location.reload();
      }
    } catch (err) {
      error = 'Failed to join game';
      setTimeout(() => error = '', 3000);
    } finally {
      joiningGame = false;
    }
  }
  
  async function sendAction(action, data = {}) {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, action, data })
      });
      
      const result = await res.json();
      
      if (result.error) {
        error = result.error;
        setTimeout(() => error = '', 3000);
      }
      
      return result;
    } catch (err) {
      error = 'Action failed';
      setTimeout(() => error = '', 3000);
    }
  }
</script>

<div class="game-container">
  {#if error}
    <div class="error-banner">{error}</div>
  {/if}
  
  {#if !game}
    <div class="loading">Loading game...</div>
  {:else if canJoin}
    <!-- Show join form for visitors -->
    <div class="join-container">
      <div class="join-card">
        <h1>Join Quiz Team Battle</h1>
        <p class="game-id-display">Game ID: <strong>{game.id}</strong></p>
        
        <div class="game-info-preview">
          <h3>Current Players ({Object.keys(game.players).length})</h3>
          <div class="players-list">
            {#each Object.values(game.players) as player}
              <div class="player-preview">
                {player.name}
                {#if player.id === game.adminId}
                  <span class="admin-badge">👑</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        
        <div class="join-form">
          <label>
            Your Name
            <input 
              type="text" 
              bind:value={playerName} 
              placeholder="Enter your name"
              on:keydown={(e) => e.key === 'Enter' && joinGame()}
              disabled={joiningGame}
            />
          </label>
          
          <button 
            on:click={joinGame} 
            disabled={!playerName.trim() || joiningGame}
            class="join-btn"
          >
            {joiningGame ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  {:else if !currentPlayer}
    <!-- Player not in game and can't join (game started) -->
    <div class="error-page">
      <h1>Cannot Join</h1>
      <p>This game has already started.</p>
      <a href="/">Go Home</a>
    </div>
  {:else}
    <!-- Player is in the game -->
    <div class="game-header">
      <h1>Quiz Team Battle</h1>
      <div class="game-info">
        <span class="game-id">Game ID: <strong>{game.id}</strong></span>
        <span class="player-name">Playing as: <strong>{currentPlayer.name}</strong></span>
      </div>
    </div>
    
    {#if game.status === 'lobby'}
      <Lobby {game} {currentPlayer} {isAdmin} {sendAction} />
    {:else if game.status === 'submitting_questions'}
      <QuestionSubmission {game} {currentPlayer} {sendAction} />
    {:else if game.status === 'answering_turn'}
      <AnsweringPhase {game} {currentPlayer} {sendAction} />
    {:else if game.status === 'finished'}
       <Results {game} {currentPlayer} {sendAction} />
    {/if}
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #f5f5f5;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .game-container {
    min-height: 100vh;
    padding: 1rem;
  }
  
  .error-banner {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: #ff6b6b;
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideDown 0.3s ease;
  }
  
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  .loading {
    text-align: center;
    padding: 4rem;
    font-size: 1.5rem;
    color: #666;
  }
  
  .join-container {
    max-width: 600px;
    margin: 4rem auto;
  }
  
  .join-card {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .join-card h1 {
    text-align: center;
    color: #333;
    margin: 0 0 1rem 0;
  }
  
  .game-id-display {
    text-align: center;
    color: #666;
    margin-bottom: 2rem;
  }
  
  .game-id-display strong {
    color: #4ECDC4;
    font-size: 1.3rem;
    font-family: monospace;
  }
  
  .game-info-preview {
    background: #f5f5f5;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }
  
  .game-info-preview h3 {
    margin: 0 0 1rem 0;
    color: #555;
  }
  
  .players-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .player-preview {
    background: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .admin-badge {
    font-size: 0.9rem;
  }
  
  .join-form {
    display: grid;
    gap: 1rem;
  }
  
  .join-form label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
    color: #555;
  }
  
  .join-form input {
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .join-form input:focus {
    outline: none;
    border-color: #4ECDC4;
  }
  
  .join-form input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
  
  .join-btn {
    padding: 1rem;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .join-btn:hover:not(:disabled) {
    background: #45b7b8;
  }
  
  .join-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .error-page {
    max-width: 500px;
    margin: 4rem auto;
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .error-page a {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 2rem;
    background: #4ECDC4;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
  }
  
  .game-header {
    max-width: 1200px;
    margin: 0 auto 2rem;
  }
  
  .game-header h1 {
    text-align: center;
    color: #333;
    margin-bottom: 1rem;
  }
  
  .game-info {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
    color: #666;
  }
  
  .game-info strong {
    color: #333;
  }
</style>