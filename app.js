(() => {
  const state = {
    scene: 'intro',
    fruit: 'apple',
    picked: { apple: 0, persimmon: 0 },
    bites: 4,
    sound: true,
    bowl: { apple: 0, sugar: 0, salt: 0, cinnamon: 0, lemon: 0, water: 0, flour: 0 },
    eatArt: 'apple-pie',
    lastDish: null,
    dishes: [],
    mixing: false,
    treeIndex: 0,
    treePicked: 0,
    switchingTree: false,
    madeRecipes: {},
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const INGREDIENTS = {
    apple: { name: '苹果', role: '果肉', color: '#dc5e3c', rgb: [220, 94, 60] },
    sugar: { name: '砂糖', role: '甜', color: '#f0e2bd', rgb: [240, 226, 189] },
    salt: { name: '盐', role: '咸', color: '#e7eae3', rgb: [231, 234, 227] },
    cinnamon: { name: '肉桂', role: '暖香', color: '#b65f3a', rgb: [182, 95, 58] },
    lemon: { name: '柠檬', role: '酸', color: '#f2c93f', rgb: [242, 201, 63] },
    water: { name: '清水', role: '润', color: '#7ea7d4', rgb: [126, 167, 212] },
    flour: { name: '面粉', role: '稠', color: '#dfb982', rgb: [223, 185, 130] },
  };
  const INGREDIENT_IDS = Object.keys(INGREDIENTS);
  const BOWL_MAX = 12;
  const TART_FRAMES = [
    'assets/food/eat/apple-tart-eat-1.png',
    'assets/food/eat/apple-tart-eat-2.png',
    'assets/food/eat/apple-tart-eat-3.png',
    'assets/food/eat/apple-tart-eat-4.png',
    'assets/food/eat/apple-tart-eat-5.png',
    'assets/food/eat/apple-tart-eat-6-crumbs.png?v=2',
  ];
  const TART_FRAME_SIZE = { w: 500, h: 432 };
  const CAKE_FRAMES = [
    'assets/food/eat/apple-cake-eat-1.png',
    'assets/food/eat/apple-cake-eat-2.png',
    'assets/food/eat/apple-cake-eat-3.png',
    'assets/food/eat/apple-cake-eat-4.png',
    'assets/food/eat/apple-cake-eat-5-crumbs.png',
  ];
  const CAKE_FRAME_SIZE = { w: 500, h: 432 };
  const CHIPS_FRAMES = [
    'assets/food/eat/apple-chips-eat-1.png',
    'assets/food/eat/apple-chips-eat-2.png',
    'assets/food/eat/apple-chips-eat-3.png',
    'assets/food/eat/apple-chips-eat-4.png',
  ];
  const CHIPS_FRAME_SIZE = { w: 760, h: 520 };
  const CIDER_FRAMES = [
    'assets/food/eat/apple-cider-eat-1.png',
    'assets/food/eat/apple-cider-eat-2.png',
    'assets/food/eat/apple-cider-eat-3.png',
  ];
  const CIDER_FRAME_SIZE = { w: 700, h: 720 };

  // target 是理想配比，合成时会先按比例归一化，再计算相似度
  const RECIPES = [
    { id: 'apple-water', name: '苹果', hint: true, eatClass: 'fresh-apple', image: 'assets/apple.png', target: { apple: 1, water: 1 }, desc: '一个苹果加一份清水，慢慢煮成一颗温润的苹果。' },
    { id: 'tart', name: '苹果馅饼', hint: true, eatClass: 'apple-pie', image: 'assets/food/apple-tart.png', frames: TART_FRAMES, frameBox: TART_FRAME_SIZE, target: { apple: 4, flour: 2, sugar: 1, cinnamon: 1 }, desc: '薄薄的饼皮裹住苹果丁，烤到边缘起酥，切一块就是热乎乎的下午茶。' },
    { id: 'chips', name: '苹果脆片', hint: true, eatClass: 'apple-pie', image: 'assets/food/apple-chips.png', frames: CHIPS_FRAMES, frameBox: CHIPS_FRAME_SIZE, target: { apple: 4, sugar: 1, cinnamon: 1, lemon: 1 }, desc: '苹果切薄片慢慢烘脆，柠檬守住颜色，咬下去咔嚓一声全是果香。' },
    { id: 'cider', name: '苹果酒', hint: true, eatClass: 'persimmon-jam', image: 'assets/food/apple-cider.png', frames: CIDER_FRAMES, frameBox: CIDER_FRAME_SIZE, target: { apple: 4, water: 3, sugar: 2, lemon: 1 }, desc: '苹果的甜在清水里慢慢化开，柠檬提一点酸，冰镇后像气泡一样清爽。' },
    { id: 'cake', name: '苹果蛋糕', hint: true, eatClass: 'apple-pie', image: 'assets/food/apple-cake.png', frames: CAKE_FRAMES, frameBox: CAKE_FRAME_SIZE, target: { apple: 3, flour: 3, sugar: 2, water: 1, cinnamon: 1 }, desc: '面糊里塞满苹果块，烤到蓬松金黄，肉桂香从切口里飘出来。' },
  ];
  const HINT_RECIPES = RECIPES.filter((recipe) => recipe.hint);
  const MADE_RECIPES_KEY = 'fruit-fiesta-made-recipes-v1';
  function loadMadeRecipes() {
    try {
      const saved = JSON.parse(localStorage.getItem(MADE_RECIPES_KEY) || '[]');
      if (!Array.isArray(saved)) return {};
      return saved.reduce((all, id) => {
        if (RECIPES.some((recipe) => recipe.id === id)) all[id] = true;
        return all;
      }, {});
    } catch (error) {
      return {};
    }
  }
  function saveMadeRecipes() {
    try {
      localStorage.setItem(MADE_RECIPES_KEY, JSON.stringify(Object.keys(state.madeRecipes)));
    } catch (error) {
      // 隐私模式下无法写入时，至少保留本次游戏内的解锁状态
    }
  }
  state.madeRecipes = loadMadeRecipes();
  function recipeKnown(recipe) {
    return Boolean(state.madeRecipes[recipe.id]);
  }
  function recipeLabel(recipe) {
    return recipeKnown(recipe) ? recipe.name : '？？？';
  }
  const BIT_SPOTS = [
    [50, 62], [42, 56], [58, 56], [46, 68], [54, 68], [36, 62],
    [64, 62], [50, 50], [44, 62], [56, 62], [48, 71], [53, 57],
  ];
  const orchardCard = $('#orchard-card');
  const persimmonCard = $('#persimmon-world-card');
  const ring = $('#ring');
  const ropeLine = $('#rope-line');
  const bottle = $('#bottle');
  // 每棵苹果树 6 颗苹果，位置和大小略有差异；摘完自动换下一棵
  const APPLE_TREES = [
    { apples: [[18, 35, 1], [39, 22, .92], [62, 26, 1.05], [29, 49, .95], [52, 42, 1.08], [72, 43, .9]] },
    { apples: [[22, 28, .95], [46, 20, 1.05], [64, 33, .92], [17, 45, 1.02], [40, 52, .9], [66, 47, 1.06]] },
    { apples: [[19, 37, 1.03], [40, 24, .93], [63, 28, 1], [30, 53, .9], [51, 43, 1.06], [69, 51, .95]] },
  ];
  let switchTimer = null;
  function currentAppleTree() { return APPLE_TREES[state.treeIndex]; }
  let hookPhase = 'swing';
  let hookFrame = null;
  let hookStart = 0;
  let hookLeft = 0;
  let hookTop = 0;
  let swingClock = 0;
  let lastSwingSign = 0;
  let holdTimer = null;
  let holdStart = 0;
  let holdActive = false;
  let bottleDragging = false;
  let bottleWasAligned = false;
  let bottlePointerOffset = { x: 0, y: 0 };
  let toastTimer = null;

  const plateRow = $('#plate-row');
  // 食物在 mask 画布里的留白，给咬痕和装饰留出溢出空间
  const BITE_PAD = 22;
  const FOOD_SIZE = { apple: { w: 114, h: 67 }, persimmon: { w: 104, h: 86 } };
  const BITES_PER_DISH = 4;
  // 「苹果」这道菜用逐帧动画表现被吃掉的过程（7 张 = 点 6 次，最后一张是果核）
  const APPLE_FRAMES = [
    'assets/apple-eat-v3-1.png',
    'assets/apple-eat-v3-2.png',
    'assets/apple-eat-v3-3.png',
    'assets/apple-eat-v3-4.png',
    'assets/apple-eat-v3-5.png',
    'assets/apple-eat-v3-6.png',
    'assets/apple-eat-v3-7.png',
  ];
  const APPLE_FRAME_SIZE = { w: 500, h: 564 };
  let dishSeq = 0;

  function dishesOnTable() {
    return state.dishes || [];
  }

  function dishNode(dish) {
    return plateRow.querySelector(`.dish[data-key="${dish.key}"]`);
  }

  function boxOfDish(dish) {
    return dish.box || FOOD_SIZE.apple;
  }

  function updateStageScale() {
    const viewportScale = Math.min(window.innerWidth / 360, window.innerHeight / 640);
    const sceneScale = Math.max(0.95, Math.min(1.55, viewportScale));
    const foodScale = Math.max(1, Math.min(1.55, viewportScale));
    document.documentElement.style.setProperty('--scene-scale', sceneScale.toFixed(2));
    document.documentElement.style.setProperty('--food-scale', foodScale.toFixed(2));
    updateDishLayout();
  }

  function seededRandom(seed) {
    let t = Math.floor((seed || 0.5) * 4294967296) >>> 0;
    return () => {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 桌上的盘子随机散摆：按份数算出能放下的盘子直径，再随机找互不重叠的位置
  function updateDishLayout() {
    if ($('#eat-scene').hidden) return;
    const dishes = dishesOnTable();
    const count = dishes.length;
    if (!count) return;
    const narrow = window.innerWidth <= 620;
    const gap = narrow ? 12 : 16;
    const availW = Math.min(window.innerWidth * 0.94, 1180) - 4;
    const availH = Math.max(150, window.innerHeight * 0.64);
    const tagHeight = narrow ? 20 : 24;
    let best = 0;
    for (let cols = 1; cols <= count; cols += 1) {
      const rows = Math.ceil(count / cols);
      const byWidth = (availW - gap * (cols - 1)) / cols;
      const byHeight = (availH - gap * (rows - 1)) / rows - tagHeight;
      best = Math.max(best, Math.min(byWidth, byHeight));
    }
    const plateWidth = Math.max(74, Math.min(best * 0.82, 380));
    const plateHeight = plateWidth * 0.984;
    const spanX = Math.max(0, availW - plateWidth);
    const spanY = Math.max(0, availH - plateHeight - tagHeight);

    plateRow.style.width = `${availW.toFixed(1)}px`;
    plateRow.style.height = `${availH.toFixed(1)}px`;
    plateRow.style.setProperty('--plate-w', `${plateWidth.toFixed(1)}px`);

    const placed = [];
    dishes.forEach((dish) => {
      const random = seededRandom(dish.seed);
      let pick = { px: spanX / 2, py: spanY / 2, score: -1 };
      for (let attempt = 0; attempt < 140; attempt += 1) {
        const px = random() * spanX;
        const py = random() * spanY;
        let score = 1e9;
        placed.forEach((other) => {
          score = Math.min(score, Math.hypot(px - other.px, py - other.py));
        });
        if (score > pick.score) pick = { px, py, score };
        if (score > plateWidth * 1.04) break;
      }
      placed.push(pick);
      const node = dishNode(dish);
      if (!node) return;
      node.style.left = `${pick.px.toFixed(1)}px`;
      node.style.top = `${pick.py.toFixed(1)}px`;
      node.style.setProperty('--dish-rot', `${(dish.rotate || 0).toFixed(1)}deg`);
      const cut = node.querySelector('.food-cut');
      const box = boxOfDish(dish);
      cut.style.width = `${box.w + BITE_PAD * 2}px`;
      cut.style.height = `${box.h + BITE_PAD * 2}px`;
      const scale = Math.max(0.2, Math.min(3.2, Math.min((plateWidth * 0.62) / box.w, (plateWidth * 0.62) / box.h)));
      cut.style.setProperty('--food-scale', scale.toFixed(3));
    });
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function ping() {
    if (!state.sound) return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.frequency.value = 420; gain.gain.value = 0.025;
      oscillator.start(); oscillator.stop(context.currentTime + 0.06);
    } catch (error) { /* 音效不可用时不影响游戏 */ }
  }

  // ===== 厨房音效 =====
  function sfxTone(context, destination, startFreq, endFreq, type, duration, level, delay = 0) {
    const at = context.currentTime + 0.012 + delay;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, startFreq), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), at + duration);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env);
    env.connect(destination);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  function sfxNoise(context, destination, duration, cutoff, filterType, level, delay = 0) {
    const at = context.currentTime + 0.012 + delay;
    const length = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoff, at);
    const env = context.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), at + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(destination);
    source.start(at);
    source.stop(at + duration + 0.03);
  }

  // 每味食材一个短音色：苹果闷、糖亮、盐干脆、肉桂暖、柠檬尖、水是水滴、面粉是粉扑
  function playIngredientSound(id) {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.22;
    master.connect(context.destination);
    switch (id) {
      case 'apple':
        sfxTone(context, master, 240, 120, 'sine', 0.16, 0.9);
        sfxTone(context, master, 480, 240, 'triangle', 0.1, 0.2);
        break;
      case 'sugar':
        sfxTone(context, master, 1568, 2093, 'triangle', 0.1, 0.55);
        sfxTone(context, master, 2093, 2637, 'sine', 0.08, 0.25, 0.04);
        break;
      case 'salt':
        sfxNoise(context, master, 0.07, 2200, 'highpass', 0.8);
        sfxTone(context, master, 640, 420, 'square', 0.05, 0.12);
        break;
      case 'cinnamon':
        sfxTone(context, master, 340, 210, 'triangle', 0.14, 0.7);
        sfxTone(context, master, 170, 105, 'sine', 0.18, 0.3);
        break;
      case 'lemon':
        sfxTone(context, master, 880, 1760, 'sine', 0.12, 0.55);
        sfxTone(context, master, 1320, 2200, 'triangle', 0.08, 0.18, 0.05);
        break;
      case 'water':
        sfxTone(context, master, 760, 260, 'sine', 0.16, 0.75);
        sfxTone(context, master, 1520, 600, 'sine', 0.08, 0.18, 0.03);
        break;
      case 'flour':
        sfxNoise(context, master, 0.18, 720, 'lowpass', 0.7);
        sfxTone(context, master, 190, 110, 'sine', 0.12, 0.25);
        break;
      default:
        sfxTone(context, master, 420, 420, 'sine', 0.06, 0.3);
    }
  }

  function playRemoveSound() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.1;
    master.connect(context.destination);
    sfxTone(context, master, 520, 260, 'sine', 0.1, 0.45);
  }

  function playBowlTap(empty = false) {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = empty ? 0.07 : 0.09;
    master.connect(context.destination);
    sfxTone(context, master, empty ? 340 : 270, empty ? 190 : 150, 'sine', 0.12, 0.55);
    sfxNoise(context, master, 0.05, 1200, 'bandpass', 0.3);
  }

  function playBowlDropSound() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.09;
    master.connect(context.destination);
    sfxTone(context, master, 190, 90, 'sine', 0.14, 0.55);
    sfxNoise(context, master, 0.08, 600, 'lowpass', 0.3);
  }

  function playTrashPourSound(short = false) {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.1;
    master.connect(context.destination);
    sfxNoise(context, master, short ? 0.24 : 0.4, 900, 'lowpass', short ? 0.4 : 0.55);
    sfxTone(context, master, 150, 65, 'sine', short ? 0.18 : 0.24, 0.45, short ? 0.08 : 0.16);
    if (!short) {
      sfxNoise(context, master, 0.14, 480, 'lowpass', 0.35, 0.26);
      sfxTone(context, master, 110, 55, 'sine', 0.2, 0.3, 0.42);
    }
  }

  function playRopeSwingSound() {
    if (!state.sound || state.scene !== 'pick' || state.fruit !== 'apple') return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.04;
    master.connect(context.destination);
    sfxNoise(context, master, 0.22, 500, 'bandpass', 0.5);
    sfxTone(context, master, 180, 120, 'sine', 0.18, 0.2);
  }

  function playRopeLaunchSound() {
    if (!state.sound || state.scene !== 'pick' || state.fruit !== 'apple') return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.08;
    master.connect(context.destination);
    sfxTone(context, master, 260, 780, 'triangle', 0.12, 0.5);
    sfxNoise(context, master, 0.12, 1200, 'bandpass', 0.4);
  }

  function playRopeReturnSound() {
    if (!state.sound || state.scene !== 'pick' || state.fruit !== 'apple') return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.055;
    master.connect(context.destination);
    sfxNoise(context, master, 0.18, 700, 'lowpass', 0.35);
    sfxTone(context, master, 480, 240, 'sine', 0.2, 0.25);
  }

  function playApplePickSound() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.15;
    master.connect(context.destination);
    sfxTone(context, master, 880, 660, 'triangle', 0.11, 0.6);
    sfxTone(context, master, 1320, 1320, 'sine', 0.3, 0.32, 0.03);
    sfxTone(context, master, 1760, 2093, 'sine', 0.18, 0.14, 0.08);
    sfxNoise(context, master, 0.05, 1800, 'highpass', 0.18);
  }

  // 每一口都有咀嚼声：鲜苹果脆、苹果派酥、柿子酱软
  const BITE_SOUNDS = {
    'fresh-apple': 'assets/audio/bite-apple.mp3',
    'persimmon-jam': 'assets/audio/bite-jam.mp3',
    'apple-pie': 'assets/audio/bite-pie.mp3',
  };
  const bitePools = new Map();
  let biteCursor = 0;

  function getBitePool(style) {
    const src = BITE_SOUNDS[style] || BITE_SOUNDS['apple-pie'];
    if (!bitePools.has(src)) {
      bitePools.set(src, Array.from({ length: 2 }, () => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.52;
        return audio;
      }));
    }
    return bitePools.get(src);
  }

  function preloadBiteSound(style) {
    getBitePool(style);
  }

  function playBiteSound(dish, biteIndex = 1) {
    if (!state.sound) return;
    const style = dish && BITE_SOUNDS[dish.eatClass] ? dish.eatClass : 'apple-pie';
    const pool = getBitePool(style);
    let player = pool.find((audio) => audio.paused || audio.ended);
    if (!player) {
      player = pool[biteCursor % pool.length];
      biteCursor += 1;
    }
    clearTimeout(player.__stopTimer);
    try { player.currentTime = 0; } catch (error) { /* 元数据还没就绪时忽略 */ }
    player.__stopTimer = window.setTimeout(() => {
      if (!player.paused) {
        player.pause();
        player.currentTime = 0;
      }
    }, 1400);
    const playPromise = player.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => playBiteSynth(dish, biteIndex));
    }
  }

  function playBiteSynth(dish, biteIndex = 1) {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    const variation = ((biteIndex * 37) % 5) - 2;
    const style = dish && dish.eatClass;
    if (style === 'fresh-apple') {
      sfxNoise(context, master, 0.12, 2600 + variation * 90, 'highpass', 0.9);
      sfxTone(context, master, 520 + variation * 18, 250, 'triangle', 0.1, 0.35);
      sfxNoise(context, master, 0.05, 1400, 'bandpass', 0.35, 0.03);
    } else if (style === 'persimmon-jam') {
      sfxNoise(context, master, 0.15, 520 + variation * 60, 'lowpass', 0.6);
      sfxTone(context, master, 180 + variation * 10, 90, 'sine', 0.16, 0.4);
      sfxTone(context, master, 320, 240, 'triangle', 0.08, 0.18, 0.02);
    } else {
      sfxNoise(context, master, 0.13, 950 + variation * 70, 'bandpass', 0.7);
      sfxTone(context, master, 260 + variation * 12, 150, 'sine', 0.12, 0.45);
      sfxNoise(context, master, 0.04, 1800, 'highpass', 0.28, 0.02);
    }
  }

  function playSynthStart() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.12;
    master.connect(context.destination);
    sfxTone(context, master, 220, 330, 'triangle', 0.24, 0.5);
    sfxTone(context, master, 330, 494, 'sine', 0.8, 0.22, 0.08);
    sfxNoise(context, master, 0.3, 900, 'bandpass', 0.25, 0.05);
  }

  function playSynthSuccess() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      sfxTone(context, master, freq, freq, 'triangle', 0.3, 0.5, index * 0.09);
      sfxTone(context, master, freq * 2, freq * 2, 'sine', 0.16, 0.12, index * 0.09);
    });
    sfxTone(context, master, 1568, 2093, 'sine', 0.5, 0.18, 0.36);
    sfxTone(context, master, 2093, 2637, 'sine', 0.4, 0.1, 0.44);
  }

  // ===== 背景音乐 =====
  const BGM_TRACKS = {
    intro: 'assets/audio/intro-bgm.mp3',
    game: 'assets/audio/game-bgm.mp3',
  };
  const BGM_VOLUME = 0.22;
  const BGM_FADE_MS = 900;
  const bgm = { intro: null, game: null, current: null, unlocked: false };
  let bgmDuck = 1;

  function getBgmTrack(name) {
    const src = BGM_TRACKS[name];
    if (!src) return null;
    if (!bgm[name]) {
      const track = new Audio(src);
      track.loop = true;
      track.preload = 'auto';
      track.volume = 0;
      bgm[name] = track;
    }
    return bgm[name];
  }

  function fadeBgm(track, from, to, duration, onDone) {
    if (!track) return;
    clearInterval(track.__fadeTimer);
    const start = performance.now();
    track.volume = Math.max(0, Math.min(1, from));
    track.__fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      track.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
      if (progress >= 1) {
        clearInterval(track.__fadeTimer);
        track.__fadeTimer = 0;
        if (to <= 0.001) track.pause();
        if (onDone) onDone();
      }
    }, 30);
  }

  function playBgm(name) {
    if (!state.sound || !bgm.unlocked) return;
    const track = getBgmTrack(name);
    if (!track) return;
    if (bgm.current === name && !track.paused) return;
    ['intro', 'game'].forEach((key) => {
      const other = bgm[key];
      if (key !== name && other && !other.paused) fadeBgm(other, other.volume, 0, BGM_FADE_MS);
    });
    bgm.current = name;
    track.volume = 0;
    const playPromise = track.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    fadeBgm(track, 0, BGM_VOLUME * bgmDuck, BGM_FADE_MS);
  }

  function stopBgm() {
    ['intro', 'game'].forEach((name) => {
      const track = bgm[name];
      if (track && !track.paused) fadeBgm(track, track.volume, 0, 400);
    });
    bgm.current = null;
  }

  function unlockBgm() {
    if (bgm.unlocked) return;
    bgm.unlocked = true;
    if (state.sound) playBgm(state.scene === 'intro' ? 'intro' : 'game');
  }

  function preloadBgm() {
    getBgmTrack('intro');
    getBgmTrack('game');
  }

  // 以后接旁白时可以用它把音乐压低
  function setBgmDuck(ducked) {
    bgmDuck = ducked ? 0.45 : 1;
    const track = bgm.current ? bgm[bgm.current] : null;
    if (track && !track.paused) fadeBgm(track, track.volume, BGM_VOLUME * bgmDuck, 350);
  }

  function updateInventory() {
    const applesOnTree = currentAppleTree().apples.length;
    $('#apple-count').textContent = `${state.treePicked} / ${applesOnTree}`;
    $('#persimmon-count').textContent = `${state.picked.persimmon} / 3`;
    $('#total-picked').textContent = state.picked.apple + state.picked.persimmon;
    $('#to-make').disabled = state.picked.apple + state.picked.persimmon === 0;
  }

  function renderAppleTree() {
    const tree = $('.apple-tree');
    if (!tree) return;
    $$('.apple-fruit').forEach((apple) => apple.remove());
    tree.classList.remove('tree-variant-1', 'tree-variant-2', 'tree-variant-3');
    tree.classList.add(`tree-variant-${state.treeIndex + 1}`);
    currentAppleTree().apples.forEach(([x, y, scale], index) => {
      const apple = document.createElement('button');
      apple.type = 'button';
      apple.className = 'fruit apple-fruit';
      apple.style.setProperty('--apple-x', `${x}%`);
      apple.style.setProperty('--apple-y', `${y}%`);
      apple.style.setProperty('--apple-s', String(scale || 1));
      apple.setAttribute('aria-label', `苹果 ${index + 1}`);
      tree.appendChild(apple);
    });
    state.treePicked = 0;
    updateInventory();
  }

  function switchAppleTree() {
    const tree = $('.apple-tree');
    if (!tree || state.switchingTree) return;
    state.switchingTree = true;
    tree.classList.add('tree-leaving');
    switchTimer = setTimeout(() => {
      state.treeIndex = (state.treeIndex + 1) % APPLE_TREES.length;
      tree.classList.remove('tree-arriving');
      renderAppleTree();
      tree.classList.remove('tree-leaving');
      void tree.offsetWidth;
      tree.classList.add('tree-arriving');
      setTimeout(() => tree.classList.remove('tree-arriving'), 560);
      state.switchingTree = false;
      $('#pick-status-text').textContent = '新的一棵树，继续套苹果吧！';
    }, 300);
  }

  function completeAppleTree() {
    $('#pick-status-text').textContent = '这树的苹果摘完啦，换下一棵…';
    showToast('这棵树摘完啦！换一棵');
    clearTimeout(switchTimer);
    switchTimer = setTimeout(switchAppleTree, 850);
  }

  function collectFruit(type, fruitElement) {
    if (!fruitElement || fruitElement.classList.contains('caught')) return;
    if (type === 'apple') {
      fruitElement.classList.add('caught');
      state.picked.apple += 1;
      state.treePicked += 1;
      updateInventory();
      playApplePickSound();
      showToast('套中啦！苹果 +1');
      if (state.treePicked >= currentAppleTree().apples.length) completeAppleTree();
      return;
    }
    if (state.picked.persimmon >= 3) return;
    fruitElement.classList.add('caught');
    state.picked.persimmon += 1;
    updateInventory();
    ping();
    showToast('瓶子接住啦！柿子 +1');
    bottle.classList.remove('aligned', 'holding');
    bottle.style.left = ''; bottle.style.top = ''; bottle.style.bottom = '';
    $('#hold-progress-bar').style.width = '0%';
    if (state.picked.persimmon === 3) {
      $('#hold-status-text').textContent = '柿子树收获完成！';
    }
  }

  function setFruit(type) {
    state.fruit = type;
    $$('.fruit-tab').forEach((tab) => {
      const active = tab.dataset.fruit === type;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    orchardCard.classList.toggle('hidden', type !== 'apple');
    persimmonCard.classList.toggle('hidden', type !== 'persimmon');
    $('#orchard-instruction').textContent = type === 'apple' ? '绳索从下方发出，点击向上套住苹果！' : '拖动瓶子，把瓶口插到柿子后面，再长按摘取！';
  }

  function localPoint(event, parent) {
    const rect = parent.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function placeHook(left, top) {
    const world = $('#apple-world');
    const x = Math.max(3, Math.min(left, world.clientWidth - ring.offsetWidth - 3));
    hookLeft = x;
    hookTop = top;
    const anchorX = world.clientWidth / 2;
    // 绳索要接到套圈上方的视觉绳结，而不是套圈盒子的中心
    const hookX = x + 40;
    // 绳索连接在套圈底部，套圈主体位于绳结上方
    const hookY = top + 56;
    const dx = hookX - anchorX;
    const anchorY = world.clientHeight - 15;
    const dy = hookY - anchorY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    ropeLine.style.left = `${anchorX}px`;
    ropeLine.style.top = `${anchorY}px`;
    ropeLine.style.width = `${Math.max(10, Math.hypot(dx, dy))}px`;
    ropeLine.style.height = '6px';
    ropeLine.style.transform = `rotate(${angle}deg)`;
    ring.style.setProperty('--ring-angle', `${-angle}deg`);
  }

  function checkRingHit() {
    const world = $('#apple-world');
    // 场景隐藏时所有元素尺寸为 0，避免误判为套中
    if ($('#pick-scene').hidden || world.clientWidth < 10) return false;
    const ringBox = ring.getBoundingClientRect();
    const ringCenter = { x: ringBox.left + ringBox.width / 2, y: ringBox.top + ringBox.height / 2 };
    const target = $$('.apple-fruit:not(.caught)').find((fruit) => {
      const fruitBox = fruit.getBoundingClientRect();
      const fruitCenter = { x: fruitBox.left + fruitBox.width / 2, y: fruitBox.top + fruitBox.height / 2 };
      return Math.hypot(ringCenter.x - fruitCenter.x, ringCenter.y - fruitCenter.y) < 30;
    });
    if (!target) return false;
    collectFruit('apple', target);
    return true;
  }

  function swingHook(now) {
    if (hookPhase !== 'swing') return;
    const world = $('#apple-world');
    const range = Math.max(55, world.clientWidth / 2 - 62);
    if (!swingClock) swingClock = now;
    const swing = Math.sin((now - swingClock) / 850);
    const sign = Math.sign(swing);
    if (sign) {
      if (lastSwingSign && sign !== lastSwingSign) playRopeSwingSound();
      lastSwingSign = sign;
    }
    const x = world.clientWidth / 2 - ring.offsetWidth / 2 + swing * range;
    // 绳索固定从底部发出，但套圈的待机位置要停在画面中下部，避免贴住底边
    const startTop = Math.max(88, world.clientHeight * 0.62 - ring.offsetHeight / 2);
    placeHook(x, startTop);
    hookFrame = requestAnimationFrame(swingHook);
  }

  function releaseHook() {
    if (state.fruit !== 'apple' || hookPhase !== 'swing') return;
    hookPhase = 'dropping';
    playRopeLaunchSound();
    lastSwingSign = 0;
    cancelAnimationFrame(hookFrame);
    hookStart = performance.now();
    const startX = hookLeft;
    const world = $('#apple-world');
    const startTop = hookTop;
    const targetTop = 58;
    let caughtThisDrop = false;
    function drop(now) {
      const progress = Math.min(1, (now - hookStart) / 480);
      placeHook(startX, startTop + (targetTop - startTop) * progress);
      if (!caughtThisDrop) caughtThisDrop = checkRingHit();
      if (progress < 1) { hookFrame = requestAnimationFrame(drop); return; }
      hookPhase = 'returning'; hookStart = now;
      playRopeReturnSound();
      function retract(time) {
        const progressBack = Math.min(1, (time - hookStart) / 420);
        placeHook(startX, targetTop + (startTop - targetTop) * progressBack);
        if (progressBack < 1) hookFrame = requestAnimationFrame(retract);
        else {
          const center = world.clientWidth / 2 - ring.offsetWidth / 2;
          const range = Math.max(55, world.clientWidth / 2 - 62);
          const ratio = Math.max(-1, Math.min(1, (startX - center) / range));
          swingClock = performance.now() - Math.asin(ratio) * 850;
          hookPhase = 'swing';
          lastSwingSign = 0;
          hookFrame = requestAnimationFrame(swingHook);
        }
      }
      hookFrame = requestAnimationFrame(retract);
    }
    hookFrame = requestAnimationFrame(drop);
  }
  ring.addEventListener('pointerdown', releaseHook);

  function snapBottleToFruit(fruit) {
    const world = $('.persimmon-world');
    const fruitBox = fruit.getBoundingClientRect();
    const worldBox = world.getBoundingClientRect();
    bottle.style.left = `${fruitBox.left - worldBox.left + fruitBox.width / 2 - bottle.offsetWidth / 2}px`;
    bottle.style.top = `${fruitBox.top - worldBox.top + fruitBox.height - 13}px`;
    bottle.style.bottom = 'auto';
    bottle.classList.add('aligned');
    $('#hold-status-text').textContent = '瓶口已对准，长按瓶子摘取';
  }

  function checkBottleAlignment() {
    const bottleBox = bottle.getBoundingClientRect();
    const bottleTop = { x: bottleBox.left + bottleBox.width / 2, y: bottleBox.top + 6 };
    const target = $$('.persimmon-fruit:not(.caught)').find((fruit) => {
      const fruitBox = fruit.getBoundingClientRect();
      return Math.hypot(bottleTop.x - (fruitBox.left + fruitBox.width / 2), bottleTop.y - fruitBox.bottom) < 34;
    });
    if (target) snapBottleToFruit(target);
    else { bottle.classList.remove('aligned'); $('#hold-status-text').textContent = '先把瓶口插到柿子后面'; }
  }

  function startHold(event) {
    if (state.fruit !== 'persimmon' || !bottleWasAligned || state.picked.persimmon >= 3) return;
    event.preventDefault();
    holdActive = true; holdStart = performance.now(); bottle.classList.add('holding');
    $('#hold-status-text').textContent = '瓶口对准了，继续长按…';
    function tick(now) {
      if (!holdActive) return;
      const progress = Math.min(1, (now - holdStart) / 1000);
      $('#hold-progress-bar').style.width = `${progress * 100}%`;
      if (progress >= 1) {
        collectFruit('persimmon', $$('.persimmon-fruit:not(.caught)')[0]);
        stopHold();
      } else holdTimer = requestAnimationFrame(tick);
    }
    holdTimer = requestAnimationFrame(tick);
  }

  function stopHold() {
    holdActive = false;
    cancelAnimationFrame(holdTimer);
    bottle.classList.remove('holding');
    if (state.picked.persimmon < 3 && bottle.classList.contains('aligned')) $('#hold-status-text').textContent = '瓶口已对准，长按瓶子摘取';
  }

  bottle.addEventListener('pointerdown', (event) => {
    bottleDragging = true;
    bottleWasAligned = bottle.classList.contains('aligned');
    bottle.setPointerCapture(event.pointerId);
    bottlePointerOffset = localPoint(event, bottle);
    if (!bottleWasAligned) bottle.classList.remove('aligned');
    startHold(event);
  });
  bottle.addEventListener('pointermove', (event) => {
    if (!bottleDragging || holdActive) return;
    const world = $('.persimmon-world');
    const point = localPoint(event, world);
    if (bottleWasAligned && Math.hypot(point.x - (parseFloat(bottle.style.left) || 0), point.y - (parseFloat(bottle.style.top) || 0)) < 10) return;
    bottleWasAligned = false;
    bottle.classList.remove('aligned');
    bottle.style.left = `${Math.max(3, Math.min(point.x - bottlePointerOffset.x, world.clientWidth - bottle.offsetWidth - 3))}px`;
    bottle.style.top = `${Math.max(72, Math.min(point.y - bottlePointerOffset.y, world.clientHeight - bottle.offsetHeight - 4))}px`;
    bottle.style.bottom = 'auto';
    checkBottleAlignment();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => bottle.addEventListener(eventName, () => { bottleDragging = false; if (holdActive) stopHold(); }));

  const FLAVOR_NOTES = {
    sugar: '甜得很直接',
    salt: '咸得很有个性',
    cinnamon: '香料味直冲鼻尖',
    lemon: '酸得人一激灵',
    water: '清汤寡水但很诚实',
    flour: '糊糊的，但很努力',
  };
  // 滑动天空：一次滑动走一个时段；四个时段都走过并回到清晨，前景长一阶（最高第 5 阶）
  const INTRO_DEFAULT_SKY = 'assets/intro/noon-sky.jpg';
  const INTRO_STAGES = [
    'assets/intro/orchard-scene.png',
    'assets/intro/orchard-stage-2.png',
    'assets/intro/orchard-stage-3.png',
    'assets/intro/orchard-stage-4.png',
    'assets/intro/orchard-stage-5.png',
  ];
  // 20 条物候手账：5 个阶段 × 晨 / 午 / 昏 / 夜
  const INTRO_CONTENT_STAGES = [
    { label: '萌芽 · 开花' },
    { label: '幼果 · 膨大' },
    { label: '着色 · 采收' },
    { label: '贮藏 · 入库' },
    { label: '产业 · 品牌' },
  ];
  const INTRO_NOTES = [
    { title: '红富士', body: '渭北旱塬日照足、昼夜温差大，白水与洛川是陕西红富士的核心产区。', tags: ['渭北旱塬', '优生区'], source: '陕西省果业中心' },
    { title: '从疏花开始', body: '红富士疏果按 15~25 厘米留 1 个幼果；花序分离期按 20 厘米间距疏掉弱小花序。', tags: ['15–25cm 留 1 果', '20cm 疏花序'], source: '宝鸡市农业农村局' },
    { title: '倒春寒', body: '冻害前 1~2 天灌水、喷抗逆调节剂；霜冻当晚可喷雾、熏烟，或开启防霜风机。', tags: ['灌水', '熏烟', '防霜风机'], source: '宝鸡市农业农村局' },
    { title: '花期最怕气温', body: '渭北旱塬的研究表明，开花期气温变化对苹果产量的影响最显著。', tags: ['开花期', '气温'], source: '中国农学通报' },
    { title: '洛川塬上', body: '塬面开阔、土层深厚，幼果在这里完成第一次膨大。', tags: ['黄土塬', '幼果期'], source: '洛川苹果产业资料' },
    { title: '品质门槛', body: '特优级红富士的气候门槛：幼果期日较差 >7.9℃，膨大期降水 ≥134.9mm。', tags: ['日较差 >7.9℃', '降水 ≥134.9mm'], source: '陕西红富士气候品质认证研究' },
    { title: '盼雨，也怕雨', body: '单果重、硬度和可溶性固形物都与膨大期降水显著正相关——雨少了不长大，雨多了不甜。', tags: ['单果重', '可溶性固形物'], source: '陕西红富士气候品质认证研究' },
    { title: '免套袋试验', body: '2024 年试验：全年 6 次高脂膜叶面肥、土壤控氮 40%，免套袋富士单果重增加约 40g，含糖量提高 1.75%。', tags: ['6 次喷施', '+40g', '+1.75%'], source: '《陕西农业科学》2024' },
    { title: '条纹与底色', body: '红富士的颜值看条纹和底色；着色期管理，决定它能不能卖上价。', tags: ['条纹着色', '商品果率'], source: '陕西省果业中心' },
    { title: '气候成绩单', body: '特优级要求着色成熟期平均最低气温 ≥6.1℃、降水 ≤79mm，全生长季平均气温 ≤17.5℃。', tags: ['≥6.1℃', '≤79mm', '≤17.5℃'], source: '陕西红富士气候品质认证研究' },
    { title: '连阴雨', body: '光照不足影响着色。抓住降水间歇除袋、铺反光膜、摘叶转果，再分批分级采收。', tags: ['除袋', '反光膜', '分批采收'], source: '陕西省果业中心 · 2025' },
    { title: '越冷越红', body: '着色期低温、晴好、少雨，有利于花青苷积累，果子红得更透。', tags: ['低温', '晴好', '少雨'], source: '中国农学通报' },
    { title: '枝头到冷库', body: '采收不是终点。从枝头到冷库的这段路，决定一颗苹果能甜多久。', tags: ['采后', '预冷'], source: '陕西省果业中心' },
    { title: '24 小时窗口', body: '采收后 24 小时内预冷入库；入库前 10 天全面消杀，富士要与瑞雪等品种分开存放。', tags: ['24h 入库', '10 天消杀'], source: '陕西省果业中心' },
    { title: '有标可依', body: 'DB61/T 1115-2017《陕西苹果贮藏技术规程》覆盖机械冷库与气调库，红富士在列。', tags: ['DB61/T 1115-2017'], source: '陕西省地方标准' },
    { title: '上户口', body: '洛川苹果的“上户口”就是二维码追溯：扫码可查产地、用药和施肥记录。', tags: ['二维码追溯', '产地可查'], source: '洛川苹果品牌资料' },
    { title: '一颗苹果的落点', body: '从枝头到木桌，苹果最后落在果盘、烤箱和日常的一餐里。', tags: ['鲜食', '加工'], source: '陕西果业' },
    { title: '八成是红富士', body: '研究资料显示，红富士约占陕西苹果面积的八成，是陕西苹果的绝对底色。', tags: ['约 80%'], source: '陕西红富士气候品质认证研究' },
    { title: '毛驴驮回的树苗', body: '1947 年，李新安用毛驴把苹果树苗从河南灵宝驮回洛川阿寺村，陕北第一棵苹果树就此扎根。', tags: ['1947', '洛川阿寺村'], source: '洛川苹果史料' },
    { title: '底色与新价', body: '普通红富士约 3 元/斤，瑞雪至少 6.5 元/斤——红富士是底色，新品种正在改写价格天花板。', tags: ['红富士 ≈3 元/斤', '瑞雪 ≥6.5 元/斤'], source: '近年产地市场行情' },
  ];
  const INTRO_NOTE_PHOTOS = [
    { src: 'assets/content/note-01.jpg', alt: '枝头的条纹红富士苹果', place: '枝头红富士', credit: '图：用户提供' },
    { src: 'assets/content/note-02.jpg', alt: '果农在苹果园里疏花', place: '米脂 · 疏花', credit: '图：新华社 / 刘诗平' },
    { src: 'assets/content/note-03.jpg', alt: '带气象站的苹果园', place: '米脂 · 果园气象站', credit: '图：新华社 / 刘诗平' },
    { src: 'assets/content/note-04.jpg', alt: '苹果花期的果园', place: '米脂 · 花期', credit: '图：新华社 / 刘诗平' },
    { src: 'assets/content/note-05.jpg', alt: '洛川旧县镇苹果园航拍', place: '洛川 · 旧县镇果园', credit: '图：新华社 / 邵瑞' },
    { src: 'assets/content/note-06.jpg', alt: '枝头的红富士苹果', place: '洛川 · 红富士', credit: '图：新华社 / 刘彤' },
    { src: 'assets/content/note-07.jpg', alt: '淳化苹果园', place: '淳化 · 果园', credit: '图：新华社' },
    { src: 'assets/content/note-08.jpg', alt: '淳化苹果园', place: '淳化 · 果园', credit: '图：新华社' },
    { src: 'assets/content/note-09.jpg', alt: '白水红富士苹果', place: '白水 · 红富士', credit: '图：西部网 / 潘航' },
    { src: 'assets/content/note-10.jpg', alt: '果农在安塞果园采摘苹果', place: '安塞 · 采摘', credit: '图：新华社 / 张博文' },
    { src: 'assets/content/note-11.jpg', alt: '白水苹果园', place: '白水 · 果园', credit: '图：西部网 / 潘航' },
    { src: 'assets/content/note-12.jpg', alt: '米脂梯田苹果园', place: '米脂 · 梯田果园', credit: '图：新华社 / 刘诗平' },
    { src: 'assets/content/note-13.jpg', alt: '白水苹果装车', place: '白水 · 装车', credit: '图：新华社 / 李一博' },
    { src: 'assets/content/note-14.jpg', alt: '淳化冷库里的苹果', place: '淳化 · 冷库', credit: '图：新华社' },
    { src: 'assets/content/note-15.jpg', alt: '洛川苹果分选线', place: '洛川 · 分选线', credit: '图：新华社 / 张曼怡' },
    { src: 'assets/content/note-16.jpg', alt: '洛川苹果直播', place: '洛川 · 直播', credit: '图：新华社 / 张曼怡' },
    { src: 'assets/content/note-17.jpg', alt: '苹果加工切片', place: '洛川 · 加工', credit: '图：新华社' },
    { src: 'assets/content/note-18.jpg', alt: '箱装套网套的红富士苹果', place: '分级装箱', credit: '图：用户提供' },
    { src: 'assets/content/note-19.jpg', alt: '洛川阿寺村的苹果树', place: '洛川 · 阿寺村果树', credit: '图：新华社 / 刘彤' },
    { src: 'assets/content/note-20.jpg', alt: '成堆的条纹红富士苹果', place: '条纹红富士', credit: '图：用户提供' },
  ];
  const INTRO_NOTE_REGIONS = [
    '白水（渭南）', '米脂（榆林）', '米脂（榆林）', '米脂（榆林）',
    '洛川（延安）', '洛川（延安）', '淳化（咸阳）', '淳化（咸阳）',
    '白水（渭南）', '安塞（延安）', '白水（渭南）', '米脂（榆林）',
    '白水（渭南）', '淳化（咸阳）', '洛川（延安）', '洛川（延安）',
    '洛川（延安）', '洛川（延安）', '洛川（延安）', '白水（渭南）',
  ];
  const INTRO_PHASES = [
    {
      id: 'morning', label: '晨', subtitle: '塬上醒了',
      brightness: .98, saturate: .95, sepia: .04,
      tint: '#ffb37a', tintAlpha: .08,
      sky: 'assets/intro/morning-sky.jpg',
    },
    {
      id: 'noon', label: '午', subtitle: '晒足 2500 小时',
      brightness: 1, saturate: 1, sepia: 0,
      tint: '#ffffff', tintAlpha: 0,
      sky: 'assets/intro/noon-sky.jpg',
    },
    {
      id: 'dusk', label: '昏', subtitle: '白天攒糖，夜里锁糖',
      brightness: .82, saturate: 1.05, sepia: .1,
      tint: '#ff8a4a', tintAlpha: .22,
      sky: 'assets/intro/dusk-sky.jpg',
    },
    {
      id: 'night', label: '夜', subtitle: '夜深了，果子在长糖心',
      brightness: .55, saturate: .7, sepia: 0,
      tint: '#0b1d3a', tintAlpha: .5,
      sky: 'assets/intro/night-sky.jpg',
    },
  ];
  const INTRO_PHASE_COUNT = INTRO_PHASES.length;

  let introContent = 0;
  let introPhase = 0;
  let introStage = 0;
  let introNoticeShown = false;
  let introNoticeTimer = 0;
  let introLeaving = false;
  let introBusy = false;
  let introRaf = 0;
  let introDrag = null;
  let introSwapTimer = null;
  let introQueue = [];
  let introSettleTimer = null;

  const INTRO_LAST_NOTE = INTRO_NOTES.length - 1;

  let noticeAudioContext = null;

  function ensureAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!noticeAudioContext) noticeAudioContext = new AudioCtx();
      if (noticeAudioContext.state === 'suspended') noticeAudioContext.resume();
      return noticeAudioContext;
    } catch (error) {
      return null;
    }
  }

  // 两颗轻音，像手机收到消息的“叮咚”
  function playNoticeChime() {
    if (!state.sound) return;
    const context = ensureAudioContext();
    if (!context) return;
    const start = context.currentTime + 0.02;
    const notes = [
      { freq: 1318.5, at: 0, dur: 0.2, gain: 0.055 },
      { freq: 1046.5, at: 0.15, dur: 0.42, gain: 0.05 },
    ];
    notes.forEach(({ freq, at, dur, gain }) => {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start + at);
      env.gain.setValueAtTime(0.0001, start + at);
      env.gain.exponentialRampToValueAtTime(gain, start + at + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, start + at + dur);
      osc.connect(env);
      env.connect(context.destination);
      osc.start(start + at);
      osc.stop(start + at + dur + 0.02);
      // 叠一个很轻的泛音，声音更像小铃铛
      const harm = context.createOscillator();
      const harmEnv = context.createGain();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(freq * 2, start + at);
      harmEnv.gain.setValueAtTime(gain * 0.12, start + at);
      harmEnv.gain.exponentialRampToValueAtTime(0.0001, start + at + dur * 0.8);
      harm.connect(harmEnv);
      harmEnv.connect(context.destination);
      harm.start(start + at);
      harm.stop(start + at + dur);
    });
  }

  // ===== 介绍页逐条旁白 =====
  const introVoicePlayers = new Map();
  let introVoiceCurrent = null;
  let introVoiceUnlocked = false;

  function getIntroVoice(index) {
    if (index < 0 || index >= INTRO_NOTES.length) return null;
    if (!introVoicePlayers.has(index)) {
      const player = new Audio(`assets/audio/intro-${String(index + 1).padStart(2, '0')}.mp3`);
      player.preload = 'auto';
      player.volume = 0.95;
      player.addEventListener('ended', () => {
        if (state.scene === 'intro') setBgmDuck(false);
      });
      introVoicePlayers.set(index, player);
    }
    return introVoicePlayers.get(index);
  }

  function preloadIntroVoice(index) {
    getIntroVoice(index);
  }

  function unlockIntroVoice() {
    introVoiceUnlocked = true;
  }

  function playIntroVoice(index) {
    if (state.scene !== 'intro' || !state.sound || !introVoiceUnlocked) return;
    const player = getIntroVoice(index);
    if (!player) return;
    if (introVoiceCurrent === player && !player.paused) return;
    introVoicePlayers.forEach((other, key) => {
      if (key !== index) {
        other.pause();
        other.currentTime = 0;
      }
    });
    introVoiceCurrent = player;
    player.currentTime = 0;
    setBgmDuck(true);
    const playPromise = player.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => setBgmDuck(false));
    preloadIntroVoice(index + 1);
  }

  function stopIntroVoice() {
    introVoicePlayers.forEach((player) => {
      player.pause();
      player.currentTime = 0;
    });
    introVoiceCurrent = null;
    setBgmDuck(false);
  }

  function setIntroSound(enabled, userInitiated = false) {
    state.sound = enabled;
    const introButton = $('#intro-sound');
    if (introButton) {
      introButton.classList.toggle('muted', !enabled);
      introButton.textContent = enabled ? '♪' : '×';
      introButton.setAttribute('aria-pressed', String(enabled));
      introButton.setAttribute('aria-label', enabled ? '关闭声音' : '开启声音');
    }
    const gameButton = $('#game-sound');
    if (gameButton) {
      gameButton.classList.toggle('muted', !enabled);
      gameButton.textContent = enabled ? '♪' : '×';
      gameButton.setAttribute('aria-pressed', String(enabled));
      gameButton.setAttribute('aria-label', enabled ? '关闭背景音乐' : '开启背景音乐');
    }
    const hudButton = $('#sound-toggle');
    if (hudButton) {
      hudButton.classList.toggle('muted', !enabled);
      hudButton.textContent = enabled ? '♪' : '×';
    }
    if (!enabled) {
      stopBgm();
      stopIntroVoice();
    } else if (userInitiated) {
      ensureAudioContext();
      bgm.unlocked = true;
      playBgm(state.scene === 'intro' ? 'intro' : 'game');
      if (state.scene === 'intro') {
        unlockIntroVoice();
        playIntroVoice(introContent);
      }
    }
  }

  // 读到第 20 条时，像收到一条 App 通知一样把玩家叫去果园
  function showIntroNotice() {
    if (state.scene !== 'intro' || introNoticeShown) return;
    introNoticeShown = true;
    const notice = $('#intro-notice');
    if (!notice) return;
    notice.hidden = false;
    notice.classList.remove('is-leaving');
    playNoticeChime();
  }

  function scheduleIntroNotice(delay = 900) {
    clearTimeout(introNoticeTimer);
    if (introNoticeShown) return;
    introNoticeTimer = window.setTimeout(showIntroNotice, delay);
  }

  function hideIntroNotice() {
    clearTimeout(introNoticeTimer);
    const notice = $('#intro-notice');
    if (!notice) return;
    notice.hidden = true;
    notice.classList.remove('is-leaving');
  }

  function introLerp(a, b, k) { return a + (b - a) * k; }

  function introHexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function introMixHex(a, b, k) {
    const from = introHexToRgb(a);
    const to = introHexToRgb(b);
    return `#${from.map((value, index) => Math.round(introLerp(value, to[index], k)).toString(16).padStart(2, '0')).join('')}`;
  }

  // 每次滑动换一条手账；第 5 阶段第 20 条之后继续左滑直接进果园
  function updateIntroNote(index, animate = true) {
    const note = INTRO_NOTES[index];
    if (!note) return;
    const photo = INTRO_NOTE_PHOTOS[index];
    const contentStage = INTRO_CONTENT_STAGES[Math.floor(index / INTRO_PHASE_COUNT)];
    const phase = INTRO_PHASES[index % INTRO_PHASE_COUNT];
    const indexEl = $('#intro-note-index');
    if (indexEl) indexEl.textContent = `${String(index + 1).padStart(2, '0')} / ${INTRO_NOTES.length} · ${phase.label}`;
    const originEl = $('#intro-note-origin');
    if (originEl) originEl.textContent = `产区 · ${INTRO_NOTE_REGIONS[index]}`;
    const stageEl = $('#intro-note-stage');
    if (stageEl) stageEl.textContent = contentStage.label;
    const image = $('#intro-note-image');
    const imageChanged = !!image && image.getAttribute('src') !== photo.src;
    if (imageChanged) {
      image.src = photo.src;
      image.alt = photo.alt;
    }
    if (imageChanged && animate) {
      const figure = $('.intro-note-figure');
      if (figure) {
        figure.classList.remove('is-new-image');
        void figure.offsetWidth;
        figure.classList.add('is-new-image');
      }
    }
    const place = $('#intro-note-place');
    if (place) place.textContent = photo.place;
    const title = $('#intro-note-title');
    if (title) title.textContent = note.title;
    const body = $('#intro-note-body');
    if (body) body.textContent = note.body;
    const tags = $('#intro-note-tags');
    if (tags) {
      tags.replaceChildren(...note.tags.map((tag) => {
        const chip = document.createElement('span');
        chip.textContent = tag;
        return chip;
      }));
    }
    const source = $('#intro-note-source');
    if (source) source.textContent = `来源：${note.source}`;
    const credit = $('#intro-note-credit');
    if (credit) credit.textContent = photo.credit;
    const notes = $('#intro-notes');
    if (notes) {
      notes.dataset.layout = String(index % 4);
      notes.dataset.media = index % 2 === 0 ? 'left' : 'right';
    }
    const card = $('#intro-note-card');
    if (card) {
      card.dataset.phase = phase.id;
      if (animate) {
        card.classList.remove('is-in');
        void card.offsetWidth;
        card.classList.add('is-in');
      }
    }
    preloadIntroVoice(index);
    preloadIntroVoice(index + 1);
    if (introVoiceUnlocked) playIntroVoice(index);
  }

  function updateIntroSubtitle(phaseIndex = introPhase) {
    const phase = INTRO_PHASES[phaseIndex];
    if (!phase) return;
    const subtitle = $('#intro-subtitle-text');
    if (subtitle) subtitle.textContent = `阶段 ${introStage + 1} / 5 · ${phase.subtitle}`;
    const surface = $('#intro-drag-surface');
    if (surface) {
      surface.setAttribute('aria-valuenow', String(introContent));
      surface.setAttribute('aria-valuemax', String(INTRO_LAST_NOTE));
      surface.setAttribute('aria-valuetext', `第 ${introContent + 1} / ${INTRO_NOTES.length} 条 · 阶段 ${introStage + 1} / 5 · ${phase.label}`);
    }
  }

  function setIntroStage(nextStage) {
    const clamped = Math.max(0, Math.min(INTRO_STAGES.length - 1, nextStage));
    if (clamped === introStage) return;
    introStage = clamped;
    const a = $('#intro-orchard-a');
    const b = $('#intro-orchard-b');
    if (!a || !b) return;
    const src = INTRO_STAGES[introStage];
    clearTimeout(introSwapTimer);
    b.src = src;
    const reveal = () => {
      requestAnimationFrame(() => {
        b.style.opacity = '1';
        a.style.opacity = '0';
      });
    };
    if (b.complete && b.naturalWidth) reveal();
    else b.onload = reveal;
    introSwapTimer = window.setTimeout(() => {
      a.src = src;
      a.style.opacity = '1';
      b.style.opacity = '0';
      b.onload = null;
    }, 680);
  }

  function applyPhaseStyle(from, to, k) {
    const stage = $('#intro-stage');
    if (!stage) return;
    stage.style.setProperty('--orchard-tint', introMixHex(from.tint, to.tint, k));
    stage.style.setProperty('--orchard-tint-alpha', introLerp(from.tintAlpha, to.tintAlpha, k).toFixed(3));
    stage.style.setProperty('--sky-b-opacity', k.toFixed(3));
  }

  function finishIntroStep(to) {
    if (!introBusy) return;
    introBusy = false;
    clearTimeout(introSettleTimer);
    const stage = $('#intro-stage');
    const skyA = $('#intro-sky-a');
    if (skyA) skyA.src = to.sky || INTRO_DEFAULT_SKY;
    if (stage) stage.style.setProperty('--sky-b-opacity', '0');
    if (introContent === INTRO_LAST_NOTE) scheduleIntroNotice(700);
    if (introQueue.length) stepIntro(introQueue.shift());
  }

  function stepIntro(direction) {
    if (!direction || state.scene !== 'intro' || introLeaving) return;
    clearTimeout(introNoticeTimer);
    if (introBusy) {
      if (introQueue.length < 19) introQueue.push(direction);
      return;
    }
    const targetIndex = introContent + direction;
    if (targetIndex > INTRO_LAST_NOTE) { showIntroNotice(); return; }
    if (targetIndex < 0) return;

    const from = INTRO_PHASES[introContent % INTRO_PHASE_COUNT];
    const to = INTRO_PHASES[targetIndex % INTRO_PHASE_COUNT];
    introContent = targetIndex;
    introPhase = targetIndex % INTRO_PHASE_COUNT;

    // 走满晨午昏夜、回到清晨时，前景长一阶
    if (direction > 0 && introPhase === 0) {
      const nextStage = targetIndex / INTRO_PHASE_COUNT;
      if (nextStage > introStage) {
        setIntroStage(nextStage);
      }
    }

    updateIntroNote(targetIndex);
    updateIntroSubtitle();
    const stage = $('#intro-stage');
    if (stage) {
      stage.dataset.phase = to.id;
      INTRO_PHASES.forEach((item, index) => stage.classList.toggle(`is-${item.id}`, index === introPhase));
    }
    const skyA = $('#intro-sky-a');
    const skyB = $('#intro-sky-b');
    if (skyA) skyA.src = from.sky || INTRO_DEFAULT_SKY;
    if (skyB) skyB.src = to.sky || INTRO_DEFAULT_SKY;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduceMotion ? 1 : 360;
    const start = performance.now();
    introBusy = true;
    cancelAnimationFrame(introRaf);
    clearTimeout(introSettleTimer);
    // rAF 被后台标签页节流时，用定时器兜底收尾，避免卡在过渡中
    introSettleTimer = window.setTimeout(() => {
      applyPhaseStyle(from, to, 1);
      finishIntroStep(to);
    }, duration + 220);
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      applyPhaseStyle(from, to, progress);
      if (progress < 1) { introRaf = requestAnimationFrame(tick); return; }
      finishIntroStep(to);
    };
    introRaf = requestAnimationFrame(tick);
  }

  const LOADING_MIN_MS = 1200;
  const LOADING_FAILSAFE_MS = 6000;
  let loadingDone = false;
  let loadingStartedAt = 0;
  let loadingFailsafeTimer = 0;

  function setLoadingProgress(loaded, total) {
    const percent = total ? Math.round((loaded / total) * 100) : 100;
    const fill = $('#loading-bar-fill');
    const count = $('#loading-count');
    const progress = $('#loading-progress');
    if (fill) fill.style.width = `${percent}%`;
    if (count) count.textContent = String(percent);
    if (progress) progress.setAttribute('aria-valuenow', String(percent));
  }

  // 介绍页出现后再慢慢补其余照片、生长阶段图和背景音乐，不跟首屏抢带宽
  function startBackgroundPreload() {
    preloadBgm();
    INTRO_NOTE_PHOTOS.slice(3).forEach(({ src }) => {
      const image = new Image();
      image.src = src;
    });
    INTRO_STAGES.slice(1).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  function finishLoading() {
    if (loadingDone) return;
    loadingDone = true;
    clearTimeout(loadingFailsafeTimer);
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minWait = reduceMotion ? 400 : LOADING_MIN_MS;
    const wait = Math.max(0, minWait - (performance.now() - loadingStartedAt));
    const fadeWait = reduceMotion ? 0 : 460;
    window.setTimeout(() => {
      const screen = $('#loading-screen');
      if (!screen) { startBackgroundPreload(); return; }
      screen.classList.add('is-done');
      window.setTimeout(() => {
        screen.hidden = true;
        startBackgroundPreload();
        const surface = $('#intro-drag-surface');
        if (surface) surface.focus({ preventScroll: true });
      }, fadeWait);
    }, wait);
  }

  function startLoading() {
    loadingStartedAt = performance.now();
    const critical = [...new Set([
      ...INTRO_PHASES.map((phase) => phase.sky || INTRO_DEFAULT_SKY),
      INTRO_STAGES[0],
      ...INTRO_NOTE_PHOTOS.slice(0, 3).map((photo) => photo.src),
    ])];
    const total = critical.length;
    let loaded = 0;
    let settled = false;
    setLoadingProgress(0, total);
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(loadingFailsafeTimer);
      finishLoading();
    };
    loadingFailsafeTimer = window.setTimeout(done, LOADING_FAILSAFE_MS);
    if (!total) { done(); return; }
    critical.forEach((src) => {
      let counted = false;
      const image = new Image();
      const step = () => {
        if (counted) return;
        counted = true;
        loaded += 1;
        setLoadingProgress(loaded, total);
        if (loaded >= total) done();
      };
      image.onload = step;
      image.onerror = step;
      image.src = src;
      if (image.complete) step();
    });
  }

  // 状态栏时间跟随现实时间（24 小时制）
  function updateIntroClock() {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const introClock = $('#intro-time');
    if (introClock) introClock.textContent = time;
    const loadingClock = $('#loading-time');
    if (loadingClock) loadingClock.textContent = time;
  }

  function initIntro() {
    introQueue = [];
    introBusy = false;
    introNoticeShown = false;
    introLeaving = false;
    clearTimeout(introSettleTimer);
    clearTimeout(introNoticeTimer);
    introContent = 0;
    introPhase = 0;
    introStage = 0;
    const from = INTRO_PHASES[0];
    const to = INTRO_PHASES[1];
    const stage = $('#intro-stage');
    const skyA = $('#intro-sky-a');
    const skyB = $('#intro-sky-b');
    if (skyA) skyA.src = from.sky || INTRO_DEFAULT_SKY;
    if (skyB) skyB.src = to.sky || INTRO_DEFAULT_SKY;
    applyPhaseStyle(from, to, 0);
    const orchardA = $('#intro-orchard-a');
    const orchardB = $('#intro-orchard-b');
    if (orchardA) { orchardA.src = INTRO_STAGES[0]; orchardA.style.opacity = '1'; }
    if (orchardB) { orchardB.src = INTRO_STAGES[0]; orchardB.style.opacity = '0'; }
    if (stage) {
      stage.dataset.phase = from.id;
      INTRO_PHASES.forEach((item, index) => stage.classList.toggle(`is-${item.id}`, index === 0));
    }
    hideIntroNotice();
    const cue = $('#intro-drag-cue');
    if (cue) cue.classList.remove('is-hidden');
    updateIntroSubtitle(0);
    updateIntroNote(0, false);
  }

  function pauseHook() {
    cancelAnimationFrame(hookFrame);
    hookPhase = 'swing';
    lastSwingSign = 0;
    holdActive = false;
    clearTimeout(holdTimer);
  }

  function resumeHook() {
    cancelAnimationFrame(hookFrame);
    swingClock = 0;
    lastSwingSign = 0;
    hookPhase = 'swing';
    hookFrame = requestAnimationFrame(swingHook);
  }

  function setScene(scene) {
    state.scene = scene;
    $('#intro-scene').hidden = scene !== 'intro';
    $('#pick-scene').hidden = scene !== 'pick';
    $('#make-scene').hidden = scene !== 'make';
    $('#eat-scene').hidden = scene !== 'eat';
    $$('.progress-step').forEach((step) => step.classList.toggle('active', step.dataset.step === scene));
    const copy = { intro: ['第零站 · 陕西名片', '陕西红富士'], pick: ['第一站 · 果园', '摘下今天的好心情'], make: ['第二站 · 小厨房', '调一碗果园甜品'], eat: ['第三站 · 小餐桌', '慢慢吃，每一口都刚刚好'] }[scene];
    $('#scene-kicker').textContent = copy[0]; $('#scene-title').textContent = copy[1];
    if (scene === 'eat' && state.lastDish) {
      $('#scene-kicker').textContent = '第三站 · 小餐桌';
      $('#scene-title').textContent = `慢慢品尝 · ${state.lastDish.name}`;
    }
    const gameSound = $('#game-sound');
    if (gameSound) gameSound.hidden = scene === 'intro';
    playBgm(scene === 'intro' ? 'intro' : 'game');
    if (scene === 'intro') {
      pauseHook();
      requestAnimationFrame(() => $('#intro-drag-surface').focus({ preventScroll: true }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 切换场景：一群苹果从左滚到右，滚到中间时换页
  let appleTransitionBusy = false;
  let appleTransitionFadeTimer = 0;
  let appleTransitionHideTimer = 0;

  function playAppleTransition(onSwitch) {
    if (appleTransitionBusy) return;
    const layer = $('#apple-transition');
    const track = $('#apple-transition-track');
    if (!layer || !track) {
      if (onSwitch) onSwitch();
      return;
    }
    appleTransitionBusy = true;
    track.replaceChildren();
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      const wall = document.createElement('div');
      wall.className = 'apple-transition-wall';
      const addApple = (x, y, size) => {
        const apple = document.createElement('img');
        apple.className = 'apple-transition-fruit';
        apple.src = 'assets/apple.png';
        apple.alt = '';
        apple.draggable = false;
        const spinDuration = 1.2 + Math.random() * 1.2;
        apple.style.setProperty('--x', `${x}%`);
        apple.style.setProperty('--y', `${y}%`);
        apple.style.setProperty('--size', `${size}px`);
        apple.style.setProperty('--spin-duration', `${spinDuration}s`);
        wall.appendChild(apple);
      };
      const baseCols = Math.max(6, Math.round(window.innerWidth / 95));
      const baseRows = Math.max(8, Math.round(window.innerHeight / 95));
      for (let row = 0; row < baseRows; row += 1) {
        for (let col = 0; col < baseCols; col += 1) {
          const jitterX = col === 0 || col === baseCols - 1 ? 0 : (Math.random() - .5) * (100 / baseCols) * .35;
          const jitterY = row === 0 || row === baseRows - 1 ? 0 : (Math.random() - .5) * (100 / baseRows) * .35;
          const x = baseCols === 1 ? 50 : (col / (baseCols - 1)) * 100 + jitterX;
          const y = baseRows === 1 ? 50 : (row / (baseRows - 1)) * 100 + jitterY;
          addApple(x, y, 120 + Math.random() * 120);
        }
      }
      const smallCount = Math.round(baseCols * baseRows * .8);
      for (let i = 0; i < smallCount; i += 1) {
        const size = Math.random() < .25 ? 80 + Math.random() * 50 : 22 + Math.random() * 58;
        addApple(Math.random() * 100, Math.random() * 100, size);
      }
      track.appendChild(wall);
    }
    layer.hidden = false;
    layer.classList.remove('is-active', 'is-leaving');
    void layer.offsetWidth;
    layer.classList.add('is-active');
    clearTimeout(appleTransitionFadeTimer);
    clearTimeout(appleTransitionHideTimer);
    const wallDuration = 900;
    const coverFraction = window.innerWidth / (2 * window.innerWidth + 340);
    const switchDelay = reduceMotion ? 80 : Math.round(wallDuration * coverFraction);
    const fadeDelay = reduceMotion ? 120 : 620;
    const hideDelay = reduceMotion ? 260 : 1000;
    window.setTimeout(() => { if (onSwitch) onSwitch(); }, switchDelay);
    appleTransitionFadeTimer = window.setTimeout(() => layer.classList.add('is-leaving'), fadeDelay);
    appleTransitionHideTimer = window.setTimeout(() => {
      layer.classList.remove('is-active', 'is-leaving');
      layer.hidden = true;
      track.replaceChildren();
      appleTransitionBusy = false;
    }, hideDelay);
  }

  function goToScene(scene, after) {
    playAppleTransition(() => {
      setScene(scene);
      if (after) after();
    });
  }

  // 从介绍页进入摘取：苹果滚过时切场景；套索在隐藏场景里量不到尺寸，切完重新启动摆动
  function enterOrchard() {
    if (state.scene !== 'intro' || introLeaving) return;
    ensureAudioContext();
    bgm.unlocked = true;
    stopIntroVoice();
    introLeaving = true;
    clearTimeout(introNoticeTimer);
    const notice = $('#intro-notice');
    if (notice && !notice.hidden) notice.classList.add('is-leaving');
    playAppleTransition(() => {
      setScene('pick');
      resumeHook();
      if (notice) {
        notice.hidden = true;
        notice.classList.remove('is-leaving');
      }
    });
    window.setTimeout(() => { introLeaving = false; }, 1000);
  }

  function totalBowl() {
    return INGREDIENT_IDS.reduce((sum, id) => sum + state.bowl[id], 0);
  }

  function mixColor(counts) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let total = 0;
    INGREDIENT_IDS.forEach((id) => {
      const count = counts[id];
      if (!count) return;
      const [r, g, b] = INGREDIENTS[id].rgb;
      red += r * count;
      green += g * count;
      blue += b * count;
      total += count;
    });
    if (!total) return null;
    // 往奶油色里提亮一点，让碗里的混合物更像食物而不是纯色块
    return {
      r: Math.round((red / total) * .7 + 250 * .3),
      g: Math.round((green / total) * .7 + 246 * .3),
      b: Math.round((blue / total) * .7 + 226 * .3),
    };
  }

  function mixCss(counts, alpha = 1) {
    const color = mixColor(counts);
    if (!color) return `rgba(255, 248, 230, ${alpha})`;
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }

  function closestRecipe() {
    if (state.bowl.apple < 1) return null;
    const candidates = RECIPES.filter((recipe) => INGREDIENT_IDS.every((id) => (
      id === 'apple' || !recipe.target[id] || state.bowl[id] > 0
    )));
    const bowlTotal = totalBowl();
    const targetTotal = (target) => INGREDIENT_IDS.reduce((sum, id) => sum + (target[id] || 0), 0);
    let best = null;
    candidates.forEach((recipe) => {
      const recipeTotal = targetTotal(recipe.target);
      if (!bowlTotal || !recipeTotal) return;
      let difference = 0;
      INGREDIENT_IDS.forEach((id) => {
        difference += Math.abs(state.bowl[id] / bowlTotal - (recipe.target[id] || 0) / recipeTotal);
      });
      const score = Math.max(0, 1 - difference / 2);
      if (!best || score > best.score) best = { recipe, score };
    });
    return best;
  }

  function renderTally() {
    const tally = $('#bowl-tally');
    const total = totalBowl();
    if (!total) {
      tally.innerHTML = '<span class="bowl-empty-text">碗里还是空的</span>';
      return;
    }
    tally.innerHTML = INGREDIENT_IDS.filter((id) => state.bowl[id] > 0).map((id) => (
      `<button class="tally-chip" type="button" data-remove="${id}" style="--chip:${INGREDIENTS[id].color}" title="取出一份${INGREDIENTS[id].name}"><i></i>${INGREDIENTS[id].name}<b>×${state.bowl[id]}</b></button>`
    )).join('');
  }

  function updateHintHighlight() {
    const closest = closestRecipe();
    const highlight = closest && closest.score >= .6 ? closest.recipe.id : null;
    $$('.recipe-hint').forEach((hint) => hint.classList.toggle('is-closest', hint.dataset.recipe === highlight));
  }

  function renderBowl() {
    const total = totalBowl();
    $$('.ingredient-card').forEach((card) => {
      const count = state.bowl[card.dataset.ingredient];
      card.classList.toggle('has-count', count > 0);
      const badge = card.querySelector('.ingredient-amount');
      if (badge) badge.textContent = count;
    });

    const bits = $('#bowl-bits');
    bits.innerHTML = '';
    let bitIndex = 0;
    INGREDIENT_IDS.forEach((id) => {
      const count = state.bowl[id];
      for (let i = 0; i < count; i += 1) {
        const spot = BIT_SPOTS[bitIndex % BIT_SPOTS.length];
        const piece = document.createElement('img');
        piece.className = 'bowl-ingredient';
        piece.src = `assets/${id}.png`;
        piece.alt = '';
        piece.draggable = false;
        piece.style.setProperty('--x', `${spot[0]}%`);
        piece.style.setProperty('--y', `${spot[1]}%`);
        piece.style.setProperty('--rot', `${((bitIndex * 37) % 50) - 25}deg`);
        piece.style.setProperty('--scale', String(.94 + Math.min(2, count) * .05));
        bits.appendChild(piece);
        bitIndex += 1;
      }
    });

    const soup = $('#bowl-soup');
    soup.style.opacity = total ? String(Math.min(.48, .18 + total * .025)) : '0';
    soup.style.setProperty('--soup-scale', String(Math.min(1, .55 + total * .05)));
    soup.style.background = total
      ? `radial-gradient(ellipse at 50% 72%, ${mixCss(state.bowl, .58)} 0%, ${mixCss(state.bowl, .24)} 56%, transparent 76%)`
      : 'transparent';

    renderTally();
    updateHintHighlight();
    const closest = closestRecipe();
    const nearest = $('#bowl-nearest');
    if (!total) {
      $('#nearest-text').textContent = '先放一个苹果，再加一味调料';
      nearest.classList.remove('is-near');
    } else if (state.bowl.apple < 1) {
      $('#nearest-text').textContent = '还差一个苹果打底';
      nearest.classList.remove('is-near');
    } else if (closest) {
      const percent = Math.round(closest.score * 100);
      $('#nearest-text').textContent = closest.score >= .72
        ? `最接近「${recipeLabel(closest.recipe)}」 · ${percent}%`
        : `自由发挥中 · 最像「${recipeLabel(closest.recipe)}」${percent}%`;
      nearest.classList.toggle('is-near', closest.score >= .72);
    } else {
      $('#nearest-text').textContent = '继续加料，调出你的灵感';
      nearest.classList.remove('is-near');
    }
    $('#bowl-status-text').textContent = total
      ? `碗里有 ${total} 份食材 · 点按配比可取出`
      : '把食材拖进碗里，或点按放入';
    $('#make-action').classList.toggle('ready', state.bowl.apple > 0 && total >= 2);
  }

  function addIngredient(id) {
    if (!INGREDIENTS[id] || state.mixing) return;
    const total = totalBowl();
    if (total >= BOWL_MAX) {
      showToast(`碗装满啦（最多 ${BOWL_MAX} 份），先合成吧`);
      return;
    }
    state.bowl[id] += 1;
    renderBowl();
    playIngredientSound(id);
    playBowlDropSound();
    const note = document.createElement('span');
    note.className = 'float-note';
    note.textContent = `+1 ${INGREDIENTS[id].name}`;
    note.style.left = `${50 + (Math.random() * 14 - 7)}%`;
    note.style.top = `${30 + Math.random() * 9}%`;
    $('#bowl-drop').appendChild(note);
    window.setTimeout(() => note.remove(), 740);
  }

  function removeIngredient(id) {
    if (state.mixing || !state.bowl[id]) return;
    state.bowl[id] -= 1;
    renderBowl();
    playRemoveSound();
  }

  function clearBowl() {
    INGREDIENT_IDS.forEach((id) => { state.bowl[id] = 0; });
    renderBowl();
  }

  // ===== 把碗拖到屏幕下方，倒进垃圾桶 =====
  const bowlDrop = $('#bowl-drop');
  const trashZone = $('#trash-zone');
  let bowlDrag = null;
  let pouring = false;

  function setBowlOffset(x, y) {
    bowlDrop.style.setProperty('--drag-x', `${x}px`);
    bowlDrop.style.setProperty('--drag-y', `${y}px`);
  }

  function trashIsHot(x, y) {
    // 垃圾桶从屏幕下方弹入时有过渡动画，直接量 getBoundingClientRect 会读到
    // 还在屏幕外的位置，所以用固定的底部投放区来判断是否命中。
    const bottomBand = window.innerHeight - Math.max(180, window.innerHeight * .26);
    const halfWidth = Math.min(170, window.innerWidth * .34);
    return y >= bottomBand && Math.abs(x - window.innerWidth / 2) <= halfWidth;
  }

  function startBowlDrag(event) {
    if (pouring || state.mixing || bowlDrag) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const empty = !totalBowl();
    playBowlTap(empty);
    if (empty) return;
    event.preventDefault();
    bowlDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      active: false,
      hot: false,
    };
    bowlDrop.classList.add('is-grabbed');
    try { bowlDrop.setPointerCapture(event.pointerId); } catch (error) { /* 某些环境不支持指针捕获 */ }
  }

  function moveBowlDrag(event) {
    if (!bowlDrag || event.pointerId !== bowlDrag.pointerId) return;
    const dx = event.clientX - bowlDrag.startX;
    const dy = event.clientY - bowlDrag.startY;
    if (!bowlDrag.active) {
      if (Math.hypot(dx, dy) < 7) return;
      bowlDrag.active = true;
    }
    event.preventDefault();
    const x = Math.max(-150, Math.min(150, dx));
    const y = Math.max(-26, Math.min(window.innerHeight * .55, dy));
    bowlDrag.x = x;
    bowlDrag.y = y;
    setBowlOffset(x, y);
    const show = y > 34 || event.clientY > window.innerHeight * .7;
    trashZone.classList.toggle('is-visible', show);
    const hot = show && trashIsHot(event.clientX, event.clientY);
    bowlDrag.hot = hot;
    trashZone.classList.toggle('is-hot', hot);
  }

  function endBowlDrag(event, cancelled = false) {
    if (!bowlDrag || event.pointerId !== bowlDrag.pointerId) return;
    const shouldPour = !cancelled && bowlDrag.active && bowlDrag.hot;
    const wasActive = bowlDrag.active;
    bowlDrag = null;
    bowlDrop.classList.remove('is-grabbed');
    trashZone.classList.remove('is-hot');
    if (!wasActive) {
      setBowlOffset(0, 0);
      trashZone.classList.remove('is-visible');
      return;
    }
    if (shouldPour) {
      pourBowlIntoTrash();
      return;
    }
    trashZone.classList.remove('is-visible');
    bowlDrop.classList.add('is-returning');
    setBowlOffset(0, 0);
    window.setTimeout(() => bowlDrop.classList.remove('is-returning'), 260);
  }

  function spawnPourParticles(counts) {
    const bowlRect = bowlDrop.getBoundingClientRect();
    const can = trashZone.querySelector('.trash-can');
    const target = can ? can.getBoundingClientRect() : trashZone.getBoundingClientRect();
    let index = 0;
    INGREDIENT_IDS.filter((id) => counts[id] > 0).forEach((id) => {
      const amount = Math.min(4, counts[id]);
      for (let i = 0; i < amount; i += 1) {
        const piece = document.createElement('img');
        piece.className = 'pour-piece';
        piece.src = `assets/${id}.png`;
        piece.alt = '';
        piece.draggable = false;
        const startX = bowlRect.left + bowlRect.width * (.34 + Math.random() * .32);
        const startY = bowlRect.top + bowlRect.height * (.44 + Math.random() * .18);
        const endX = target.left + target.width * (.28 + Math.random() * .44);
        const endY = target.top + target.height * (.22 + Math.random() * .4);
        piece.style.left = `${startX}px`;
        piece.style.top = `${startY}px`;
        document.body.appendChild(piece);
        const delay = index * 34;
        index += 1;
        piece.animate([
          { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${(endX - startX) * .45}px), calc(-50% + ${Math.min(40, (endY - startY) * .3)}px)) scale(.96) rotate(${Math.random() * 160 - 80}deg)`,
            opacity: 1,
            offset: .45,
          },
          {
            transform: `translate(calc(-50% + ${endX - startX}px), calc(-50% + ${endY - startY}px)) scale(.55) rotate(${Math.random() * 240 - 120}deg)`,
            opacity: 0,
          },
        ], {
          duration: 520 + Math.random() * 160,
          delay,
          easing: 'cubic-bezier(.34,.02,.72,1)',
          fill: 'forwards',
        });
        window.setTimeout(() => piece.remove(), 1250 + delay);
      }
    });
  }

  function pourBowlIntoTrash() {
    if (pouring) return;
    pouring = true;
    const counts = { ...state.bowl };
    bowlDrop.classList.add('is-pouring');
    trashZone.classList.add('is-visible', 'is-pouring');
    // 等垃圾桶弹入到位再计算落点，避免材料飞向屏幕外
    window.setTimeout(() => spawnPourParticles(counts), 180);
    playTrashPourSound();
    window.setTimeout(() => {
      clearBowl();
      bowlDrop.classList.remove('is-pouring', 'is-returning');
      setBowlOffset(0, 0);
      trashZone.classList.remove('is-visible', 'is-pouring');
      pouring = false;
      showToast('材料都倒进垃圾桶啦');
    }, 820);
  }

  let drag = null;

  function isOverBowl(event) {
    const rect = $('#bowl-drop').getBoundingClientRect();
    return event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8
      && event.clientY >= rect.top - 8 && event.clientY <= rect.bottom + 8;
  }

  function moveGhost(x, y) {
    if (!drag) return;
    drag.ghost.style.left = `${x}px`;
    drag.ghost.style.top = `${y}px`;
  }

  function startDrag(event, card, id) {
    if (drag || state.mixing) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML = `<img src="assets/${id}.png" alt="" draggable="false" /><span>${INGREDIENTS[id].name}</span>`;
    document.body.appendChild(ghost);
    drag = { id, ghost, startX: event.clientX, startY: event.clientY, moved: false, pointerId: event.pointerId };
    card.classList.add('dragging');
    try { card.setPointerCapture(event.pointerId); } catch (error) { /* 某些环境不支持指针捕获 */ }
    moveGhost(event.clientX, event.clientY);
  }

  function handleDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
    moveGhost(event.clientX, event.clientY);
    $('#bowl-drop').classList.toggle('drop-active', isOverBowl(event));
  }

  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { id, moved, ghost } = drag;
    const card = $(`.ingredient-card[data-ingredient="${id}"]`);
    const over = !cancelled && isOverBowl(event);
    ghost.remove();
    if (card) card.classList.remove('dragging');
    $('#bowl-drop').classList.remove('drop-active');
    drag = null;
    if (cancelled) return;
    if (!moved || over) addIngredient(id);
  }

  function renderHints() {
    $('#recipe-hints').innerHTML = HINT_RECIPES.map((recipe, index) => {
      const chips = INGREDIENT_IDS.filter((id) => recipe.target[id]).map((id) => (
        `<span class="hint-chip"><i style="--chip:${INGREDIENTS[id].color}"></i>${INGREDIENTS[id].name}${recipe.target[id]}</span>`
      )).join('');
      const known = recipeKnown(recipe);
      const thumb = known && recipe.image
        ? `<img class="hint-thumb" src="${recipe.image}" alt="" draggable="false" />`
        : `<span class="hint-thumb hint-thumb-locked" aria-hidden="true">?</span>`;
      return `<div class="recipe-hint${known ? '' : ' is-locked'}${thumb ? ' has-thumb' : ''}" data-recipe="${recipe.id}"><span class="hint-index">${String(index + 1).padStart(2, '0')}</span>${thumb}<div><b class="hint-name">${recipeLabel(recipe)}</b><div class="hint-ratio">${chips}</div></div></div>`;
    }).join('');
  }

  function buildDish() {
    const closest = closestRecipe();
    const total = totalBowl();
    if (closest && closest.score >= .72) {
      return { ...closest.recipe, score: closest.score, creative: false };
    }
    const dominant = INGREDIENT_IDS
      .filter((id) => id !== 'apple')
      .sort((a, b) => state.bowl[b] - state.bowl[a])[0];
    const flavor = dominant ? FLAVOR_NOTES[dominant] : '苹果香最突出';
    return {
      id: 'creative',
      name: '果园实验特调',
      score: closest ? closest.score : 0,
      eatClass: dominant === 'water' || total >= 6 ? 'persimmon-jam' : 'apple-pie',
      desc: dominant
        ? `${INGREDIENTS[dominant].name}的味道最抢戏，${flavor}。这一碗只此一份。`
        : '只有苹果也很有态度，清清爽爽的一碗。',
      creative: true,
      closestName: closest ? recipeLabel(closest.recipe) : null,
    };
  }

  function renderResultRatio() {
    $('#mix-result-ratio').innerHTML = INGREDIENT_IDS.filter((id) => state.bowl[id] > 0).map((id) => (
      `<span class="result-chip" style="--chip:${INGREDIENTS[id].color}"><i></i>${INGREDIENTS[id].name} ×${state.bowl[id]}</span>`
    )).join('');
  }

  function showResult(dish) {
    const stars = dish.score >= .95 ? '★★★' : dish.score >= .82 ? '★★☆' : dish.score >= .68 ? '★☆☆' : '☆☆☆';
    const kicker = dish.creative
      ? (dish.closestName ? `创意料理 · 最接近「${dish.closestName}」` : '创意料理 · 自由发挥')
      : dish.score >= .95 ? '黄金配比 · 完美复刻' : dish.score >= .82 ? '很像那么回事 · 配比接近' : '有点意思 · 再调调会更像';
    $('#mix-result-kicker').textContent = kicker;
    $('#mix-result-name').textContent = dish.name;
    $('#mix-result-stars').textContent = stars;
    $('#mix-result-score').textContent = `${Math.round(dish.score * 100)}% 配比`;
    $('#mix-result-desc').textContent = dish.desc;
    $('#result-soup').style.background = `radial-gradient(ellipse at 50% 58%, ${mixCss(state.bowl, .95)} 0%, ${mixCss(state.bowl, .72)} 54%, transparent 78%)`;
    const hasFood = Boolean(dish.image);
    $('#mix-result-badge').classList.toggle('show-food', hasFood);
    $('#mix-result-badge').classList.toggle('show-apple', !hasFood && dish.eatClass === 'fresh-apple');
    if (hasFood) {
      $('#result-food').src = dish.image;
      $('#result-food').alt = dish.name;
    }
    renderResultRatio();
    $('#mix-result').classList.remove('hidden');
    $('#mix-result-card').focus({ preventScroll: true });
  }

  function hideResult() {
    $('#mix-result').classList.add('hidden');
  }

  function updateMakeScene() {
    renderHints();
    renderBowl();
    hideResult();
    $('#make-action').classList.remove('mixing');
    $('#make-action').innerHTML = '合成甜品 <span>→</span>';
    setRecipeOpen(false);
  }

  function synthDish() {
    if (state.mixing) return;
    const total = totalBowl();
    if (state.bowl.apple < 1) { showToast('先放一个苹果打底吧'); return; }
    if (total < 2) { showToast('再加一味调料，才有配比可言'); return; }
    state.mixing = true;
    $('#make-action').classList.add('mixing');
    $('#make-action').innerHTML = '正在合成…';
    $('#bowl-drop').classList.add('is-mixing');
    playSynthStart();
    window.setTimeout(() => {
      state.mixing = false;
      $('#bowl-drop').classList.remove('is-mixing');
      $('#make-action').classList.remove('mixing');
      const dish = buildDish();
      if (!dish.creative && !recipeKnown(dish)) {
        state.madeRecipes[dish.id] = true;
        saveMadeRecipes();
        renderHints();
      }
      state.lastDish = dish;
      state.eatArt = dish.eatClass;
      $('#make-action').innerHTML = '合成甜品 <span>→</span>';
      renderBowl();
      showResult(dish);
      playSynthSuccess();
    }, 900);
  }

  function foodMarkup(dish) {
    if (dish.frames && dish.frames.length) {
      const src = dish.frames[Math.min(dish.frame || 0, dish.frames.length - 1)];
      return `<div class="eaten-food is-frame" role="button" tabindex="0" aria-label="${dish.name}，点击咬一口" style="width:${dish.box.w}px;height:${dish.box.h}px"><img class="food-frame" src="${src}" alt="" draggable="false" /></div>`;
    }
    const imageStyle = dish.image ? ` has-image" style="--dish-img:url('${dish.image}')` : '';
    return `<div class="eaten-food ${dish.eatClass}${imageStyle}" role="button" tabindex="0" aria-label="${dish.name}，点击咬一口"><span></span><i></i><b></b></div>`;
  }

  // 本次做过的甜品都留在桌上，每份各自算咬痕
  function renderTable() {
    const dishes = dishesOnTable();
    plateRow.innerHTML = '';
    plateRow.dataset.count = String(dishes.length || 1);
    dishes.forEach((dish) => {
      const node = document.createElement('div');
      node.className = `dish${dish.bites === 0 ? ' cleared' : ''}`;
      node.dataset.key = dish.key;
      node.innerHTML = `<div class="plate"><div class="food-cut">${foodMarkup(dish)}</div><span class="bite-pop" aria-hidden="true"></span></div><span class="dish-tag">${dish.name}<b>· ${dish.bites === 0 ? '吃完啦' : `${dish.bites}口`}</b></span>`;
      plateRow.appendChild(node);
    });
    updateDishLayout();
    dishes.forEach((dish) => applyBiteMask(dish));
    updateBiteUi();
  }

  function updateBiteUi() {
    const dishes = dishesOnTable();
    const total = dishes.reduce((sum, dish) => sum + (dish.maxBites || BITES_PER_DISH), 0);
    const left = dishes.reduce((sum, dish) => sum + dish.bites, 0);
    $('#bites-left').textContent = left;
    $('#bite-progress-bar').style.width = `${total ? (left / total) * 100 : 0}%`;
    const alive = dishes.filter((dish) => dish.bites > 0);
    if (!dishes.length) $('#bite-hint').textContent = '桌上还没有甜品';
    else if (!left) $('#bite-hint').textContent = '已经全部吃光啦';
    else if (dishes.length === 1) $('#bite-hint').textContent = alive[0].bites === 1 ? '最后一口，慢慢嚼' : '点击盘子里的食物咬一口';
    else $('#bite-hint').textContent = `桌上还有 ${alive.length} 份 · 点哪盘吃哪盘`;
    $('#finish-card').classList.toggle('hidden', !dishes.length || left > 0);
  }

  function addDishToTable(dish, options = {}) {
    if (!dish) return;
    preloadBiteSound(dish.eatClass);
    const silent = Boolean(options.silent);
    const dishes = dishesOnTable();
    const isApple = dish.eatClass === 'fresh-apple';
    const frames = dish.frames || (isApple ? APPLE_FRAMES : null);
    const frameBox = dish.frameBox || (isApple ? APPLE_FRAME_SIZE : null);
    const biteCount = frames ? frames.length - 1 : BITES_PER_DISH;
    dishes.push({
      key: `dish-${++dishSeq}`,
      name: dish.name,
      image: dish.image || '',
      eatClass: ['persimmon-jam', 'fresh-apple'].includes(dish.eatClass) ? dish.eatClass : 'apple-pie',
      frames,
      frame: 0,
      box: frameBox
        ? { ...frameBox }
        : { ...(dish.eatClass === 'persimmon-jam' ? FOOD_SIZE.persimmon : FOOD_SIZE.apple) },
      bites: biteCount,
      maxBites: biteCount,
      marks: [],
      seed: Math.random(),
      rotate: (Math.random() * 2 - 1) * 7,
    });
    renderTable();
    if (silent) return;
    const count = dishes.length;
    $('#scene-title').textContent = count > 1 ? `慢慢品尝 · 桌上有 ${count} 份甜品` : `慢慢品尝 · ${dish.name}`;
    showToast(`「${dish.name}」端上桌啦`);
  }

  function resetTable() {
    state.dishes = [];
    dishSeq = 0;
    plateRow.innerHTML = '';
    plateRow.dataset.count = '1';
    $('#bites-left').textContent = '0';
    $('#bite-progress-bar').style.width = '100%';
    $('#bite-hint').textContent = '点击盘子里的食物咬一口';
    $('#finish-card').classList.add('hidden');
  }

  // 用 SVG 圆形遮罩挖掉食物，形成真正的咬痕
  function applyBiteMask(dish) {
    const node = dishNode(dish);
    if (!node) return;
    const cut = node.querySelector('.food-cut');
    if (dish.frames || !dish.marks.length) {
      cut.style.webkitMaskImage = 'none';
      cut.style.maskImage = 'none';
      return;
    }
    const width = cut.offsetWidth;
    const height = cut.offsetHeight;
    const holes = dish.marks
      .map((mark) => `<circle cx="${mark.x.toFixed(1)}" cy="${mark.y.toFixed(1)}" r="${mark.r.toFixed(1)}" fill="#000"/>`)
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="bite" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff"/>${holes}</mask></defs><rect width="${width}" height="${height}" fill="#000" mask="url(#bite)"/></svg>`;
    const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    cut.style.webkitMaskImage = mask;
    cut.style.maskImage = mask;
  }

  function showBitePop(node, x, y, scale) {
    const pop = node.querySelector('.bite-pop');
    if (!pop) return;
    const cutRect = node.querySelector('.food-cut').getBoundingClientRect();
    const plateRect = node.querySelector('.plate').getBoundingClientRect();
    const size = 20 * scale;
    pop.style.left = `${cutRect.left - plateRect.left + x * scale}px`;
    pop.style.top = `${cutRect.top - plateRect.top + y * scale}px`;
    pop.style.width = pop.style.height = `${size}px`;
    pop.style.marginLeft = pop.style.marginTop = `${-size / 2}px`;
    pop.classList.remove('pop');
    void pop.offsetWidth;
    pop.classList.add('pop');
  }

  function takeBite(dish, event) {
    if (!dish || dish.bites <= 0) return;
    const node = dishNode(dish);
    if (!node) return;
    const cut = node.querySelector('.food-cut');
    const { w, h } = boxOfDish(dish);
    const rect = cut.getBoundingClientRect();
    const scale = rect.width / (cut.offsetWidth || 1);
    let x = BITE_PAD + w / 2;
    let y = BITE_PAD + h / 2;
    if (event && typeof event.clientX === 'number' && event.clientX) {
      x = (event.clientX - rect.left) / scale;
      y = (event.clientY - rect.top) / scale;
    }
    const clampX = (value) => Math.max(BITE_PAD + 3, Math.min(BITE_PAD + w - 3, value));
    const clampY = (value) => Math.max(BITE_PAD + 3, Math.min(BITE_PAD + h - 3, value));
    x = clampX(x);
    y = clampY(y);

    if (dish.frames && dish.frames.length) {
      // 苹果这类菜：一次点击播放下一帧，直到果核
      dish.frame = Math.min(dish.frames.length - 1, (dish.frame || 0) + 1);
      dish.bites -= 1;
      // 直接换掉 <img> 节点，避免个别浏览器缓存/延迟重绘导致画面不更新
      const oldImg = node.querySelector('.food-frame');
      if (oldImg) {
        const fresh = document.createElement('img');
        fresh.className = 'food-frame';
        fresh.alt = '';
        fresh.draggable = false;
        fresh.src = dish.frames[dish.frame];
        oldImg.replaceWith(fresh);
      }
    } else {
      // 同一位置连点两次时错开一点，保证每口都看得见
      dish.marks.forEach((mark) => {
        if (Math.hypot(x - mark.x, y - mark.y) < 13) { x += 16; y += 8; }
      });
      x = clampX(x);
      y = clampY(y);
      dish.marks.push({ x, y, r: 17 });
      dish.bites -= 1;
      applyBiteMask(dish);
    }

    showBitePop(node, x, y, scale);
    cut.classList.remove('chomping');
    void cut.offsetWidth;
    cut.classList.add('chomping');
    playBiteSound(dish, (dish.maxBites || 1) - dish.bites);

    const tag = node.querySelector('.dish-tag b');
    if (tag) tag.textContent = `· ${dish.bites === 0 ? '吃完啦' : `${dish.bites}口`}`;
    if (dish.bites === 0) node.classList.add('cleared');
    const wasAllDone = dishesOnTable().every((item) => item.bites === 0);
    updateBiteUi();
    if (wasAllDone) showToast('嗯！一口不剩，太棒啦');
  }

  function setRecipeOpen(open) {
    if (open) renderHints();
    $('#recipe-book').classList.toggle('open', open);
    $('#recipe-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    const backdrop = $('#recipe-backdrop');
    if (backdrop) backdrop.classList.toggle('is-open', open);
  }

  $$('.ingredient-card').forEach((card) => {
    card.addEventListener('pointerdown', (event) => startDrag(event, card, card.dataset.ingredient));
    card.addEventListener('pointermove', handleDragMove);
    card.addEventListener('pointerup', (event) => endDrag(event));
    card.addEventListener('pointercancel', (event) => endDrag(event, true));
  });
  bowlDrop.addEventListener('pointerdown', startBowlDrag);
  bowlDrop.addEventListener('pointermove', moveBowlDrag);
  bowlDrop.addEventListener('pointerup', (event) => endBowlDrag(event));
  bowlDrop.addEventListener('pointercancel', (event) => endBowlDrag(event, true));
  $('#bowl-tally').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove]');
    if (chip) removeIngredient(chip.dataset.remove);
  });
  $('#make-action').addEventListener('click', synthDish);
  $('#clear-bowl').addEventListener('click', () => {
    if (!totalBowl()) { showToast('碗里还是空的'); return; }
    clearBowl();
    playTrashPourSound(true);
    showToast('碗已经清空，重新调配吧');
  });
  $('#recipe-toggle').addEventListener('click', () => {
    setRecipeOpen(!$('#recipe-book').classList.contains('open'));
  });
  document.addEventListener('pointerdown', (event) => {
    if (!$('#recipe-book').classList.contains('open')) return;
    if (event.target.closest('#recipe-book') || event.target.closest('#recipe-toggle')) return;
    setRecipeOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.scene === 'intro') { enterOrchard(); return; }
    if (event.key !== 'Escape') return;
    if (!$('#mix-result').classList.contains('hidden')) { hideResult(); return; }
    if ($('#recipe-book').classList.contains('open')) setRecipeOpen(false);
  });
  $('#mix-result-close').addEventListener('click', hideResult);
  $('#mix-result-backdrop').addEventListener('click', hideResult);
  $('#mix-again').addEventListener('click', () => {
    const dish = state.lastDish;
    if (dish) addDishToTable(dish, { silent: true });
    hideResult();
    clearBowl();
    showToast(dish ? `「${dish.name}」已留在餐桌上，再调一碗吧` : '碗已经清空，重新调配吧');
  });
  $('#serve-dish').addEventListener('click', () => {
    hideResult();
    goToScene('eat', () => {
      addDishToTable(state.lastDish);
      showToast(`「${state.lastDish ? state.lastDish.name : '甜品'}」端上桌啦！`);
    });
  });

  $$('.fruit-tab').forEach((tab) => tab.addEventListener('click', () => setFruit(tab.dataset.fruit)));
  $('#intro-skip').addEventListener('click', enterOrchard);
  $('#intro-notice').addEventListener('click', enterOrchard);
  const introSound = $('#intro-sound');
  if (introSound) {
    introSound.addEventListener('click', () => setIntroSound(!state.sound, true));
  }
  const gameSound = $('#game-sound');
  if (gameSound) {
    gameSound.addEventListener('click', () => setIntroSound(!state.sound, true));
  }
  setIntroSound(state.sound);

  const introSurface = $('#intro-drag-surface');
  const hideIntroCue = () => { const cue = $('#intro-drag-cue'); if (cue) cue.classList.add('is-hidden'); };

  introSurface.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    ensureAudioContext();
    unlockBgm();
    unlockIntroVoice();
    introDrag = { id: event.pointerId, startX: event.clientX };
    try { introSurface.setPointerCapture(event.pointerId); } catch (error) { /* 某些环境不支持指针捕获 */ }
    introSurface.classList.add('is-dragging');
    hideIntroCue();
    introSurface.focus({ preventScroll: true });
    event.preventDefault();
  });
  introSurface.addEventListener('pointerup', (event) => {
    if (!introDrag || event.pointerId !== introDrag.id) return;
    const dx = event.clientX - introDrag.startX;
    introDrag = null;
    introSurface.classList.remove('is-dragging');
    if (Math.abs(dx) >= 30) stepIntro(dx < 0 ? 1 : -1);
    else playIntroVoice(introContent);
  });
  introSurface.addEventListener('pointercancel', () => {
    introDrag = null;
    introSurface.classList.remove('is-dragging');
  });
  introSurface.addEventListener('keydown', (event) => {
    ensureAudioContext();
    unlockBgm();
    unlockIntroVoice();
    let direction = 0;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') direction = 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') direction = -1;
    if (!direction) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playIntroVoice(introContent);
      }
      return;
    }
    hideIntroCue();
    event.preventDefault();
    stepIntro(direction);
  });

  initIntro();
  startLoading();
  updateIntroClock();
  window.setInterval(updateIntroClock, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ['intro', 'game'].forEach((name) => {
        if (bgm[name]) bgm[name].pause();
      });
      introVoicePlayers.forEach((player) => player.pause());
      setBgmDuck(false);
      return;
    }
    updateIntroClock();
    if (state.sound && bgm.unlocked && bgm.current) playBgm(bgm.current);
  });

  $('#to-make').addEventListener('click', () => goToScene('make', updateMakeScene));
  $('#back-to-pick').addEventListener('click', () => goToScene('pick'));
  $('#back-to-make').addEventListener('click', () => goToScene('make', updateMakeScene));
  plateRow.addEventListener('pointerdown', (event) => {
    const cut = event.target.closest('.food-cut');
    if (!cut) return;
    event.preventDefault();
    const node = cut.closest('.dish');
    takeBite(dishesOnTable().find((item) => item.key === node.dataset.key), event);
  });
  plateRow.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cut = event.target.closest('.food-cut');
    if (!cut) return;
    event.preventDefault();
    const node = cut.closest('.dish');
    takeBite(dishesOnTable().find((item) => item.key === node.dataset.key), null);
  });
  $('#restart-eat').addEventListener('click', () => {
    resetTable();
    goToScene('make', updateMakeScene);
  });
  $('#sound-toggle').addEventListener('click', () => setIntroSound(!state.sound, true));
  $('#reset-game').addEventListener('click', () => {
    if (!window.confirm('要从第一站重新开始吗？')) return;
    try { localStorage.removeItem(MADE_RECIPES_KEY); } catch (error) {}
    window.location.reload();
  });

  setFruit('apple');
  renderAppleTree();
  updateInventory();
  updateStageScale();
  // 预加载苹果的逐帧图，点击时立刻切换
  APPLE_FRAMES.forEach((src) => { const img = new Image(); img.src = src; });
  window.addEventListener('resize', updateStageScale);
  hookFrame = requestAnimationFrame(swingHook);
})();

