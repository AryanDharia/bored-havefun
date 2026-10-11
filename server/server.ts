export {
  MultiplayerRoomServer,
  type RoomPlayer,
  type ActiveRoom,
  type RoomSnapshot,
  type ApiResponse,
  type DrawingStroke,
  type ScribbleWord,
  SERVER_WORDS,
  isCloseGuess
} from './roomServer';

import { MultiplayerRoomServer } from './roomServer';

// Standalone execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const server = new MultiplayerRoomServer();
  server.listen(PORT);

  const handleShutdown = async (signal: string) => {
    console.log(`[MultiplayerRoomServer] Received ${signal}. Shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
