import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type GamePhase = 'IDLE' | 'PLAYING' | 'DEAD';

interface Block {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
}

interface GameState {
  balls: Ball[];
  blocks: Block[];
  energy: number;
  health: number;
  score: number;
  wave: number;
  speed: number;
  lastEnergyRegen: number;
  lastEscalation: number;
  blockIdCounter: number;
  phase: GamePhase;
}

const COLORS = {
  root: '#07071a',
  arena: '#0a0a22',
  hud: '#0d0d28',
  energyActive: '#00ff88',
  energyInactive: '#0a2a18',
  healthActive: '#ff2255',
  healthInactive: '#2a050f',
  coreBar: '#1a0010',
  scoreText: '#e0e0ff',
  labelText: '#4a4a8a',
  flash: 'rgba(0,255,200,0.22)',
  startBtn: '#00ffcc',
  title: '#00ffcc',
  breached: '#ff1744',
  grid: 'rgba(30,30,80,0.3)',
} as const;

const BLOCK_COLORS = ['#00ffcc', '#00e5ff', '#18ffff', '#64ffda', '#1de9b6'] as const;
const BALL_COLORS = ['#ff1744', '#ff9100', '#d500f9'] as const;

const HUD_H = 80;
const CORE_H = 100;
const BALL_RADIUS = 13;
const BLOCK_H = 36;
const MAX_ENERGY = 8;
const MAX_HEALTH = 5;
const ENERGY_REGEN_MS = 900;
const ESCALATION_MS = 15000;
const INITIAL_SPEED = 4.5;
const SPEED_STEP = 1.2;
const COLS = 8;

function hapticImpact(style: Haptics.ImpactFeedbackStyle) {
  try { Haptics.impactAsync(style); } catch {}
}

function hapticNotify(type: Haptics.NotificationFeedbackType) {
  try { Haptics.notificationAsync(type); } catch {}
}

function randomBlockColor(): string {
  return BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
}

function makeBall(arenaW: number, speed: number, colorIdx: number): Ball {
  const angle = (Math.random() * (150 - 30) + 30) * (Math.PI / 180);
  const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
  const vy = Math.sin(angle) * speed;
  return {
    x: BALL_RADIUS + Math.random() * (arenaW - BALL_RADIUS * 2),
    y: BALL_RADIUS + 20 + Math.random() * 60,
    vx,
    vy: Math.abs(vy),
    color: BALL_COLORS[colorIdx % BALL_COLORS.length],
    radius: BALL_RADIUS,
  };
}

export default function BreachAndClear() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 20);

  const arenaTop = topInset + HUD_H;
  const arenaH = SCREEN_H - arenaTop - CORE_H - insets.bottom;
  const arenaW = SCREEN_W;
  const cellW = arenaW / COLS;
  const rows = Math.floor(arenaH / BLOCK_H);

  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [renderBalls, setRenderBalls] = useState<Ball[]>([]);
  const [renderBlocks, setRenderBlocks] = useState<Block[]>([]);
  const [energy, setEnergy] = useState<number>(MAX_ENERGY);
  const [health, setHealth] = useState<number>(MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [lowEnergy, setLowEnergy] = useState<boolean>(false);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const gsRef = useRef<GameState>({
    balls: [],
    blocks: [],
    energy: MAX_ENERGY,
    health: MAX_HEALTH,
    score: 0,
    wave: 1,
    speed: INITIAL_SPEED,
    lastEnergyRegen: 0,
    lastEscalation: 0,
    blockIdCounter: 0,
    phase: 'IDLE',
  });
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  const triggerFlash = useCallback(() => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [flashAnim]);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const syncUI = useCallback(() => {
    const gs = gsRef.current;
    setRenderBalls([...gs.balls]);
    setRenderBlocks([...gs.blocks]);
    setEnergy(gs.energy);
    setHealth(gs.health);
    setScore(gs.score);
    setWave(gs.wave);
    setLowEnergy(gs.energy < 2);
  }, []);

  const handleCoreDamage = useCallback(() => {
    const gs = gsRef.current;
    gs.health = Math.max(0, gs.health - 1);
    hapticNotify(Haptics.NotificationFeedbackType.Error);
    triggerFlash();
    triggerShake();
    if (gs.health <= 0) {
      gs.phase = 'DEAD';
      setPhase('DEAD');
      syncUI();
    }
  }, [triggerFlash, triggerShake, syncUI]);

  const gameLoop = useCallback((timestamp: number) => {
    const gs = gsRef.current;
    if (gs.phase !== 'PLAYING') return;

    if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
    const dt = Math.min(timestamp - lastFrameRef.current, 33);
    lastFrameRef.current = timestamp;
    const factor = dt / 16.67;

    if (timestamp - gs.lastEnergyRegen >= ENERGY_REGEN_MS) {
      if (gs.energy < MAX_ENERGY) {
        gs.energy = Math.min(MAX_ENERGY, gs.energy + 1);
      }
      gs.lastEnergyRegen = timestamp;
    }

    if (timestamp - gs.lastEscalation >= ESCALATION_MS) {
      gs.wave += 1;
      if (gs.balls.length < 3) {
        gs.balls.push(makeBall(arenaW, gs.speed, gs.balls.length));
      } else {
        gs.speed += SPEED_STEP;
        for (const ball of gs.balls) {
          const angle = Math.atan2(ball.vy, ball.vx);
          ball.vx = Math.cos(angle) * gs.speed;
          ball.vy = Math.sin(angle) * gs.speed;
        }
      }
      gs.lastEscalation = timestamp;
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    }

    let needsRender = false;

    for (let bi = 0; bi < gs.balls.length; bi++) {
      const ball = gs.balls[bi];
      ball.x += ball.vx * factor;
      ball.y += ball.vy * factor;

      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.radius >= arenaW) {
        ball.x = arenaW - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
      }

      if (ball.y + ball.radius >= arenaH) {
        handleCoreDamage();
        ball.x = ball.radius + Math.random() * (arenaW - ball.radius * 2);
        ball.y = ball.radius + 20 + Math.random() * 40;
        const angle = (Math.random() * (150 - 30) + 30) * (Math.PI / 180);
        ball.vx = Math.cos(angle) * gs.speed * (Math.random() > 0.5 ? 1 : -1);
        ball.vy = Math.abs(Math.sin(angle) * gs.speed);
        needsRender = true;
        continue;
      }

      let hitBlock = -1;
      for (let i = 0; i < gs.blocks.length; i++) {
        const blk = gs.blocks[i];
        const nearX = Math.max(blk.x, Math.min(ball.x, blk.x + blk.w));
        const nearY = Math.max(blk.y, Math.min(ball.y, blk.y + blk.h));
        const dx = ball.x - nearX;
        const dy = ball.y - nearY;
        if (dx * dx + dy * dy < ball.radius * ball.radius) {
          hitBlock = i;
          const overlapX = ball.radius - Math.abs(dx);
          const overlapY = ball.radius - Math.abs(dy);
          if (overlapX < overlapY) {
            ball.vx = -ball.vx;
            ball.x += ball.vx > 0 ? overlapX : -overlapX;
          } else {
            ball.vy = -ball.vy;
            ball.y += ball.vy > 0 ? overlapY : -overlapY;
          }
          break;
        }
      }
      if (hitBlock >= 0) {
        gs.blocks.splice(hitBlock, 1);
        gs.score += 10;
        hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
        triggerFlash();
        needsRender = true;
      }
    }

    syncUI();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [arenaW, arenaH, handleCoreDamage, syncUI, triggerFlash]);

  const startGame = useCallback(() => {
    const gs = gsRef.current;
    gs.health = MAX_HEALTH;
    gs.energy = MAX_ENERGY;
    gs.score = 0;
    gs.wave = 1;
    gs.speed = INITIAL_SPEED;
    gs.blocks = [];
    gs.blockIdCounter = 0;
    gs.balls = [makeBall(arenaW, INITIAL_SPEED, 0)];
    gs.phase = 'PLAYING';
    gs.lastEnergyRegen = 0;
    gs.lastEscalation = 0;
    lastFrameRef.current = 0;
    setPhase('PLAYING');
    syncUI();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [arenaW, syncUI, gameLoop]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'PLAYING') {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, gameLoop]);

  const handleArenaTap = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const gs = gsRef.current;
    if (gs.phase !== 'PLAYING') return;

    const tapX = evt.nativeEvent.locationX;
    const tapY = evt.nativeEvent.locationY;

    if (gs.energy <= 0) {
      hapticNotify(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const col = Math.floor(tapX / cellW);
    const row = Math.floor(tapY / BLOCK_H);
    const bx = col * cellW;
    const by = row * BLOCK_H;

    const occupied = gs.blocks.some(
      (b) => Math.abs(b.x - bx) < 1 && Math.abs(b.y - by) < 1
    );
    if (occupied) return;

    gs.energy -= 1;
    gs.blockIdCounter += 1;
    gs.blocks.push({
      id: gs.blockIdCounter,
      x: bx,
      y: by,
      w: cellW,
      h: BLOCK_H,
      color: randomBlockColor(),
    });
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    syncUI();
  }, [cellW, syncUI]);

  const renderPips = (count: number, max: number, activeColor: string, inactiveColor: string) => {
    const pips = [];
    for (let i = 0; i < max; i++) {
      pips.push(
        <View
          key={i}
          style={[
            styles.pip,
            {
              backgroundColor: i < count ? activeColor : inactiveColor,
              shadowColor: i < count ? activeColor : 'transparent',
              shadowOpacity: i < count ? 0.8 : 0,
              shadowRadius: i < count ? 6 : 0,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      );
    }
    return pips;
  };

  const renderHealthSegments = () => {
    const segs = [];
    for (let i = 0; i < MAX_HEALTH; i++) {
      segs.push(
        <View
          key={i}
          style={[
            styles.healthSeg,
            {
              backgroundColor: i < health ? COLORS.healthActive : COLORS.healthInactive,
              shadowColor: i < health ? COLORS.healthActive : 'transparent',
              shadowOpacity: i < health ? 0.9 : 0,
              shadowRadius: i < health ? 8 : 0,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      );
    }
    return segs;
  };

  const renderGridLines = () => {
    const lines: React.ReactNode[] = [];
    for (let c = 1; c < COLS; c++) {
      lines.push(
        <View
          key={`vc-${c}`}
          style={[styles.gridLineV, { left: c * cellW }]}
        />
      );
    }
    for (let r = 1; r < rows; r++) {
      lines.push(
        <View
          key={`hr-${r}`}
          style={[styles.gridLineH, { top: r * BLOCK_H }]}
        />
      );
    }
    return lines;
  };

  const scoreStr = String(score).padStart(5, '0');

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.hud}>
        <View style={styles.hudSection}>
          <Text style={styles.hudLabel}>ENERGY</Text>
          <View style={styles.pipRow}>
            {renderPips(energy, MAX_ENERGY, COLORS.energyActive, COLORS.energyInactive)}
          </View>
        </View>
        <View style={styles.hudCenter}>
          <Text style={styles.waveText}>WAVE {wave}</Text>
          <Text style={styles.scoreText}>{scoreStr}</Text>
        </View>
        <View style={styles.hudSection}>
          <Text style={styles.hudLabel}>CORE</Text>
          <View style={styles.pipRow}>
            {renderPips(health, MAX_HEALTH, COLORS.healthActive, COLORS.healthInactive)}
          </View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.arenaContainer,
          { height: arenaH, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleArenaTap}>
          <View style={styles.arena}>
            {renderGridLines()}

            {renderBlocks.map((blk) => (
              <View
                key={blk.id}
                style={[
                  styles.block,
                  {
                    left: blk.x,
                    top: blk.y,
                    width: blk.w,
                    height: blk.h,
                    borderColor: blk.color,
                    backgroundColor: blk.color + '25',
                    shadowColor: blk.color,
                  },
                ]}
              />
            ))}

            {renderBalls.map((ball, idx) => (
              <View
                key={`ball-${idx}`}
                style={[
                  styles.ball,
                  {
                    left: ball.x - ball.radius,
                    top: ball.y - ball.radius,
                    width: ball.radius * 2,
                    height: ball.radius * 2,
                    borderRadius: ball.radius,
                    backgroundColor: ball.color,
                    shadowColor: ball.color,
                  },
                ]}
              />
            ))}

            <Animated.View
              pointerEvents="none"
              style={[styles.flashOverlay, { opacity: flashAnim }]}
            />
          </View>
        </TouchableWithoutFeedback>

        {phase === 'IDLE' && (
          <View style={styles.overlay}>
            <Text style={styles.titleText}>BREACH</Text>
            <Text style={styles.titleAmp}>&</Text>
            <Text style={styles.titleText}>CLEAR</Text>
            <Text style={styles.instrText}>
              TAP THE ARENA TO PLACE FIREWALL BLOCKS
            </Text>
            <Text style={styles.instrText2}>
              STOP THE BREACHER FROM HITTING YOUR CORE
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={startGame}
              activeOpacity={0.7}
            >
              <Text style={styles.startBtnText}>▶  START</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'DEAD' && (
          <View style={styles.overlay}>
            <Text style={styles.deadText}>BREACHED</Text>
            <Text style={styles.deadScore}>SCORE: {scoreStr}</Text>
            <Text style={styles.deadWave}>WAVE {wave}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={startGame}
              activeOpacity={0.7}
            >
              <Text style={styles.retryBtnText}>↻  RETRY</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <View style={[styles.coreBar, { paddingBottom: insets.bottom }]}>
        <Text style={styles.coreLabel}>◆ CORE ◆</Text>
        <View style={styles.healthSegRow}>{renderHealthSegments()}</View>
        {lowEnergy && phase === 'PLAYING' && (
          <Text style={styles.lowEnergyWarn}>⚠ LOW ENERGY</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.root,
  },
  hud: {
    height: HUD_H,
    backgroundColor: COLORS.hud,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,200,0.08)',
  },
  hudSection: {
    alignItems: 'center',
    flex: 1,
  },
  hudCenter: {
    alignItems: 'center',
    flex: 1,
  },
  hudLabel: {
    color: COLORS.labelText,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 2,
    marginBottom: 6,
  },
  pipRow: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 18,
    height: 10,
    borderRadius: 2,
  },
  waveText: {
    color: COLORS.labelText,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 2,
    marginBottom: 2,
  },
  scoreText: {
    color: COLORS.scoreText,
    fontSize: 22,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
  },
  arenaContainer: {
    width: SCREEN_W,
    overflow: 'hidden',
  },
  arena: {
    flex: 1,
    backgroundColor: COLORS.arena,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: COLORS.grid,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.grid,
  },
  block: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  ball: {
    position: 'absolute',
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === 'web'
      ? {}
      : { elevation: 8 }),
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.flash,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,7,26,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  titleText: {
    color: COLORS.title,
    fontSize: 48,
    fontWeight: '900' as const,
    letterSpacing: 8,
    textShadowColor: COLORS.title,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleAmp: {
    color: COLORS.title,
    fontSize: 28,
    fontWeight: '300' as const,
    marginVertical: 2,
    opacity: 0.6,
  },
  instrText: {
    color: COLORS.labelText,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginTop: 28,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  instrText2: {
    color: COLORS.labelText,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  startBtn: {
    marginTop: 40,
    borderWidth: 2,
    borderColor: COLORS.startBtn,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 50,
    shadowColor: COLORS.startBtn,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  startBtnText: {
    color: COLORS.startBtn,
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 4,
  },
  deadText: {
    color: COLORS.breached,
    fontSize: 44,
    fontWeight: '900' as const,
    letterSpacing: 6,
    textShadowColor: COLORS.breached,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  deadScore: {
    color: COLORS.scoreText,
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 20,
    letterSpacing: 3,
  },
  deadWave: {
    color: COLORS.labelText,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
    letterSpacing: 2,
  },
  retryBtn: {
    marginTop: 36,
    borderWidth: 2,
    borderColor: COLORS.startBtn,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 50,
    shadowColor: COLORS.startBtn,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  retryBtnText: {
    color: COLORS.startBtn,
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 4,
  },
  coreBar: {
    backgroundColor: COLORS.coreBar,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,34,85,0.3)',
    minHeight: CORE_H,
  },
  coreLabel: {
    color: COLORS.healthActive,
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 4,
    textShadowColor: COLORS.healthActive,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  healthSegRow: {
    flexDirection: 'row',
    gap: 6,
  },
  healthSeg: {
    width: 44,
    height: 22,
    borderRadius: 4,
  },
  lowEnergyWarn: {
    color: '#ff9100',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginTop: 8,
    textShadowColor: '#ff9100',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
