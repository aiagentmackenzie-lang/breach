# Breach & Clear Arcade

A fast-paced cyberpunk arcade game for iOS and Android. Defend your CORE from waves of BREACHERS by placing FIREWALL blocks in real-time. Simple to learn, difficult to master.

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.81.5-blue" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-54.0.27-black" alt="Expo">
  <img src="https://img.shields.io/badge/iOS-17+-lightgrey" alt="iOS 17+">
  <img src="https://img.shields.io/badge/Android-API%2021+-brightgreen" alt="Android">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

---

## 🎮 What is Breach & Clear?

**Breach & Clear Arcade** is a reflex-based arcade game with tower defense elements. Neon-soaked visuals meet frantic gameplay as you race to block bouncing projectiles before they breach your core.

### The Premise
You're defending a critical system CORE from incoming BREACHERS. Tap to place FIREWALL BLOCKS and deflect the breachers. Each block destroyed scores points. If a breacher hits your core, you take damage. Survive escalating waves to achieve the highest score.

---

## 🕹️ How to Play

### Core Mechanics
| Action | Description |
|--------|-------------|
| **TAP** | Place a firewall block at tap location |
| **BOUNCE** | Breachers ricochet off placed blocks |
| **SCORE** | Each block destroyed = +10 points |
| **SURVIVE** | Don't let breachers hit your core |

### Game Systems

**🔋 ENERGY (8 Max)**
- Each block costs 1 energy
- Energy regenerates automatically (~1 per second)
- Manage your energy — spamming blocks leaves you vulnerable

**💔 CORE HEALTH (5 Lives)**
- Breachers hitting bottom = -1 health
- Game Over at 0 health
- No continues. Run reset.

**⚡ ESCALATION**
- Every 15 seconds: difficulty increases
- Wave counter increments
- Speed increases OR new breacher spawns
- Maximum 3 breachers on screen

### Controls
- **Single tap** anywhere in the arena to place a block
- Tap strategically to create angled deflections
- Chain bounces for maximum efficiency

---

## 🎨 Visual Design

Dark cyberpunk aesthetic with neon accents:
- Deep navy/black backgrounds (`#07071a`)
- Electric cyan/green energy indicators (`#00ff88`)
- Emergency red health warnings (`#ff2255`)
- Glowing neon blocks with bloom effects
- Grid overlay on playfield
- Screen shake on damage
- Flash effects on impact

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform native mobile framework |
| **Expo** | Development platform & build tooling |
| **Expo Router** | File-based routing |
| **TypeScript** | Type-safe development |
| **Zustand** | State management |
| **React Query** | Server state (future multiplayer) |
| **Expo Haptics** | Tactile feedback |

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- [Bun](https://bun.sh/) runtime
- iOS Simulator (macOS + Xcode) or Android Emulator

### Setup

```bash
# Clone the repository
git clone https://github.com/aiagentmackenzie-lang/breach.git
cd breach

# Install dependencies
bun install

# Start development server
bun run start
```

### Running on Device

**iOS Simulator:**
```bash
bun run start
# Press "i" in terminal to launch iOS Simulator
```

**Android Emulator:**
```bash
bun run start
# Press "a" in terminal to launch Android Emulator
```

**Physical Device:**
1. Install Expo Go from App Store / Play Store
2. Run `bun run start`
3. Scan QR code with device camera

**Web Preview:**
```bash
bun run start-web
```

---

## 📱 Building for Production

### iOS (App Store)

```bash
# Install EAS CLI
bun i -g @expo/eas-cli

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android (Google Play)

```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

---

## 🎮 Game Architecture

```
app/
├── index.tsx          # Main game screen (single-file game engine)
├── _layout.tsx        # Root layout with providers
├── +native-intent.tsx # Native deep linking
└── +not-found.tsx     # 404 handler

assets/
└── images/            # App icons, splash, favicon

constants/
└── colors.ts          # Theme configuration
```

### Game Loop Implementation
- **RequestAnimationFrame** for 60fps smooth gameplay
- **Physics engine** built with custom collision detection
- **State management** via refs for performance
- **React state** synced for UI rendering only

### Collision Detection
```typescript
// Circle (ball) vs Rectangle (block) collision
for each ball:
  for each block:
    find closest point on rect to circle center
    if distance < ball.radius:
      calculate reflection vector
      apply bounce physics
      destroy block
      add score
```

---

## 🎯 Future Features

- [ ] **Power-ups**: Shield, Freeze Time, Multi-ball
- [ ] **Leaderboards**: Global high scores via Supabase
- [ ] **Skins**: Unlockable themes and color schemes
- [ ] **Sound Design**: Synthwave soundtrack and SFX
- [ ] **Combo System**: Chain reactions for bonus points
- [ ] **Boss Waves**: Special patterns every 10 waves
- [ ] **Zen Mode**: No damage, just score chasing
- [ ] **Multiplayer**: 1v1 competitive mode

---

## 🐛 Known Issues

- Web version may have slight timing differences vs native
- Shake animation can occasionally stutter on older devices
- Energy regeneration pauses when app is backgrounded

---

## 📝 Development Notes

### Performance Optimizations
- Game state stored in refs, not React state
- UI only re-renders on score/health/energy changes
- `requestAnimationFrame` decoupled from React render cycle
- Platform-specific shadow/elevation handling

### Haptic Feedback
- **Light Impact**: Block placed
- **Heavy Impact**: Block destroyed
- **Notification Error**: Core damaged
- **Notification Success**: Wave escalation
- **Notification Warning**: Low energy tap

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 👥 Credits

**Developed by:**
- **Raphael Main** — Creator & Developer
- **Agent Mackenzie** — AI Development Partner

📧 Contact: [aiagent.mackenzie@gmail.com](mailto:aiagent.mackenzie@gmail.com)

---

## 🙋 FAQ

**Q: Is this game free?**  
A: Yes, completely free. No ads, no in-app purchases.

**Q: Is there a leaderboard?**  
A: Not yet — local high score only for now. Online leaderboards coming in v2.

**Q: Why does the screen shake?**  
A: Visual feedback when your core takes damage. Adds tension!

**Q: Can I pause the game?**  
A: Backgrounding the app automatically pauses. No in-game pause button — arcade purity.

**Q: What happens when I hit wave 100?**  
A: Try it and find out. Good luck.

---

<p align="center">
  <sub>⚡ Defend the core. Survive the breach. ⚡</sub>
</p>
