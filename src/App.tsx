import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { BlockType, BLOCK_DEFS } from './game/constants';
import { VoxelWorld } from './game/world/VoxelWorld';
import { PlayerPhysics } from './game/physics/PlayerPhysics';
import { FirstPersonHand } from './game/entities/FirstPersonHand';
import { Avatar } from './game/entities/Avatar';
import { SoundEffects } from './game/audio/SoundEffects';
import { MultiplayerClient } from './game/network/MultiplayerClient';
import { ChatMessage } from './game/network/types';
import { WorldEventManager, WorldEvent } from './game/events/WorldEventManager';
import { PlayerStats } from './game/player/PlayerStats';
import { BlockBreakParticles } from './game/particles/BlockBreakParticles';

import { TitleScreen } from './components/TitleScreen';
import { GameUI } from './components/GameUI';
import { Hotbar } from './components/Hotbar';
import { ChatOverlay } from './components/ChatOverlay';
import { TouchControls } from './components/TouchControls';
import { CraftingModal } from './components/CraftingModal';
import { EventBanner } from './components/EventBanner';
import { Minimap } from './components/Minimap';
import { PlayerStatsBar } from './components/PlayerStatsBar';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING'>('TITLE');
  const [playerName, setPlayerName] = useState('Стив');
  const [playerColor, setPlayerColor] = useState('#00d26a');
  const [roomId, setRoomId] = useState('default');
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);

  const [selectedBlock, setSelectedBlock] = useState<BlockType>(BlockType.GRASS);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [craftingGridSize, setCraftingGridSize] = useState<2 | 3 | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [cameraMode, setCameraMode] = useState<'FIRST_PERSON' | 'THIRD_PERSON'>('FIRST_PERSON');

  const [activeEvent, setActiveEvent] = useState<WorldEvent | null>(null);
  const [eventTimer, setEventTimer] = useState(0);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerCount, setPlayerCount] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const [minimapPos, setMinimapPos] = useState({ x: 0, y: 25, z: 0 });
  const [minimapYaw, setMinimapYaw] = useState(0);

  const [health, setHealth] = useState(20);
  const [hunger, setHunger] = useState(20);
  const [armorPoints, setArmorPoints] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Engine refs
  const worldRef = useRef<VoxelWorld | null>(null);
  const physicsRef = useRef<PlayerPhysics | null>(null);
  const handRef = useRef<FirstPersonHand | null>(null);
  const networkRef = useRef<MultiplayerClient | null>(null);
  const avatarsRef = useRef<Map<string, Avatar>>(new Map());
  const eventManagerRef = useRef<WorldEventManager | null>(null);
  const statsRef = useRef<PlayerStats>(new PlayerStats());
  const particlesRef = useRef<BlockBreakParticles | null>(null);

  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0);
  const moveInputRef = useRef({ x: 0, z: 0 });
  const isPointerLockedRef = useRef(false);
  const keysPressedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartGame = (name: string, color: string, room: string, singlePlayer: boolean) => {
    setPlayerName(name);
    setPlayerColor(color);
    setRoomId(room);
    setIsSinglePlayer(singlePlayer);
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState !== 'PLAYING' || !canvasMountRef.current) return;

    const mount = canvasMountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialSky = new THREE.Color(0x87ceeb);
    scene.background = initialSky;
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 250);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(50, 100, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const sunGeo = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea78 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const moonGeo = new THREE.BoxGeometry(8, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x55a137, 0.6);
    scene.add(hemiLight);

    const voxelWorld = new VoxelWorld(42);
    worldRef.current = voxelWorld;
    scene.add(voxelWorld.sceneGroup);

    const playerPhysics = new PlayerPhysics();
    physicsRef.current = playerPhysics;

    const eventManager = new WorldEventManager(scene, voxelWorld);
    eventManagerRef.current = eventManager;

    const breakParticles = new BlockBreakParticles(scene);
    particlesRef.current = breakParticles;

    const hand = new FirstPersonHand();
    handRef.current = hand;
    camera.add(hand.group);
    scene.add(camera);

    const outlineGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const outlineMesh = new THREE.LineSegments(new THREE.EdgesGeometry(outlineGeo), outlineMat);
    outlineMesh.visible = false;
    scene.add(outlineMesh);

    if (!isSinglePlayer) {
      const net = new MultiplayerClient();
      networkRef.current = net;

      net.onInit(({ playerId, players, blockChanges }) => {
        voxelWorld.applyServerBlockChanges(blockChanges);
        setPlayerCount(players.length + 1);

        players.forEach((p) => {
          const avatar = new Avatar(p.id, p.name, p.color);
          avatar.targetPosition.set(p.x, p.y, p.z);
          avatar.targetYaw = p.yaw;
          avatarsRef.current.set(p.id, avatar);
          scene.add(avatar.mesh);
        });
      });

      net.onPlayerJoined((p) => {
        const avatar = new Avatar(p.id, p.name, p.color);
        avatar.targetPosition.set(p.x, p.y, p.z);
        avatarsRef.current.set(p.id, avatar);
        scene.add(avatar.mesh);
        setPlayerCount((prev) => prev + 1);
      });

      net.onPlayerMoved((p) => {
        const avatar = avatarsRef.current.get(p.id);
        if (avatar) {
          avatar.targetPosition.set(p.x, p.y, p.z);
          avatar.targetYaw = p.yaw;
          avatar.targetPitch = p.pitch;
          avatar.isMoving = p.isMoving;
          avatar.updateHeldBlock(p.holdingBlock as BlockType);
        }
      });

      net.onPlayerLeft((id) => {
        const avatar = avatarsRef.current.get(id);
        if (avatar) {
          scene.remove(avatar.mesh);
          avatar.dispose();
          avatarsRef.current.delete(id);
          setPlayerCount((prev) => Math.max(1, prev - 1));
        }
      });

      net.onBlockUpdate(({ x, y, z, blockId }) => {
        const currentBlock = voxelWorld.getBlock(x, y, z);
        voxelWorld.setBlock(x, y, z, blockId as BlockType);

        if (blockId === BlockType.AIR) {
          if (particlesRef.current && currentBlock !== BlockType.AIR) {
            particlesRef.current.spawnBreakBurst(x, y, z, currentBlock);
          }
          SoundEffects.getInstance().playBreakSound();
        } else {
          SoundEffects.getInstance().playPlaceSound();
        }
      });

      net.onChat((msg) => {
        setChatMessages((prev) => [...prev.slice(-49), msg]);
      });

      net.connect(roomId, playerName, playerColor);
    } else {
      setPlayerCount(1);
    }

    playerPhysics.position.set(0, voxelWorld.getBlock(0, 25, 0) ? 30 : 25, 0);

    const handlePointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const handleCanvasClick = () => {
      if (!isMobile && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLockedRef.current) {
        const sensitivity = 0.0025;
        cameraYawRef.current -= e.movementX * sensitivity;
        cameraPitchRef.current -= e.movementY * sensitivity;
        cameraPitchRef.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, cameraPitchRef.current));
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;

      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 8) {
          const block = [
            BlockType.GRASS, BlockType.DIRT, BlockType.STONE, BlockType.COBBLESTONE,
            BlockType.WOOD, BlockType.PLANKS, BlockType.CRAFTING_TABLE, BlockType.CHEST
          ][digit - 1];
          setSelectedBlock(block);
          hand.setHeldBlock(block);
        }
      }

      if (e.code === 'KeyF') setIsFlying((prev) => !prev);
      if (e.code === 'F5') { e.preventDefault(); setCameraMode((prev) => (prev === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON')); }
      if (e.code === 'KeyE') setCraftingGridSize(2);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleMouseDown = (e: MouseEvent) => {
      if (!isPointerLockedRef.current || !worldRef.current) return;

      const hit = worldRef.current.raycast(camera.position, camera.getWorldDirection(new THREE.Vector3()), 6.0);

      if (eventManagerRef.current && hit && eventManagerRef.current.attackMobAt(hit.hitPoint)) {
        hand.triggerSwing();
        return;
      }

      if (!hit) return;

      if (e.button === 0) {
        hand.triggerSwing();
        const oldBlock = voxelWorld.getBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z);
        voxelWorld.setBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, BlockType.AIR);

        if (particlesRef.current) {
          particlesRef.current.spawnBreakBurst(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, oldBlock);
        }

        if (networkRef.current) networkRef.current.sendBlockUpdate(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, BlockType.AIR);
      } else if (e.button === 2) {
        hand.triggerSwing();

        if (hit.blockType === BlockType.CRAFTING_TABLE) {
          setCraftingGridSize(3);
          document.exitPointerLock();
          return;
        }

        const placePos = hit.blockPos.clone().add(hit.faceNormal);
        voxelWorld.setBlock(placePos.x, placePos.y, placePos.z, selectedBlock);
        if (networkRef.current) networkRef.current.sendBlockUpdate(placePos.x, placePos.y, placePos.z, selectedBlock);
      }
    };
    window.addEventListener('mousedown', handleMouseDown);

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    let singlePlayerEventTimer = 0;
    let dayTime = 0.25;
    let minimapSyncTimer = 0;
    let mobAttackTimer = 0;

    const clock = new THREE.Clock();
    let netSyncTimer = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = clock.getDelta();

      const playerX = playerPhysics.position.x;
      const playerY = playerPhysics.position.y;
      const playerZ = playerPhysics.position.z;

      const isPlayerMoving = moveInputRef.current.x !== 0 || moveInputRef.current.z !== 0;

      statsRef.current.update(dt, playerY, playerPhysics.isGrounded, isPlayerMoving);
      setHealth(statsRef.current.health);
      setHunger(statsRef.current.hunger);
      setArmorPoints(statsRef.current.getTotalArmorPoints());
      setIsDead(statsRef.current.isDead);
      setDamageFlash(statsRef.current.damageFlashTimer > 0);

      mobAttackTimer += dt;
      if (mobAttackTimer > 1.0) {
        mobAttackTimer = 0;
        eventManager.mobs.forEach((mob) => {
          if (mob.position.distanceTo(playerPhysics.position) < 1.8) {
            statsRef.current.takeDamage(4);
          }
        });
      }

      // Update flying block particles
      breakParticles.update(dt);

      dayTime = (dayTime + dt * (1 / 180)) % 1;
      const sunAngle = dayTime * Math.PI * 2;
      const sunRadius = 160;

      const sunX = Math.cos(sunAngle) * sunRadius;
      const sunY = Math.sin(sunAngle) * sunRadius;
      const sunZ = Math.sin(sunAngle * 0.3) * 40;

      sunLight.position.set(playerX + sunX, playerY + sunY, playerZ + sunZ);
      sunMesh.position.set(playerX + sunX, playerY + sunY, playerZ + sunZ);
      moonMesh.position.set(playerX - sunX, playerY - sunY, playerZ - sunZ);

      const sunFactor = Math.sin(sunAngle);

      let currentSkyColor: THREE.Color;
      let currentSunColor: THREE.Color;
      let currentSunIntensity = 1.4;

      if (sunFactor > 0.15) {
        currentSkyColor = new THREE.Color(0x87ceeb);
        currentSunColor = new THREE.Color(0xfffaed);
        currentSunIntensity = 1.3;
      } else if (sunFactor > -0.15) {
        const t = (sunFactor + 0.15) / 0.3;
        currentSkyColor = new THREE.Color(0x0f172a).lerp(new THREE.Color(0xfdba74), t);
        currentSunColor = new THREE.Color(0xf97316);
        currentSunIntensity = 0.5 + t * 0.8;
      } else {
        currentSkyColor = new THREE.Color(0x0f172a);
        currentSunColor = new THREE.Color(0x94a3b8);
        currentSunIntensity = 0.25;
      }

      scene.background = currentSkyColor;
      if (scene.fog) scene.fog.color = currentSkyColor;
      sunLight.color = currentSunColor;
      sunLight.intensity = currentSunIntensity;
      hemiLight.intensity = Math.max(0.2, currentSunIntensity * 0.6);

      if (!isMobile) {
        let mx = 0;
        let mz = 0;
        if (keysPressedRef.current['KeyW']) mz += 1;
        if (keysPressedRef.current['KeyS']) mz -= 1;
        if (keysPressedRef.current['KeyA']) mx -= 1;
        if (keysPressedRef.current['KeyD']) mx += 1;
        moveInputRef.current = { x: mx, z: mz };
      }

      const jumpReq = keysPressedRef.current['Space'] || false;
      const sneakReq = keysPressedRef.current['ShiftLeft'] || false;

      playerPhysics.isFlying = isFlying;
      playerPhysics.update(dt, moveInputRef.current, cameraYawRef.current, jumpReq, sneakReq, voxelWorld);

      voxelWorld.updateChunksAroundPlayer(playerX, playerZ);

      minimapSyncTimer += dt;
      if (minimapSyncTimer > 0.1) {
        minimapSyncTimer = 0;
        setMinimapPos({ x: playerX, y: playerY, z: playerZ });
        setMinimapYaw(cameraYawRef.current);
      }

      if (isSinglePlayer) {
        singlePlayerEventTimer += dt;
        if (singlePlayerEventTimer > 45) {
          singlePlayerEventTimer = 0;
          const eventsList = [
            { id: 'METEOR_SHOWER', title: 'МЕТЕОРИТНЫЙ ДОЖДЬ', desc: 'С неба падают метеориты с обсидианом и алмазами!', duration: 25 },
            { id: 'MOB_INVASION', title: 'ВНЕЗАПНОЕ НАПАДЕНИЕ', desc: 'На вас напала орда монстров!', duration: 30 },
            { id: 'TREASURE_DROP', title: 'РЕДКАЯ НАХОДКА', desc: 'Рядом упал сундук с сокровищами!', duration: 35 },
          ];
          const ev = eventsList[Math.floor(Math.random() * eventsList.length)];
          eventManager.triggerEvent(ev, playerPhysics.position);
          setActiveEvent(ev);
        }
      }

      eventManager.update(dt, playerPhysics.position);
      setEventTimer(eventManager.eventTimeRemaining);

      let camShakeX = 0;
      let camShakeY = 0;
      if (statsRef.current.screenShakeTimer > 0) {
        camShakeX = (Math.random() - 0.5) * 0.2;
        camShakeY = (Math.random() - 0.5) * 0.2;
      }

      if (cameraMode === 'FIRST_PERSON') {
        camera.position.set(playerX + camShakeX, playerY + 1.62 + camShakeY, playerZ);
        camera.rotation.set(cameraPitchRef.current, cameraYawRef.current, 0, 'YXZ');
        hand.group.visible = true;
      } else {
        const dist = 4.0;
        const camX = playerX + Math.sin(cameraYawRef.current) * dist + camShakeX;
        const camZ = playerZ + Math.cos(cameraYawRef.current) * dist;
        const camY = playerY + 2.5 + camShakeY;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(playerX, playerY + 1.2, playerZ);
        hand.group.visible = false;
      }

      hand.update(dt, isPlayerMoving);

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const rayHit = voxelWorld.raycast(camera.position, camDir, 6.0);

      if (rayHit) {
        outlineMesh.position.set(rayHit.blockPos.x + 0.5, rayHit.blockPos.y + 0.5, rayHit.blockPos.z + 0.5);
        outlineMesh.visible = true;
      } else {
        outlineMesh.visible = false;
      }

      if (!isSinglePlayer && networkRef.current) {
        netSyncTimer += dt;
        if (netSyncTimer > 0.05) {
          netSyncTimer = 0;
          networkRef.current.sendMove(
            playerX,
            playerY,
            playerZ,
            cameraYawRef.current,
            cameraPitchRef.current,
            selectedBlock,
            isPlayerMoving,
            !playerPhysics.isGrounded
          );
        }
      }

      avatarsRef.current.forEach((avatar) => avatar.update(dt));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);

      if (networkRef.current) networkRef.current.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [gameState, roomId, isSinglePlayer]);

  const handleMobileMine = () => {
    if (!worldRef.current || !physicsRef.current) return;
    const cameraDir = new THREE.Vector3(-Math.sin(cameraYawRef.current), Math.sin(cameraPitchRef.current), -Math.cos(cameraYawRef.current));
    const hit = worldRef.current.raycast(physicsRef.current.position, cameraDir, 6.0);
    if (hit) {
      if (handRef.current) handRef.current.triggerSwing();

      const oldBlock = worldRef.current.getBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z);
      worldRef.current.setBlock(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, BlockType.AIR);

      if (particlesRef.current) {
        particlesRef.current.spawnBreakBurst(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, oldBlock);
      }

      if (networkRef.current) networkRef.current.sendBlockUpdate(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z, BlockType.AIR);
    }
  };

  const handleMobilePlace = () => {
    if (!worldRef.current || !physicsRef.current) return;
    const cameraDir = new THREE.Vector3(-Math.sin(cameraYawRef.current), Math.sin(cameraPitchRef.current), -Math.cos(cameraYawRef.current));
    const hit = worldRef.current.raycast(physicsRef.current.position, cameraDir, 6.0);
    if (hit) {
      if (handRef.current) handRef.current.triggerSwing();

      if (hit.blockType === BlockType.CRAFTING_TABLE) {
        setCraftingGridSize(3);
        return;
      }

      const placePos = hit.blockPos.clone().add(hit.faceNormal);
      worldRef.current.setBlock(placePos.x, placePos.y, placePos.z, selectedBlock);
      if (networkRef.current) networkRef.current.sendBlockUpdate(placePos.x, placePos.y, placePos.z, selectedBlock);
    }
  };

  const handleMobileJump = () => {
    keysPressedRef.current['Space'] = true;
    setTimeout(() => { keysPressedRef.current['Space'] = false; }, 200);
  };

  if (gameState === 'TITLE') {
    return <TitleScreen onStartGame={handleStartGame} />;
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Top-Down Radar Minimap */}
      <Minimap
        world={worldRef.current}
        playerPos={minimapPos}
        playerYaw={minimapYaw}
        otherAvatars={avatarsRef.current}
      />

      {/* Health, Hunger & Armor Status Bar */}
      <PlayerStatsBar
        health={health}
        maxHealth={20}
        hunger={hunger}
        maxHunger={20}
        armorPoints={armorPoints}
        isDead={isDead}
        damageFlash={damageFlash}
        onEatFood={() => statsRef.current.eatFood(5)}
        onRespawn={() => {
          statsRef.current.respawn(25);
          if (physicsRef.current) physicsRef.current.position.set(0, 30, 0);
        }}
      />

      {/* Random Event Banner */}
      <EventBanner event={activeEvent} timeRemaining={eventTimer} />

      {/* Game UI */}
      <GameUI
        playerCount={isSinglePlayer ? 1 : playerCount}
        maxPlayers={15}
        roomId={isSinglePlayer ? 'Одиночная игра' : roomId}
        isFlying={isFlying}
        onToggleFly={() => setIsFlying((prev) => !prev)}
        onToggleCamera={() => setCameraMode((prev) => (prev === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON'))}
        onExitGame={() => setGameState('TITLE')}
      />

      {/* Multiplayer Chat Overlay */}
      {!isSinglePlayer && (
        <ChatOverlay
          messages={chatMessages}
          onSendMessage={(text) => {
            if (networkRef.current) networkRef.current.sendChat(text);
          }}
        />
      )}

      {/* Hotbar */}
      <Hotbar
        selectedBlock={selectedBlock}
        onSelectBlock={(b) => {
          setSelectedBlock(b);
          if (handRef.current) handRef.current.setHeldBlock(b);
        }}
        isInventoryOpen={isInventoryOpen}
        setIsInventoryOpen={setIsInventoryOpen}
      />

      {/* Crafting Grid & Equipment Modal */}
      {craftingGridSize && (
        <CraftingModal
          gridSize={craftingGridSize}
          equippedArmor={{
            helmet: statsRef.current.helmet,
            chestplate: statsRef.current.chestplate,
            leggings: statsRef.current.leggings,
          }}
          onClose={() => setCraftingGridSize(null)}
          onCraftItem={(itemId) => {
            if (itemId <= 24) {
              setSelectedBlock(itemId as BlockType);
              if (handRef.current) handRef.current.setHeldBlock(itemId as BlockType);
            }
            SoundEffects.getInstance().playPopSound();
          }}
          onEquipArmor={(itemId) => {
            statsRef.current.equipArmor(itemId);
            setArmorPoints(statsRef.current.getTotalArmorPoints());
          }}
        />
      )}

      {/* Touch Controls for Mobile */}
      {isMobile && (
        <TouchControls
          onMoveInput={(move) => { moveInputRef.current = move; }}
          onLookInput={(dx, dy) => {
            cameraYawRef.current -= dx * 1.5;
            cameraPitchRef.current -= dy * 1.5;
            cameraPitchRef.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, cameraPitchRef.current));
          }}
          onMine={handleMobileMine}
          onPlace={handleMobilePlace}
          onJump={handleMobileJump}
          onToggleFly={() => setIsFlying((prev) => !prev)}
          onToggleCamera={() => setCameraMode((prev) => (prev === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON'))}
          onOpenInventory={() => setCraftingGridSize(2)}
          isFlying={isFlying}
        />
      )}
    </div>
  );
}
