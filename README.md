# English Master AI

AI 英語學習平台：AI 字典、AI Reading、AI Translator、My Learning。

## 本機運行

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## Vercel 部署

1. 上載整個專案到 GitHub
2. Vercel Import Project
3. Framework 選 Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`

## GitHub Pages 部署

1. 執行 `npm run build`
2. 將 `dist` 內容部署到 GitHub Pages

如 repo 不是根目錄，可在 `vite.config.js` 修改 `base`。

## AI 設定

在 My Learning 頁面可選 OpenAI / Gemini，並輸入 API Key。前端保存 API Key 只適合個人測試；正式產品建議改用後端 API Proxy，避免 key 外洩。

## Randomization Upgrade

This version adds stronger AI variation:

- 250+ daily-life scenario bank inside `api/ai.js`
- Random Seed sent from the frontend for every generation
- Higher temperature: Scenario / Roleplay 1.2, Reading 1.1
- Anti-repetition instruction: "Do not generate similar content to previous outputs"
- Recent generated titles are sent to the backend to reduce repeated output

Optional Vercel Environment Variable:

```txt
AI_TEMPERATURE=1.2
```

If omitted, the backend uses task-based defaults automatically.
