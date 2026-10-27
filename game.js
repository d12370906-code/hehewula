const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ---------- 圖片載入與 GitHub Pages 全面相容機制 ---------- */
// 收集未找到的圖片，以便在畫面上即時提示排查
const failedImages = [];

function loadSmartImage(nameOptions) {
  const img = new Image();
  let candidateIndex = 0;

  // 自動產生所有可能的存放路徑（支援 ./images/、images/、大寫 ./Images/、根目錄 ./ 以及各大小寫變體）
  const candidates = [];
  nameOptions.forEach(name => {
    candidates.push(`./images/${name}`);
    candidates.push(`images/${name}`);
    candidates.push(`./Images/${name}`);
    candidates.push(`./${name}`);
  });

  function tryNext() {
    if (candidateIndex < candidates.length) {
      const nextSrc = candidates[candidateIndex++];
      img.src = nextSrc;
    } else {
      console.warn(`[圖片載入失敗] 嘗試了以下路徑皆找不到圖片:`, candidates);
      if (!failedImages.includes(nameOptions[0])) {
        failedImages.push(nameOptions[0]);
      }
    }
  }

  img.addEventListener("error", tryNext);
  tryNext();
  return img;
}

// 支援所有檔名與大小寫組合
const bgImg = loadSmartImage(["bg.PNG", "bg.png", "BG.png", "BG.PNG"]);
const playerImg = loadSmartImage(["player.png", "Player.png"]);
const slimeImg = loadSmartImage(["Slime.png", "slime.png"]);
const ironSlimeImg = loadSmartImage(["ironslime.png", "ironSlime.png", "IronSlime.png"]);
const goblinImg = loadSmartImage(["Goblin.png", "goblin.png"]);
const bossImg = loadSmartImage(["boss.png", "Boss.png"]);
const ballImg = loadSmartImage(["ball.png", "Ball.png"]);

const allImages = [bgImg, playerImg, slimeImg, ironSlimeImg, goblinImg, bossImg, ballImg];

/* ---------- 玩家 ---------- */
const player = {
  x: 220,
  y: 520,
  w: 40,
  h: 40,
  speed: 5 * 0.3,
  hp: 5,
  shootCooldown: 0
};

/* ---------- 狀態 ---------- */
let boss = null;
let bossSpawned = false;

/* ---------- 鍵盤 ---------- */
const keys = {};
document.addEventListener("keydown", e => {
  // 防止捲動頁面
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;
  if (e.key === " ") shoot();
});
document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

/* ---------- 物件 ---------- */
const enemies = [];
const playerBullets = [];
const enemyBullets = [];

/* ---------- 工具 ---------- */
function randomSpeed() {
  return (Math.random() * 2 - 1) * 1.5 * 0.3;
}

function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.size > b.x &&
    a.y < b.y + b.h &&
    a.y + a.size > b.y
  );
}

function hitPlayer(b) {
  return (
    b.x < player.x + player.w &&
    b.x + b.size > player.x &&
    b.y < player.y + player.h &&
    b.y + b.size > player.y
  );
}

/* ---------- 敵人 ---------- */
function createEnemy(x, y, img) {
  return {
    x, y, w: 40, h: 40,
    img,
    vx: randomSpeed(),
    vy: randomSpeed(),
    moveTimer: 0,
    shootTimer: Math.floor(Math.random() * 50), // 隨機錯開起步時間，讓彈幕更有節奏感
    hp: img === ironSlimeImg ? 3 : img === goblinImg ? 2 : 1
  };
}

enemies.push(
  createEnemy(50, 50, slimeImg),
  createEnemy(150, 50, slimeImg),
  createEnemy(250, 50, ironSlimeImg),
  createEnemy(350, 50, ironSlimeImg),
  createEnemy(200, 120, goblinImg)
);

/* ---------- Boss ---------- */
function spawnBoss() {
  boss = {
    x: 200,
    y: 60,
    w: 80,
    h: 80,
    hp: 20,
    maxHp: 20,
    // 提高隨機性：水平與垂直速度 + 平滑過渡目標
    vx: 1.2 * 0.3,
    vy: 0.5 * 0.3,
    targetVx: 1.2 * 0.3,
    targetVy: 0.5 * 0.3,
    moveTimer: 0,
    changeInterval: 45,
    shootTimer: 0,
    // 血量低於 50% 全螢幕散射技能狀態
    specialTimer: 0,
    specialCooldown: 180,
    isCharging: false
  };
  bossSpawned = true;
}

/* 發動全螢幕散射（留 1~2 個較大縫隙） */
function bossSpreadAttack() {
  if (!boss) return;

  const totalBullets = 20;
  const startAngle = Math.PI * 0.1; // 約 18 度（往右下方）
  const endAngle = Math.PI * 0.9;   // 約 162 度（往左下方）
  const originX = boss.x + boss.w / 2;
  const originY = boss.y + boss.h / 2;
  const bulletSpeed = 4 * 0.3;

  // 隨機決定留下 1 個還是 2 個縫隙
  const gapCount = Math.random() < 0.5 ? 1 : 2;
  const gaps = new Set();

  if (gapCount === 1) {
    // 留下 1 個超寬安全縫隙（跳過連續 4 顆子彈，通道寬度擴大至約 200px，極易反應閃避）
    const g = 4 + Math.floor(Math.random() * 8); // 4 ~ 11
    gaps.add(g);
    gaps.add(g + 1);
    gaps.add(g + 2);
    gaps.add(g + 3);
  } else {
    // 留下 2 個加大縫隙（左右各一區，各跳過連續 3 顆子彈，通道寬度擴大至約 155px）
    const g1 = 3 + Math.floor(Math.random() * 4); // 3 ~ 6
    const g2 = 11 + Math.floor(Math.random() * 4); // 11 ~ 14
    gaps.add(g1);
    gaps.add(g1 + 1);
    gaps.add(g1 + 2);
    gaps.add(g2);
    gaps.add(g2 + 1);
    gaps.add(g2 + 2);
  }

  for (let i = 0; i < totalBullets; i++) {
    if (gaps.has(i)) continue; // 留給玩家躲避的大縫隙！

    const angle = startAngle + (i * (endAngle - startAngle)) / (totalBullets - 1);
    enemyBullets.push({
      x: originX - 6,
      y: originY - 6,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      size: 13,
      isSpecial: true // 特殊全螢幕技能子彈
    });
  }
}

/* ---------- 清空子彈 ---------- */
function clearBullets() {
  playerBullets.length = 0;
  enemyBullets.length = 0;
}

/* ---------- 射擊 ---------- */
function shoot() {
  // 遊戲結束時（失敗或勝利）不發射子彈
  if (player.hp <= 0 || (!boss && bossSpawned)) return;
  if (player.shootCooldown > 0) return;

  playerBullets.push({
    x: player.x + player.w / 2 - 5,
    y: player.y,
    size: 10,
    speed: 7 * 0.3
  });

  // 射速加快一倍：CD 由原本的 (15 / 0.3 = 50) 減半為 25
  player.shootCooldown = (15 / 0.3) / 2;
}

/* ---------- 更新 ---------- */
function update() {
  // 遊戲結束時（玩家死亡或 Boss 擊破勝利）清空子彈並結束更新
  if (player.hp <= 0 || (!boss && bossSpawned)) {
    clearBullets();
    return;
  }

  /* 玩家移動（左右 + 上下，支援箭頭鍵與 WASD） */
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.x += player.speed;
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) player.y += player.speed;

  // 限制在畫布範圍（上方保留 40px 避開血條與 UI）
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(40, Math.min(canvas.height - player.h, player.y));

  // 持續射擊（按住空白鍵亦可連續開火）
  if (keys[" "]) shoot();
  if (player.shootCooldown > 0) player.shootCooldown--;

  /* 玩家子彈 */
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.y -= b.speed;
    if (b.y < -20) playerBullets.splice(i, 1);
  }

  /* 一般敵人 */
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    e.x += e.vx;
    e.y += e.vy;
    e.moveTimer++;

    if (e.x <= 0 || e.x + e.w >= canvas.width) e.vx *= -1;
    if (e.y <= 0 || e.y + e.h >= 300) e.vy *= -1;

    if (e.moveTimer > 60) {
      e.vx = randomSpeed();
      e.vy = randomSpeed();
      e.moveTimer = 0;
    }

    // 怪物射速提升至三倍（冷卻時間由原本 90/0.3 降為 (90/0.3)/3 = 100 幀）
    e.shootTimer++;
    if (e.shootTimer > (90 / 0.3) / 3) {
      enemyBullets.push({
        x: e.x + e.w / 2 - 5,
        y: e.y + e.h,
        size: 10,
        speed: 4 * 0.3
      });
      e.shootTimer = 0;
    }

    for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
      if (hit(playerBullets[bi], e)) {
        playerBullets.splice(bi, 1);
        e.hp--;
        if (e.hp <= 0) enemies.splice(ei, 1);
        break;
      }
    }
  }

  /* 生成 Boss */
  if (enemies.length === 0 && !bossSpawned) spawnBoss();

  /* Boss 行為 */
  if (boss) {
    // 1. 活動隨機性增強：定時隨機變更移動方向與速度
    boss.moveTimer++;
    if (boss.moveTimer > boss.changeInterval) {
      boss.moveTimer = 0;
      boss.changeInterval = 35 + Math.random() * 45; // 隨機更換間隔

      // 水平速度隨機化（方向隨機、速度變化）
      const hSpeed = (0.7 + Math.random() * 1.5) * 0.3;
      boss.targetVx = (Math.random() < 0.5 ? 1 : -1) * hSpeed;

      // 垂直速度隨機化（在高度 30~200 之間遊走）
      const vSpeed = (0.4 + Math.random() * 1.0) * 0.3;
      boss.targetVy = (Math.random() < 0.5 ? 1 : -1) * vSpeed;
    }

    // 慣性平滑移動
    boss.vx += (boss.targetVx - boss.vx) * 0.08;
    boss.vy += (boss.targetVy - boss.vy) * 0.08;
    boss.x += boss.vx;
    boss.y += boss.vy;

    // 水平牆面碰撞彈回
    if (boss.x <= 10) {
      boss.x = 10;
      boss.vx = Math.abs(boss.vx);
      boss.targetVx = Math.abs(boss.targetVx);
    } else if (boss.x + boss.w >= canvas.width - 10) {
      boss.x = canvas.width - boss.w - 10;
      boss.vx = -Math.abs(boss.vx);
      boss.targetVx = -Math.abs(boss.targetVx);
    }

    // 垂直高度區間限制 (30 ~ 200px)
    if (boss.y <= 30) {
      boss.y = 30;
      boss.vy = Math.abs(boss.vy);
      boss.targetVy = Math.abs(boss.targetVy);
    } else if (boss.y + boss.h >= 220) {
      boss.y = 220 - boss.h;
      boss.vy = -Math.abs(boss.vy);
      boss.targetVy = -Math.abs(boss.targetVy);
    }

    // 2. 常規射擊（蓄力中暫停常規射擊以利躲避）
    if (!boss.isCharging) {
      boss.shootTimer++;
      if (boss.shootTimer > (60 / 0.3) / 2) {
        enemyBullets.push({
          x: boss.x + boss.w * 0.25 - 6,
          y: boss.y + boss.h,
          size: 12,
          speed: 5 * 0.3
        });

        enemyBullets.push({
          x: boss.x + boss.w * 0.75 - 6,
          y: boss.y + boss.h,
          size: 12,
          speed: 5 * 0.3
        });

        boss.shootTimer = 0;
      }
    }

    // 3. 血量低於 50% 發動全螢幕散射技能
    if (boss.hp <= boss.maxHp * 0.5) {
      boss.specialTimer++;

      // 施法前約 0.6 秒蓄力警告提示
      if (boss.specialTimer >= boss.specialCooldown - 35) {
        boss.isCharging = true;
      }

      // 蓄力完成，發動全螢幕散射
      if (boss.specialTimer >= boss.specialCooldown) {
        bossSpreadAttack();
        boss.isCharging = false;
        boss.specialTimer = 0;
        boss.specialCooldown = 160 + Math.random() * 50; // 下次技能間隔
      }
    }

    // 擊中 Boss 判定
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      if (hit(playerBullets[i], boss)) {
        playerBullets.splice(i, 1);
        boss.hp--;
        if (boss.hp <= 0) {
          boss = null;
          clearBullets(); // Boss 擊破通關，立即清空所有子彈
          break;
        }
        break;
      }
    }
  }

  /* 敵人子彈（支援向量運動與垂直運動） */
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];

    if (b.vx !== undefined && b.vy !== undefined) {
      b.x += b.vx;
      b.y += b.vy;
    } else {
      b.y += b.speed;
    }

    // 超出畫布移除
    if (b.y > canvas.height + 30 || b.y < -30 || b.x < -30 || b.x > canvas.width + 30) {
      enemyBullets.splice(i, 1);
      continue;
    }

    // 擊中玩家判定
    if (hitPlayer(b)) {
      enemyBullets.splice(i, 1);
      player.hp--;
      if (player.hp <= 0) {
        clearBullets(); // 玩家死亡遊戲結束，立即清空所有子彈
      }
    }
  }
}

/* ---------- 繪製 ---------- */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景繪製（載入完成時繪製圖片，未完成時提供深色背景保底）
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#0c0d14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 玩家
  if (playerImg.complete && playerImg.naturalWidth > 0) {
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = "#00ddff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // 一般敵人
  enemies.forEach(e => {
    if (e.img.complete && e.img.naturalWidth > 0) {
      ctx.drawImage(e.img, e.x, e.y, e.w, e.h);
    } else {
      ctx.fillStyle = "#44cc44";
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
  });

  if (boss) {
    // Boss 蓄力特效（發光光暈與蓄力波紋）
    if (boss.isCharging) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
      ctx.lineWidth = 3;
      const pulse = 10 + Math.sin(Date.now() / 60) * 6;
      ctx.beginPath();
      ctx.arc(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.w / 2 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 繪製 Boss
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      if (boss.hp <= boss.maxHp * 0.5) {
        ctx.save();
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 12;
        ctx.drawImage(bossImg, boss.x, boss.y, boss.w, boss.h);
        ctx.restore();
      } else {
        ctx.drawImage(bossImg, boss.x, boss.y, boss.w, boss.h);
      }
    } else {
      ctx.fillStyle = "#cc2255";
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }
  }

  // 玩家子彈繪製
  playerBullets.forEach(b => {
    if (ballImg.complete && ballImg.naturalWidth > 0) {
      ctx.drawImage(ballImg, b.x, b.y, b.size, b.size);
    } else {
      ctx.fillStyle = "#ffff55";
      ctx.beginPath();
      ctx.arc(b.x + b.size / 2, b.y + b.size / 2, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 敵人子彈繪製（全螢幕技能子彈帶有紅色危險光暈）
  enemyBullets.forEach(b => {
    if (ballImg.complete && ballImg.naturalWidth > 0) {
      if (b.isSpecial) {
        ctx.save();
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 10;
        ctx.drawImage(ballImg, b.x, b.y, b.size, b.size);
        ctx.restore();
      } else {
        ctx.drawImage(ballImg, b.x, b.y, b.size, b.size);
      }
    } else {
      ctx.fillStyle = b.isSpecial ? "#ff0055" : "#ff8800";
      ctx.beginPath();
      ctx.arc(b.x + b.size / 2, b.y + b.size / 2, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // UI：玩家血量
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`HP: ${player.hp}`, 10, 25);

  /* Boss 血條與警告文字 */
  if (boss) {
    const isEnraged = boss.hp <= boss.maxHp * 0.5;
    ctx.fillStyle = isEnraged ? "#ff1a40" : "red";
    ctx.fillRect(100, 10, 280 * (boss.hp / boss.maxHp), 14);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(100, 10, 280, 14);

    // 狂暴提示
    if (isEnraged) {
      ctx.fillStyle = "#ff6677";
      ctx.font = "12px Arial";
      ctx.fillText("BOSS ENRAGED (狂暴)", 185, 22);
    }

    // 技能蓄力警告
    if (boss.isCharging) {
      ctx.fillStyle = "#ffdd00";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ 全螢幕散射警告！找縫隙閃避！ ⚠️", canvas.width / 2, 50);
      ctx.textAlign = "start";
    }
  }

  // 圖片載入失敗診斷提示（在 GitHub 缺漏圖片時即時回報）
  if (failedImages.length > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(10, canvas.height - 65, canvas.width - 20, 55);
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, canvas.height - 65, canvas.width - 20, 55);
    ctx.fillStyle = "#ff6666";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("⚠️ 圖片 404 載入失敗: " + failedImages.slice(0, 3).join(", "), canvas.width / 2, canvas.height - 42);
    ctx.fillStyle = "#dddddd";
    ctx.font = "12px Arial";
    ctx.fillText("請確認 GitHub 儲存庫內是否有成功上傳 images 資料夾", canvas.width / 2, canvas.height - 20);
    ctx.restore();
  }
}

/* ---------- 主迴圈與載入啟動 ---------- */
let gameStarted = false;

function tryStartGame() {
  if (gameStarted) return;
  const allReady = allImages.every(img => img.complete);
  if (allReady) {
    gameStarted = true;
    requestAnimationFrame(loop);
  }
}

// 監聽圖片載入完成，支援快取與網路非同步加載
allImages.forEach(img => {
  img.addEventListener("load", tryStartGame);
  img.addEventListener("error", () => {
    // 遇到錯誤重試 fallback，保底也能啟動
    setTimeout(tryStartGame, 150);
  });
});

// 若所有圖片在快取中已就緒，立即啟動
tryStartGame();

// 設置 1 秒超時保底啟動（避免極端網路狀況下畫面卡死）
setTimeout(() => {
  if (!gameStarted) {
    gameStarted = true;
    requestAnimationFrame(loop);
  }
}, 1000);

function loop() {
  const isGameOver = player.hp <= 0;
  const isGameWin = !boss && bossSpawned;

  if (isGameOver || isGameWin) {
    clearBullets();
  } else {
    update();
  }

  draw();
  requestAnimationFrame(loop);
}
