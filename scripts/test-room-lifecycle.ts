import { MultiplayerRoomServer } from '../server/roomServer';
import { io as ioClient, Socket } from 'socket.io-client';

console.log('====================================================');
console.log('🧪 PLAYBREAK SOCKET.IO MULTIPLAYER TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failedTests++;
  }
}

async function runTests() {
  const TEST_PORT = 3991;
  const server = new MultiplayerRoomServer();
  await server.listen(TEST_PORT);
  const SERVER_URL = `http://localhost:${TEST_PORT}`;

  const createSocket = (): Promise<Socket> => {
    return new Promise((resolve) => {
      const s = ioClient(SERVER_URL, {
        transports: ['websocket', 'polling'],
        forceNew: true
      });
      s.on('connect', () => resolve(s));
    });
  };

  try {
    // -----------------------------------------------------------------
    // TEST 1: Successful room creation
    // -----------------------------------------------------------------
    console.log('\n--- 1. Successful room creation ---');
    const hostSocket = await createSocket();
    let hostCreateResp: any;

    await new Promise<void>((resolve) => {
      hostSocket.emit('create-room', {
        playerName: 'AliceHost',
        gameId: 'scribble',
        maxPlayers: 4
      }, (resp: any) => {
        hostCreateResp = resp;
        resolve();
      });
    });

    assert(hostCreateResp && hostCreateResp.ok === true, 'Host successfully creates room via create-room event');
    assert(Boolean(hostCreateResp.data && hostCreateResp.data.roomCode), 'Room creation returns structured roomCode');
    const roomCode = hostCreateResp.data.roomCode;
    const hostPlayer = hostCreateResp.data.players[0];
    assert(hostPlayer.isHost === true, 'Creator is marked as isHost: true');
    assert(hostPlayer.name === 'AliceHost', 'Creator name matches sanitized input');
    assert(hostCreateResp.data.maxPlayers === 4, 'Room default maxPlayers is set to 4');

    // -----------------------------------------------------------------
    // TEST 2: Unique room-code generation
    // -----------------------------------------------------------------
    console.log('\n--- 2. Unique room-code generation ---');
    const codeRegex = /^[A-Z0-9]{6}$/;
    assert(codeRegex.test(roomCode), `Generated room code is 6 uppercase alphanumeric chars (${roomCode})`);

    const generatedCodes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const code = server.generateUniqueRoomCode();
      assert(!generatedCodes.has(code), `Unique code generated on attempt ${i + 1}`);
      generatedCodes.add(code);
    }
    assert(generatedCodes.size === 50, 'All 50 generated codes are distinct and collision-free');

    // -----------------------------------------------------------------
    // TEST 3: Joining an existing room
    // -----------------------------------------------------------------
    console.log('\n--- 3. Joining an existing room ---');
    const player2Socket = await createSocket();
    let p2JoinResp: any;

    await new Promise<void>((resolve) => {
      player2Socket.emit('join-room', {
        roomCode,
        playerName: 'BobPlayer'
      }, (resp: any) => {
        p2JoinResp = resp;
        resolve();
      });
    });

    assert(p2JoinResp && p2JoinResp.ok === true, 'Player 2 successfully joins existing room');
    assert(p2JoinResp.data.players.length === 2, 'Room player count increases to 2');
    const joinedP2 = p2JoinResp.data.players.find((p: any) => p.name === 'BobPlayer');
    assert(Boolean(joinedP2) && joinedP2.isHost === false, 'Joined player is assigned isHost: false');

    // -----------------------------------------------------------------
    // TEST 4: Invalid room codes
    // -----------------------------------------------------------------
    console.log('\n--- 4. Invalid room codes ---');
    const invalidSocket = await createSocket();
    let invalidResp1: any;
    let invalidResp2: any;

    await new Promise<void>((resolve) => {
      invalidSocket.emit('join-room', { roomCode: 'NOPE99', playerName: 'Fail' }, (r: any) => {
        invalidResp1 = r;
        resolve();
      });
    });
    assert(invalidResp1 && invalidResp1.ok === false && invalidResp1.code === 'invalid_code', 'Unknown room code rejected with invalid_code');

    await new Promise<void>((resolve) => {
      invalidSocket.emit('join-room', { roomCode: 'AB', playerName: 'Short' }, (r: any) => {
        invalidResp2 = r;
        resolve();
      });
    });
    assert(invalidResp2 && invalidResp2.ok === false && invalidResp2.code === 'invalid_code', 'Malformed short room code rejected with invalid_code');
    invalidSocket.disconnect();

    // -----------------------------------------------------------------
    // TEST 5: Room capacity limits
    // -----------------------------------------------------------------
    console.log('\n--- 5. Room capacity limits ---');
    const player3Socket = await createSocket();
    const player4Socket = await createSocket();

    await new Promise<void>((resolve) => {
      player3Socket.emit('join-room', { roomCode, playerName: 'Charlie' }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      player4Socket.emit('join-room', { roomCode, playerName: 'Dana' }, () => resolve());
    });

    assert(server.rooms.get(roomCode)?.players.length === 4, 'Room successfully reaches 4 players capacity');

    // 5th player should be rejected
    const player5Socket = await createSocket();
    let p5JoinResp: any;
    await new Promise<void>((resolve) => {
      player5Socket.emit('join-room', { roomCode, playerName: 'Eve' }, (r: any) => {
        p5JoinResp = r;
        resolve();
      });
    });
    assert(p5JoinResp && p5JoinResp.ok === false && p5JoinResp.code === 'room_full', 'Fifth player rejected with room_full error');
    player5Socket.disconnect();

    // -----------------------------------------------------------------
    // TEST 7: Host-only game start & minimum player enforcement
    // -----------------------------------------------------------------
    console.log('\n--- 7. Host-only game start ---');
    // Non-host attempts to start game
    let nonHostStartResp: any;
    await new Promise<void>((resolve) => {
      player2Socket.emit('start-game', { roomCode }, (r: any) => {
        nonHostStartResp = r;
        resolve();
      });
    });
    assert(nonHostStartResp && nonHostStartResp.ok === false && nonHostStartResp.code === 'unauthorized', 'Non-host client rejected with unauthorized when starting game');

    // Host starts game
    let hostStartResp: any;
    await new Promise<void>((resolve) => {
      hostSocket.emit('start-game', { roomCode }, (r: any) => {
        hostStartResp = r;
        resolve();
      });
    });
    assert(hostStartResp && hostStartResp.ok === true, 'Host successfully starts game');
    assert(server.rooms.get(roomCode)?.gameStarted === true, 'Authoritative gameStarted status is true');

    // -----------------------------------------------------------------
    // TEST 6: Joining after game starts
    // -----------------------------------------------------------------
    console.log('\n--- 6. Joining after game starts ---');
    // Free up a slot by disconnecting player 4
    player4Socket.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Try joining room where gameStarted is true
    const lateSocket = await createSocket();
    let lateJoinResp: any;
    await new Promise<void>((resolve) => {
      lateSocket.emit('join-room', { roomCode, playerName: 'LateJoiner' }, (r: any) => {
        lateJoinResp = r;
        resolve();
      });
    });
    assert(lateJoinResp && lateJoinResp.ok === false && lateJoinResp.code === 'game_started', 'Joining active room rejected with game_started');
    lateSocket.disconnect();

    // -----------------------------------------------------------------
    // TEST 8 & 9: Player leave, disconnect cleanup, host transfer
    // -----------------------------------------------------------------
    console.log('\n--- 8 & 9. Player leave, disconnect cleanup, host transfer ---');
    // Host leaves room
    let hostLeaveResp: any;
    await new Promise<void>((resolve) => {
      hostSocket.emit('leave-room', {}, (r: any) => {
        hostLeaveResp = r;
        resolve();
      });
    });
    assert(hostLeaveResp && hostLeaveResp.ok === true, 'Host cleanly leaves room via leave-room');
    hostSocket.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const updatedRoom = server.rooms.get(roomCode);
    assert(Boolean(updatedRoom), 'Room remains active with remaining players');
    assert(updatedRoom?.players[0].name === 'BobPlayer', 'Host ownership transferred to Player 2 (BobPlayer)');
    assert(updatedRoom?.players[0].isHost === true, 'New host has isHost: true');

    // Idempotent test: calling removePlayerFromRoom twice does not throw or corrupt state
    server.removePlayerFromRoom('nonexistent_socket', roomCode, 'nonexistent_id');
    assert(updatedRoom?.players.length === 2, 'Idempotent disconnect leaves room roster intact');

    // Disconnect remaining players
    player2Socket.disconnect();
    player3Socket.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // -----------------------------------------------------------------
    // TEST 10: Empty-room expiration & cleanup
    // -----------------------------------------------------------------
    console.log('\n--- 10. Empty-room expiration & cleanup ---');
    assert(!server.rooms.has(roomCode), 'Room deleted immediately when all players leave');

    // -----------------------------------------------------------------
    // TEST 11: Multiple clients receiving synchronized room updates
    // -----------------------------------------------------------------
    console.log('\n--- 11. Multiple clients synchronized room updates ---');
    const syncHost = await createSocket();
    const syncGuest1 = await createSocket();
    const syncGuest2 = await createSocket();

    let syncCode = '';
    await new Promise<void>((resolve) => {
      syncHost.emit('create-room', { playerName: 'SyncHost' }, (r: any) => {
        syncCode = r.data.roomCode;
        resolve();
      });
    });

    const hostUpdates: any[] = [];
    const guest1Updates: any[] = [];
    const guest2Updates: any[] = [];

    syncHost.on('room-updated', (s) => hostUpdates.push(s));
    syncGuest1.on('room-updated', (s) => guest1Updates.push(s));
    syncGuest2.on('room-updated', (s) => guest2Updates.push(s));

    await new Promise<void>((resolve) => {
      syncGuest1.emit('join-room', { roomCode: syncCode, playerName: 'SyncG1' }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      syncGuest2.emit('join-room', { roomCode: syncCode, playerName: 'SyncG2' }, () => resolve());
    });

    await new Promise((r) => setTimeout(r, 150));

    assert(hostUpdates.length >= 2, 'Host receives real-time room updates as guests join');
    const lastHostSnap = hostUpdates[hostUpdates.length - 1];
    assert(lastHostSnap.players.length === 3, 'Host snapshot accurately reflects 3 players');
    assert(guest1Updates.length >= 1, 'Guest 1 receives synchronized room update when Guest 2 joins');

    syncHost.disconnect();
    syncGuest1.disconnect();
    syncGuest2.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // -----------------------------------------------------------------
    // TEST 12: Two clients attempting to occupy the last slot concurrently
    // -----------------------------------------------------------------
    console.log('\n--- 12. Two clients attempting to occupy last slot concurrently ---');
    const raceHost = await createSocket();
    const raceP2 = await createSocket();
    const raceP3 = await createSocket();
    const candidateA = await createSocket();
    const candidateB = await createSocket();

    let raceCode = '';
    await new Promise<void>((resolve) => {
      raceHost.emit('create-room', { playerName: 'RaceHost', maxPlayers: 4 }, (r: any) => {
        raceCode = r.data.roomCode;
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      raceP2.emit('join-room', { roomCode: raceCode, playerName: 'RaceP2' }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      raceP3.emit('join-room', { roomCode: raceCode, playerName: 'RaceP3' }, () => resolve());
    });

    assert(server.rooms.get(raceCode)?.players.length === 3, 'Room currently has 3 of 4 slots filled');

    // Concurrently attempt to join the 4th and final slot
    let resA: any = null;
    let resB: any = null;

    await Promise.all([
      new Promise<void>((resolve) => {
        candidateA.emit('join-room', { roomCode: raceCode, playerName: 'CandidateA' }, (r: any) => {
          resA = r;
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        candidateB.emit('join-room', { roomCode: raceCode, playerName: 'CandidateB' }, (r: any) => {
          resB = r;
          resolve();
        });
      })
    ]);

    const oneSucceeded = (resA?.ok === true && resB?.ok === false) || (resA?.ok === false && resB?.ok === true);
    assert(oneSucceeded, 'Exactly one client succeeds in occupying the final available slot');
    const rejectedResult = resA?.ok === false ? resA : resB;
    assert(rejectedResult.code === 'room_full', 'The losing concurrent client receives room_full error');
    assert(server.rooms.get(raceCode)?.players.length === 4, 'Room never exceeds 4 players');

    raceHost.disconnect();
    raceP2.disconnect();
    raceP3.disconnect();
    candidateA.disconnect();
    candidateB.disconnect();

    // -----------------------------------------------------------------
    // TEST 13: Room Admin: Remove Player (Kick) Authorization & Sync
    // -----------------------------------------------------------------
    console.log('\n--- 13. Room Admin: Remove Player Authorization & Sync ---');
    const adminHost = await createSocket();
    const guestUser = await createSocket();
    const spectator = await createSocket();

    let adminRoomCode = '';
    let guestPlayerId = '';
    let adminPlayerId = '';

    await new Promise<void>((resolve) => {
      adminHost.emit('create-room', { playerName: 'AdminHost' }, (r: any) => {
        adminRoomCode = r.data.roomCode;
        adminPlayerId = r.data.players[0].id;
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      guestUser.emit('join-room', { roomCode: adminRoomCode, playerName: 'GuestUser' }, (r: any) => {
        guestPlayerId = r.data.players.find((p: any) => p.name === 'GuestUser').id;
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      spectator.emit('join-room', { roomCode: adminRoomCode, playerName: 'Spectator' }, () => resolve());
    });

    assert(server.rooms.get(adminRoomCode)?.players.length === 3, 'Room has 3 active players before removal');

    // 13.1 Non-host attempts to kick guest -> MUST be rejected with unauthorized
    let nonHostKickResp: any;
    await new Promise<void>((resolve) => {
      guestUser.emit('kick-player', { targetPlayerId: guestPlayerId }, (r: any) => {
        nonHostKickResp = r;
        resolve();
      });
    });
    assert(nonHostKickResp && nonHostKickResp.ok === false && nonHostKickResp.code === 'unauthorized', 'Non-host client rejected with unauthorized when attempting to kick a player');

    // 13.2 Host attempts to remove themselves -> MUST be rejected
    let hostKickSelfResp: any;
    await new Promise<void>((resolve) => {
      adminHost.emit('kick-player', { targetPlayerId: adminPlayerId }, (r: any) => {
        hostKickSelfResp = r;
        resolve();
      });
    });
    assert(hostKickSelfResp && hostKickSelfResp.ok === false && hostKickSelfResp.code === 'cannot_remove_self', 'Host cannot remove themselves using kick control');

    // 13.3 Host removes non-existent target -> rejected
    let invalidTargetResp: any;
    await new Promise<void>((resolve) => {
      adminHost.emit('kick-player', { targetPlayerId: 'invalid_id_999' }, (r: any) => {
        invalidTargetResp = r;
        resolve();
      });
    });
    assert(invalidTargetResp && invalidTargetResp.ok === false && invalidTargetResp.code === 'player_not_found', 'Removing non-existent player rejected with player_not_found');

    // 13.4 Host successfully removes GuestUser
    let guestKickedEventReceived: any = null;
    guestUser.on('kicked-from-room', (data) => {
      guestKickedEventReceived = data;
    });

    let hostKickSuccessResp: any;
    await new Promise<void>((resolve) => {
      adminHost.emit('kick-player', { targetPlayerId: guestPlayerId, reason: 'The host removed you from the room.' }, (r: any) => {
        hostKickSuccessResp = r;
        resolve();
      });
    });
    await new Promise((r) => setTimeout(r, 100));

    assert(hostKickSuccessResp && hostKickSuccessResp.ok === true, 'Host successfully removes player via kick-player event');
    assert(Boolean(guestKickedEventReceived) && guestKickedEventReceived.message === 'The host removed you from the room.', 'Removed player receives kicked-from-room notification with clear message');

    const adminRoomAfterKick = server.rooms.get(adminRoomCode);
    assert(adminRoomAfterKick?.players.length === 2, 'Authoritative room state player count decreased to 2');
    assert(!adminRoomAfterKick?.players.some((p) => p.id === guestPlayerId), 'Target player completely removed from room membership');

    adminHost.disconnect();
    guestUser.disconnect();
    spectator.disconnect();

  } finally {
    await server.close();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
