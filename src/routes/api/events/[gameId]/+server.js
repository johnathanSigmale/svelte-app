import { addClient, removeClient } from '$lib/server/eventEmitter.js';
import { getGame } from '$lib/server/gameStore.js';

export async function GET({ params }) {
  const { gameId } = params;
  
  const game = getGame(gameId);
  if (!game) {
    return new Response('Game not found', { status: 404 });
  }
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial game state
      const encoder = new TextEncoder();
      
      // Serialize game state (convert Sets to Arrays)
      const serializedGame = JSON.parse(JSON.stringify(game, (key, value) => {
        if (value instanceof Set) {
          return Array.from(value);
        }
        return value;
      }));
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'game_update', game: serializedGame })}\n\n`)
      );
      
      // Add client to broadcast list
      addClient(gameId, {
        enqueue: (message) => {
          controller.enqueue(encoder.encode(message));
        }
      });
      
      // Store controller for cleanup
      const wrappedController = {
        enqueue: (message) => {
          controller.enqueue(encoder.encode(message));
        }
      };
      
      // Cleanup on disconnect
      return () => {
        removeClient(gameId, wrappedController);
      };
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}