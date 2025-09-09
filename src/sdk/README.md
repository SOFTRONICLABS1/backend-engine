# Mobile SDK Backend Engine

A comprehensive SDK for launching and managing musical games on mobile platforms with note integration.

## Features

- **Game Registry**: Maps game names to IDs and components
- **Game Launcher**: Handles payload validation and game launching
- **Note Integration**: Passes musical note data with durations to games
- **Validation**: Comprehensive payload validation
- **Type Safety**: Full TypeScript support

## Quick Start

```typescript
import { GameLauncher, MobileSdk } from './sdk'

// Create payload
const payload = {
  userId: "e4aad36b-ecb7-45b3-886b-616364a15bfb",
  gameId: "2d6263d7-d4a4-4074-8be3-430120ac1cc5", // Flappy Bird
  notes: {
    title: "Cheap Thrills",
    measures: [
      {
        notes: [
          { beat: 1, pitch: "E3", duration: 100 },
          { beat: 1, pitch: "G3", duration: 100 },
          { beat: 1, pitch: "B3", duration: 100 },
          { beat: 1, pitch: "E4", duration: 200 }
        ],
        measure_number: 1
      }
    ],
    key_signature: "C",
    time_signature: "4/4"
  }
}

// Launch game component
<GameLauncher
  payload={payload}
  onGameEnd={(score) => console.log('Final score:', score)}
  onError={(error) => console.error('Game error:', error)}
/>
```

## SDK API

### MobileSdk Class

#### `MobileSdk.launch(payload: GamePayload)`
Programmatically launch a game and return launch result.

```typescript
const result = MobileSdk.launch(payload)
if (result.success) {
  console.log('Game ready:', result.gameDefinition?.displayName)
} else {
  console.error('Launch failed:', result.error)
}
```

#### `MobileSdk.validatePayload(payload: any)`
Validate a game payload structure.

```typescript
const validation = MobileSdk.validatePayload(payload)
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors)
}
```

#### `MobileSdk.extractNoteDurations(payload: GamePayload)`
Extract note durations from payload for game timing.

```typescript
const durations = MobileSdk.extractNoteDurations(payload)
// Returns: [100, 100, 100, 200, ...]
```

#### `MobileSdk.getAvailableGames()`
Get all registered games.

```typescript
const games = MobileSdk.getAvailableGames()
games.forEach(game => console.log(game.displayName))
```

#### `MobileSdk.isValidGameId(gameId: string)`
Check if a game ID is valid.

```typescript
const isValid = MobileSdk.isValidGameId("2d6263d7-d4a4-4074-8be3-430120ac1cc5")
```

#### `MobileSdk.getGameById(gameId: string)`
Get game definition by ID.

```typescript
const game = MobileSdk.getGameById("2d6263d7-d4a4-4074-8be3-430120ac1cc5")
```

#### `MobileSdk.getGameByName(gameName: string)`
Get game definition by name.

```typescript
const game = MobileSdk.getGameByName("flappy-bird")
```

## Payload Structure

### GamePayload Interface

```typescript
interface GamePayload {
  userId: string                    // User identifier
  gameId: string                   // Game identifier
  notes?: {                        // Optional musical notes
    title: string                  // Song title
    measures: {                    // Musical measures
      notes: {                     // Individual notes
        beat: number               // Beat position
        pitch: string              // Note pitch (e.g., "E3")
        duration: number           // Note duration in milliseconds
      }[]
      measure_number: number       // Measure number
    }[]
    key_signature: string          // Key signature (e.g., "C")
    time_signature: string         // Time signature (e.g., "4/4")
  }
  [key: string]: any              // Additional properties
}
```

## Registered Games

### Flappy Bird
- **Game ID**: `2d6263d7-d4a4-4074-8be3-430120ac1cc5`
- **Name**: `flappy-bird`
- **Display Name**: Flappy Bird
- **Supported Payload Types**: `["notes"]`

The Flappy Bird game uses note durations to calculate pipe widths and note frequencies to determine gap positions.

## Game Registry

The SDK maintains a registry of all available games:

```typescript
const GAME_REGISTRY = {
  'flappy-bird': {
    id: '2d6263d7-d4a4-4074-8be3-430120ac1cc5',
    name: 'flappy-bird',
    displayName: 'Flappy Bird',
    component: FlappyBirdGame,
    supportedPayloadTypes: ['notes']
  }
}
```

## Error Handling

The SDK provides comprehensive error handling:

- **Invalid Payload**: Missing required fields
- **Game Not Found**: Invalid game ID
- **Launch Errors**: Component loading failures
- **Validation Errors**: Malformed note structures

## Testing

A complete test suite is available in `src/test/TestGameLauncher.tsx`:

- Payload validation tests
- Game registry tests  
- Launch functionality tests
- Live game launching

## File Structure

```
src/sdk/
├── index.ts                 # Main SDK exports
├── GameRegistry.ts          # Game registration system
├── GameLauncher.tsx         # Game launcher component
├── games/                   # Individual game components
│   └── flappy-bird/
│       ├── index.ts
│       └── FlappyBirdGame.tsx
├── example/
│   └── SDKDemo.tsx          # Usage examples
└── README.md               # This file
```

## Adding New Games

1. Create game component in `src/sdk/games/your-game/`
2. Add game to registry in `GameRegistry.ts`
3. Export from `src/sdk/games/your-game/index.ts`
4. Update main SDK exports in `src/sdk/index.ts`

## Development Server

The SDK is integrated into the mobile app's development environment. Use the "Test SDK" option in the home screen to access the testing suite.

## Support

For issues or questions about the Mobile SDK, please check the test suite first for usage examples and validation patterns.