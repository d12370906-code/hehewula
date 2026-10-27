# Canvas 射擊遊戲 (Canvas Shooting Game)

這是一款使用原生 HTML5 Canvas 與 JavaScript 開發的 2D 縱向彈幕射擊遊戲。

## 🎮 操作方式

* **移動**：方向鍵 `↑` `↓` `←` `→` 或 `W` `A` `S` `D`
* **射擊**：`空白鍵 (Space)`（可持續按住進行高速連射）

## 🚀 部署至 GitHub Pages 步驟

1. **建立 GitHub 儲存庫（Repository）**
   * 前往 [GitHub](https://github.com/) 點選 **New repository**。
   * 輸入儲存庫名稱（如 `canvas-shooting-game`），設為 Public，點擊 **Create repository**。

2. **推動程式碼到 GitHub**
   在專案資料夾下開啟終端機（Terminal / Git Bash），執行：
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for canvas shooting game"
   git branch -M main
   git remote add origin https://github.com/<你的使用者名稱>/<你的儲存庫名稱>.git
   git push -u origin main
   ```

3. **啟用 GitHub Pages**
   * 進入該 GitHub 儲存庫頁面，點選上方 **Settings**。
   * 在左側選單點選 **Pages**。
   * 在 **Build and deployment** > **Source** 選擇 **Deploy from a branch**。
   * 在 **Branch** 選取 `main`，資料夾維持 `/ (root)`，按下 **Save**。
   * 等待約 1~2 分鐘後，即可在上方看到您的線上遊戲網址：
     `https://<你的使用者名稱>.github.io/<你的儲存庫名稱>/`

## 🛠️ GitHub Pages 相容性適配說明

* **檔名大小寫容錯**：Linux 伺服器對大小寫敏感（如 `bg.PNG`、`Slime.png`、`Goblin.png`），程式碼已加入雙向 Fallback 容錯機制，無論 Git 大小寫如何上傳均可正常讀取。
* **相對路徑適配**：全面採用 `./images/...`，支援在自訂 Repo 子目錄下直接載入。
* **非同步圖片預載入**：加入網路非同步載入偵測與繪製保底機制，即使在行動網路下也不會卡死黑畫面。
