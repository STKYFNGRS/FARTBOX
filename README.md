# 🎮 FART.BOX: Gas Dominance

A strategic territory control game built on Web3 technology, where players compete to dominate the map with their unique gas types!

## ✨ Features

### 🎯 Core Gameplay
- **Territory Control**: Claim and defend hexagonal tiles on the game board
- **Gas Types**: Choose from Green (balanced), Yellow (offensive), or Toxic (defensive) gas
- **Three Action Types**: 
  - **Emit Gas** (10 gas) - Basic territory capture
  - **Gas Bomb** (25 gas) - Powerful area attack with splash damage
  - **Boost Defense** (15 gas) - Fortify your territories
- **Real-time Multiplayer**: Play with up to 6 players per game
- **AI Opponents**: Include smart bots for practice and faster games

### 🎮 Game Actions
1. **Release Gas** (10 gas, 10s cooldown): Basic attack to claim or capture adjacent territories
2. **Gas Bomb** (25 gas, 45s cooldown): Powerful area attack that affects target and adjacent tiles
3. **Boost Defense** (15 gas, 30s cooldown): Temporarily fortify your territories with defense bonuses

### 🏆 Victory Conditions
- **Territorial Dominance**: Control 20+ territories to achieve victory
- **Strategic Positioning**: Use gas vents and territory adjacency to your advantage
- **Resource Efficiency**: Balance aggressive expansion with defensive positioning

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Web3 wallet (MetaMask recommended)

### Setup
1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd fartbox
   npm install
   ```

2. **Environment Setup**
   - Copy `env.example` to `.env.local`
   - Configure your environment variables

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Start Playing**
   - Connect your wallet
   - Visit the lobby: `http://localhost:3000/lobby`
   - Create or join a game
   - Start strategizing!

## 🎮 How to Play

### Getting Started
1. **Connect Wallet**: Use the connect button to link your Web3 wallet
2. **Join Lobby**: Navigate to `/lobby` to see available games
3. **Create Game**: Set up a new game with custom settings:
   - Max players (2-6)
   - Include AI bots for testing
   - Game duration settings

### During Gameplay
1. **Select Action**: Choose from Release Gas, Gas Bomb, or Boost Defense
2. **Target Selection**: Click highlighted tiles to execute your action
3. **Strategic Planning**: 
   - Plan your expansion route
   - Control gas vents for bonuses
   - Defend key territories
   - Attack weak opponent positions

### Winning Strategy
- **Early Game**: Secure gas vents and expand efficiently
- **Mid Game**: Form defensive positions and pressure opponents
- **Late Game**: Push for territorial dominance while maintaining defenses

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Web3**: Wagmi + Reown AppKit for wallet connections
- **Database**: Serverless PostgreSQL
- **Smart Contracts**: Solidity (coming soon)
- **Deployment**: Vercel-ready

## 🌟 Recent Improvements

### Enhanced UX
- ✅ **Interactive Game Board**: Click-to-select territory targeting
- ✅ **Real-time Visual Feedback**: Highlighted valid moves and action states
- ✅ **Proper Action System**: Working attack, bomb, and defense mechanics
- ✅ **Cooldown Management**: Visual cooldown timers and gas cost display
- ✅ **Game State Sync**: Real-time polling for multiplayer updates

### Performance
- ✅ **Optimized Database**: Proper indexing and query optimization
- ✅ **Responsive Design**: Mobile-friendly game controls
- ✅ **Smooth Animations**: Enhanced CSS animations for better engagement

## 🎯 Current Status

**Fully Functional Features:**
- ✅ Lobby system with game creation/joining
- ✅ Interactive game board with territory control
- ✅ Three distinct action types (emit, bomb, defend)
- ✅ Resource management and cooldown system
- ✅ Bot players for testing
- ✅ Real-time game state updates
- ✅ Victory conditions and game completion

**In Development:**
- 🔄 Smart contract integration for true Web3 gameplay
- 🔄 NFT-based player enhancements
- 🔄 Seasonal gameplay with larger maps
- 🔄 Token economy and rewards system

## 🤝 Contributing

We welcome contributions! The game is designed to be:
- **Skill-based**: Strategy matters more than spending
- **Accessible**: Free-to-play with optional enhancements
- **Social**: Multiplayer competitive gameplay
- **Fair**: Balanced mechanics for all player types

## 🎮 Play Now

1. Start the development server: `npm run dev`
2. Visit: `http://localhost:3000`
3. Connect wallet and head to `/lobby`
4. Create a game with bots to test solo, or invite friends!

---

**Gas up and dominate the map! 💨**
