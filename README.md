# Empire of Bits Chess

> "Where every move can become a live event."

Empire of Bits Chess is the chess chapter of the Empire of Bits arcade ecosystem: a livestream-native, viewer-influenced chess experience where standard 1v1 chess is fused with real-time package drops, shared points, streamer sessions, and a reactive Solana chess engine architecture.

Play the deployed build: [chess.empireofbits.xyz](https://chess.empireofbits.xyz/)

Part of the wider Empire of Bits vision: interoperable games on Solana where assets, achievements, rewards, viewer influence, and player identity can move across games instead of being trapped inside one title.

## Overview

Empire of Bits Chess turns a normal chess match into a live arcade event.

Players create or join a chess game, share a join code, and play a real-time match in the browser. When the game is connected to the Arena / Vorld streaming layer, viewers can influence the match by triggering chess-specific packages such as shields, clock effects, piece swaps, double moves, and empowered pieces.

The goal is simple: preserve the depth of chess while adding the chaos, social energy, and reward loop of livestream arcade games.

## Why This Exists

Traditional games and livestreams are fragmented:

- Players invest time into isolated games where rewards rarely travel elsewhere.
- Viewers usually interact through chat, polls, or emotes instead of affecting gameplay directly.
- Streamers need more interactive formats that create memorable moments.
- Chess is usually deterministic and quiet, even when streamed to a live audience.

Empire of Bits solves this with the Viewer-Influence Loop.

## The Viewer-Influence Loop

The Viewer-Influence Loop is the core mechanic behind Empire of Bits.

1. A player starts a game and connects a livestream session.
2. Viewers join through the Arena / Vorld experience.
3. Viewers spend platform credits to trigger packages.
4. The game receives websocket events in real time.
5. The frontend applies the effect immediately and syncs shared state for both players.
6. The match becomes a live, collaborative, unpredictable event.

In this chess build, viewer influence is not cosmetic only. It can change clocks, undo pressure, alter turn structure, and create tactical swings.

## Live Chess Packages

These are the chess packages currently represented by the game logic and UI.

| Package | Type | Gameplay Effect |
| --- | --- | --- |
| Shield Move | Immediate | Nullifies pressure by giving the target player a shield/undo style defensive resource. If your opponent thinks they found a tactic, Shield Move can make that attack feel like it never happened. |
| Chrono Chip | Immediate | Adds +10 seconds to the target player's clock. Perfect for time scrambles and flag-defense moments. |
| Piece Swap | Immediate | Arms a swap interaction for the target player, allowing two pieces to exchange positions when the effect becomes active. It can reverse development, unlock tactics, or create chaos on the board. |
| Piece Empower | Immediate | Empowers an opponent piece as a temporary high-value target. Capturing the empowered piece creates a bonus moment, including the +20s visual reward flow in the current game. |
| Double Move | Immediate | Lets the target player move twice in a row when active. Forks, discoveries, checks, and tempo swings can happen back-to-back before the opponent responds. |
| Freeze Enemy Clock | Immediate | Drains time from the target player's clock, creating pressure and panic in fast games. |

### Package Fantasy

- Shield Move: your opponent just played what they think is a brilliant tactic. Drop Shield Move and the pressure gets nullified. Instant "your attack does nothing" energy.
- Chrono Chip: running low on time and about to flag? Drop Chrono Chip and +10 seconds lands on your clock.
- Piece Swap: that annoying developed piece can be displaced by a swap moment, turning normal chess development into tactical chaos.
- Piece Empower: turn a piece into a temporary monster and make one capture or tactical sequence feel like it can rip the position open.
- Double Move: why move once when you can move twice in a row? Forks, discoveries, checks, and tempo attacks can chain together before the opponent answers.
- Freeze Enemy Clock: the ultimate time-pressure troll. Drain or freeze the opponent's clock and watch the panic build.

## Current Game Features

- Real-time 1v1 chess game creation and joining with shareable join codes.
- Supabase-backed game state, move history, clocks, player seats, and arena state syncing.
- Chess legality and board state handled in the frontend with `chess.js`.
- Interactive board UI powered by `chessboardjsx`.
- Stockfish-powered evaluation, best-move support, move explanations, and post-game analysis.
- Timed games with visible player clocks and hidden timer updater.
- Resign, draw offer, draw accept, undo/shield flows, and game-over handling.
- Post-game result screen with move replay, evaluation graph, accuracy-style presentation, and Empire of Bits points return.
- Arena monitoring panel for stream URL connection, session status, countdown, activity state, boost events, package drops, and websocket event logs.
- Viewer boost points with milestone animations and perk activation.
- Immediate item drop notifications for both players.
- Shared arena state synchronization through the `games.arena_state` field.
- Redirect back into the Empire of Bits game center with win and points context.

## Arena / Vorld Integration

The game integrates with the Vorld / Arena Arcade API for livestream sessions and viewer-driven game events.

The arena flow is handled in `src/lib/arenaGameService.ts`:

- Creates a session with `POST /api/v1/sessions`.
- Fetches session details with `GET /api/v1/sessions/:id`.
- Connects to the websocket endpoint.
- Joins the active session with `join_session`.
- Handles session lifecycle events such as countdown, arena toggle, boost activation, package unlock, immediate item drop, overlay change, and session ended.
- Keeps legacy event aliases for compatibility with older event names.
- Cancels the session on disconnect when possible.

If the API returns `Active streamer role required`, the UI shows a modal directing the user to [VORLD.TV](https://vorld.tv/) so they can enable streamer mode from their profile without breaking the chess match.

## Empire of Bits Ecosystem Context

Empire of Bits is an interoperable arcade gaming ecosystem on Solana where games share a common identity, reward model, and viewer-influence philosophy.

The wider ecosystem includes arcade prototypes across multiple genres:

| Game | Genre | Example Viewer Influence |
| --- | --- | --- |
| Space Invader | Arcade shooter | Overclock, Guardian Shield, Thunder Strike, Precision Mode, Frenzy Mode |
| Axe Arcade | Aiming challenge | Rain of Mini-Axes, Clone Throw, Slow-Motion Zone, Extra-Axe, Giant Target |
| Candy Crush-style game | Puzzle/casual | Colour Bomb, Sweet Teeth, Lollipop Hammer, Free Switch, 5X Moves |
| Battleship | Strategy | Bomb, Sonar Ping, Radar Ping, Guided Missile, Rapid Fire, Repair Drone |
| Chess | Strategy/esports | Shield Move, Chrono Chip, Piece Swap, Piece Empower, Double Move, Freeze Enemy Clock |

The common idea across all games is that viewers are not passive spectators. They become co-creators of the live gameplay session.

## Why Airdrop Arcade / Arena

The Arena layer is the bridge between a livestream audience and the game.

- Direct viewer interaction: viewers can influence play from the stream-side experience instead of only sending chat messages.
- Low-latency game events: boosts, item drops, package unlocks, session state, and countdown events arrive through websocket flows.
- Streamer-first UX: creators connect with a stream URL and can monitor session status in-game.
- Cross-game design: the same viewer-influence concept can work across chess, shooters, puzzle games, strategy games, and arcade prototypes.
- Game-changing effects: viewers become active participants in the match instead of passive spectators.

## Reactive Multiplayer Chess Engine

Empire of Bits Chess is connected to the Empire of Bits reactive chess engine track: a Rust and Anchor based Solana program designed for on-chain gameplay, structured events, wagers, clocks, and stream-native reactions.

The engine vision is infrastructure-first:

```text
wallet
  |
  v
+----------------+      tx       +----------------------+
|  Solana RPC    | ------------> |  Chess Program       |
+----------------+               |  Rust / Anchor       |
        ^                         +----------+-----------+
        |                                    |
        |                                    | Anchor events
        |                                    v
+----------------+               +----------------------+
| onLogs /       | <------------ | MovePlayed           |
| Helius WS /    |               | CheckmateEvent       |
| Geyser gRPC    |               | StreamReactionEvent  |
+-------+--------+               +----------------------+
        |
        +----------+-------------+-------------+----------+
                   |             |             |
                   v             v             v
               Overlays    AI Commentator     Bots / Analytics
```

The on-chain program is designed to be the source of truth for move legality, clocks, wagers, and game outcomes. Frontends, bots, overlays, indexers, and analytics systems can consume the same reactive event stream.

### Engine Features

- Full on-chain chess legality with piece move generation.
- King-safety validation.
- Castling, en passant, promotion, check, mate, stalemate, 50-move rule, and insufficient-material draw detection.
- Multiple concurrent matches per creator via PDA seeded by `(creator, session_id)`.
- PDA-only design with no extra signer keypairs.
- Structured Anchor events with stable field names and board hashes for client replay verification.
- Fischer clocks and timeout flagging callable by anyone.
- Wager escrow with automatic payout on mate, timeout, resignation, and draw splitting.
- Anti-replay nonce to prevent flaky-network retries from applying a move twice.
- Compressed 16-bit move history so a full match can fit in compact account data.
- Spectator reaction events for emotes, predictions, comments, and clip markers.

### Engine Layout

The reactive chess engine is designed as a separate Solana / Anchor program with a layout like this:

```text
programs/anchor-project/src/
  lib.rs                         # Anchor entrypoint and instruction wiring
  errors.rs                      # Stable numbered error codes
  events.rs                      # Anchor event structs
  state.rs                       # Game, StreamSession, and WagerVault accounts
  chess/
    mod.rs                       # Piece encoding and move flags
    board.rs                     # ChessState, ChessMove, board hash
    movegen.rs                   # Move application, attack detection, game status
  instructions/
    mod.rs                       # Shared helpers
    create_game.rs
    join_game.rs
    make_move.rs
    resign_game.rs
    offer_draw.rs
    accept_draw.rs
    sync_clock.rs
    record_reaction.rs
    close_game.rs

app/
  client.ts                      # ChessClient SDK and runnable demo
  subscribe.ts                   # Websocket subscription examples

tests/
  anchor-project.ts              # Anchor end-to-end suite
```

### Engine Instruction Surface

| Instruction | Signer | Purpose |
| --- | --- | --- |
| `create_game` | Creator | Mint a Game PDA, seat white, and optionally escrow a wager. |
| `join_game` | Black | Seat black, match the wager, and activate the game. |
| `make_move` | Mover | Validate via the chess engine, tick clock, emit events, and finalize on mate. |
| `resign_game` | Either player | End the game and award the opponent. |
| `offer_draw` | Either player | Set the draw offer. |
| `accept_draw` | Counterparty | Finalize as draw and split wager if present. |
| `sync_clock` | Anyone | Tick the on-chain clock and flag a timeout. |
| `record_reaction` | Spectator | Emit a stream reaction event and update spectator counters. |
| `close_game` | Creator/player | Reclaim rent on a finished or never-started match. |

### Reactive Events

| Event | Emitted On |
| --- | --- |
| `GameCreated` | Game creation |
| `GameStarted` | Opponent joins |
| `MovePlayed` | Every successful move |
| `CheckEvent` | Move gives check without mate |
| `CheckmateEvent` | Checkmate |
| `StalemateEvent` | Stalemate |
| `DrawEvent` | Agreed draw, forced draw, 50-move draw, insufficient material, or stalemate |
| `ClockUpdated` | Clock sync without flag-fall |
| `DrawOffered` | Draw offer |
| `StreamReactionEvent` | Emote, prediction, comment, or clip reaction |
| `SpectatorJoined` | First registered spectator reaction |
| `GameEnded` | Mate, resignation, timeout, draw, or abandoned game |

`MovePlayed.flags` is intended as a packed bitfield for capture, castle, en passant, check, mate, double push, and promotion. `MovePlayed.board_hash` allows clients to verify replay state and detect board drift.

### Subscription Patterns

The reactive layer is designed to support multiple levels of infrastructure:

1. Public RPC `onLogs` plus Anchor/Borsh decoding for a simple zero-infrastructure setup.
2. Helius enhanced websocket subscriptions for lower-latency structured event delivery.
3. Geyser or Yellowstone gRPC streams into Kafka/Redpanda-style pipelines for analytics, overlays, bots, and large-scale ingestion.

### PDA Seeds

```text
game   = ["game", creator, session_id_le_bytes]
stream = ["stream", game_pubkey]
vault  = ["vault", game_pubkey]
```

This PDA-only design keeps the protocol wallet-adapter friendly and avoids extra signer keypairs.

### Security Model

- Authority checks: player-only instructions verify signer against `game.white` or `game.black`.
- Turn enforcement: the signer must match the side to move.
- Replay protection: client-provided nonces prevent duplicate move application.
- Race safety: Solana account writes serialize conflicting move attempts.
- Legality: illegal moves are rejected by the on-chain chess engine.
- Wager safety: escrow lamports are held in a PDA vault with checked arithmetic.
- Spectator boundaries: spectators can emit reaction events but cannot mutate chess state.

### Engine Extension Points

- Compressed replay storage for long-term match history.
- Replay or "memory" NFTs for iconic games.
- Tournament dispatchers using deterministic session IDs.
- AI commentator hooks from move comments and stream reaction payloads.
- Audience prediction markets/events.
- Solana Mobile Stack support through the PDA-only authority model.
- Helius/Geyser webhooks for overlays, bots, analytics, and real-time dashboards.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons |
| Routing | React Router |
| Chess | `chess.js`, `chessboardjsx`, Stockfish |
| Realtime app state | Supabase Postgres realtime |
| Backend functions | Supabase Edge Functions |
| Arena / streaming | Vorld / Arena Arcade API, Socket.IO |
| HTTP client | Axios |
| State and async utilities | React hooks, TanStack Query |
| Motion | Framer Motion |
| Solana engine track | Rust, Anchor, PDA-based on-chain chess protocol |

## Project Structure

```text
src/
  App.tsx                         # App shell and routes
  main.tsx                        # React entry point
  pages/
    Home.tsx                      # Create/join chess games
    Game.tsx                      # Main chessboard, timers, arena effects, gameplay state
    NotFound.tsx                  # Catch-all route
  components/
    ArenaMonitoring.tsx           # Stream session control and event monitor
    ArenaNotification.tsx         # Boost/item drop notifications
    GameResult.tsx                # Post-game replay, analysis, points return
    GameControls.tsx              # Resign/draw/undo controls
    GameTimer.tsx                 # Clock updater
    MoveHistory.tsx               # Move list
    MoveExplanation.tsx           # Move commentary
    PlayerCard.tsx                # Player clock/captured pieces/shields
    EvaluationBar.tsx             # Live evaluation display
    MilestoneAnimations.tsx       # Points milestone visuals
    MilestoneFeed.tsx             # Recent milestone feed
    PerkUI.tsx                    # Earned perk display
    FreezeOverlay.tsx             # Freeze visual effect
    ui/                           # shadcn/ui primitives
  hooks/
    useStockfish.ts               # Engine evaluation and best-move helpers
    usePointsMilestone.ts         # Viewer boost points and milestone rewards
    usePerkSystem.ts              # Perk activation state
    useSoundEffects.ts            # Move/audio feedback
  lib/
    arenaGameService.ts           # Vorld/Arena session API and websocket client
    stockfishFactory.ts           # Stockfish worker/factory helper
    utils.ts                      # Shared utilities
  integrations/
    supabase/
      client.ts                   # Supabase client
      types.ts                    # Generated database types

supabase/
  migrations/                     # Game schema and arena_state changes
  functions/
    analyze-game/                 # Game analysis function
    explain-move/                 # Move explanation function
    get-available-games/          # Waiting game list function
```

## Local Development

### Prerequisites

- Node.js 20+
- npm
- A configured Supabase project
- Optional: Vorld / Arena streamer account for live viewer influence sessions

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

`VITE_SUPABASE_ANON_KEY` is also supported as a fallback for the publishable key.

Arena API IDs and Vorld endpoints are currently configured in `src/lib/arenaGameService.ts`.

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## How To Play

1. Open [chess.empireofbits.xyz](https://chess.empireofbits.xyz/) or run locally.
2. Create a new game from the home screen.
3. Share the join code with another player.
4. The second player joins with that code.
5. Play the match normally.
6. If you are the creator/streamer, paste your stream URL into the Arena panel and connect.
7. Viewers can trigger boosts and package drops through the Arena flow.
8. When the game ends, the result screen shows replay, evaluation context, and Empire of Bits points flow.

## Streamer Setup

To use the live Arena session:

1. Go to [VORLD.TV](https://vorld.tv/).
2. Open your profile.
3. Enable streamer mode.
4. Return to the chess game.
5. Enter your livestream URL.
6. Connect the Arena session.

If streamer mode is not active, the game will show an in-app modal with the VORLD.TV link. The chess match can continue even if the Arena session is not connected.

## Supabase Model

The app uses Supabase for the multiplayer chess room and shared state layer:

- `games` stores player seats, board state, turn, clocks, game status, result fields, and serialized `arena_state`.
- `moves` stores move history and board snapshots for replay.
- Supabase realtime subscriptions keep both players synced.
- Edge Functions provide optional helpers such as available game discovery, move explanation, and analysis.

The `arena_state` field is used to mirror livestream-side events to both players, including last boost, last drop, active package effects, shields, piece swap state, empowered piece state, and monitor event logs.

## Package Effect Implementation Notes

- `Shield Move` increments shield counts and syncs them through `arena_state`.
- `Chrono Chip` adds 10 seconds to the target player's Supabase clock field.
- `Freeze Enemy Clock` drains 10 seconds from the target player's clock.
- `Piece Swap` arms a pending swap state and activates it on the target player's turn.
- `Double Move` lets the target player perform two consecutive moves when active.
- `Piece Empower` marks a piece and rewards the capture moment with a time bonus flow.

## Empire of Bits Points

Viewer boosts add points during the match. Milestones can trigger visual effects and temporary perks:

- 25 points: milestone pulse.
- 50 points: stronger milestone animation.
- 100 points: random tactical/cosmetic perk.
- 500 points: aura-style milestone and stronger effects.
- 5000 points: celestial-level milestone tier.

On game completion, the result screen can return the player to the Empire of Bits game center and update user points through the Empire of Bits backend.

## Roadmap

- Deeper Solana/Anchor integration for on-chain move authority and event verification.
- More chess-native viewer packages.
- Stream overlays for package drops, clocks, and tactical moments.
- Tournament and bracket sessions seeded by stream/session IDs.
- Replay NFTs or memory objects for memorable matches.
- AI commentator hooks driven by the reactive move/event stream.
- Helius/Geyser ingestion for low-latency analytics and bot integrations.

## Related Links

- Live chess app: [chess.empireofbits.xyz](https://chess.empireofbits.xyz/)
- Vorld streamer portal: [vorld.tv](https://vorld.tv/)
- Empire of Bits game center: [empireofbits.xyz](https://empireofbits.xyz/)

## Contact

- Email: empireofbits@gmail.com
- Twitter/X: `@empireofbits`

## License

This project is part of Empire of Bits. Add the repository license here when finalized.

---

Empire of Bits Chess - transforming chess from a quiet board game into a live, reactive, viewer-powered arena.
