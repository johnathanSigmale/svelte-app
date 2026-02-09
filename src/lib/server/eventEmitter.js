const clients = new Map(); // gameId -> Set of controllers

export function addClient(gameId, controller) {
  if (!clients.has(gameId)) {
    clients.set(gameId, new Set());
  }
  clients.get(gameId).add(controller);
}

export function removeClient(gameId, controller) {
  const gameClients = clients.get(gameId);
  if (gameClients) {
    gameClients.delete(controller);
    if (gameClients.size === 0) {
      clients.delete(gameId);
    }
  }
}

export function broadcastGameUpdate(gameId, game) {
  const gameClients = clients.get(gameId);
  if (!gameClients) return;
  
  // Convert Sets to Arrays for JSON serialization
  const serializedGame = serializeGame(game);
  
  const message = `data: ${JSON.stringify({ type: 'game_update', game: serializedGame })}\n\n`;
  
  gameClients.forEach(controller => {
    try {
      controller.enqueue(message);
    } catch (err) {
      console.error('Error sending to client:', err);
    }
  });
}

function serializeGame(game) {
  // Deep clone and convert Sets to Arrays
  const serialized = JSON.parse(JSON.stringify(game, (key, value) => {
    if (value instanceof Set) {
      return Array.from(value);
    }
    return value;
  }));
  
  return serialized;
}