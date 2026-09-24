import * as THREE from "./node_modules/three/build/three.module.js";
import { animateCombatCat, createCombatCat } from "./cat-rig.js";
import { createReplayAdService, isNativeIosRuntime } from "./ads.js";
import { createAnalytics } from "./analytics.js";

(() => {
  const byId = (...ids) => ids.map((id) => document.getElementById(id)).find(Boolean);
  const canvas = document.getElementById("game");
  const overlay = document.getElementById("overlay");
  const startButton = byId("start-button", "start");
  const overlayNote = byId("overlay-note");
  const adStatus = byId("ad-status");
  const privacyOptionsButton = byId("privacy-options-button");
  const p1HealthValue = byId("p1-health", "p1");
  const p2HealthValue = byId("p2-health", "p2");
  const p1HealthBar = document.getElementById("p1-health-bar");
  const p2HealthBar = document.getElementById("p2-health-bar");
  const p1ShieldBar = document.getElementById("p1-shield-bar");
  const p2ShieldBar = document.getElementById("p2-shield-bar");
  const p1ShieldValue = document.getElementById("p1-shield");
  const p2ShieldValue = document.getElementById("p2-shield");
  const p2NameLabel = document.querySelector(".p2-panel .player-heading strong");
  const p1ScoreValue = byId("p1-score", "s1");
  const p2ScoreValue = byId("p2-score", "s2");
  const streakValue = document.getElementById("streak");
  const bestScoreValue = document.getElementById("best-score");
  const coinsValue = document.getElementById("coins");
  const rankValue = document.getElementById("rank");
  const dailyMissionValue = document.getElementById("daily-mission");
  const dailyRewardValue = document.getElementById("daily-reward");
  const riftChargeValue = document.getElementById("rift-charge");
  const riftStateValue = document.getElementById("rift-state");
  const enemiesValue = document.getElementById("enemies");
  const timerValue = document.getElementById("timer");
  const statusValue = document.getElementById("status");
  const topAlertFill = document.getElementById("top-alert-fill");
  const topAlertText = document.getElementById("top-alert-text");
  const touchStick = document.getElementById("touch-stick");
  const touchStickKnob = document.getElementById("touch-stick-knob");
  const touchPause = document.getElementById("touch-pause");
  const touchJump = document.getElementById("touch-jump");
  const touchSurge = document.getElementById("touch-surge");
  const touchFire = document.getElementById("touch-fire");
  const touchDash = document.getElementById("touch-dash");
  const dashChargeValue = document.getElementById("dash-charge");
  const combatFeedback = document.getElementById("combat-feedback");
  const damageVignette = document.getElementById("damage-vignette");
  const incomingWarning = document.getElementById("incoming-warning");
  const incomingWarningDirection = document.getElementById("incoming-warning-direction");
  const incomingWarningText = document.getElementById("incoming-warning-text");
  const incomingWarningHint = document.getElementById("incoming-warning-hint");
  const directorStateValue = document.getElementById("director-state");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const muteButton = document.getElementById("mute-button");

  const isCompactTouch = matchMedia("(pointer: coarse), (max-width: 760px)").matches;
  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const cameraTuning = Object.freeze({
    baseFov: isCompactTouch ? 76 : 70,
    followDistance: isCompactTouch ? 16.6 : 15.2,
    sideOffset: isCompactTouch ? 1.9 : 2.25,
    height: isCompactTouch ? 5.35 : 4.75,
    lookAhead: 19,
  });
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isCompactTouch,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isCompactTouch ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = !isCompactTouch;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06101a, 0.012);
  const camera = new THREE.PerspectiveCamera(cameraTuning.baseFov, innerWidth / innerHeight, 0.1, 600);
  const root = new THREE.Group();
  scene.add(root);

  const clock = new THREE.Clock();
  const fixedStep = 1 / 60;
  const playerSurfaceOffset = 1.02;
  const localPlayerId = "p1";
  const rivalPlayerId = "p2";
  const actionTuning = Object.freeze({
    groundSpeed: 31,
    dashSpeed: 52,
    groundResponse: 16,
    idleResponse: 19,
    airAcceleration: 44,
    jumpSpeed: 46,
    groundedGravity: 56,
    launchGravity: 50,
    returnGravity: 112,
    gravityRampTime: 0.62,
    distantGravityBonus: 32,
    descendingGravityBonus: 18,
    dashCooldown: 1.5,
    shotSpeed: 104,
    shotCooldown: 0.115,
    surgeShotCooldown: 0.065,
  });
  const combatTuning = Object.freeze({
    maxShield: 30,
    shieldRegenDelay: 3.8,
    shieldRegenRate: 10,
    healthRegenDelay: 3.2,
    healthRegenRate: 8,
    hitInvulnerability: 0.48,
    respawnInvulnerability: 1.75,
    openingGrace: 5.5,
    enemyCap: 4,
    spawnDelayMin: 4.2,
    spawnDelayMax: 6.4,
    parryRadius: 6.5,
    nearMissRadius: 2.35,
  });
  const planetFormationCenter = new THREE.Vector3(2.625, 22.75, 13);
  const planetFormationScale = 0.78;
  const planetClusterRadius = 54;
  const planetMaxSeparation = 82;
  let accumulator = 0;
  const loader = new THREE.TextureLoader();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  const input = {
    f: false,
    b: false,
    l: false,
    r: false,
    jump: false,
    dash: false,
    fire: false,
    touchX: 0,
    touchY: 0,
  };
  const cameraState = {
    forward: new THREE.Vector3(1, 0, 0),
    pitch: -0.08,
    recoil: 0,
    trauma: 0,
    landingKick: 0,
  };
  const aiBrain = {
    nextJump: 0,
    nextStrafe: 0,
    strafe: 1,
    fireDelay: 0.9,
    aimWarmup: 0,
    decisionTimer: 0,
    targetType: "enemy",
    targetEnemyIndex: -1,
    action: "observe",
    targetPoint: new THREE.Vector3(),
    aggression: 0.58,
  };
  const combatDirector = {
    label: "CALM",
    intensity: 0.4,
    maxAttackers: 1,
    activeAttackers: 0,
    incomingThreats: 0,
    recentDamageTimer: 0,
    interrupts: 0,
    phaseParries: 0,
    nearMisses: 0,
    localDeaths: 0,
    lastNearMissFeedback: -99,
  };
  const roundSeconds = 120;
  const state = {
    started: false,
    ended: false,
    message: "Tap Start",
    timeLeft: roundSeconds,
    nextEnemySpawn: 0,
    streak: 0,
    streakTimer: 0,
    bestStreak: readNumber("speedy-jumper-best-streak"),
    bestScore: readNumber("speedy-jumper-best-score"),
    coins: readNumber("speedy-jumper-coins"),
    matchCoins: 0,
    dailyTarget: 12,
    dailyProgress: readDailyProgress(),
    dailyClaimed: readTodayFlag("speedy-jumper-daily-claimed"),
    riftCharge: 0,
    riftActive: false,
    riftTimer: 0,
    nextRiftPulse: 0,
    nextShardSpawn: 0,
    countdown: 0,
    simTime: 0,
    planetTime: 0,
    paused: false,
    matchBestStreak: 0,
    muted: false,
  };
  const scores = { p1: 0, p2: 0 };
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audio = {
    context: null,
    master: null,
    music: null,
    sfx: null,
    compressor: null,
    noiseBuffer: null,
    nextBeat: 0,
    step: 0,
    playing: false,
    unlocked: false,
    primed: false,
    resumePending: false,
    scheduledSteps: 0,
    unlockError: "",
  };
  let replayGateBlocked = false;
  let postMatchAdGeneration = 0;
  const replayAds = createReplayAdService({
    nativeIos: isNativeIosRuntime(),
    getMuted: () => state.muted,
    onStateChange: updateAdInterface,
  });
  const analytics = createAnalytics();

  const players = {
    p1: makePlayer("p1", "You", 0x65f7df, 0x5ef5ff),
    p2: makePlayer("p2", "AI Cat", 0xffbd57, 0xff8a25),
  };
  const platforms = [];
  const riftShards = [];
  const surgeWaves = [];
  const enemies = [];
  const bullets = [];
  const effects = [];
  const bulletGeometry = new THREE.SphereGeometry(0.22, 10, 10);
  const enemyBulletGeometry = new THREE.SphereGeometry(0.17, 10, 10);
  const playerTrailGeometry = new THREE.CylinderGeometry(0.045, 0.14, 1.65, 7);
  const enemyTrailGeometry = new THREE.CylinderGeometry(0.035, 0.1, 1.1, 7);
  const effectGeometry = new THREE.IcosahedronGeometry(1, 0);
  const enemyBarBackGeometry = new THREE.PlaneGeometry(1.58, 0.16);
  const enemyBarFillGeometry = new THREE.PlaneGeometry(1.42, 0.085);
  enemyBarFillGeometry.translate(0.71, 0, 0);
  const enemyBarBackMaterial = new THREE.MeshBasicMaterial({
    color: 0x02060c,
    transparent: true,
    opacity: 0.78,
    depthTest: false,
    depthWrite: false,
  });
  const bulletMaterials = new Map();
  let lookTouchId = null;
  let lookTouchX = 0;
  let lookTouchY = 0;
  let lockedTarget = null;
  let feedbackTimeout = 0;
  let fadedRingCount = 0;

  const keys = {
    KeyW: "f",
    ArrowUp: "f",
    KeyS: "b",
    ArrowDown: "b",
    KeyA: "l",
    ArrowLeft: "l",
    KeyD: "r",
    ArrowRight: "r",
  };
  const shardSlots = [
    [1, 0.34, 0.7],
    [2, -0.28, 2.8],
    [4, 0.18, 4.3],
    [6, -0.18, 5.5],
  ];
  const enemyTypes = {
    scout: {
      health: 34, orbitSpeed: 0.78, cooldown: 1.9, windup: 0.62, recover: 0.48,
      range: 52, bulletSpeed: 39, damage: 6, aimError: 2.2, scale: 0.9, color: 0xff3a4f,
    },
    sentinel: {
      health: 68, orbitSpeed: 0.4, cooldown: 2.55, windup: 0.84, recover: 0.78,
      range: 58, bulletSpeed: 32, damage: 10, aimError: 1.55, scale: 1.18, color: 0xff6a35,
    },
    sniper: {
      health: 34, orbitSpeed: 0.28, cooldown: 3.15, windup: 1.08, recover: 1.05,
      range: 78, bulletSpeed: 56, damage: 13, aimError: 0.9, scale: 1.02, color: 0xff2d88,
    },
  };
  const moonDefinitions = {
    earth: [
      { name: "Moon", radius: 0.52, distance: 12.4, speed: 0.19, color: 0xb8b5ac, phase: 0.4 },
    ],
    mars: [
      { name: "Phobos", radius: 0.22, distance: 7.4, speed: 0.52, color: 0x8b7667, phase: 1.1 },
      { name: "Deimos", radius: 0.15, distance: 9.0, speed: 0.31, color: 0xa28b78, phase: 3.3 },
    ],
    jupiter: [
      { name: "Io", radius: 0.34, distance: 13.3, speed: 0.56, color: 0xd8b35e, phase: 0.3 },
      { name: "Europa", radius: 0.3, distance: 15.0, speed: 0.42, color: 0xd7cfb8, phase: 1.7 },
      { name: "Ganymede", radius: 0.5, distance: 17.1, speed: 0.3, color: 0x867a68, phase: 3.2 },
      { name: "Callisto", radius: 0.46, distance: 19.4, speed: 0.22, color: 0x62584f, phase: 4.8 },
    ],
    saturn: [
      { name: "Enceladus", radius: 0.2, distance: 12.5, speed: 0.48, color: 0xe8f2f0, phase: 2.1 },
      { name: "Titan", radius: 0.48, distance: 17.8, speed: 0.24, color: 0xc68a3c, phase: 4.2 },
    ],
    uranus: [
      { name: "Titania", radius: 0.34, distance: 11.2, speed: 0.31, color: 0xa8aaa7, phase: 1.4 },
    ],
    neptune: [
      { name: "Triton", radius: 0.38, distance: 11.0, speed: -0.34, color: 0xb9b7aa, phase: 2.7 },
    ],
  };

  const planetDefinitions = [
    {
      key: "earth",
      name: "Earth",
      radius: 8.2,
      base: [0, 6, 0],
      amp: [0, 1.1, 0],
      atmosphere: 0x72cfff,
      atmosphereStrength: 0.42,
      tilt: 23.4,
      rotationSpeed: 0.075,
      roughness: 0.68,
    },
    {
      key: "mars",
      name: "Mars",
      radius: 5.4,
      base: [18, 14, -11],
      amp: [1.8, 1.35, 1.7],
      atmosphere: 0xff9c6b,
      atmosphereStrength: 0.15,
      tilt: 25.2,
      rotationSpeed: 0.072,
      roughness: 0.92,
    },
    {
      key: "venus",
      name: "Venus",
      radius: 7.8,
      base: [-19, 14, 15],
      amp: [1.8, 1.2, 2.0],
      atmosphere: 0xffd58a,
      atmosphereStrength: 0.46,
      tilt: 177.4,
      rotationSpeed: -0.018,
      roughness: 0.96,
    },
    {
      key: "jupiter",
      name: "Jupiter",
      radius: 10.5,
      base: [35, 23, 13],
      amp: [1.5, 1.8, 1.8],
      atmosphere: 0xffd9aa,
      atmosphereStrength: 0.22,
      tilt: 3.1,
      rotationSpeed: 0.14,
      roughness: 0.84,
    },
    {
      key: "saturn",
      name: "Saturn",
      radius: 9.2,
      base: [10, 32, 33],
      amp: [2.2, 1.2, 2.4],
      atmosphere: 0xffe0a6,
      atmosphereStrength: 0.2,
      tilt: 26.7,
      rotationSpeed: 0.12,
      roughness: 0.86,
      rings: "saturn",
    },
    {
      key: "uranus",
      name: "Uranus",
      radius: 7.2,
      base: [-25, 31, 35],
      amp: [2.4, 1.7, 2.1],
      atmosphere: 0x8ff6ff,
      atmosphereStrength: 0.3,
      tilt: 97.8,
      rotationSpeed: -0.082,
      roughness: 0.82,
      rings: "uranus",
    },
    {
      key: "neptune",
      name: "Neptune",
      radius: 7.0,
      base: [44, 39, 37],
      amp: [1.9, 2.0, 1.6],
      atmosphere: 0x4d89ff,
      atmosphereStrength: 0.36,
      tilt: 28.3,
      rotationSpeed: 0.095,
      roughness: 0.8,
    },
    {
      key: "mercury",
      name: "Mercury",
      radius: 4.6,
      base: [-42, 23, -18],
      amp: [1.3, 1.0, 1.4],
      atmosphere: 0xb7b0aa,
      atmosphereStrength: 0,
      tilt: 0.03,
      rotationSpeed: 0.022,
      roughness: 1,
    },
  ];
  const planetAssetUrls = {
    earth: "./assets/textures/planet-earth-v1.webp",
    mars: "./assets/textures/planet-mars-v1.webp",
    venus: "./assets/textures/planet-venus-v1.webp",
    jupiter: "./assets/textures/planet-jupiter-v1.webp",
    saturn: "./assets/textures/planet-saturn-v1.webp",
    uranus: "./assets/textures/planet-uranus-v1.webp",
    neptune: "./assets/textures/planet-neptune-v1.webp",
    mercury: "./assets/textures/planet-mercury-v1.webp",
  };
  const planetTextures = Object.fromEntries(planetDefinitions.map((planet) => {
    const assetUrl = planetAssetUrls[planet.key];
    const texture = assetUrl
      ? loadTexture(assetUrl, () => sphereFallback(planet.key), 1, 1)
      : configureTexture(sphereFallback(planet.key), 1, 1);
    texture.name = assetUrl ? `generated-${planet.key}-surface` : `procedural-${planet.key}-surface`;
    return [planet.key, texture];
  }));
  const skyTexture = loadTexture("./assets/textures/cosmic-bg-v2.webp", skyFallback, 1, 1);

  configureInterfaceForInput();
  initScene();
  resetGame();
  animate();
  void replayAds.initialize();

  function makePlayer(id, label, color, bulletColor) {
    const mesh = new THREE.Group();
    const catRig = createCombatCat(THREE, {
      furColor: id === "p1" ? 0x78989b : 0xb38355,
      undersideColor: id === "p1" ? 0xd6e5df : 0xf0d4a4,
      accentColor: bulletColor,
      accentDarkColor: id === "p1" ? 0x123d48 : 0x5f3516,
      eyeColor: id === "p1" ? 0xb7fff7 : 0xffe3a1,
      maxSpeed: actionTuning.groundSpeed,
      gaitOffset: id === "p1" ? 0 : Math.PI,
      castShadow: !isCompactTouch,
      receiveShadow: !isCompactTouch,
    });
    const { visual } = catRig;
    const guardShell = new THREE.Mesh(
      new THREE.SphereGeometry(1, isCompactTouch ? 18 : 26, isCompactTouch ? 12 : 18),
      new THREE.MeshBasicMaterial({
        color: bulletColor,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    guardShell.position.y = 0.42;
    guardShell.scale.set(1.15, 1.05, 1.72);
    guardShell.renderOrder = 2;
    mesh.add(visual, guardShell);
    root.add(mesh);
    return {
      id,
      label,
      color,
      bulletColor,
      mesh,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      forward: new THREE.Vector3(id === "p1" ? 1 : -1, 0, 0),
      platform: null,
      grounded: true,
      health: 100,
      shield: combatTuning.maxShield,
      maxShield: combatTuning.maxShield,
      alive: true,
      cooldown: 0,
      invuln: 0,
      jumpGrace: 0,
      airborneTime: 0,
      jumpBuffer: 0,
      coyoteTime: 0,
      dashCooldown: 0,
      dashTimer: 0,
      lastDamageAt: -99,
      lastGroundedSpeed: 0,
      gravityPlatform: null,
      respawnTimer: 0,
      visual,
      parts: catRig.parts,
      catRig,
      firePulse: 0,
      guardPulse: 0,
      guardShell,
      turnAmount: 0,
      previousForward: new THREE.Vector3(id === "p1" ? 1 : -1, 0, 0),
    };
  }

  function configureInterfaceForInput() {
    if (!isCompactTouch) return;
    const bindings = [
      ["LEFT STICK", "Move"],
      ["RIGHT SWIPE", "Aim"],
      ["JUMP", "Long jump"],
      ["PARRY", "Dash / parry"],
      ["FIRE", "Fire / interrupt"],
      ["RIFT", "Rift surge"],
    ];
    document.querySelectorAll(".controls li").forEach((item, index) => {
      const binding = bindings[index];
      if (!binding) return;
      const key = item.querySelector("kbd");
      const label = item.querySelector("span");
      if (key) key.textContent = binding[0];
      if (label) label.textContent = binding[1];
    });
  }

  function initScene() {
    scene.add(new THREE.HemisphereLight(0x9edfff, 0x030712, 1.08));
    const sun = new THREE.DirectionalLight(0xffefd0, 2.15);
    sun.position.set(24, 36, 20);
    if (!isCompactTouch) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 130;
      sun.shadow.camera.left = -54;
      sun.shadow.camera.right = 54;
      sun.shadow.camera.top = 54;
      sun.shadow.camera.bottom = -54;
      sun.shadow.bias = -0.0007;
    }
    scene.add(sun);
    const fill = new THREE.PointLight(0x40dcff, 82, 180, 2);
    fill.position.set(-14, 20, -22);
    scene.add(fill);
    const amberFill = new THREE.PointLight(0xffa344, 46, 160, 2);
    amberFill.position.set(44, 36, 18);
    scene.add(amberFill);
    scene.add(makeSunVisual());
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(190, 64, 32),
      new THREE.MeshBasicMaterial({
        map: skyTexture,
        color: 0xb5dfff,
        side: THREE.BackSide,
        fog: false,
      })
    );
    sky.rotation.y = Math.PI * 0.34;
    scene.add(sky);

    const stars = new THREE.BufferGeometry();
    const positions = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i += 1) {
      const r = 110 + Math.random() * 150;
      const a = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const h = Math.sqrt(1 - z * z);
      positions[i * 3] = Math.cos(a) * h * r;
      positions[i * 3 + 1] = z * r;
      positions[i * 3 + 2] = Math.sin(a) * h * r;
    }
    stars.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starField = new THREE.Points(
      stars,
      new THREE.PointsMaterial({ color: 0xdff8ff, size: isCompactTouch ? 0.38 : 0.52, transparent: true, opacity: 0.72 })
    );
    starField.name = "star-field";
    scene.add(starField);

  }

  function makeSunVisual() {
    const group = new THREE.Group();
    group.name = "Sun";
    group.position.set(72, 108, 60);
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, isCompactTouch ? 24 : 40, isCompactTouch ? 16 : 28),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false })
    );
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    const glow = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
    glow.addColorStop(0, "rgba(255,255,229,1)");
    glow.addColorStop(0.12, "rgba(255,221,116,.88)");
    glow.addColorStop(0.38, "rgba(255,155,55,.28)");
    glow.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffc766,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    halo.scale.set(25, 25, 1);
    group.add(halo, disc);
    return group;
  }

  function resetGame() {
    postMatchAdGeneration += 1;
    replayGateBlocked = false;
    if (startButton) startButton.disabled = false;
    if (adStatus) adStatus.hidden = true;
    for (const item of [...platforms, ...riftShards, ...enemies]) {
      const object = item.mesh || item.group;
      root.remove(object);
      disposeObject3D(object);
      if (item.bar) {
        root.remove(item.bar);
        item.bar.userData.fill?.material?.dispose?.();
      }
    }
    for (const item of surgeWaves) {
      root.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
    }
    for (const item of bullets) root.remove(item.mesh);
    for (const item of effects) {
      root.remove(item.mesh || item.group);
      item.mesh.material.dispose();
    }
    platforms.length = 0;
    riftShards.length = 0;
    surgeWaves.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    effects.length = 0;
    scores.p1 = 0;
    scores.p2 = 0;
    state.streak = 0;
    state.streakTimer = 0;
    state.matchBestStreak = 0;
    state.matchCoins = 0;
    state.riftCharge = 0;
    state.riftActive = false;
    state.riftTimer = 0;
    state.nextRiftPulse = 0;
    state.nextShardSpawn = 0;
    state.dailyProgress = readDailyProgress();
    state.dailyClaimed = readTodayFlag("speedy-jumper-daily-claimed");
    state.started = false;
    state.ended = false;
    state.paused = false;
    state.countdown = 0;
    state.message = "Tap Start";
    state.timeLeft = roundSeconds;
    state.nextEnemySpawn = 0;
    state.planetTime = 0;
    combatDirector.label = "CALM";
    combatDirector.intensity = 0.4;
    combatDirector.maxAttackers = 1;
    combatDirector.activeAttackers = 0;
    combatDirector.incomingThreats = 0;
    combatDirector.recentDamageTimer = 0;
    combatDirector.interrupts = 0;
    combatDirector.phaseParries = 0;
    combatDirector.nearMisses = 0;
    combatDirector.localDeaths = 0;
    combatDirector.lastNearMissFeedback = -99;
    aiBrain.nextJump = 0;
    aiBrain.nextStrafe = 0;
    aiBrain.strafe = 1;
    aiBrain.fireDelay = 0.9;
    aiBrain.aimWarmup = 0;
    aiBrain.decisionTimer = 0;
    aiBrain.targetType = "enemy";
    aiBrain.targetEnemyIndex = -1;
    aiBrain.action = "observe";
    aiBrain.aggression = 0.58;
    input.f = input.b = input.l = input.r = input.jump = input.dash = input.fire = false;
    input.touchX = input.touchY = 0;
    lockedTarget = null;
    document.body.classList.remove("game-over", "target-locked", "rift-active", "damage-hit", "guard-hit", "hit-confirmed");
    incomingWarning?.classList.remove("active");
    createPlatforms();
    createRiftShards();
    placePlayer(players.p1, platforms[0], new THREE.Vector3(0, 1, 0));
    placePlayer(players.p2, platforms[3], new THREE.Vector3(-0.35, 0.92, 0.16).normalize());
    players.p1.invuln = 2.8;
    players.p2.invuln = 2.8;
    players.p2.label = "AI Cat";
    if (p2NameLabel) p2NameLabel.textContent = "AI CAT";
    cameraState.forward.copy(players.p1.forward);
    cameraState.pitch = -0.08;
    cameraState.recoil = 0;
    cameraState.trauma = 0;
    createEnemies();
    showOverlay("ENTER THE RIFT", "Offline Solo Raid: break locks, phase-parry red fire, and outsmart the adaptive AI Cat.");
    updateCamera(0.016);
    updateUi();
  }

  function disposeObject3D(object) {
    object?.traverse?.((child) => {
      child.userData?.generatedTexture?.dispose?.();
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
  }

  function createPlatforms() {
    planetDefinitions.forEach((definition, i) => {
      const { radius } = definition;
      const group = new THREE.Group();
      const axialGroup = new THREE.Group();
      axialGroup.rotation.z = THREE.MathUtils.degToRad(definition.tilt);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: planetTextures[definition.key],
        roughness: definition.roughness,
        metalness: 0.02,
      });
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(radius, isCompactTouch ? 44 : 72, isCompactTouch ? 28 : 48),
        mat
      );
      shell.receiveShadow = !isCompactTouch;
      shell.castShadow = !isCompactTouch;
      axialGroup.add(shell);
      const atmosphere = definition.atmosphereStrength > 0
        ? makeAtmosphere(radius, definition.atmosphere, definition.atmosphereStrength)
        : null;
      if (atmosphere) axialGroup.add(atmosphere);
      const cloud = definition.key === "earth" ? makeEarthCloudShell(radius) : null;
      if (cloud) axialGroup.add(cloud);
      const rings = definition.rings ? makePlanetRings(radius, definition.rings) : null;
      if (rings) axialGroup.add(rings);
      const moonSystem = makeMoonSystem(definition);
      if (moonSystem) axialGroup.add(moonSystem.group);
      group.add(axialGroup);
      root.add(group);
      const originalBase = new THREE.Vector3(...definition.base);
      const baseVector = planetFormationCenter.clone().add(
        originalBase.sub(planetFormationCenter).multiplyScalar(planetFormationScale)
      );
      const ampVector = new THREE.Vector3(...definition.amp);
      const motion = createPlanetMotion(definition.key, i, ampVector, definition.rotationSpeed);
      const center = platformPosition(baseVector, motion, state.planetTime);
      group.position.copy(center);
      platforms.push({
        name: definition.name,
        key: definition.key,
        group,
        mesh: group,
        radius,
        base: baseVector,
        amp: ampVector,
        center: center.clone(),
        prev: center.clone(),
        delta: new THREE.Vector3(),
        motionVelocity: new THREE.Vector3(),
        motion,
        collisionRadius: radius * (definition.rings === "saturn" ? 2.12 : definition.rings === "uranus" ? 1.72 : 1),
        tilt: definition.tilt,
        rotationSpeed: motion.spinBase,
        spinRate: motion.spinBase,
        axialGroup,
        shell,
        cloud,
        atmosphere,
        rings,
        moonSystem,
        mat,
      });
    });
    updatePlanetMotion(fixedStep, true);
  }

  function makeAtmosphere(radius, color, strength) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.035, isCompactTouch ? 32 : 52, isCompactTouch ? 22 : 36),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          glowColor: { value: new THREE.Color(color) },
          strength: { value: strength },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float strength;
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDirection)), 0.0), 2.35);
            gl_FragColor = vec4(glowColor, fresnel * strength);
          }
        `,
      })
    );
  }

  function makePlanetRings(radius, kind) {
    const group = new THREE.Group();
    const bands = kind === "saturn"
      ? [
          [1.18, 1.4, 0xd5c39d, 0.34],
          [1.43, 1.7, 0xead7ac, 0.72],
          [1.75, 1.94, 0xbda77f, 0.5],
          [1.98, 2.12, 0xf0dcb7, 0.24],
        ]
      : [
          [1.36, 1.39, 0x8adbe6, 0.4],
          [1.51, 1.54, 0x6eb8c9, 0.34],
          [1.68, 1.72, 0x99e4ea, 0.28],
        ];
    for (const [inner, outer, color, opacity] of bands) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * inner, radius * outer, isCompactTouch ? 96 : 160),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.material.userData.baseOpacity = opacity;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    return group;
  }

  function makeEarthCloudShell(radius) {
    const texture = createEarthCloudTexture();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.012, isCompactTouch ? 40 : 64, isCompactTouch ? 26 : 42),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.42,
        roughness: 1,
        depthWrite: false,
      })
    );
    shell.userData.generatedTexture = texture;
    return shell;
  }

  function makeMoonSystem(definition) {
    const definitions = moonDefinitions[definition.key];
    if (!definitions?.length) return null;
    const group = new THREE.Group();
    group.name = `${definition.name} moon system`;
    const moons = [];
    for (const moon of definitions) {
      const pivot = new THREE.Group();
      pivot.rotation.y = moon.phase;
      pivot.rotation.z = Math.sin(moon.phase * 2.7) * 0.045;
      const orbit = new THREE.Mesh(
        new THREE.RingGeometry(moon.distance - 0.012, moon.distance + 0.012, isCompactTouch ? 72 : 128),
        new THREE.MeshBasicMaterial({
          color: 0xa8d8e6,
          transparent: true,
          opacity: 0.075,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      orbit.rotation.x = Math.PI / 2;
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(1, isCompactTouch ? 12 : 20, isCompactTouch ? 8 : 14),
        new THREE.MeshStandardMaterial({ color: moon.color, roughness: 0.98, metalness: 0 })
      );
      body.name = moon.name;
      body.scale.setScalar(moon.radius);
      body.position.z = moon.distance;
      body.castShadow = !isCompactTouch;
      body.receiveShadow = !isCompactTouch;
      pivot.add(body);
      group.add(orbit, pivot);
      moons.push({ ...moon, pivot, body });
    }
    return { group, moons };
  }

  function createEarthCloudTexture() {
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 1024;
    cloudCanvas.height = 512;
    const ctx = cloudCanvas.getContext("2d");
    ctx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
    for (let belt = 0; belt < 9; belt += 1) {
      const y = 42 + belt * 54 + Math.sin(belt * 1.7) * 18;
      for (let i = 0; i < 22; i += 1) {
        const x = (i * 53 + belt * 97 + Math.sin(i * 2.3) * 24 + 1024) % 1024;
        const width = 26 + ((i * 17 + belt * 11) % 54);
        const height = 5 + ((i * 7 + belt * 5) % 14);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, width);
        gradient.addColorStop(0, "rgba(255,255,255,.72)");
        gradient.addColorStop(0.45, "rgba(244,250,255,.34)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, height / width);
        ctx.beginPath();
        ctx.arc(0, 0, width, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    const texture = new THREE.CanvasTexture(cloudCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createRiftShards() {
    for (const [platformIndex, lat, lon] of shardSlots) {
      spawnRiftShard(platformIndex, lat, lon);
    }
  }

  function spawnRiftShard(
    platformIndex = 1 + Math.floor(Math.random() * Math.max(1, platforms.length - 1)),
    lat = Math.random() * 0.8 - 0.4,
    lon = Math.random() * Math.PI * 2
  ) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({
        color: 0xdffcff,
        emissive: 0x64fff1,
        emissiveIntensity: 0.86,
        roughness: 0.18,
        metalness: 0.48,
      })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.045, 10, 42),
      new THREE.MeshBasicMaterial({ color: 0x6ff7dd, transparent: true, opacity: 0.72 })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x6ff7dd, transparent: true, opacity: 0.14 })
    );
    group.add(core, ring, halo);
    root.add(group);
    riftShards.push({
      group,
      mesh: group,
      core,
      ring,
      platform: platforms[platformIndex % platforms.length],
      lat,
      lon,
      phase: Math.random() * Math.PI * 2,
      pos: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    });
  }

  function createEnemies() {
    const slots = [
      [1, 0.2, 1, "scout"],
      [2, -0.2, 2.4, "sentinel"],
      [4, 0.1, 4, "sniper"],
      [6, -0.3, 1.5, "scout"],
    ];
    for (const [platformIndex, lat, lon, kind] of slots) {
      spawnEnemy(platformIndex, lat, lon, kind);
    }
  }

  function spawnEnemy(
    platformIndex = 1 + Math.floor(Math.random() * Math.max(1, platforms.length - 1)),
    lat = Math.random() * 0.8 - 0.4,
    lon = Math.random() * Math.PI * 2,
    kind = ["scout", "sentinel", "sniper"][enemies.length % 3]
  ) {
    const spec = enemyTypes[kind] || enemyTypes.scout;
    const mesh = makeEnemyMesh(kind, spec);
    const bar = makeEnemyHealthBar(spec);
    root.add(mesh);
    root.add(bar);
    enemies.push({
      mesh,
      bar,
      baseScale: mesh.scale.clone(),
      kind,
      spec,
      platform: platforms[platformIndex % platforms.length],
      lat,
      lon,
      health: spec.health,
      maxHealth: spec.health,
      cooldown: combatTuning.openingGrace + Math.random() * 1.4,
      telegraph: 0,
      telegraphTotal: 0,
      recover: 0,
      stagger: 0,
      deathTimer: 0,
      attackState: "patrol",
      targetId: null,
      aimTarget: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      prevPos: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      forward: new THREE.Vector3(0, 0, 1),
      firePulse: 0,
      dead: false,
    });
    spawnBurst(platforms[platformIndex % platforms.length].center, spec.color, 6, 0.22, new THREE.Vector3(0, 1, 0));
  }

  function makeEnemyHealthBar(spec) {
    const group = new THREE.Group();
    const back = new THREE.Mesh(enemyBarBackGeometry, enemyBarBackMaterial);
    const fill = new THREE.Mesh(
      enemyBarFillGeometry,
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.94,
        depthTest: false,
        depthWrite: false,
      })
    );
    fill.position.x = -0.71;
    fill.position.z = 0.002;
    back.renderOrder = 20;
    fill.renderOrder = 21;
    group.add(back, fill);
    group.userData.fill = fill;
    group.visible = false;
    return group;
  }

  function makeEnemyMesh(kind, spec) {
    const catRig = createCombatCat(THREE, {
      hostile: true,
      enemyKind: kind,
      accentColor: spec.color,
      scale: spec.scale,
      maxSpeed: kind === "scout" ? 11 : kind === "sentinel" ? 7 : 5.5,
      gaitOffset: enemies.length * 1.37,
      castShadow: !isCompactTouch,
      receiveShadow: !isCompactTouch,
    });
    const group = catRig.visual;
    const aimGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
    const aimLine = new THREE.Line(
      aimGeometry,
      new THREE.LineBasicMaterial({ color: spec.color, transparent: true, opacity: 0.28, depthWrite: false })
    );
    aimLine.visible = false;
    group.add(aimLine);
    group.userData.catRig = catRig;
    group.userData.parts = { ...catRig.parts, aimLine };
    return group;
  }

  function placePlayer(player, platform, up) {
    player.platform = platform;
    player.gravityPlatform = platform;
    player.up.copy(up);
    player.pos.copy(platform.center).addScaledVector(up, platform.radius + playerSurfaceOffset);
    player.vel.set(0, 0, 0);
    player.health = 100;
    player.shield = player.maxShield;
    player.alive = true;
    player.grounded = true;
    player.cooldown = 0;
    player.jumpGrace = 0;
    player.airborneTime = 0;
    player.jumpBuffer = 0;
    player.coyoteTime = 0.12;
    player.dashCooldown = 0;
    player.dashTimer = 0;
    player.invuln = combatTuning.respawnInvulnerability;
    player.lastDamageAt = -99;
    player.respawnTimer = 0;
    player.guardPulse = 0;
    syncMesh(player);
  }

  function anchorGroundedPlayer(player) {
    if (!player?.alive || !player.grounded || !player.platform) return;
    player.pos.add(player.platform.delta);
    const normal = player.pos.clone().sub(player.platform.center);
    if (normal.lengthSq() < 0.0001) normal.copy(player.up);
    normal.normalize();
    player.pos.copy(player.platform.center).addScaledVector(normal, player.platform.radius + playerSurfaceOffset);
    player.up.copy(normal);
    player.gravityPlatform = player.platform;
    const normalSpeed = player.vel.dot(normal);
    player.vel.addScaledVector(normal, -normalSpeed);
    syncMesh(player);
  }

  function startGame() {
    unlockAudio();
    const adState = replayAds.snapshot();
    if (!state.started && !state.ended && adState.supported && !adState.consentSettled) {
      updateAdInterface(adState);
      return;
    }
    if (state.ended && replayGateBlocked) {
      if (adStatus) {
        adStatus.hidden = false;
        adStatus.textContent = "The next match unlocks when the ad break finishes.";
      }
      return;
    }
    if (state.paused) {
      state.paused = false;
      state.message = "Match resumed";
      hideOverlay();
      clock.getDelta();
      return;
    }
    if (state.started && !state.ended) {
      hideOverlay();
      return;
    }
    if (state.ended) resetGame();
    players.p2.label = "AI Cat";
    state.started = true;
    state.countdown = 3;
    state.message = "Drop in 3";
    hideOverlay();
    analytics.logEvent("level_start", { level_name: "solo_match" });
    restartMusicTransport();
    void replayAds.preload();
    playSweep(360, 780, 0.2, 0.08, "triangle");
    updateUi();
  }

  function animate() {
    requestAnimationFrame(animate);
    const frameDt = Math.min(clock.getDelta(), 0.1);
    accumulator = Math.min(accumulator + frameDt, 0.25);
    while (accumulator >= fixedStep) {
      update(fixedStep);
      accumulator -= fixedStep;
    }
    renderer.render(scene, camera);
  }

  function update(dt) {
    state.simTime += dt;
    state.planetTime += dt;
    updatePlanetMotion(dt);

    if (!state.started || state.ended || state.paused || state.countdown > 0) {
      anchorGroundedPlayer(players.p1);
      anchorGroundedPlayer(players.p2);
    }

    if (state.started && !state.ended && !state.paused) {
      const local = localPlayer();
      if (state.countdown > 0) {
        state.countdown = Math.max(0, state.countdown - dt);
        const count = Math.ceil(state.countdown);
        state.message = count > 0 ? `Drop in ${count}` : "Match live";
        updateRiftShards(dt);
        updateEffects(dt);
        updateMusic();
        updateCamera(dt);
        updateUi();
        return;
      }
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (state.timeLeft <= 0) {
        finishByScore("Time is up.");
        updateUi();
        return;
      }
      updateRespawn(local, dt);
      updatePlayer(local, dt);
      updateCombatDirector(dt);
      updateAiPlayer(players.p2, dt);
      updateRiftShards(dt);
      updateRiftSurge(dt);
      updateEnemies(dt);
      updateEnemyDeaths(dt);
      updateEnemySpawns(dt);
      updateBullets(dt);
    }
    state.streakTimer = Math.max(0, state.streakTimer - dt);
    if (state.streakTimer <= 0) state.streak = 0;
    updateSurgeWaves(dt);
    updateEffects(dt);
    updateMusic();
    updateTargetLock();
    updateCamera(dt);
    updateUi();
  }

  function updatePlayer(player, dt) {
    if (!player || !player.alive) return;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invuln = Math.max(0, (player.invuln || 0) - dt);
    player.jumpGrace = Math.max(0, (player.jumpGrace || 0) - dt);
    player.dashCooldown = Math.max(0, (player.dashCooldown || 0) - dt);
    player.dashTimer = Math.max(0, (player.dashTimer || 0) - dt);
    player.jumpBuffer = Math.max(0, (player.jumpBuffer || 0) - dt);
    if (input.jump) player.jumpBuffer = 0.15;
    input.jump = false;
    player.coyoteTime = player.grounded ? 0.13 : Math.max(0, (player.coyoteTime || 0) - dt);
    if (player.grounded && player.platform) player.pos.add(player.platform.delta);
    player.airborneTime = player.grounded ? 0 : (player.airborneTime || 0) + dt;

    const platform = gravityPlatformFor(player);
    player.gravityPlatform = platform;
    const desiredUp = tmp.copy(player.pos).sub(platform.center).normalize();
    player.up.lerp(desiredUp, 1 - Math.exp(-26 * dt)).normalize();
    const forward = tmp2.copy(cameraState.forward).projectOnPlane(player.up);
    if (forward.lengthSq() < 0.001) forward.copy(player.forward).projectOnPlane(player.up);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, player.up).normalize();
    const moveForward = THREE.MathUtils.clamp((input.f ? 1 : 0) - (input.b ? 1 : 0) - input.touchY, -1, 1);
    const moveRight = THREE.MathUtils.clamp((input.r ? 1 : 0) - (input.l ? 1 : 0) + input.touchX, -1, 1);
    const move = forward.clone().multiplyScalar(moveForward).addScaledVector(right, moveRight);
    const moveStrength = Math.min(1, move.length());
    if (move.lengthSq() > 0.001) move.normalize();

    const normalSpeed = player.vel.dot(player.up);
    const tangent = player.vel.clone().sub(player.up.clone().multiplyScalar(normalSpeed));
    const surgeBoost = state.riftActive && player.id === localPlayerId ? 1.22 : 1;
    const maxSpeed = (player.dashTimer > 0 ? actionTuning.dashSpeed : actionTuning.groundSpeed) * surgeBoost;
    if (player.grounded) {
      const desiredVelocity = move.clone().multiplyScalar(maxSpeed * moveStrength);
      tangent.lerp(desiredVelocity, 1 - Math.exp(-(moveStrength > 0.01 ? actionTuning.groundResponse : actionTuning.idleResponse) * dt));
    } else if (moveStrength > 0.01) {
      tangent.addScaledVector(move, actionTuning.airAcceleration * dt * surgeBoost);
      if (tangent.length() > maxSpeed) tangent.setLength(maxSpeed);
    } else {
      tangent.multiplyScalar(Math.exp(-0.12 * dt));
    }
    player.vel.copy(tangent).addScaledVector(player.up, normalSpeed);

    if (input.dash && player.dashCooldown <= 0) {
      const dashDirection = moveStrength > 0.01 ? move : forward;
      const outward = THREE.MathUtils.clamp(player.vel.dot(player.up), 1.5, 6);
      player.vel.copy(dashDirection).multiplyScalar(actionTuning.dashSpeed * surgeBoost).addScaledVector(player.up, outward);
      player.dashCooldown = state.riftActive ? 0.82 : actionTuning.dashCooldown;
      player.dashTimer = 0.27;
      player.invuln = Math.max(player.invuln, 0.18);
      cameraState.trauma = Math.max(cameraState.trauma, 0.18);
      spawnSurgeWave(player.pos, player.bulletColor, 0.26, 8);
      const parried = phaseParryNearby(player, combatTuning.parryRadius);
      if (!parried) {
        showCombatFeedback("PHASE DASH", "dash");
        playCombatSfx("dash");
      }
    }
    input.dash = false;

    if (player.jumpBuffer > 0 && player.coyoteTime > 0) {
      const launchDirection = moveStrength > 0.01 ? move : forward;
      const tangentVelocity = player.vel.clone().projectOnPlane(player.up);
      if (tangentVelocity.length() < 14) tangentVelocity.addScaledVector(launchDirection, 14 - tangentVelocity.length());
      player.vel.copy(tangentVelocity).addScaledVector(player.up, actionTuning.jumpSpeed);
      player.grounded = false;
      player.airborneTime = 0;
      player.jumpGrace = 0.17;
      player.jumpBuffer = 0;
      player.coyoteTime = 0;
      playSweep(240, 520, 0.16, 0.055, "triangle");
      spawnBurst(player.pos, player.color, 7, 0.32, player.up);
    }
    const gravityUp = tmp.copy(player.pos).sub(platform.center).normalize();
    const gravityPull = gravityStrengthFor(player, platform, gravityUp);
    player.vel.addScaledVector(gravityUp, -gravityPull * dt);
    const previousPos = player.pos.clone();
    const impactSpeed = Math.max(0, -player.vel.dot(gravityUp));
    player.pos.addScaledVector(player.vel, dt);
    const landed = landPlayer(player, previousPos);
    if (landed && impactSpeed > 7) onPlayerLanded(player, impactSpeed);

    const recoveryAge = state.simTime - player.lastDamageAt;
    if (recoveryAge > combatTuning.shieldRegenDelay && player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + combatTuning.shieldRegenRate * dt);
    }
    if (recoveryAge > combatTuning.healthRegenDelay && player.health < 100) {
      player.health = Math.min(100, player.health + combatTuning.healthRegenRate * dt);
    }

    if (input.fire && player.cooldown <= 0) fire(player);
    player.forward.lerp(forward, 1 - Math.exp(-16 * dt)).normalize();
    syncMesh(player, dt);
    if (player.pos.length() > 230 || player.pos.y < -90) damagePlayer(player, 100, null);
  }

  function updateRespawn(player, dt) {
    if (!player || player.alive || player.respawnTimer <= 0) return;
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      placePlayer(player, platform, spherical(Math.random() * 0.8 - 0.4, Math.random() * Math.PI * 2));
      playSweep(210, 640, 0.18, 0.06, "triangle");
      state.message = "Respawned";
    }
  }

  function updateAiPlayer(player, dt) {
    if (!player) return;
    updateRespawn(player, dt);
    if (!player.alive) return;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invuln = Math.max(0, (player.invuln || 0) - dt);
    player.jumpGrace = Math.max(0, (player.jumpGrace || 0) - dt);
    player.dashCooldown = Math.max(0, (player.dashCooldown || 0) - dt);
    player.dashTimer = Math.max(0, (player.dashTimer || 0) - dt);
    aiBrain.nextJump = Math.max(0, aiBrain.nextJump - dt);
    aiBrain.nextStrafe = Math.max(0, aiBrain.nextStrafe - dt);
    aiBrain.fireDelay = Math.max(0, aiBrain.fireDelay - dt);
    aiBrain.decisionTimer = Math.max(0, aiBrain.decisionTimer - dt);
    const wasAiming = aiBrain.aimWarmup > 0;
    aiBrain.aimWarmup = Math.max(0, aiBrain.aimWarmup - dt);
    const localEffectiveHealth = players.p1.health + players.p1.shield;
    aiBrain.aggression = THREE.MathUtils.clamp(
      0.46
        + combatDirector.intensity * 0.16
        + THREE.MathUtils.clamp(scores.p1 - scores.p2, -5, 5) * 0.022
        - (localEffectiveHealth < 48 ? 0.1 : 0),
      0.4,
      0.68
    );
    if (aiBrain.nextStrafe <= 0) {
      aiBrain.strafe = Math.random() < 0.5 ? -1 : 1;
      aiBrain.nextStrafe = 1.15 + Math.random() * 1.4;
    }
    // Finish the current readable aim commitment before selecting a new objective.
    // This prevents a last-frame target swap from firing the stored aim point at
    // an unrelated actor.
    if (!wasAiming && aiBrain.aimWarmup <= 0 && (aiBrain.decisionTimer <= 0 || !isAiTargetValid())) {
      chooseAiObjective(player);
    }
    const target = aiBrain.targetType === "enemy"
      ? enemies[aiBrain.targetEnemyIndex]
      : players.p1;
    const targetPosition = target?.pos || players.p1.pos;
    if (player.grounded && player.platform) player.pos.add(player.platform.delta);
    player.airborneTime = player.grounded ? 0 : (player.airborneTime || 0) + dt;

    const platform = gravityPlatformFor(player);
    player.gravityPlatform = platform;
    const desiredUp = tmp.copy(player.pos).sub(platform.center).normalize();
    player.up.lerp(desiredUp, 1 - Math.exp(-24 * dt)).normalize();
    const toTarget = targetPosition.clone().sub(player.pos).projectOnPlane(player.up);
    const forward = toTarget.lengthSq() > 0.01
      ? toTarget.normalize()
      : player.forward.clone().projectOnPlane(player.up).normalize();
    const right = new THREE.Vector3().crossVectors(forward, player.up).normalize();
    const distance = player.pos.distanceTo(targetPosition);
    const preferredDistance = aiBrain.targetType === "enemy" ? 19 : 25;
    const approach = distance > preferredDistance + 6 ? 1 : distance < preferredDistance - 7 ? -0.58 : 0.08;
    aiBrain.action = aiBrain.aimWarmup > 0 ? "telegraph" : approach > 0.5 ? "reposition" : approach < -0.2 ? "evade" : "flank";
    const move = forward.clone().multiplyScalar(approach).addScaledVector(right, aiBrain.strafe * 0.68).normalize();
    const normalSpeed = player.vel.dot(player.up);
    const tangent = player.vel.clone().sub(player.up.clone().multiplyScalar(normalSpeed));
    tangent.addScaledVector(move, (player.grounded ? 66 : 28) * dt * aiBrain.aggression);
    if (tangent.length() > 25) tangent.setLength(25);
    if (player.grounded) tangent.multiplyScalar(Math.exp(-2.05 * dt));
    player.vel.copy(tangent).addScaledVector(player.up, normalSpeed);

    const projectileDanger = bullets.some((bullet) => bullet.owner === "enemy" && bullet.pos.distanceTo(player.pos) < 7.5);
    if (player.dashCooldown <= 0 && (projectileDanger || (distance > 28 && Math.random() < dt * 0.11))) {
      player.vel.copy(move).multiplyScalar(42).addScaledVector(player.up, THREE.MathUtils.clamp(normalSpeed, 2, 6));
      player.dashCooldown = 2.35;
      player.dashTimer = 0.25;
      player.invuln = Math.max(player.invuln, 0.16);
      spawnSurgeWave(player.pos, player.bulletColor, 0.2, 7);
    }

    if (player.grounded && aiBrain.nextJump <= 0 && distance > 21 && Math.random() < dt * 0.75) {
      player.vel.addScaledVector(player.up, actionTuning.jumpSpeed * 0.86);
      player.vel.addScaledVector(move, 18);
      player.grounded = false;
      player.airborneTime = 0;
      player.jumpGrace = 0.18;
      aiBrain.nextJump = 1.35 + Math.random() * 1.15;
      spawnEffect(player.pos, player.color, 0.3);
    }

    const gravityUp = tmp.copy(player.pos).sub(platform.center).normalize();
    const gravityPull = gravityStrengthFor(player, platform, gravityUp);
    player.vel.addScaledVector(gravityUp, -gravityPull * dt);
    const previousPos = player.pos.clone();
    const impactSpeed = Math.max(0, -player.vel.dot(gravityUp));
    player.pos.addScaledVector(player.vel, dt);
    const landed = landPlayer(player, previousPos);
    if (landed && impactSpeed > 8) onPlayerLanded(player, impactSpeed);

    const recoveryAge = state.simTime - player.lastDamageAt;
    if (recoveryAge > combatTuning.shieldRegenDelay && player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + combatTuning.shieldRegenRate * dt * 0.82);
    }
    if (recoveryAge > combatTuning.healthRegenDelay && player.health < 100) {
      player.health = Math.min(100, player.health + combatTuning.healthRegenRate * dt * 0.78);
    }

    player.forward.lerp(forward, 1 - Math.exp(-10 * dt)).normalize();
    const targetAlive = target && !target.dead && target.alive !== false;
    const clearShot = targetAlive && distance < 72 && lineOfSightClear(player.pos, targetPosition, 0.16);
    if (!wasAiming && aiBrain.aimWarmup <= 0 && aiBrain.fireDelay <= 0 && clearShot) {
      aiBrain.targetPoint.copy(computeAiAimPoint(player, target, distance));
      aiBrain.aimWarmup = aiBrain.targetType === "enemy"
        ? 0.22 + Math.random() * 0.16
        : 0.42 + Math.random() * 0.2;
      aiBrain.action = "telegraph";
    } else if (wasAiming && aiBrain.aimWarmup <= 0 && clearShot) {
      const damage = aiBrain.targetType === "enemy" ? 34 : 12;
      fire(player, aiBrain.targetPoint.clone().sub(player.pos).normalize(), damage);
      aiBrain.fireDelay = (aiBrain.targetType === "enemy" ? 0.7 : 0.82) + Math.random() * 0.34;
      aiBrain.decisionTimer = Math.min(aiBrain.decisionTimer, 0.42);
    }
    syncMesh(player, dt);
    if (player.pos.length() > 230 || player.pos.y < -90) damagePlayer(player, 100, null);
  }

  function isAiTargetValid() {
    if (aiBrain.targetType === "player") return players.p1.alive;
    const enemy = enemies[aiBrain.targetEnemyIndex];
    return Boolean(enemy && !enemy.dead);
  }

  function chooseAiObjective(player) {
    const available = enemies
      .map((enemy, index) => ({ enemy, index }))
      .filter(({ enemy }) => !enemy.dead && enemy.pos.distanceTo(player.pos) < 82)
      .sort((a, b) => {
        const aThreat = a.enemy.targetId === player.id && a.enemy.telegraph > 0 ? -60 : 0;
        const bThreat = b.enemy.targetId === player.id && b.enemy.telegraph > 0 ? -60 : 0;
        const aScore = aThreat + a.enemy.health * 0.12 + a.enemy.pos.distanceTo(player.pos);
        const bScore = bThreat + b.enemy.health * 0.12 + b.enemy.pos.distanceTo(player.pos);
        return aScore - bScore;
      });
    const humanNeedsSpace = players.p1.health + players.p1.shield < 62;
    const objectiveChance = humanNeedsSpace ? 0.9 : scores.p2 < scores.p1 - 4 ? 0.62 : 0.76;
    if (available.length && Math.random() < objectiveChance) {
      aiBrain.targetType = "enemy";
      aiBrain.targetEnemyIndex = available[0].index;
    } else {
      aiBrain.targetType = "player";
      aiBrain.targetEnemyIndex = -1;
    }
    aiBrain.decisionTimer = 0.8 + Math.random() * 0.72;
  }

  function computeAiAimPoint(player, target, distance) {
    const targetVelocity = target.vel
      ? target.vel.clone()
      : target.pos.clone().sub(target.prevPos || target.pos).multiplyScalar(12);
    const leadScale = aiBrain.targetType === "enemy" ? 0.7 : 0.48 + combatDirector.intensity * 0.18;
    const leadTime = THREE.MathUtils.clamp(distance / actionTuning.shotSpeed * leadScale, 0.04, 0.24);
    const point = target.pos.clone().addScaledVector(targetVelocity, leadTime);
    const targetUp = target.up?.clone().normalize() || new THREE.Vector3(0, 1, 0);
    const lateral = new THREE.Vector3().crossVectors(targetUp, point.clone().sub(player.pos)).normalize();
    if (lateral.lengthSq() < 0.001) lateral.set(1, 0, 0);
    const vertical = new THREE.Vector3().crossVectors(lateral, point.clone().sub(player.pos)).normalize();
    const humanLow = players.p1.health + players.p1.shield < 55;
    const scatter = aiBrain.targetType === "enemy"
      ? 0.34
      : THREE.MathUtils.lerp(2.6, 1.25, combatDirector.intensity) * (humanLow ? 1.35 : 1);
    const angle = Math.random() * Math.PI * 2;
    const radius = scatter * (0.45 + Math.random() * 0.55);
    return point.addScaledVector(lateral, Math.cos(angle) * radius).addScaledVector(vertical, Math.sin(angle) * radius);
  }

  function landPlayer(player, previousPos = player.pos) {
    const wasGrounded = player.grounded;
    let bestContact = null;
    for (const platform of platforms) {
      const offset = player.pos.clone().sub(platform.center);
      const dist = offset.length();
      const normal = offset.multiplyScalar(1 / Math.max(dist, 0.0001));
      const surface = platform.radius + playerSurfaceOffset;
      const previousCenter = platform.prev || platform.center;
      const previousDist = previousPos.distanceTo(previousCenter);
      const normalSpeed = player.vel.dot(normal);
      const launchProtected = player.jumpGrace > 0 && platform === player.gravityPlatform;
      if (launchProtected) continue;
      const crossedSurface = previousDist >= surface - 0.08 && dist <= surface + 0.28;
      const maintainedContact = wasGrounded
        && platform === player.platform
        && dist <= surface + 0.72;
      const penetrated = dist < surface && normalSpeed <= 3;
      if (maintainedContact || (normalSpeed <= 3 && (crossedSurface || penetrated))) {
        const error = Math.abs(dist - surface);
        if (!bestContact || error < bestContact.error) {
          bestContact = { platform, normal: normal.clone(), surface, normalSpeed, error, maintainedContact };
        }
      }
    }
    player.grounded = false;
    if (bestContact) {
      player.pos.copy(bestContact.platform.center).addScaledVector(bestContact.normal, bestContact.surface);
      if (bestContact.normalSpeed < 0 || bestContact.maintainedContact) {
        player.vel.addScaledVector(bestContact.normal, -bestContact.normalSpeed);
      }
      player.grounded = true;
      player.jumpGrace = 0;
      player.platform = bestContact.platform;
      player.gravityPlatform = bestContact.platform;
      player.up.copy(bestContact.normal);
    }
    return !wasGrounded && player.grounded;
  }

  function onPlayerLanded(player, impactSpeed) {
    const strength = THREE.MathUtils.clamp((impactSpeed - 6) / 22, 0.12, 1);
    if (player.catRig) {
      player.catRig.state.landing = Math.max(player.catRig.state.landing, strength);
      player.catRig.state.landingVelocity = Math.min(player.catRig.state.landingVelocity, 0);
    }
    spawnBurst(player.pos, player.color, 5 + Math.floor(strength * 7), 0.28 + strength * 0.22, player.up);
    spawnSurgeWave(player.pos, player.bulletColor, 0.18 + strength * 0.16, 3.5 + strength * 4);
    if (player.id === localPlayerId) {
      cameraState.landingKick = Math.max(cameraState.landingKick, strength);
      cameraState.trauma = Math.max(cameraState.trauma, strength * 0.22);
      if (strength > 0.55) showCombatFeedback("HEAVY LANDING", "land");
      playSweep(120 + strength * 80, 64, 0.1 + strength * 0.08, 0.035, "triangle");
      pulseDevice(8 + Math.round(strength * 12));
    }
  }

  function updateRiftShards(dt) {
    const local = localPlayer();
    for (let i = riftShards.length - 1; i >= 0; i -= 1) {
      const shard = riftShards[i];
      shard.lon += dt * 0.18;
      const normal = spherical(shard.lat + Math.sin(state.simTime * 0.8 + shard.phase) * 0.08, shard.lon);
      shard.up.copy(normal);
      shard.pos.copy(shard.platform.center).addScaledVector(normal, shard.platform.radius + 1.42);
      shard.group.position.copy(shard.pos);
      shard.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      shard.core.rotation.y += dt * 2.4;
      shard.ring.rotation.x += dt * 1.9;
      shard.ring.rotation.z -= dt * 1.2;
      shard.group.scale.setScalar(1 + Math.sin(state.simTime * 4 + shard.phase) * 0.08);
      if (local && local.alive && local.pos.distanceTo(shard.pos) < 1.9) {
        collectRiftShard(i);
      }
    }

    state.nextShardSpawn = Math.max(0, state.nextShardSpawn - dt);
    if (riftShards.length < 4 && state.nextShardSpawn <= 0) {
      spawnRiftShard();
      state.nextShardSpawn = 2.4 + Math.random() * 1.8;
    }
  }

  function collectRiftShard(index) {
    const shard = riftShards[index];
    if (!shard) return;
    root.remove(shard.group);
    riftShards.splice(index, 1);
    addRiftCharge(25);
    awardCoins(1, false);
    const local = localPlayer();
    if (local?.alive) {
      const shieldBefore = local.shield;
      local.shield = Math.min(local.maxShield, local.shield + 12);
      local.health = Math.min(100, local.health + 5);
      local.guardPulse = Math.max(local.guardPulse, 0.48);
      if (local.shield > shieldBefore + 0.5) showCombatFeedback(`GUARD +${Math.ceil(local.shield - shieldBefore)}`, "guard");
    }
    state.message = state.riftCharge >= 100 ? "Rift Surge ready" : `Rift shard collected: ${state.riftCharge}%`;
    spawnEffect(shard.pos, 0x6ff7dd, 0.55);
    playSweep(640, 1180, 0.16, 0.055, "triangle");
    pulseDevice(12);
  }

  function addRiftCharge(amount) {
    state.riftCharge = THREE.MathUtils.clamp(Math.floor(state.riftCharge + amount), 0, 100);
  }

  function updateRiftSurge(dt) {
    if (!state.riftActive) return;
    state.riftTimer = Math.max(0, state.riftTimer - dt);
    state.nextRiftPulse -= dt;
    if (state.nextRiftPulse <= 0) {
      const local = localPlayer();
      if (local?.alive) {
        spawnSurgeWave(local.pos, 0x6ff7dd, 0.34, 18);
        for (let i = bullets.length - 1; i >= 0; i -= 1) {
          if (bullets[i].owner === "enemy" && bullets[i].pos.distanceTo(local.pos) < 17) removeBullet(i);
        }
        cameraState.trauma = Math.max(cameraState.trauma, 0.06);
      }
      state.nextRiftPulse = 0.72;
    }
    if (state.riftTimer <= 0) {
      state.riftActive = false;
      document.body.classList.remove("rift-active");
      state.message = "Rift Surge ended";
    }
  }

  function activateRiftSurge() {
    const local = localPlayer();
    if (!local || !state.started || state.ended || state.riftActive || state.riftCharge < 100) return;
    state.riftCharge = 0;
    state.riftActive = true;
    state.riftTimer = 7;
    state.nextRiftPulse = 0.2;
    document.body.classList.add("rift-active");
    state.message = "Rift Surge active";
    showCombatFeedback("RIFT SURGE", "rift");
    spawnSurgeWave(local.pos, 0x6ff7dd);
    playSweep(220, 1380, 0.35, 0.08, "sawtooth");
    pulseDevice(26);

    let cleared = 0;
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (!enemy.dead && enemy.pos.distanceTo(local.pos) < 42) {
        if (beginEnemyDeath(enemy)) {
          addScore(local.id, 1, "Rift surge");
          cleared += 1;
        }
      }
    }
    if (players.p2.alive && players.p2.pos.distanceTo(local.pos) < 24) {
      damagePlayer(players.p2, 30, local.id);
    }
    if (cleared > 0) state.message = `Rift Surge cleared ${cleared} hostile cat${cleared === 1 ? "" : "s"}`;
  }

  function spawnSurgeWave(pos, color, duration = 0.64, maxScale = 38) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.07, 12, 96),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 })
    );
    mesh.position.copy(pos);
    if (platforms.length) {
      const platform = nearestPlatform(pos);
      const normal = pos.clone().sub(platform.center).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    }
    root.add(mesh);
    surgeWaves.push({ mesh, life: duration, maxLife: duration, maxScale });
  }

  function updateSurgeWaves(dt) {
    for (let i = surgeWaves.length - 1; i >= 0; i -= 1) {
      const wave = surgeWaves[i];
      wave.life -= dt;
      const progress = 1 - wave.life / wave.maxLife;
      const scale = 1 + progress * wave.maxScale;
      wave.mesh.scale.set(scale, scale, scale);
      wave.mesh.material.opacity = Math.max(0, 0.82 * (1 - progress));
      if (wave.life <= 0) {
        root.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
        surgeWaves.splice(i, 1);
      }
    }
  }

  function updateCombatDirector(dt) {
    combatDirector.recentDamageTimer = Math.max(0, combatDirector.recentDamageTimer - dt);
    const local = localPlayer();
    if (!local) return;
    const elapsed = roundSeconds - state.timeLeft;
    const ramp = THREE.MathUtils.smoothstep(elapsed, 8, 100);
    const effectiveHealth = local.health + local.shield;
    const opponentId = local.id === "p1" ? "p2" : "p1";
    const scoreDeficit = Math.max(0, scores[opponentId] - scores[local.id]);
    let intensity = 0.43 + ramp * 0.27;
    if (effectiveHealth < 82) intensity -= 0.08;
    if (effectiveHealth < 50) intensity -= 0.12;
    if (scoreDeficit > 2) intensity -= Math.min(0.12, scoreDeficit * 0.018);
    if (combatDirector.recentDamageTimer > 0) intensity -= 0.08;
    if (state.streak >= 6 && effectiveHealth > 92) intensity += 0.045;
    if (elapsed < combatTuning.openingGrace) intensity = Math.min(intensity, 0.36);
    combatDirector.intensity = THREE.MathUtils.clamp(intensity, 0.32, 0.78);
    combatDirector.maxAttackers = elapsed > 24 && effectiveHealth > 68 && combatDirector.intensity >= 0.62 ? 2 : 1;
    combatDirector.activeAttackers = enemies.filter((enemy) => !enemy.dead && (enemy.telegraph > 0 || enemy.recover > 0)).length;
    combatDirector.incomingThreats = enemies.filter((enemy) => !enemy.dead && enemy.telegraph > 0 && enemy.targetId === local.id).length;
    combatDirector.label = combatDirector.incomingThreats > 0
      ? "LOCK"
      : combatDirector.intensity < 0.48
        ? "CALM"
        : combatDirector.intensity < 0.65
          ? "ACTIVE"
          : "SURGE";
  }

  function selectEnemyTarget(enemy) {
    const candidates = Object.values(players).filter((player) => player.alive);
    const local = localPlayer();
    return candidates.sort((a, b) => {
      const score = (player) => {
        let value = player.pos.distanceTo(enemy.pos);
        const effectiveHealth = player.health + player.shield;
        if (player === local && effectiveHealth < 68) value += 22;
        if (player === local && combatDirector.recentDamageTimer > 0) value += 10;
        value -= Math.max(0, scores[player.id] - Math.min(scores.p1, scores.p2)) * 1.4;
        return value;
      };
      return score(a) - score(b);
    })[0] || null;
  }

  function beginEnemyTelegraph(enemy, target) {
    const distance = enemy.pos.distanceTo(target.pos);
    const prediction = THREE.MathUtils.clamp(distance / enemy.spec.bulletSpeed, 0.04, 0.26)
      * THREE.MathUtils.lerp(0.42, 0.72, combatDirector.intensity);
    enemy.aimTarget.copy(target.pos).addScaledVector(target.vel, prediction);
    const targetUp = target.up.clone().normalize();
    const lateral = new THREE.Vector3().crossVectors(targetUp, enemy.aimTarget.clone().sub(enemy.pos)).normalize();
    if (lateral.lengthSq() < 0.001) lateral.set(1, 0, 0);
    const vertical = new THREE.Vector3().crossVectors(lateral, enemy.aimTarget.clone().sub(enemy.pos)).normalize();
    const mercy = target.id === localPlayerId && target.health + target.shield < 58 ? 1.35 : 1;
    const scatter = enemy.spec.aimError * THREE.MathUtils.lerp(1.18, 0.68, combatDirector.intensity) * mercy;
    const scatterAngle = Math.random() * Math.PI * 2;
    enemy.aimTarget
      .addScaledVector(lateral, Math.cos(scatterAngle) * scatter)
      .addScaledVector(vertical, Math.sin(scatterAngle) * scatter);
    enemy.telegraphTotal = enemy.spec.windup * THREE.MathUtils.lerp(1.32, 1, combatDirector.intensity);
    enemy.telegraph = enemy.telegraphTotal;
    enemy.targetId = target.id;
    enemy.attackState = "locking";
    if (target.id === localPlayerId) {
      const label = enemy.kind === "sniper" ? "SNIPER LOCK" : enemy.kind === "sentinel" ? "SENTINEL BLAST" : "SCOUT BURST";
      state.message = `${label}: move, dash, or interrupt`;
      playCombatSfx("lock");
    }
  }

  function clearEnemyTelegraph(enemy) {
    enemy.telegraph = 0;
    const parts = enemy.mesh.userData.parts;
    if (!parts) return;
    parts.aimLine.visible = false;
    parts.eyes.left.group.scale.x = 1;
    parts.eyes.right.group.scale.x = 1;
  }

  function lineOfSightClear(start, end, padding = 0.1) {
    for (const platform of platforms) {
      const hit = segmentSphereHit(start, end, platform.center, platform.radius + padding);
      if (hit !== null && hit > 0.015 && hit < 0.965) return false;
    }
    return true;
  }

  function updateEnemyBar(enemy) {
    if (!enemy.bar) return;
    const local = localPlayer();
    const recentlyHit = state.simTime - (enemy.lastDamagedAt || -99) < 1.25;
    const visible = Boolean(local)
      && enemy.pos.distanceTo(local.pos) < 72
      && (recentlyHit || enemy.telegraph > 0 || lockedTarget === enemy);
    enemy.bar.visible = visible;
    if (!visible) return;
    enemy.bar.position.copy(enemy.pos).addScaledVector(enemy.up, 1.62 * enemy.spec.scale);
    enemy.bar.quaternion.copy(camera.quaternion);
    const ratio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
    enemy.bar.userData.fill.scale.x = ratio;
  }

  function updateEnemies(dt) {
    let occupiedSlots = enemies.filter((enemy) => !enemy.dead && (enemy.telegraph > 0 || enemy.recover > 0)).length;
    let sniperSlotUsed = enemies.some((enemy) => !enemy.dead && enemy.kind === "sniper" && (enemy.telegraph > 0 || enemy.recover > 0));
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (enemy.dead) continue;
      enemy.prevPos.copy(enemy.pos);
      enemy.cooldown = Math.max(-1, enemy.cooldown - dt);
      enemy.recover = Math.max(0, enemy.recover - dt);
      enemy.stagger = Math.max(0, enemy.stagger - dt);
      const pace = enemy.telegraph > 0 ? 0.2 : enemy.stagger > 0 ? 0.06 : enemy.recover > 0 ? 1.18 : 1;
      enemy.lon += dt * enemy.spec.orbitSpeed * pace;
      const normal = spherical(enemy.lat + Math.sin(state.simTime * 0.78 + i) * 0.14, enemy.lon);
      enemy.up.copy(normal);
      enemy.pos.copy(enemy.platform.center).addScaledVector(normal, enemy.platform.radius + 0.92 * enemy.spec.scale);
      if (enemy.prevPos.lengthSq() < 0.001) enemy.prevPos.copy(enemy.pos);
      const travel = enemy.pos.clone().sub(enemy.prevPos).projectOnPlane(normal);
      const previousForward = enemy.forward.clone();
      if (travel.lengthSq() > 0.00001) {
        enemy.forward.lerp(travel.normalize(), 1 - Math.exp(-14 * dt)).projectOnPlane(normal).normalize();
      } else {
        enemy.forward.set(-Math.sin(enemy.lon), 0, Math.cos(enemy.lon)).projectOnPlane(normal).normalize();
      }
      const right = new THREE.Vector3().crossVectors(normal, enemy.forward).normalize();
      const basis = new THREE.Matrix4().makeBasis(right, normal, enemy.forward);
      enemy.mesh.position.copy(enemy.pos);
      enemy.mesh.quaternion.setFromRotationMatrix(basis);
      const parts = enemy.mesh.userData.parts;
      const catRig = enemy.mesh.userData.catRig;
      const turnAmount = THREE.MathUtils.clamp(previousForward.clone().cross(enemy.forward).dot(normal) * 8, -1, 1);
      const target = selectEnemyTarget(enemy);

      if (enemy.telegraph > 0) {
        enemy.telegraph = Math.max(0, enemy.telegraph - dt);
        if (parts) {
          enemy.mesh.updateMatrixWorld(true);
          const muzzleWorld = parts.muzzleFlash.getWorldPosition(new THREE.Vector3());
          const localMuzzle = enemy.mesh.worldToLocal(muzzleWorld);
          const localTarget = enemy.mesh.worldToLocal(enemy.aimTarget.clone());
          const attribute = parts.aimLine.geometry.getAttribute("position");
          attribute.setXYZ(0, localMuzzle.x, localMuzzle.y, localMuzzle.z);
          attribute.setXYZ(1, localTarget.x, localTarget.y, localTarget.z);
          attribute.needsUpdate = true;
          parts.aimLine.visible = true;
          const progress = 1 - enemy.telegraph / Math.max(enemy.telegraphTotal, 0.01);
          parts.aimLine.material.opacity = 0.16 + progress * 0.52 + Math.sin(state.simTime * 25) * 0.08;
          const eyePulse = 1 + Math.sin(state.simTime * 30) * (0.08 + progress * 0.1);
          parts.eyes.left.group.scale.x = eyePulse;
          parts.eyes.right.group.scale.x = eyePulse;
        }
        if (enemy.telegraph <= 0) {
          enemy.mesh.updateMatrixWorld(true);
          const origin = parts?.muzzleFlash
            ? parts.muzzleFlash.getWorldPosition(new THREE.Vector3())
            : enemy.pos.clone().addScaledVector(normal, 0.42).addScaledVector(enemy.forward, 1.05);
          if (lineOfSightClear(origin, enemy.aimTarget, 0.05)) {
            const direction = enemy.aimTarget.clone().sub(origin).normalize();
            const speed = enemy.spec.bulletSpeed * THREE.MathUtils.lerp(0.88, 1, combatDirector.intensity);
            const damage = Math.round(enemy.spec.damage * THREE.MathUtils.lerp(0.82, 1, combatDirector.intensity));
            shoot(origin, direction, speed, "enemy", enemy.spec.color, damage, { kind: enemy.kind, sourceIndex: i });
            enemy.firePulse = 1;
          }
          clearEnemyTelegraph(enemy);
          enemy.recover = enemy.spec.recover;
          enemy.cooldown = enemy.spec.cooldown * THREE.MathUtils.lerp(1.34, 1, combatDirector.intensity) + Math.random() * 0.55;
          enemy.attackState = "recover";
        }
      } else if (enemy.stagger > 0) {
        enemy.attackState = "staggered";
      } else if (enemy.recover > 0) {
        enemy.attackState = "recover";
      } else if (target && enemy.cooldown <= 0 && occupiedSlots < combatDirector.maxAttackers) {
        const distance = enemy.pos.distanceTo(target.pos);
        const sniperAvailable = enemy.kind !== "sniper" || !sniperSlotUsed;
        const origin = enemy.pos.clone().addScaledVector(enemy.up, 0.45);
        if (sniperAvailable && distance < enemy.spec.range && lineOfSightClear(origin, target.pos, 0.12)) {
          beginEnemyTelegraph(enemy, target);
          occupiedSlots += 1;
          if (enemy.kind === "sniper") sniperSlotUsed = true;
        }
      } else {
        enemy.attackState = "patrol";
      }

      updateEnemyBar(enemy);
      if (catRig) {
        animateCombatCat(THREE, catRig, {
          dt,
          time: state.simTime + i * 0.31,
          speed: travel.length() / Math.max(dt, 0.0001),
          grounded: true,
          normalVelocity: 0,
          dash: enemy.kind === "scout" && enemy.attackState === "patrol" ? 0.08 : 0,
          turning: turnAmount,
          aiming: enemy.telegraph > 0,
          firePulse: enemy.firePulse,
          landing: enemy.stagger > 0 ? 0.45 : 0,
        });
      }
      enemy.firePulse *= Math.exp(-24 * dt);
    }
  }

  function beginEnemyDeath(enemy) {
    if (!enemy || enemy.dead) return false;
    enemy.dead = true;
    enemy.deathTimer = 0.44;
    enemy.attackState = "destroyed";
    clearEnemyTelegraph(enemy);
    if (enemy.bar) enemy.bar.visible = false;
    spawnBurst(enemy.pos, enemy.spec.color, 15, 0.38, enemy.up);
    spawnSurgeWave(enemy.pos, enemy.spec.color, 0.24, 5.5);
    return true;
  }

  function updateEnemyDeaths(dt) {
    for (const enemy of enemies) {
      if (!enemy.dead || enemy.deathTimer <= 0) continue;
      enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      const progress = 1 - enemy.deathTimer / 0.44;
      const scale = Math.max(0.02, 1 - progress * progress);
      enemy.mesh.scale.copy(enemy.baseScale).multiplyScalar(scale);
      enemy.mesh.rotation.y += dt * 8;
      enemy.mesh.rotation.z += dt * 3.5;
      if (enemy.deathTimer <= 0) {
        root.remove(enemy.mesh);
        root.remove(enemy.bar);
      }
    }
  }

  function updateEnemySpawns(dt) {
    state.nextEnemySpawn = Math.max(0, state.nextEnemySpawn - dt);
    const aliveCount = enemies.filter((enemy) => !enemy.dead).length;
    if (aliveCount >= combatTuning.enemyCap || state.nextEnemySpawn > 0) return;
    spawnEnemy();
    state.nextEnemySpawn = combatTuning.spawnDelayMin
      + Math.random() * (combatTuning.spawnDelayMax - combatTuning.spawnDelayMin);
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.life -= dt;
      const previous = bullet.pos.clone();
      const next = bullet.pos.clone().addScaledVector(bullet.vel, dt);
      if (bullet.life <= 0) {
        removeBullet(i);
        continue;
      }
      let hit = null;
      const consider = (type, target, center, radius) => {
        const t = segmentSphereHit(previous, next, center, radius + bullet.radius);
        if (t !== null && (!hit || t < hit.t)) hit = { type, target, t };
      };
      const considerCat = (type, target, actor, scale = 1) => {
        const actorUp = actor.up.clone().normalize();
        const actorForward = actor.forward.clone().projectOnPlane(actorUp).normalize();
        consider(type, target, actor.pos.clone().addScaledVector(actorUp, 0.05 * scale), 0.58 * scale);
        consider(type, target, actor.pos.clone().addScaledVector(actorForward, 0.66 * scale).addScaledVector(actorUp, 0.28 * scale), 0.46 * scale);
        consider(type, target, actor.pos.clone().addScaledVector(actorForward, -0.58 * scale).addScaledVector(actorUp, 0.04 * scale), 0.5 * scale);
        consider(type, target, actor.pos.clone().addScaledVector(actorForward, 1.04 * scale).addScaledVector(actorUp, 0.43 * scale), 0.4 * scale);
      };

      if (bullet.owner === "enemy") {
        const targets = Object.values(players);
        for (const player of targets) {
          if (player.alive) considerCat("player", player, player);
        }
      } else {
        for (let e = 0; e < enemies.length; e += 1) {
          const enemy = enemies[e];
          if ((bullet.owner === localPlayerId || bullet.owner === rivalPlayerId) && !enemy.dead) {
            considerCat("enemy", { enemy, index: e }, enemy, enemy.spec.scale);
          }
        }
        const other = players[bullet.owner === "p1" ? "p2" : "p1"];
        if (other.alive) considerCat("rival", other, other);
      }
      for (const platform of platforms) consider("platform", platform, platform.center, platform.radius);

      if (!hit) {
        registerNearMiss(bullet, previous, next);
        bullet.pos.copy(next);
        bullet.mesh.position.copy(bullet.pos);
        continue;
      }

      bullet.pos.lerpVectors(previous, next, hit.t);
      bullet.mesh.position.copy(bullet.pos);
      if (hit.type === "player") {
        if (hit.target.id === localPlayerId && hit.target.dashTimer > 0) {
          parryEnemyBullet(i, hit.target);
          continue;
        }
        damagePlayer(hit.target, bullet.damage, "enemy", bullet.vel);
        spawnBurst(bullet.pos, bullet.color, 6, 0.2, bullet.vel.clone().normalize());
      } else if (hit.type === "enemy") {
        const { enemy } = hit.target;
        const interrupted = enemy.telegraph > 0;
        if (interrupted) {
          clearEnemyTelegraph(enemy);
          enemy.recover = Math.max(enemy.recover, 0.68);
          enemy.cooldown = Math.max(enemy.cooldown, 1.25);
          enemy.attackState = "interrupted";
          if (bullet.owner === localPlayerId) {
            combatDirector.interrupts += 1;
            addRiftCharge(8);
            const local = localPlayer();
            if (local) local.shield = Math.min(local.maxShield, local.shield + 3);
            showCombatFeedback("LOCK INTERRUPTED · +8 RIFT", "interrupt");
            playCombatSfx("interrupt");
          }
        }
        enemy.health -= bullet.damage;
        enemy.lastDamagedAt = state.simTime;
        enemy.stagger = Math.max(enemy.stagger, interrupted ? 0.34 : 0.18);
        spawnBurst(bullet.pos, bullet.color, 7, 0.24, bullet.vel.clone().normalize());
        if (bullet.owner === localPlayerId) confirmHit(enemy.health <= 0);
        if (enemy.health <= 0) {
          if (beginEnemyDeath(enemy)) {
            addScore(bullet.owner, 1, `${enemy.kind} destroyed`);
            if (bullet.owner === localPlayerId) {
              addRiftCharge(5);
              const local = localPlayer();
              if (local) local.shield = Math.min(local.maxShield, local.shield + 4);
              playCombatSfx("kill");
              pulseDevice(18);
            }
          }
        }
      } else if (hit.type === "rival") {
        damagePlayer(hit.target, Math.min(20, bullet.damage), bullet.owner);
        confirmHit(false);
      } else if (hit.type === "platform") {
        spawnBurst(bullet.pos, bullet.color, 4, 0.14, bullet.pos.clone().sub(hit.target.center).normalize());
      }
      removeBullet(i);
    }
  }

  function segmentSphereHit(start, end, center, radius) {
    const direction = end.clone().sub(start);
    const offset = start.clone().sub(center);
    const a = direction.lengthSq();
    if (a < 0.0000001) return start.distanceToSquared(center) <= radius * radius ? 0 : null;
    const b = 2 * offset.dot(direction);
    const c = offset.lengthSq() - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const rootValue = Math.sqrt(discriminant);
    const t1 = (-b - rootValue) / (2 * a);
    const t2 = (-b + rootValue) / (2 * a);
    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return c <= 0 ? 0 : null;
  }

  function segmentPointDistanceSq(start, end, point) {
    const segment = end.clone().sub(start);
    const lengthSq = segment.lengthSq();
    if (lengthSq < 0.0000001) return start.distanceToSquared(point);
    const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
    return start.clone().addScaledVector(segment, t).distanceToSquared(point);
  }

  function registerNearMiss(bullet, start, end) {
    if (bullet.owner !== "enemy" || bullet.nearMissed) return;
    const local = localPlayer();
    if (!local?.alive || local.dashTimer > 0) return;
    const distanceSq = segmentPointDistanceSq(start, end, local.pos);
    if (distanceSq > combatTuning.nearMissRadius ** 2 || distanceSq < 0.95 ** 2) return;
    bullet.nearMissed = true;
    combatDirector.nearMisses += 1;
    addRiftCharge(2);
    local.shield = Math.min(local.maxShield, local.shield + 1);
    if (state.simTime - combatDirector.lastNearMissFeedback > 0.85) {
      combatDirector.lastNearMissFeedback = state.simTime;
      showCombatFeedback("NEAR MISS · +2 RIFT", "parry");
      playCombatSfx("near");
    }
  }

  function confirmHit(kill) {
    document.body.classList.remove("hit-confirmed");
    void document.body.offsetWidth;
    document.body.classList.add("hit-confirmed");
    setTimeout(() => document.body.classList.remove("hit-confirmed"), 120);
    showCombatFeedback(kill ? "TARGET BROKEN" : "HIT", kill ? "kill" : "hit");
    cameraState.trauma = Math.max(cameraState.trauma, kill ? 0.22 : 0.08);
  }

  function fire(player, forcedDirection = null, damage = 34) {
    const crosshairDirection = camera.getWorldDirection(new THREE.Vector3()).normalize();
    const aimForward = cameraState.forward.clone().projectOnPlane(player.up);
    if (aimForward.lengthSq() < 0.001) aimForward.copy(player.forward).projectOnPlane(player.up);
    aimForward.normalize();
    player.mesh.updateMatrixWorld(true);
    const muzzle = player.parts?.muzzleFlash
      ? player.parts.muzzleFlash.getWorldPosition(new THREE.Vector3())
      : player.pos.clone().addScaledVector(player.up, 0.42).addScaledVector(aimForward, 1.15);
    const crosshairPoint = camera.position.clone().addScaledVector(crosshairDirection, 90);
    let direction = forcedDirection ? forcedDirection.clone().normalize() : crosshairPoint.sub(muzzle).normalize();
    if (!forcedDirection && lockedTarget && (isCompactTouch || state.riftActive)) {
      direction.lerp(lockedTarget.pos.clone().sub(muzzle).normalize(), isCompactTouch ? 0.26 : 0.1).normalize();
    }
    shoot(muzzle, direction, actionTuning.shotSpeed, player.id, player.bulletColor, damage);
    player.firePulse = 1;
    player.cooldown = state.riftActive && player.id === localPlayerId ? actionTuning.surgeShotCooldown : actionTuning.shotCooldown;
    cameraState.recoil = Math.min(0.16, cameraState.recoil + (player.id === localPlayerId ? 0.025 : 0));
    cameraState.trauma = Math.max(cameraState.trauma, player.id === localPlayerId ? 0.035 : 0);
    playSweep(player.id === "p2" ? 380 : 460, 170, 0.08, 0.045, "square");
    spawnBurst(muzzle, player.bulletColor, 3, 0.11, direction);
  }

  function shoot(origin, direction, speed, owner, color, damage = owner === "enemy" ? 10 : 34, metadata = {}) {
    const colorKey = Number(color || 0xffffff);
    if (!bulletMaterials.has(colorKey)) {
      bulletMaterials.set(colorKey, {
        core: new THREE.MeshBasicMaterial({ color: colorKey }),
        trail: new THREE.MeshBasicMaterial({ color: colorKey, transparent: true, opacity: 0.38, depthWrite: false }),
      });
    }
    const materials = bulletMaterials.get(colorKey);
    const mesh = new THREE.Group();
    const core = new THREE.Mesh(owner === "enemy" ? enemyBulletGeometry : bulletGeometry, materials.core);
    const trail = new THREE.Mesh(
      owner === "enemy" ? enemyTrailGeometry : playerTrailGeometry,
      materials.trail
    );
    trail.position.y = owner === "enemy" ? -0.55 : -0.82;
    mesh.add(core, trail);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    root.add(mesh);
    bullets.push({
      mesh,
      pos: origin.clone(),
      vel: direction.clone().multiplyScalar(speed),
      owner,
      color: colorKey,
      damage,
      kind: metadata.kind || null,
      sourceIndex: Number.isInteger(metadata.sourceIndex) ? metadata.sourceIndex : -1,
      nearMissed: false,
      radius: owner === "enemy" ? 0.17 : 0.22,
      life: owner === "enemy" ? 3.1 : 2.6,
    });
    spawnEffect(origin, colorKey, 0.12);
  }

  function damagePlayer(player, amount, source, incomingVelocity = null) {
    if (!player || (player.invuln > 0 && source !== null)) return false;
    const shieldBefore = player.shield;
    const absorbed = source === null ? 0 : Math.min(player.shield, amount);
    player.shield = Math.max(0, player.shield - absorbed);
    const healthDamage = Math.max(0, amount - absorbed);
    player.health = Math.max(0, player.health - healthDamage);
    player.invuln = combatTuning.hitInvulnerability;
    player.lastDamageAt = state.simTime;
    player.guardPulse = Math.max(player.guardPulse, absorbed > 0 ? 1 : 0.45);
    const attacker = players[source];
    if (attacker) {
      const knockback = player.pos.clone().sub(attacker.pos).projectOnPlane(player.up);
      if (knockback.lengthSq() > 0.001) player.vel.addScaledVector(knockback.normalize(), 4.5).addScaledVector(player.up, 2.2);
    } else if (incomingVelocity) {
      const knockback = incomingVelocity.clone().projectOnPlane(player.up);
      if (knockback.lengthSq() > 0.001) player.vel.addScaledVector(knockback.normalize(), 2.5).addScaledVector(player.up, 1.2);
    }
    spawnBurst(player.pos, absorbed > 0 ? 0x85eaff : source === "enemy" ? 0xff4b4b : player.color, absorbed > 0 ? 7 : 9, 0.32, player.up);
    playCombatSfx(healthDamage > 0 ? "damage" : "guard");
    duckMusic(healthDamage > 0 ? 0.42 : 0.68, healthDamage > 0 ? 0.24 : 0.13);
    if (player.id === localPlayerId) {
      combatDirector.recentDamageTimer = healthDamage > 0 ? 3.2 : 1.5;
      cameraState.trauma = Math.max(cameraState.trauma, healthDamage > 0 ? 0.34 : 0.14);
      const hitClass = healthDamage > 0 ? "damage-hit" : "guard-hit";
      document.body.classList.remove("damage-hit", "guard-hit");
      void document.body.offsetWidth;
      document.body.classList.add(hitClass);
      setTimeout(() => document.body.classList.remove(hitClass), healthDamage > 0 ? 320 : 240);
      if (shieldBefore > 0 && player.shield <= 0) {
        showCombatFeedback("RIFT GUARD BROKEN", "damage");
      } else if (healthDamage > 0) {
        showCombatFeedback(`-${Math.round(healthDamage)} VITALS`, "damage");
      } else {
        showCombatFeedback(`GUARD -${Math.round(absorbed)}`, "guard");
      }
      pulseDevice(healthDamage > 0 ? 18 : 10);
    }
    if (source === "p1" || source === "p2") {
      addScore(source, 1, "Direct hit");
      state.message = `${source === localPlayerId ? "You" : "AI Cat"} scored a hit`;
      playSweep(620, 920, 0.12, 0.045, "triangle");
      pulseDevice(14);
    }
    if (player.health <= 0) {
      player.alive = false;
      player.mesh.visible = false;
      player.respawnTimer = 2.05;
      if (player.id === localPlayerId) combatDirector.localDeaths += 1;
      state.message = `${player.label} is respawning`;
      spawnSurgeWave(player.pos, player.color, 0.38, 12);
      spawnBurst(player.pos, player.color, 18, 0.52, player.up);
    }
    return true;
  }

  function addScore(owner, amount, reason) {
    if (!scores[owner]) scores[owner] = 0;
    const localScored = owner === localPlayerId;
    if (localScored) {
      state.streak += 1;
      state.matchBestStreak = Math.max(state.matchBestStreak, state.streak);
      state.streakTimer = 3.5;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      writeNumber("speedy-jumper-best-streak", state.bestStreak);
      state.dailyProgress = Math.min(state.dailyTarget, state.dailyProgress + amount);
      writeDailyProgress(state.dailyProgress);
    } else {
      state.streak = 0;
      state.streakTimer = 0;
    }
    const bonus = state.streak > 0 && state.streak % 5 === 0 ? 2 : state.streak > 0 && state.streak % 3 === 0 ? 1 : 0;
    scores[owner] += amount + (localScored ? bonus : 0);
    if (localScored) {
      const coinGain = amount + bonus + (state.streak >= 5 ? 1 : 0);
      awardCoins(coinGain, false);
      if (!state.dailyClaimed && state.dailyProgress >= state.dailyTarget) {
        state.dailyClaimed = true;
        writeTodayFlag("speedy-jumper-daily-claimed", true);
        awardCoins(25, true);
        state.message = `Daily target complete: +25 coins`;
        showCombatFeedback("DAILY COMPLETE · +25", "streak");
        playSweep(580, 1280, 0.22, 0.07, "triangle");
      }
    }
    if (localScored && scores[owner] > state.bestScore) {
      state.bestScore = scores[owner];
      writeNumber("speedy-jumper-best-score", state.bestScore);
    }
    if (bonus > 0) {
      state.message = `${reason}: x${state.streak} streak bonus +${bonus}`;
      showCombatFeedback(`x${state.streak} STREAK · +${bonus}`, "streak");
      playSweep(720, 1180, 0.16, 0.06, "triangle");
    }
  }

  function awardCoins(amount, announce) {
    state.coins += amount;
    state.matchCoins += amount;
    writeNumber("speedy-jumper-coins", state.coins);
    if (announce) pulseDevice(20);
  }

  function finishByScore(reason) {
    state.ended = true;
    input.fire = false;
    const winner = scores.p1 === scores.p2 ? "Draw" : scores.p1 > scores.p2 ? "You win" : "AI Cat wins";
    const localWon = scores.p1 > scores.p2;
    if (localWon) awardCoins(10, true);
    if (state.matchBestStreak >= 8) awardCoins(5, true);
    analytics.logEvent("level_end", {
      level_name: "solo_match",
      success: localWon,
      result: scores.p1 === scores.p2 ? "draw" : localWon ? "win" : "loss",
      score: scores.p1,
      opponent_score: scores.p2,
      coins_earned: state.matchCoins,
      best_streak: state.matchBestStreak,
    });
    if (scores.p1 > state.bestScore) {
      state.bestScore = scores.p1;
      writeNumber("speedy-jumper-best-score", state.bestScore);
    }
    state.message = `${reason} ${winner}. Final ${scores.p1}-${scores.p2}. +${state.matchCoins} coins. Best ${state.bestScore}.`;
    showOverlay("RE-ENTER THE RIFT", state.message);
    document.body.classList.add("game-over");
    void beginPostMatchAdBreak();
  }

  function updateAdInterface(adState) {
    const startupPrivacyPending = adState.supported && !adState.consentSettled;
    if (!state.started && !state.ended && startButton) {
      startButton.disabled = startupPrivacyPending;
      if (startupPrivacyPending) startButton.textContent = "PRIVACY SETUP…";
      else if (startButton.textContent === "PRIVACY SETUP…") startButton.textContent = "ENTER THE RIFT";
    }
    if (privacyOptionsButton) {
      privacyOptionsButton.hidden = !adState.supported || !adState.privacyOptionsRequired;
      privacyOptionsButton.disabled = adState.showing || adState.privacyFormShowing || replayGateBlocked;
    }
    if (adStatus && !state.started && !state.ended) {
      adStatus.hidden = !startupPrivacyPending;
      if (startupPrivacyPending) adStatus.textContent = "Preparing required advertising privacy choices…";
    }
    if (!adStatus || !state.ended || !replayGateBlocked) return;
    adStatus.hidden = false;
    if (adState.showing) adStatus.textContent = "Advertisement in progress…";
    else if (adState.phase === "ready") adStatus.textContent = "Advertisement ready…";
    else adStatus.textContent = "Preparing the ad break…";
  }

  function unlockReplayAfterAd({ shown = false, reason = "unavailable", hideStatus = false } = {}) {
    replayGateBlocked = false;
    if (reason !== "unsupported") {
      const adState = replayAds.snapshot();
      analytics.logEvent("post_match_ad", {
        outcome: shown ? "shown" : reason,
        ad_phase: adState.phase,
        ad_error: adState.lastErrorDetail || adState.lastError || "none",
      });
    }
    updateAdInterface(replayAds.snapshot());
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "RE-ENTER THE RIFT";
    }
    if (adStatus) {
      adStatus.hidden = hideStatus;
      adStatus.textContent = shown
        ? "Ad break complete · next match ready"
        : reason === "unsupported"
          ? ""
          : "Ad unavailable · replay unlocked";
    }
    setTimeout(() => startButton?.focus({ preventScroll: true }), 0);
  }

  async function beginPostMatchAdBreak() {
    const generation = ++postMatchAdGeneration;
    const adState = replayAds.snapshot();
    if (!adState.supported || document.visibilityState !== "visible") {
      unlockReplayAfterAd({ reason: "unsupported", hideStatus: true });
      return;
    }

    // Never wait for a late load on the results screen. If the ad was not
    // preloaded during the two-minute match, this replay fails open.
    if (!adState.initialized || !adState.sdkInitialized || !adState.canRequest || !adState.ready
      || adState.privacyFormShowing) {
      unlockReplayAfterAd({ reason: "not-ready" });
      void replayAds.preload();
      return;
    }

    replayGateBlocked = true;
    updateAdInterface(adState);
    clearInputs();
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "AD BREAK…";
    }
    if (adStatus) {
      adStatus.hidden = false;
      adStatus.textContent = "Advertisement starts in a moment…";
    }

    // A short settle prevents a last gameplay tap from landing on the ad.
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (!state.ended || generation !== postMatchAdGeneration) return;
    if (document.visibilityState !== "visible") {
      unlockReplayAfterAd({ reason: "inactive" });
      return;
    }

    const currentAdState = replayAds.snapshot();
    if (!currentAdState.ready || currentAdState.privacyFormShowing) {
      unlockReplayAfterAd({ reason: "not-ready" });
      return;
    }

    const resumeAudioAfterAd = audio.context?.state === "running" && !state.muted;
    try {
      await audio.context?.suspend();
    } catch {}

    if (document.visibilityState !== "visible") {
      if (resumeAudioAfterAd) {
        try {
          await audio.context?.resume();
        } catch {}
      }
      unlockReplayAfterAd({ reason: "inactive" });
      return;
    }

    const result = await replayAds.showReadyInterstitial();
    if (!state.ended || generation !== postMatchAdGeneration) return;

    if (resumeAudioAfterAd) {
      try {
        await audio.context?.resume();
      } catch {}
    }
    unlockReplayAfterAd(result);
  }

  function updateCamera(dt) {
    const player = localPlayer() || players.p1;
    const up = player.up.clone().normalize();
    const forward = cameraState.forward.clone().projectOnPlane(up);
    if (forward.lengthSq() < 0.001) forward.copy(player.forward).projectOnPlane(up);
    forward.normalize();
    cameraState.forward.copy(forward);
    cameraState.recoil *= Math.exp(-10 * dt);
    cameraState.trauma = Math.max(0, cameraState.trauma - dt * 1.7);
    cameraState.landingKick *= Math.exp(-9 * dt);
    const pitch = THREE.MathUtils.clamp(cameraState.pitch + cameraState.recoil, -0.68, 0.58);
    const viewDirection = forward.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).normalize();
    const focus = player.pos.clone()
      .addScaledVector(up, 0.62 - cameraState.landingKick * 0.24)
      .addScaledVector(forward, 0.28);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const desired = focus
      .clone()
      .addScaledVector(forward, -cameraTuning.followDistance)
      .addScaledVector(right, cameraTuning.sideOffset)
      .addScaledVector(up, cameraTuning.height - cameraState.landingKick * 0.58);
    const shake = reducedMotionQuery.matches ? 0 : cameraState.trauma * cameraState.trauma;
    desired.addScaledVector(right, Math.sin(state.simTime * 83) * shake * 0.34);
    desired.addScaledVector(up, Math.sin(state.simTime * 109 + 1.4) * shake * 0.25);
    let cameraHit = null;
    for (const platform of platforms) {
      const t = segmentSphereHit(focus, desired, platform.center, platform.radius + 0.5);
      if (t !== null && t > 0.04 && (!cameraHit || t < cameraHit)) cameraHit = t;
    }
    if (cameraHit !== null) desired.lerpVectors(focus, desired, Math.max(0.08, cameraHit - 0.04));
    camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    camera.up.copy(up);
    camera.lookAt(focus.clone().addScaledVector(viewDirection, cameraTuning.lookAhead));
    updateRingVisibility(dt, focus);
    const tangentSpeed = player.vel.clone().projectOnPlane(up).length();
    const motionFovScale = reducedMotionQuery.matches ? 0.22 : 1;
    const targetFov = cameraTuning.baseFov + (
      THREE.MathUtils.clamp((tangentSpeed - 10) * 0.2, 0, 4.5)
      + (player.dashTimer > 0 ? 7 : 0)
      + (state.riftActive ? 2 : 0)
    ) * motionFovScale;
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-8 * dt));
    camera.updateProjectionMatrix();
  }

  function updateRingVisibility(dt, focus) {
    fadedRingCount = 0;
    for (const platform of platforms) {
      if (!platform.rings) continue;
      const blocksView = segmentSphereHit(
        camera.position,
        focus,
        platform.center,
        platform.collisionRadius + 0.35
      ) !== null;
      if (blocksView) fadedRingCount += 1;
      const visibility = blocksView ? 0.12 : 1;
      for (const ring of platform.rings.children) {
        const baseOpacity = ring.material.userData.baseOpacity ?? ring.material.opacity;
        const targetOpacity = baseOpacity * visibility;
        ring.material.opacity += (targetOpacity - ring.material.opacity) * (1 - Math.exp(-14 * dt));
      }
    }
  }

  function updateTargetLock() {
    if (!state.started || state.ended || state.countdown > 0) {
      lockedTarget = null;
      document.body.classList.remove("target-locked");
      return;
    }
    const origin = camera.position;
    const direction = camera.getWorldDirection(new THREE.Vector3()).normalize();
    const candidates = enemies.filter((enemy) => !enemy.dead);
    const rival = rivalPlayer();
    if (rival?.alive) candidates.push(rival);
    let best = null;
    for (const candidate of candidates) {
      const toTarget = candidate.pos.clone().sub(origin);
      const distance = toTarget.length();
      if (distance > 82 || distance < 1) continue;
      if (!lineOfSightClear(origin, candidate.pos, 0.08)) continue;
      const alignment = toTarget.multiplyScalar(1 / distance).dot(direction);
      if (alignment < (isCompactTouch ? 0.982 : 0.991)) continue;
      const score = alignment - distance * 0.00008;
      if (!best || score > best.score) best = { target: candidate, score };
    }
    lockedTarget = best?.target || null;
    document.body.classList.toggle("target-locked", Boolean(lockedTarget));
  }

  function syncMesh(player, dt = fixedStep) {
    const up = player.up.clone().normalize();
    const forward = player.forward.clone().projectOnPlane(up);
    if (forward.lengthSq() < 0.001) forward.set(0, 0, 1).projectOnPlane(up);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const matrix = new THREE.Matrix4().makeBasis(right, up, forward);
    player.mesh.position.copy(player.pos);
    player.mesh.quaternion.setFromRotationMatrix(matrix);
    player.mesh.visible = player.alive;
    if (player.catRig) {
      const previousForward = player.previousForward.clone().projectOnPlane(up);
      if (previousForward.lengthSq() < 0.001) previousForward.copy(forward);
      previousForward.normalize();
      const turnDelta = previousForward.clone().cross(forward).dot(up);
      const targetTurn = THREE.MathUtils.clamp(turnDelta / Math.max(dt, 0.0001) * 0.18, -1, 1);
      player.turnAmount = THREE.MathUtils.lerp(player.turnAmount || 0, targetTurn, 1 - Math.exp(-10 * dt));
      player.previousForward.copy(forward);
      const tangentSpeed = player.vel.clone().projectOnPlane(up).length();
      animateCombatCat(THREE, player.catRig, {
        dt,
        time: state.simTime + (player.id === "p2" ? 0.21 : 0),
        speed: tangentSpeed,
        grounded: player.grounded,
        normalVelocity: player.vel.dot(up),
        dash: player.dashTimer > 0 ? 1 : 0,
        turning: player.turnAmount,
        aiming: input.fire || player.cooldown > 0.02,
        firePulse: player.firePulse,
      });
      player.firePulse *= Math.exp(-24 * dt);
      const glow = player.parts.materials?.armor;
      if (glow) glow.emissiveIntensity = 0.2 + (state.riftActive && player.id === localPlayerId ? 0.5 : 0) + (player.dashTimer > 0 ? 0.28 : 0);
    }
    player.guardPulse = Math.max(0, (player.guardPulse || 0) - dt * 2.8);
    if (player.guardShell) {
      const shieldRatio = THREE.MathUtils.clamp(player.shield / player.maxShield, 0, 1);
      const pulse = player.guardPulse || 0;
      player.guardShell.visible = player.alive && (shieldRatio > 0.01 || pulse > 0.01);
      player.guardShell.material.opacity = 0.018 + shieldRatio * 0.035 + pulse * 0.16;
      const shellScale = 1 + pulse * 0.08 + Math.sin(state.simTime * 3.2 + (player.id === "p2" ? 1.4 : 0)) * 0.012;
      player.guardShell.scale.set(1.15 * shellScale, 1.05 * shellScale, 1.72 * shellScale);
    }
  }

  function spawnEffect(pos, color, scale) {
    const mesh = new THREE.Mesh(
      effectGeometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    );
    mesh.position.copy(pos);
    mesh.scale.setScalar(scale);
    root.add(mesh);
    effects.push({ mesh, life: 0.35, maxLife: 0.35, scale, velocity: null, spin: 0 });
  }

  function spawnBurst(pos, color, count = 7, scale = 0.24, direction = new THREE.Vector3(0, 1, 0)) {
    const axis = direction.clone().normalize();
    const particleCount = reducedMotionQuery.matches ? Math.max(2, Math.ceil(count * 0.45)) : count;
    for (let i = 0; i < particleCount; i += 1) {
      const velocity = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      if (velocity.dot(axis) < -0.25) velocity.reflect(axis);
      velocity.addScaledVector(axis, 0.45 + Math.random() * 0.8).normalize().multiplyScalar(3 + Math.random() * 8);
      const particleScale = scale * (0.42 + Math.random() * 0.7);
      const mesh = new THREE.Mesh(
        effectGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false })
      );
      mesh.position.copy(pos);
      mesh.scale.setScalar(particleScale);
      root.add(mesh);
      const maxLife = 0.22 + Math.random() * 0.32;
      effects.push({
        mesh,
        life: maxLife,
        maxLife,
        scale: particleScale,
        velocity,
        spin: (Math.random() * 2 - 1) * 9,
      });
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.life -= dt;
      if (effect.velocity) {
        effect.mesh.position.addScaledVector(effect.velocity, dt);
        effect.velocity.multiplyScalar(Math.exp(-2.2 * dt));
        effect.mesh.rotation.x += effect.spin * dt;
        effect.mesh.rotation.y -= effect.spin * 0.7 * dt;
        effect.mesh.scale.multiplyScalar(Math.exp(-2.4 * dt));
      } else {
        effect.mesh.scale.multiplyScalar(1 + dt * 5);
      }
      effect.mesh.material.opacity = Math.max(0, 0.85 * effect.life / effect.maxLife);
      if (effect.life <= 0) {
        root.remove(effect.mesh);
        effect.mesh.material.dispose();
        effects.splice(i, 1);
      }
    }
  }

  function ensureAudio() {
    if (!AudioContextClass || audio.context) return audio.context;
    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      const music = context.createGain();
      const sfx = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const noise = noiseBuffer.getChannelData(0);
      let noiseSeed = 0x5f3759df;
      for (let i = 0; i < noise.length; i += 1) {
        noiseSeed = Math.imul(noiseSeed ^ noiseSeed >>> 15, 1 | noiseSeed);
        noise[i] = (((noiseSeed >>> 0) / 4294967295) * 2 - 1) * (1 - i / noise.length * 0.12);
      }
      master.gain.value = state.muted ? 0 : 0.78;
      music.gain.value = 0.42;
      sfx.gain.value = 0.38;
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.22;
      music.connect(master);
      sfx.connect(master);
      master.connect(compressor);
      compressor.connect(context.destination);
      audio.context = context;
      audio.master = master;
      audio.music = music;
      audio.sfx = sfx;
      audio.compressor = compressor;
      audio.noiseBuffer = noiseBuffer;
      audio.nextBeat = context.currentTime + 0.08;
      context.onstatechange = () => {
        audio.unlocked = context.state === "running";
        if (!audio.unlocked) audio.playing = false;
      };
      return context;
    } catch (error) {
      audio.unlockError = error?.message || "Audio initialization failed";
      return null;
    }
  }

  function unlockAudio() {
    const context = ensureAudio();
    if (!context) return;

    // A one-sample silent source primes Web Audio on Safari/iOS while this
    // function is still running inside the user's click, tap, or key press.
    if (!audio.primed) {
      try {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate);
        source.connect(context.destination);
        source.start(0);
        audio.primed = true;
      } catch {}
    }

    if (context.state === "running") {
      audio.unlocked = true;
      audio.unlockError = "";
      return;
    }
    if (audio.resumePending) return;
    audio.resumePending = true;
    try {
      const result = context.resume();
      Promise.resolve(result).then(() => {
        audio.resumePending = false;
        audio.unlocked = context.state === "running";
        audio.unlockError = audio.unlocked ? "" : `Audio context is ${context.state}`;
        if (audio.unlocked && state.started && !state.ended) {
          audio.nextBeat = context.currentTime + 0.025;
        }
      }).catch((error) => {
        audio.resumePending = false;
        audio.unlockError = error?.message || "Audio resume was blocked";
      });
    } catch (error) {
      audio.resumePending = false;
      audio.unlockError = error?.message || "Audio resume was blocked";
    }
  }

  function restartMusicTransport() {
    if (!audio.context) return;
    audio.step = 0;
    audio.scheduledSteps = 0;
    audio.nextBeat = audio.context.currentTime + 0.055;
    audio.playing = true;
  }

  function updateMusic() {
    if (!audio.context || !state.started || state.ended || state.paused) {
      audio.playing = false;
      return;
    }
    if (audio.context.state !== "running") {
      audio.playing = false;
      return;
    }
    audio.unlocked = true;
    if (audio.nextBeat < audio.context.currentTime - 0.05) {
      audio.nextBeat = audio.context.currentTime + 0.055;
    }
    audio.playing = true;
    const horizon = audio.context.currentTime + 0.75;
    while (audio.nextBeat < horizon) {
      const finalRush = state.timeLeft < 30;
      const stepDuration = finalRush ? 0.125 : 0.15;
      const roots = [40, 43, 38, 45];
      const root = roots[Math.floor(audio.step / 16) % roots.length];
      const pulse = audio.step % 16;
      const beatTime = audio.nextBeat;
      const bassOffsets = [0, 0, 7, 0, 3, 3, 7, 10];
      const arpOffsets = [12, 19, 15, 22, 12, 24, 19, 15, 10, 17, 14, 22, 10, 24, 17, 14];

      if (pulse === 0) {
        for (const offset of [0, 3, 7, 10]) {
          playPadTone(root + offset, beatTime, stepDuration * 15.2, 0.012);
        }
      }
      if (pulse % 2 === 0) {
        playBassTone(root - 12 + bassOffsets[pulse / 2], beatTime, stepDuration * 1.72, finalRush ? 0.062 : 0.055);
      }
      if ([0, 6, 8, 11].includes(pulse)) playKick(beatTime, pulse === 0 || pulse === 8 ? 0.105 : 0.078);
      if (pulse === 4 || pulse === 12) playNoiseDrum(beatTime, 0.16, 0.043, 1850, "bandpass");
      playNoiseDrum(beatTime, pulse === 7 || pulse === 15 ? 0.09 : 0.038, pulse % 2 ? 0.007 : 0.011, 6400, "highpass");
      playTone(root + arpOffsets[pulse], beatTime + 0.018, stepDuration * 0.72, finalRush ? 0.021 : 0.017, pulse % 4 ? "triangle" : "sawtooth", audio.music);
      if (pulse === 2 || pulse === 10) {
        playTone(root + 24, beatTime, stepDuration * 1.8, 0.012, "sine", audio.music);
      }
      audio.nextBeat += stepDuration;
      audio.step += 1;
      audio.scheduledSteps += 1;
    }
  }

  function midiFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function playBassTone(midi, time, duration, volume) {
    if (!audio.context) return;
    const osc = audio.context.createOscillator();
    const filter = audio.context.createBiquadFilter();
    const gain = audio.context.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = midiFrequency(midi);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(310, time);
    filter.frequency.exponentialRampToValueAtTime(125, time + duration);
    filter.Q.value = 2.4;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.music);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  function playPadTone(midi, time, duration, volume) {
    if (!audio.context) return;
    const osc = audio.context.createOscillator();
    const filter = audio.context.createBiquadFilter();
    const gain = audio.context.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiFrequency(midi);
    osc.detune.value = midi % 2 ? 5 : -5;
    filter.type = "lowpass";
    filter.frequency.value = 1450;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(0.22, duration * 0.22));
    gain.gain.setValueAtTime(volume, time + duration * 0.68);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.music);
    osc.start(time);
    osc.stop(time + duration + 0.04);
  }

  function playKick(time, volume) {
    if (!audio.context) return;
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(148, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.13);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(audio.music);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  function playNoiseDrum(time, duration, volume, frequency, type) {
    if (!audio.context || !audio.noiseBuffer) return;
    const source = audio.context.createBufferSource();
    const filter = audio.context.createBiquadFilter();
    const gain = audio.context.createGain();
    source.buffer = audio.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === "bandpass" ? 0.9 : 0.5;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.music);
    source.start(time, (audio.step * 0.037) % 0.72, duration);
    source.stop(time + duration + 0.01);
  }

  function playSweep(start, end, duration, volume, type) {
    if (!audio.context) return;
    const now = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(end, 30), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.sfx);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function playNoiseSfx(duration, volume, frequency, type = "bandpass") {
    if (!audio.context || !audio.noiseBuffer || !audio.sfx) return;
    const now = audio.context.currentTime;
    const source = audio.context.createBufferSource();
    const filter = audio.context.createBiquadFilter();
    const gain = audio.context.createGain();
    source.buffer = audio.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === "bandpass" ? 1.4 : 0.65;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.sfx);
    source.start(now, (state.simTime * 0.137) % 0.7, duration);
    source.stop(now + duration + 0.02);
  }

  function playCombatSfx(kind) {
    if (!audio.context) return;
    if (kind === "lock") {
      playSweep(420, 760, 0.13, 0.025, "triangle");
    } else if (kind === "dash") {
      playNoiseSfx(0.14, 0.035, 1900, "bandpass");
      playSweep(150, 640, 0.16, 0.045, "sawtooth");
    } else if (kind === "parry") {
      playNoiseSfx(0.18, 0.05, 3600, "highpass");
      playSweep(240, 1320, 0.2, 0.065, "triangle");
    } else if (kind === "near") {
      playSweep(760, 1040, 0.08, 0.022, "sine");
    } else if (kind === "interrupt") {
      playNoiseSfx(0.12, 0.046, 2300, "bandpass");
      playSweep(880, 220, 0.18, 0.058, "square");
    } else if (kind === "kill") {
      playNoiseSfx(0.28, 0.075, 760, "lowpass");
      playSweep(520, 74, 0.3, 0.075, "square");
    } else if (kind === "guard") {
      playSweep(520, 280, 0.13, 0.04, "triangle");
    } else if (kind === "damage") {
      playNoiseSfx(0.16, 0.055, 520, "lowpass");
      playSweep(170, 70, 0.2, 0.055, "sawtooth");
    }
  }

  function duckMusic(level = 0.55, duration = 0.18) {
    if (!audio.context || !audio.music) return;
    const now = audio.context.currentTime;
    const gain = audio.music.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(0.0001, gain.value), now);
    gain.setTargetAtTime(0.42 * level, now, 0.018);
    gain.setTargetAtTime(0.42, now + duration, 0.09);
  }

  function playTone(midi, time, duration, volume, type, destination) {
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = type;
    osc.frequency.value = midiFrequency(midi);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.04);
  }

  function pulseDevice(ms) {
    if (!reducedMotionQuery.matches && navigator.vibrate) navigator.vibrate(ms);
  }

  function parryEnemyBullet(index, player, announce = true) {
    const bullet = bullets[index];
    if (!bullet || bullet.owner !== "enemy" || !player) return false;
    const impact = bullet.pos.clone();
    removeBullet(index);
    spawnBurst(impact, player.bulletColor, 9, 0.28, bullet.vel.clone().multiplyScalar(-1).normalize());
    spawnSurgeWave(impact, player.bulletColor, 0.18, 3.4);
    addRiftCharge(6);
    player.shield = Math.min(player.maxShield, player.shield + 2);
    player.guardPulse = Math.max(player.guardPulse, 0.8);
    combatDirector.phaseParries += 1;
    cameraState.trauma = Math.max(cameraState.trauma, 0.13);
    if (announce) {
      showCombatFeedback("PHASE PARRY · +6 RIFT", "parry");
      playCombatSfx("parry");
      pulseDevice(12);
    }
    return true;
  }

  function phaseParryNearby(player, radius) {
    let count = 0;
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (bullets[i].owner === "enemy" && bullets[i].pos.distanceTo(player.pos) <= radius) {
        if (parryEnemyBullet(i, player, false)) count += 1;
      }
    }
    if (count > 0) {
      showCombatFeedback(`PHASE PARRY x${count} · +${count * 6} RIFT`, "parry");
      playCombatSfx("parry");
      pulseDevice(12 + count * 3);
    }
    return count;
  }

  function removeBullet(index) {
    const bullet = bullets[index];
    if (!bullet) return;
    root.remove(bullet.mesh);
    bullets.splice(index, 1);
  }

  function readNumber(key) {
    try {
      return Number(localStorage.getItem(key) || 0) || 0;
    } catch {
      return 0;
    }
  }

  function writeNumber(key, value) {
    try {
      localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
    } catch {}
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function readDailyProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem("speedy-jumper-daily-progress") || "{}");
      return raw.date === todayKey() ? Number(raw.value || 0) : 0;
    } catch {
      return 0;
    }
  }

  function writeDailyProgress(value) {
    try {
      localStorage.setItem("speedy-jumper-daily-progress", JSON.stringify({ date: todayKey(), value }));
    } catch {}
  }

  function readTodayFlag(key) {
    try {
      return localStorage.getItem(key) === todayKey();
    } catch {
      return false;
    }
  }

  function writeTodayFlag(key, value) {
    try {
      if (value) localStorage.setItem(key, todayKey());
    } catch {}
  }

  function getRank(score) {
    if (score >= 80) return "VOID ACE";
    if (score >= 50) return "ORBIT PRO";
    if (score >= 30) return "RIFT HUNTER";
    if (score >= 15) return "SPHERE PILOT";
    return "ROOKIE";
  }

  function updateUi() {
    const local = localPlayer();
    updateHealthDisplay(players.p1, p1HealthValue, p1HealthBar, p1ShieldValue, p1ShieldBar);
    updateHealthDisplay(players.p2, p2HealthValue, p2HealthBar, p2ShieldValue, p2ShieldBar);
    if (p1ScoreValue) p1ScoreValue.textContent = p1ScoreValue.id === "s1" ? `${scores.p1} points` : scores.p1;
    if (p2ScoreValue) p2ScoreValue.textContent = p2ScoreValue.id === "s2" ? `${scores.p2} points` : scores.p2;
    if (streakValue) streakValue.textContent = state.streak > 0 ? `x${state.streak}` : "0";
    if (bestScoreValue) bestScoreValue.textContent = `BEST ${state.bestScore}`;
    if (coinsValue) coinsValue.textContent = state.coins;
    if (rankValue) rankValue.textContent = getRank(state.bestScore);
    if (dailyMissionValue) dailyMissionValue.textContent = state.dailyClaimed ? "DONE" : `${state.dailyProgress}/${state.dailyTarget}`;
    if (dailyRewardValue) dailyRewardValue.textContent = state.dailyClaimed ? "COME BACK TOMORROW" : "+25 COINS";
    if (riftChargeValue) riftChargeValue.textContent = state.riftActive ? `${Math.ceil(state.riftTimer)}s` : `${state.riftCharge}%`;
    if (riftStateValue) {
      riftStateValue.textContent = state.riftActive
        ? isCompactTouch ? "SURGE" : "SURGE ACTIVE"
        : state.riftCharge >= 100
          ? isCompactTouch ? "TAP RIFT" : "TAP SURGE"
          : isCompactTouch ? "SHARDS" : "COLLECT SHARDS";
    }
    touchSurge?.classList.toggle("active", state.riftActive);
    touchSurge?.classList.toggle("ready", !state.riftActive && state.riftCharge >= 100);
    touchSurge?.setAttribute("aria-disabled", String(!state.riftActive && state.riftCharge < 100));
    touchSurge?.setAttribute("aria-label", state.riftActive ? "Rift Surge active" : state.riftCharge >= 100 ? "Activate Rift Surge" : `Rift charge ${state.riftCharge} percent`);
    if (enemiesValue) enemiesValue.textContent = enemies.filter((enemy) => !enemy.dead).length;
    if (directorStateValue) {
      directorStateValue.textContent = `${combatDirector.label} · ${combatDirector.maxAttackers} SLOT${combatDirector.maxAttackers === 1 ? "" : "S"}`;
    }
    if (timerValue) timerValue.textContent = formatTime(state.timeLeft);
    const roleText = "Offline Solo vs Tactical AI";
    const bestRun = `Best streak ${state.bestStreak}`;
    const streak = state.streak > 1 ? ` | x${state.streak} streak` : "";
    if (statusValue) statusValue.textContent = `${state.message}${streak} | ${roleText} | ${bestRun}`;
    const healthRatio = local ? local.health / 100 : 0;
    if (topAlertFill) topAlertFill.style.transform = `scaleX(${THREE.MathUtils.clamp(healthRatio, 0, 1)})`;
    if (topAlertText) topAlertText.textContent = local
      ? `${local.label} · ${Math.ceil(local.health)} HP · ${Math.ceil(local.shield)} GUARD`
      : "Player ready";
    if (dashChargeValue) {
      const ratio = local ? 1 - THREE.MathUtils.clamp(local.dashCooldown / actionTuning.dashCooldown, 0, 1) : 0;
      dashChargeValue.textContent = ratio >= 0.999 ? "READY" : `${Math.ceil(ratio * 100)}%`;
      dashChargeValue.parentElement?.style.setProperty("--dash-fill", `${Math.round(ratio * 100)}%`);
    }
    if (damageVignette) {
      const danger = local ? THREE.MathUtils.clamp(1 - local.health / 55, 0, 1) : 0;
      damageVignette.style.setProperty("--danger", danger.toFixed(2));
    }
    const incoming = local
      ? enemies
          .filter((enemy) => !enemy.dead && enemy.telegraph > 0 && enemy.targetId === local.id)
          .sort((a, b) => a.telegraph - b.telegraph)
      : [];
    incomingWarning?.classList.toggle("active", incoming.length > 0);
    incomingWarning?.setAttribute("aria-hidden", String(incoming.length === 0));
    if (incoming[0] && incomingWarningText && incomingWarningHint) {
      if (incomingWarningDirection) {
        const toThreat = incoming[0].pos.clone().sub(camera.position).normalize();
        const cameraForward = camera.getWorldDirection(new THREE.Vector3()).normalize();
        const cameraRight = new THREE.Vector3().crossVectors(cameraForward, camera.up).normalize();
        const horizontal = toThreat.dot(cameraRight);
        const vertical = toThreat.dot(camera.up);
        const behind = toThreat.dot(cameraForward) < 0;
        const angle = Math.atan2(behind ? -horizontal : horizontal, behind ? -vertical : vertical) * THREE.MathUtils.RAD2DEG;
        incomingWarning.style.setProperty("--threat-angle", `${Number.isFinite(angle) ? angle.toFixed(1) : 0}deg`);
      }
      incomingWarningText.textContent = `${incoming[0].kind.toUpperCase()} LOCK${incoming.length > 1 ? ` x${incoming.length}` : ""}`;
      incomingWarningHint.textContent = incoming[0].kind === "sniper"
        ? "BREAK LINE · DASH · INTERRUPT"
        : "MOVE · PHASE-PARRY · INTERRUPT";
    }
  }

  function showCombatFeedback(text, kind = "info") {
    if (!combatFeedback) return;
    combatFeedback.className = "";
    combatFeedback.textContent = text;
    combatFeedback.classList.add(kind);
    void combatFeedback.offsetWidth;
    combatFeedback.classList.add("active");
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
      combatFeedback.className = "";
      combatFeedback.textContent = "";
    }, kind === "kill" ? 820 : 620);
  }

  function updateHealthDisplay(player, valueEl, barEl, shieldValueEl, shieldBarEl) {
    const health = Math.ceil(THREE.MathUtils.clamp(player.health, 0, 100));
    if (valueEl) valueEl.textContent = health;
    const ratio = health / 100;
    if (barEl) {
      barEl.style.transform = `scaleX(${ratio})`;
      barEl.classList.toggle("low", ratio <= 0.35);
      const meter = barEl.parentElement;
      meter?.setAttribute("role", "progressbar");
      meter?.setAttribute("aria-valuemin", "0");
      meter?.setAttribute("aria-valuemax", "100");
      meter?.setAttribute("aria-valuenow", String(health));
      meter?.setAttribute("aria-valuetext", `${health} health, ${Math.ceil(player.shield)} guard`);
    }
    const shield = Math.ceil(THREE.MathUtils.clamp(player.shield, 0, player.maxShield));
    if (shieldValueEl) shieldValueEl.textContent = `+${shield}`;
    if (shieldBarEl) {
      shieldBarEl.style.transform = `scaleX(${THREE.MathUtils.clamp(shield / player.maxShield, 0, 1)})`;
      shieldBarEl.style.opacity = shield > 0 ? "1" : "0";
    }
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function showOverlay(title, note) {
    if (startButton) startButton.textContent = title;
    if (overlayNote) overlayNote.textContent = note;
    overlay.inert = false;
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("visible");
    document.body.classList.add("overlay-open");
    if (document.pointerLockElement) document.exitPointerLock?.();
    setTimeout(() => startButton?.focus({ preventScroll: true }), 0);
  }

  function hideOverlay() {
    overlay.classList.remove("visible");
    document.body.classList.remove("overlay-open");
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    if (overlay.contains(document.activeElement)) document.activeElement?.blur?.();
  }

  function togglePause() {
    if (!state.started || state.ended) return;
    state.paused = !state.paused;
    input.fire = false;
    state.message = state.paused ? "Match paused" : "Match resumed";
    if (state.paused) showOverlay("Resume Match", "Paused · press P or Enter the Rift to continue");
    else hideOverlay();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      resizeRenderer();
    } catch {}
  }

  function toggleMute() {
    unlockAudio();
    state.muted = !state.muted;
    if (audio.master && audio.context) {
      audio.master.gain.cancelScheduledValues(audio.context.currentTime);
      audio.master.gain.setTargetAtTime(state.muted ? 0 : 0.78, audio.context.currentTime, 0.03);
    }
    if (muteButton) {
      muteButton.setAttribute("aria-pressed", String(state.muted));
      muteButton.firstChild.textContent = state.muted ? "SOUND OFF " : "SOUND ON ";
    }
    void replayAds.setMuted(state.muted);
  }

  function clearInputs() {
    input.f = input.b = input.l = input.r = input.jump = input.dash = input.fire = false;
    input.touchX = input.touchY = 0;
  }

  function localPlayer() {
    return players[localPlayerId];
  }

  function rivalPlayer() {
    return players[rivalPlayerId];
  }

  function nearestPlatform(pos) {
    return platforms.reduce((best, platform) =>
      pos.distanceTo(platform.center) - platform.radius < pos.distanceTo(best.center) - best.radius ? platform : best
    );
  }

  function nearestPlanetClearance(platform) {
    let clearance = Infinity;
    for (const other of platforms) {
      if (other === platform) continue;
      clearance = Math.min(clearance, platform.center.distanceTo(other.center) - platform.collisionRadius - other.collisionRadius);
    }
    return Number.isFinite(clearance) ? clearance : 0;
  }

  function gravityPlatformFor(player) {
    const nearest = nearestPlatform(player.pos);
    const current = player.gravityPlatform || player.platform;
    if (player.grounded && current) return current;
    return nearest;
  }

  function gravityStrengthFor(player, platform, gravityUp) {
    if (player.grounded) return actionTuning.groundedGravity;
    const surfaceGap = Math.max(0, player.pos.distanceTo(platform.center) - (platform.radius + playerSurfaceOffset));
    const returnRamp = THREE.MathUtils.clamp((player.airborneTime || 0) / actionTuning.gravityRampTime, 0, 1);
    const basePull = THREE.MathUtils.lerp(actionTuning.launchGravity, actionTuning.returnGravity, returnRamp);
    const distanceBoost = actionTuning.distantGravityBonus * THREE.MathUtils.clamp(surfaceGap / 28, 0, 1);
    const normalSpeed = player.vel.dot(gravityUp);
    const descentBoost = normalSpeed < 0 ? actionTuning.descendingGravityBonus : 0;
    return basePull + distanceBoost + descentBoost;
  }

  function createPlanetMotion(key, index, amp, originalSpin) {
    const random = seededRandom(`riftbound:${key}:motion`);
    const direction = originalSpin < 0 ? -1 : 1;
    const primaryAmp = new THREE.Vector3(
      amp.x * (1.45 + random() * 0.55),
      amp.y * (1.35 + random() * 0.5),
      amp.z * (1.45 + random() * 0.55)
    );
    const secondaryAmp = new THREE.Vector3(
      primaryAmp.x * (0.18 + random() * 0.2),
      primaryAmp.y * (0.18 + random() * 0.2),
      primaryAmp.z * (0.18 + random() * 0.2)
    );
    return {
      pattern: `seeded-lissajous-${index + 1}`,
      primaryAmp,
      secondaryAmp,
      primaryFreq: new THREE.Vector3(0.27 + random() * 0.24, 0.31 + random() * 0.22, 0.24 + random() * 0.26),
      secondaryFreq: new THREE.Vector3(0.72 + random() * 0.5, 0.68 + random() * 0.54, 0.76 + random() * 0.48),
      phase: new THREE.Vector3(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2),
      secondaryPhase: new THREE.Vector3(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2),
      spinBase: direction * Math.max(Math.abs(originalSpin) * (2.1 + random() * 1.25), 0.13 + random() * 0.11),
      spinVariation: 0.28 + random() * 0.34,
      spinFrequency: 0.22 + random() * 0.42,
      spinPhase: random() * Math.PI * 2,
      wobble: THREE.MathUtils.degToRad(1.2 + random() * 3.2),
      wobbleFrequency: 0.16 + random() * 0.28,
      wobblePhase: random() * Math.PI * 2,
    };
  }

  function seededRandom(seedText) {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i += 1) {
      seed ^= seedText.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    return () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function platformPosition(base, motion, time) {
    return new THREE.Vector3(
      base.x
        + Math.sin(time * motion.primaryFreq.x + motion.phase.x) * motion.primaryAmp.x
        + Math.sin(time * motion.secondaryFreq.x + motion.secondaryPhase.x) * motion.secondaryAmp.x,
      base.y
        + Math.cos(time * motion.primaryFreq.y + motion.phase.y) * motion.primaryAmp.y
        + Math.sin(time * motion.secondaryFreq.y + motion.secondaryPhase.y) * motion.secondaryAmp.y,
      base.z
        + Math.sin(time * motion.primaryFreq.z + motion.phase.z) * motion.primaryAmp.z
        + Math.cos(time * motion.secondaryFreq.z + motion.secondaryPhase.z) * motion.secondaryAmp.z
    );
  }

  function constrainPlanetPositions() {
    for (let pass = 0; pass < 5; pass += 1) {
      for (let i = 0; i < platforms.length; i += 1) {
        for (let j = i + 1; j < platforms.length; j += 1) {
          const a = platforms[i];
          const b = platforms[j];
          const offset = b.center.clone().sub(a.center);
          let distance = offset.length();
          if (distance < 0.0001) {
            offset.set(i % 2 ? 1 : -1, 0.25, j % 2 ? 0.5 : -0.5).normalize();
            distance = 0.0001;
          } else {
            offset.multiplyScalar(1 / distance);
          }
          const minDistance = a.collisionRadius + b.collisionRadius + 2.8;
          if (distance < minDistance) {
            const correction = (minDistance - distance) * 0.52;
            a.center.addScaledVector(offset, -correction);
            b.center.addScaledVector(offset, correction);
          } else if (distance > planetMaxSeparation) {
            const correction = (distance - planetMaxSeparation) * 0.12;
            a.center.addScaledVector(offset, correction);
            b.center.addScaledVector(offset, -correction);
          }
        }
      }
      for (const platform of platforms) {
        const fromClusterCenter = platform.center.clone().sub(planetFormationCenter);
        if (fromClusterCenter.length() > planetClusterRadius) {
          platform.center.copy(planetFormationCenter).add(fromClusterCenter.setLength(planetClusterRadius));
        }
      }
    }
  }

  function updatePlanetMotion(dt, initialize = false) {
    for (const platform of platforms) {
      if (!initialize) platform.prev.copy(platform.center);
      platform.center.copy(platformPosition(platform.base, platform.motion, state.planetTime));
    }
    constrainPlanetPositions();
    for (const platform of platforms) {
      if (initialize) {
        platform.prev.copy(platform.center);
        platform.delta.set(0, 0, 0);
        platform.motionVelocity.set(0, 0, 0);
      } else {
        platform.delta.subVectors(platform.center, platform.prev);
        platform.motionVelocity.copy(platform.delta).multiplyScalar(1 / Math.max(dt, 0.0001));
      }
      platform.group.position.copy(platform.center);
      const motion = platform.motion;
      platform.spinRate = motion.spinBase * (1 + Math.sin(state.planetTime * motion.spinFrequency + motion.spinPhase) * motion.spinVariation);
      platform.shell.rotation.y += dt * platform.spinRate;
      platform.axialGroup.rotation.x = Math.sin(state.planetTime * motion.wobbleFrequency + motion.wobblePhase) * motion.wobble;
      platform.axialGroup.rotation.z = THREE.MathUtils.degToRad(platform.tilt)
        + Math.cos(state.planetTime * motion.wobbleFrequency * 0.83 + motion.wobblePhase) * motion.wobble * 0.72;
      if (platform.cloud) platform.cloud.rotation.y += dt * (platform.spinRate * 1.22 + 0.018);
      if (platform.moonSystem) {
        for (const moon of platform.moonSystem.moons) {
          moon.pivot.rotation.y += dt * moon.speed * 1.35;
          moon.body.rotation.y += dt * 0.3;
        }
      }
    }
  }

  function spherical(lat, lon) {
    return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).normalize();
  }

  function pack(v) {
    return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
  }

  function loadTexture(url, fallbackFactory, rx, ry) {
    const texture = loader.load(url, undefined, undefined, () => {
      const fallback = fallbackFactory();
      texture.copy(fallback);
      texture.needsUpdate = true;
    });
    return configureTexture(texture, rx, ry);
  }

  function configureTexture(texture, rx = 1, ry = 1) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rx, ry);
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), isCompactTouch ? 2 : 8);
    return texture;
  }

  function sphereFallback(kind) {
    const canvasTexture = document.createElement("canvas");
    canvasTexture.width = isCompactTouch ? 768 : 1024;
    canvasTexture.height = canvasTexture.width / 2;
    const ctx = canvasTexture.getContext("2d");
    const width = canvasTexture.width;
    const height = canvasTexture.height;
    const seed = [...kind].reduce((value, character) => ((value * 31) ^ character.charCodeAt(0)) >>> 0, 0x9e3779b9);
    const random = seededRandom(seed);
    const fillGradient = (stops) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      for (const [position, color] of stops) gradient.addColorStop(position, color);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };
    const scatter = (colors, count, radiusMin, radiusMax, opacity = 0.3) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      for (let i = 0; i < count; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radius = radiusMin + random() * (radiusMax - radiusMin);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, colors[Math.floor(random() * colors.length)]);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.restore();
    };
    const wavyBand = (y, thickness, color, amplitude, frequency, opacity = 1) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const wave = Math.sin(x / width * Math.PI * 2 * frequency + y * 0.013) * amplitude
          + Math.sin(x / width * Math.PI * 2 * (frequency * 0.43) + 1.7) * amplitude * 0.45;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      for (let x = width; x >= 0; x -= 12) {
        const wave = Math.sin(x / width * Math.PI * 2 * frequency + y * 0.013 + 0.65) * amplitude;
        ctx.lineTo(x, y + thickness + wave);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const polygon = (points, fill, stroke = null, lineWidth = 2) => {
      const scaled = points.map(([x, y]) => [x * width / 1024, y * height / 512]);
      ctx.beginPath();
      const first = scaled[0];
      const last = scaled[scaled.length - 1];
      ctx.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);
      scaled.forEach(([x, y], index) => {
        const next = scaled[(index + 1) % scaled.length];
        ctx.quadraticCurveTo(x, y, (x + next[0]) * 0.5, (y + next[1]) * 0.5);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    if (kind === "earth") {
      fillGradient([[0, "#061a49"], [0.18, "#0b3f79"], [0.5, "#0877aa"], [0.82, "#0b3f79"], [1, "#06183e"]]);
      scatter(["rgba(63,169,185,.5)", "rgba(3,35,75,.7)"], 110, 10, 58, 0.22);
      const continents = [
        [[74, 150], [112, 106], [174, 84], [227, 105], [265, 145], [246, 179], [216, 185], [200, 222], [161, 214], [138, 188], [98, 183]],
        [[204, 217], [252, 224], [279, 274], [270, 330], [242, 391], [214, 360], [201, 312], [180, 266]],
        [[412, 128], [477, 96], [553, 104], [610, 91], [674, 121], [731, 111], [808, 145], [826, 183], [776, 205], [720, 186], [669, 213], [612, 188], [558, 207], [510, 181], [459, 188], [430, 164]],
        [[489, 190], [548, 193], [590, 235], [584, 296], [547, 362], [506, 337], [478, 274]],
        [[772, 283], [829, 268], [873, 299], [860, 344], [810, 356], [769, 327]],
        [[302, 70], [336, 57], [365, 82], [351, 118], [315, 111]],
      ];
      continents.forEach((points, index) => polygon(points, index === 3 ? "#9c763a" : "#367946", "#80a663", 2.2));
      const insidePolygon = (x, y, points) => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i][0];
          const yi = points[i][1];
          const xj = points[j][0];
          const yj = points[j][1];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / Math.max(0.0001, yj - yi) + xi) inside = !inside;
        }
        return inside;
      };
      ctx.save();
      for (let i = 0; i < 420; i += 1) {
        const mapX = random() * 1024;
        const mapY = 55 + random() * 342;
        if (!continents.some((points) => insidePolygon(mapX, mapY, points))) continue;
        const px = mapX * width / 1024;
        const py = mapY * height / 512;
        const radius = 1.5 + random() * 9;
        ctx.globalAlpha = 0.13 + random() * 0.22;
        ctx.fillStyle = random() > 0.52 ? "#b39a55" : random() > 0.5 ? "#204f36" : "#6d8b4a";
        ctx.beginPath();
        ctx.ellipse(px, py, radius * 1.6, radius * 0.65, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      polygon([[488, 205], [551, 203], [575, 232], [527, 246]], "rgba(203,151,66,.82)");
      polygon([[705, 138], [780, 149], [742, 178], [673, 167]], "rgba(161,133,67,.72)");
      ctx.strokeStyle = "rgba(205,222,166,.42)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 36; i += 1) {
        const x = (80 + random() * 820) * width / 1024;
        const y = (95 + random() * 250) * height / 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (10 + random() * 36), y + (random() - 0.5) * 20);
        ctx.stroke();
      }
      const northIce = ctx.createLinearGradient(0, 0, 0, height * 0.14);
      northIce.addColorStop(0, "rgba(238,250,255,.98)");
      northIce.addColorStop(1, "rgba(220,245,255,0)");
      ctx.fillStyle = northIce;
      ctx.fillRect(0, 0, width, height * 0.17);
      const southIce = ctx.createLinearGradient(0, height * 0.84, 0, height);
      southIce.addColorStop(0, "rgba(220,245,255,0)");
      southIce.addColorStop(1, "rgba(244,252,255,.98)");
      ctx.fillStyle = southIce;
      ctx.fillRect(0, height * 0.82, width, height * 0.18);
    } else if (kind === "mars") {
      fillGradient([[0, "#b96b42"], [0.5, "#c65f32"], [1, "#8f432c"]]);
      scatter(["rgba(91,40,29,.82)", "rgba(231,139,77,.74)", "rgba(119,54,31,.62)"], 180, 4, 42, 0.38);
      ctx.strokeStyle = "rgba(83,34,28,.75)";
      ctx.lineWidth = height * 0.018;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 18) {
        const y = height * (0.56 + Math.sin(x * 0.021) * 0.035 + Math.sin(x * 0.047) * 0.018);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const volcanoX = width * 0.23;
      const volcanoY = height * 0.37;
      const volcano = ctx.createRadialGradient(volcanoX, volcanoY, 2, volcanoX, volcanoY, height * 0.09);
      volcano.addColorStop(0, "#5f2f26");
      volcano.addColorStop(0.2, "#ce7950");
      volcano.addColorStop(1, "rgba(88,38,30,0)");
      ctx.fillStyle = volcano;
      ctx.fillRect(volcanoX - height * 0.1, volcanoY - height * 0.1, height * 0.2, height * 0.2);
      for (let i = 0; i < 42; i += 1) {
        const x = random() * width;
        const y = height * (0.16 + random() * 0.7);
        const radius = 2 + random() * 13;
        ctx.strokeStyle = `rgba(71,31,27,${0.22 + random() * 0.32})`;
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      wavyBand(height * 0.02, height * 0.09, "#f2dfce", 7, 3, 0.82);
      wavyBand(height * 0.91, height * 0.09, "#ead5c5", 6, 4, 0.78);
    } else if (kind === "venus") {
      fillGradient([[0, "#c68332"], [0.42, "#efbd62"], [0.58, "#d8963f"], [1, "#9b5a28"]]);
      for (let i = 0; i < 28; i += 1) {
        wavyBand(i * height / 28, height * (0.018 + random() * 0.024), ["#ffe0a0", "#b9702f", "#eaaa52"][i % 3], 4 + random() * 9, 2 + random() * 3, 0.24 + random() * 0.28);
      }
      scatter(["rgba(255,226,157,.65)", "rgba(126,69,31,.5)"], 100, 18, 80, 0.3);
      for (const pole of [height * 0.08, height * 0.92]) {
        ctx.strokeStyle = "rgba(255,230,173,.46)";
        ctx.lineWidth = 5;
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath();
          ctx.ellipse(width * 0.54, pole, width * (0.05 + i * 0.024), height * (0.018 + i * 0.012), i * 0.15, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (kind === "mercury") {
      fillGradient([[0, "#77746f"], [0.48, "#a09b91"], [1, "#66635f"]]);
      scatter(["rgba(220,214,199,.55)", "rgba(47,46,45,.7)", "rgba(137,130,119,.7)"], 200, 3, 34, 0.34);
      for (let i = 0; i < 110; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radius = 2 + random() * 19;
        const crater = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.25, radius * 0.1, x, y, radius);
        crater.addColorStop(0, "rgba(42,42,42,.78)");
        crater.addColorStop(0.62, "rgba(74,72,69,.55)");
        crater.addColorStop(0.76, "rgba(208,201,185,.5)");
        crater.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = crater;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.strokeStyle = "rgba(225,217,199,.42)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 22; i += 1) {
        const x = width * 0.68 + (random() - 0.5) * width * 0.22;
        const y = height * 0.42 + (random() - 0.5) * height * 0.26;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (random() - 0.5) * 150, y + (random() - 0.5) * 80);
        ctx.stroke();
      }
    } else if (kind === "uranus") {
      fillGradient([[0, "#70c6d0"], [0.35, "#9fe0e0"], [0.55, "#7fd1d7"], [1, "#4ba7b8"]]);
      for (let i = 0; i < 22; i += 1) wavyBand(i * height / 22, 2 + random() * 5, i % 2 ? "#d0f2ec" : "#438fa5", 2, 2, 0.08 + random() * 0.1);
      scatter(["rgba(230,255,249,.45)", "rgba(43,119,142,.38)"], 42, 15, 62, 0.18);
    } else if (kind === "neptune") {
      fillGradient([[0, "#143b9d"], [0.42, "#246cd0"], [0.58, "#1552bb"], [1, "#0a2d80"]]);
      for (let i = 0; i < 25; i += 1) wavyBand(i * height / 25, 3 + random() * 7, i % 3 === 0 ? "#75c8f0" : "#092d82", 4 + random() * 5, 2 + random() * 2, 0.12 + random() * 0.18);
      scatter(["rgba(174,229,255,.62)", "rgba(10,39,118,.72)"], 70, 8, 54, 0.28);
      ctx.fillStyle = "rgba(5,26,95,.78)";
      ctx.beginPath();
      ctx.ellipse(width * 0.66, height * 0.57, width * 0.075, height * 0.075, -0.18, 0, Math.PI * 2);
      ctx.fill();
      wavyBand(height * 0.64, height * 0.025, "#b9ecff", 8, 3.2, 0.72);
    } else if (kind === "jupiter" || kind === "saturn") {
      const saturn = kind === "saturn";
      fillGradient(saturn
        ? [[0, "#ad8a58"], [0.5, "#efd59d"], [1, "#9d784e"]]
        : [[0, "#826548"], [0.5, "#e6c18e"], [1, "#77553d"]]);
      const palette = saturn ? ["#f4dfaf", "#c8a46d", "#e8cb91", "#9f7950"] : ["#e8d4b3", "#b8784f", "#f2e3c7", "#8e563e"];
      for (let i = 0; i < 34; i += 1) wavyBand(i * height / 34, height * (0.015 + random() * 0.02), palette[i % palette.length], 2 + random() * (saturn ? 3 : 7), 2 + random() * 5, 0.46 + random() * 0.3);
      if (!saturn) {
        ctx.fillStyle = "rgba(168,67,42,.92)";
        ctx.beginPath();
        ctx.ellipse(width * 0.68, height * 0.66, width * 0.07, height * 0.04, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      fillGradient([[0, "#173a58"], [0.5, "#3f92aa"], [1, "#112b48"]]);
      scatter(["rgba(117,228,242,.62)", "rgba(7,40,70,.72)"], 90, 8, 56, 0.32);
    }

    const texture = new THREE.CanvasTexture(canvasTexture);
    texture.name = `procedural-${kind}-surface`;
    return texture;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function skyFallback() {
    const canvasTexture = document.createElement("canvas");
    canvasTexture.width = 1024;
    canvasTexture.height = 512;
    const ctx = canvasTexture.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
    gradient.addColorStop(0, "#071027");
    gradient.addColorStop(0.5, "#04172f");
    gradient.addColorStop(1, "#1b102c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 850; i += 1) {
      ctx.fillStyle = `rgba(230,248,255,${0.35 + Math.random() * 0.65})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, 1.3, 1.3);
    }
    for (const [x, y, color] of [[150, 230, "rgba(60,220,255,.34)"], [760, 120, "rgba(255,74,190,.28)"], [910, 360, "rgba(255,180,90,.25)"]]) {
      const nebula = ctx.createRadialGradient(x, y, 0, x, y, 250);
      nebula.addColorStop(0, color);
      nebula.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nebula;
      ctx.fillRect(x - 250, y - 250, 500, 500);
    }
    return new THREE.CanvasTexture(canvasTexture);
  }

  document.addEventListener("keydown", (event) => {
    if (keys[event.code]) input[keys[event.code]] = true;
    if (event.code === "Space") {
      input.jump = true;
      event.preventDefault();
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyQ") {
      input.dash = true;
      event.preventDefault();
    }
    if (event.code === "KeyE") activateRiftSurge();
    if (event.code === "KeyF") toggleFullscreen();
    if (event.code === "KeyM") toggleMute();
    if (event.code === "KeyP" || (event.code === "Escape" && !document.fullscreenElement)) togglePause();
    if (event.code === "Enter") input.fire = true;
  });

  document.addEventListener("keyup", (event) => {
    if (keys[event.code]) input[keys[event.code]] = false;
    if (event.code === "Enter") input.fire = false;
  });

  document.addEventListener("mousemove", (event) => {
    const player = localPlayer();
    if (!player || !state.started) return;
    cameraState.forward.applyQuaternion(quat.setFromAxisAngle(player.up, -event.movementX * 0.0026));
    cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch - event.movementY * 0.0022, -0.62, 0.52);
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 2) {
      input.dash = true;
      return;
    }
    if (event.button !== 0) return;
    if (!state.started || state.ended) {
      startGame();
      return;
    }
    try {
      const request = canvas.requestPointerLock?.();
      request?.catch?.(() => {});
    } catch {}
    input.fire = true;
  });
  window.addEventListener("mouseup", () => {
    input.fire = false;
  });

  const bindPress = (button, onPress, onRelease) => {
    if (!button) return;
    let lastTouchPressAt = 0;
    button.addEventListener("click", (event) => {
      if (performance.now() - lastTouchPressAt < 500) {
        event.preventDefault();
        return;
      }
      onPress(event);
    });
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      event.preventDefault();
      lastTouchPressAt = performance.now();
      onPress(event);
    });
    if (!onRelease) return;
    button.addEventListener("pointerup", onRelease);
    button.addEventListener("pointercancel", onRelease);
    button.addEventListener("pointerleave", onRelease);
  };

  bindPress(startButton, startGame);
  bindPress(fullscreenButton, toggleFullscreen);
  bindPress(muteButton, toggleMute);
  bindPress(privacyOptionsButton, () => void replayAds.showPrivacyOptions());
  bindPress(touchPause, togglePause);

  // Audio must be unlocked synchronously from a real user gesture on mobile
  // browsers. Capture-phase listeners run before individual game controls.
  document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || event.clientX < innerWidth * 0.38) return;
    lookTouchId = event.pointerId;
    lookTouchX = event.clientX;
    lookTouchY = event.clientY;
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {}
    startGame();
  });

  canvas.addEventListener("pointermove", (event) => {
    const player = localPlayer();
    if (event.pointerId !== lookTouchId || !player || !state.started) return;
    const dx = event.clientX - lookTouchX;
    const dy = event.clientY - lookTouchY;
    lookTouchX = event.clientX;
    lookTouchY = event.clientY;
    cameraState.forward.applyQuaternion(quat.setFromAxisAngle(player.up, -dx * 0.0052));
    cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch - dy * 0.0042, -0.62, 0.52);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerId === lookTouchId) lookTouchId = null;
  });
  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId === lookTouchId) lookTouchId = null;
  });

  if (touchStick) {
    let stickPointerId = null;
    const resetTouchStick = () => {
      input.f = input.b = input.l = input.r = false;
      input.touchX = input.touchY = 0;
      stickPointerId = null;
      if (touchStickKnob) touchStickKnob.style.transform = "translate(-50%, -50%)";
      touchStick.classList.remove("active");
    };
    const updateTouchStick = (point) => {
      const rect = touchStick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = point.clientX - cx;
      const dy = point.clientY - cy;
      const max = rect.width * 0.38;
      const len = Math.min(max, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      const nx = Math.cos(a) * len / max;
      const ny = Math.sin(a) * len / max;
      input.touchX = Math.abs(nx) < 0.12 ? 0 : nx;
      input.touchY = Math.abs(ny) < 0.12 ? 0 : ny;
      if (touchStickKnob) touchStickKnob.style.transform = `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;
    };
    touchStick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      stickPointerId = event.pointerId;
      try {
        touchStick.setPointerCapture?.(event.pointerId);
      } catch {}
      touchStick.classList.add("active");
      startGame();
      updateTouchStick(event);
    });
    touchStick.addEventListener("pointermove", (event) => {
      if (stickPointerId === null || event.pointerId !== stickPointerId) return;
      event.preventDefault();
      updateTouchStick(event);
    });
    touchStick.addEventListener("pointerup", resetTouchStick);
    touchStick.addEventListener("pointercancel", resetTouchStick);
    touchStick.addEventListener("lostpointercapture", resetTouchStick);
    touchStick.addEventListener("touchstart", (event) => {
      event.preventDefault();
      touchStick.classList.add("active");
      startGame();
      updateTouchStick(event.touches[0]);
    }, { passive: false });
    touchStick.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (event.touches[0]) updateTouchStick(event.touches[0]);
    }, { passive: false });
    touchStick.addEventListener("touchend", resetTouchStick);
    touchStick.addEventListener("touchcancel", resetTouchStick);
  }
  bindPress(touchJump, () => {
    input.jump = true;
    startGame();
  });
  bindPress(touchSurge, () => {
    startGame();
    activateRiftSurge();
  });
  bindPress(touchDash, () => {
    input.dash = true;
    startGame();
  });
  bindPress(touchFire, () => {
    input.fire = true;
    startGame();
    const player = localPlayer();
    if (player && state.started && !state.ended && state.countdown <= 0 && player.cooldown <= 0) fire(player);
  }, () => {
    input.fire = false;
  });

  function resizeRenderer() {
    const width = Math.round(visualViewport?.width || innerWidth);
    const height = Math.round(visualViewport?.height || innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  addEventListener("resize", resizeRenderer);
  visualViewport?.addEventListener("resize", resizeRenderer);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("blur", clearInputs);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInputs();
  });

  window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: "Three.js world coordinates; +Y is global up, but each sphere uses radial local up; positions are x/y/z world units.",
    mode: state.ended ? "ended" : state.paused ? "paused" : state.started ? "playing" : "menu",
    gameMode: "solo",
    message: state.message,
    countdown: +state.countdown.toFixed(2),
    timeLeft: +state.timeLeft.toFixed(1),
    planetTime: +state.planetTime.toFixed(3),
    scores: { ...scores },
    streak: state.streak,
    coins: state.coins,
    matchCoins: state.matchCoins,
    riftCharge: state.riftCharge,
    riftActive: state.riftActive,
    riftShards: riftShards.length,
    dailyProgress: state.dailyProgress,
    dailyClaimed: state.dailyClaimed,
    rank: getRank(state.bestScore),
    bestScore: state.bestScore,
    bestStreak: state.bestStreak,
    difficulty: {
      profile: "adaptive-explorer",
      description: "forgiving opening, pressure relief when hurt or behind, and at most two coordinated attackers",
      enemyCap: combatTuning.enemyCap,
      maxShield: combatTuning.maxShield,
    },
    combatDirector: {
      label: combatDirector.label,
      intensity: +combatDirector.intensity.toFixed(3),
      maxAttackers: combatDirector.maxAttackers,
      activeAttackers: combatDirector.activeAttackers,
      incomingThreats: combatDirector.incomingThreats,
      recentDamageRelief: +combatDirector.recentDamageTimer.toFixed(2),
      interrupts: combatDirector.interrupts,
      phaseParries: combatDirector.phaseParries,
      nearMisses: combatDirector.nearMisses,
      localDeaths: combatDirector.localDeaths,
    },
    aiRival: {
      action: aiBrain.action,
      targetType: aiBrain.targetType,
      targetEnemyIndex: aiBrain.targetEnemyIndex,
      fireDelay: +aiBrain.fireDelay.toFixed(2),
      aimWarmup: +aiBrain.aimWarmup.toFixed(2),
      aggression: +aiBrain.aggression.toFixed(3),
    },
    accessibility: {
      reducedMotion: reducedMotionQuery.matches,
      overlayInert: Boolean(overlay.inert),
      incomingWarning: Boolean(incomingWarning?.classList.contains("active")),
      incomingKind: enemies.find((enemy) => !enemy.dead && enemy.telegraph > 0 && enemy.targetId === localPlayer()?.id)?.kind || null,
      threatDirectionDegrees: +(Number.parseFloat(incomingWarning?.style.getPropertyValue("--threat-angle")) || 0).toFixed(1),
    },
    audio: {
      muted: state.muted,
      playing: audio.playing,
      supported: Boolean(AudioContextClass),
      contextState: audio.context?.state || "not-created",
      unlocked: audio.unlocked,
      primed: audio.primed,
      scheduledSteps: audio.scheduledSteps,
      error: audio.unlockError,
      style: "procedural synthwave: drums, bass, arpeggio, and pads",
    },
    ads: {
      ...replayAds.snapshot(),
      replayBlocked: replayGateBlocked,
      placement: "post-match interstitial",
    },
    camera: {
      distanceFromPlayer: +camera.position.distanceTo((localPlayer() || players.p1).pos).toFixed(2),
      followDistance: cameraTuning.followDistance,
      height: cameraTuning.height,
      fov: +camera.fov.toFixed(2),
      fadedRingCount,
    },
    jumpProfile: {
      launchSpeed: actionTuning.jumpSpeed,
      launchGravity: actionTuning.launchGravity,
      returnGravity: actionTuning.returnGravity,
      gravityRampTime: actionTuning.gravityRampTime,
    },
    player: localPlayer() ? packPlayerText(localPlayer()) : null,
    rival: rivalPlayer() ? packPlayerText(rivalPlayer()) : null,
    planets: platforms.map((platform) => ({
      key: platform.key,
      name: platform.name,
      center: pack(platform.center),
      velocity: pack(platform.motionVelocity),
      radius: platform.radius,
      axialTiltDegrees: platform.tilt,
      rotationSpeed: +platform.spinRate.toFixed(3),
      motionPattern: platform.motion.pattern,
      nearestClearance: +nearestPlanetClearance(platform).toFixed(2),
      atmosphere: Boolean(platform.atmosphere),
      clouds: Boolean(platform.cloud),
      rings: Boolean(platform.rings),
      moons: platform.moonSystem?.moons.map((moon) => moon.name) || [],
      surfaceTexture: platform.mat.map?.name || `${platform.key}-surface`,
    })),
    enemiesRemaining: enemies.filter((enemy) => !enemy.dead).length,
    enemies: enemies.filter((enemy) => !enemy.dead).slice(0, 10).map((enemy) => ({
      species: "cat",
      kind: enemy.kind,
      gait: enemy.mesh.userData.catRig?.state.gait || "idle",
      health: Math.ceil(enemy.health),
      maxHealth: enemy.maxHealth,
      state: enemy.attackState,
      target: enemy.targetId,
      telegraph: +enemy.telegraph.toFixed(2),
      recover: +enemy.recover.toFixed(2),
      stagger: +enemy.stagger.toFixed(2),
      healthBarVisible: Boolean(enemy.bar?.visible),
      position: pack(enemy.pos),
    })),
    shards: riftShards.map((shard) => ({ position: pack(shard.pos), platform: platforms.indexOf(shard.platform) })),
    projectiles: bullets.slice(0, 14).map((bullet) => ({
      owner: bullet.owner,
      kind: bullet.kind,
      damage: bullet.damage,
      nearMissed: bullet.nearMissed,
      position: pack(bullet.pos),
      velocity: pack(bullet.vel),
    })),
  });

  function packPlayerText(player) {
    return {
      id: player.id,
      species: "cat",
      anatomy: "quadruped",
      gait: player.catRig?.state.gait || "idle",
      gaitPhase: +(player.catRig?.state.phase || 0).toFixed(3),
      position: pack(player.pos),
      velocity: pack(player.vel),
      up: pack(player.up),
      forward: pack(player.forward),
      normalVelocity: +player.vel.dot(player.up).toFixed(3),
      airborneTime: +(player.airborneTime || 0).toFixed(3),
      gravityStrength: player.gravityPlatform
        ? +gravityStrengthFor(player, player.gravityPlatform, player.up).toFixed(1)
        : 0,
      surfaceGap: player.gravityPlatform
        ? +Math.max(0, player.pos.distanceTo(player.gravityPlatform.center) - (player.gravityPlatform.radius + playerSurfaceOffset)).toFixed(3)
        : 0,
      surfaceOffset: playerSurfaceOffset,
      health: Math.ceil(player.health),
      shield: +player.shield.toFixed(1),
      maxShield: player.maxShield,
      invulnerableFor: +player.invuln.toFixed(2),
      alive: player.alive,
      grounded: player.grounded,
      pawContacts: player.catRig?.state.pawContacts || {
        frontLeft: player.grounded,
        frontRight: player.grounded,
        hindLeft: player.grounded,
        hindRight: player.grounded,
      },
      platform: platforms.indexOf(player.platform),
      gravityPlatform: platforms.indexOf(player.gravityPlatform),
      jumpGrace: +player.jumpGrace.toFixed(2),
      dashCooldown: +player.dashCooldown.toFixed(2),
      respawnTimer: +player.respawnTimer.toFixed(2),
    };
  }

  window.advanceTime = (ms) => {
    accumulator = 0;
    const steps = Math.max(1, Math.round(ms / (fixedStep * 1000)));
    for (let i = 0; i < steps; i += 1) update(fixedStep);
    clock.getDelta();
    renderer.render(scene, camera);
  };
})();
