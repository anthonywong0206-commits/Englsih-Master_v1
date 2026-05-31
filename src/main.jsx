import React, { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, Languages, Newspaper, UserRound, Sparkles, Download, Image as ImageIcon, Moon, Sun, Save, Wand2, Upload, Trash2, Phone, Utensils, ShoppingBag, Plane, Briefcase, MoreHorizontal, Volume2, Mic, Play, RefreshCw, GraduationCap, Lightbulb, MessageCircle, Headphones, Home } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './styles.css'

const STORAGE = {
  words: 'ema_saved_words_v2',
  readings: 'ema_readings_v2',
  scenarios: 'ema_scenarios_v1',
  settings: 'ema_settings_v2',
  stats: 'ema_stats_v2'
}

const defaultSettings = { theme: 'light' }
const SCENARIOS = [
  { id: 'phone', icon: Phone, title: '電話對答', en: 'Phone Call', role: 'Receptionist', prompt: '打電話預約醫生', accent: 'purple' },
  { id: 'restaurant', icon: Utensils, title: '餐廳點餐', en: 'Restaurant', role: 'Waiter', prompt: '在餐廳點餐及查詢推薦菜式', accent: 'orange' },
  { id: 'takeaway', icon: ShoppingBag, title: '叫外賣', en: 'Takeaway', role: 'Staff', prompt: '用電話或App叫外賣', accent: 'pink' },
  { id: 'shopping', icon: Briefcase, title: '購物付款', en: 'Shopping', role: 'Shop assistant', prompt: '查詢價錢、尺寸及付款', accent: 'green' },
  { id: 'travel', icon: Plane, title: '旅行住宿', en: 'Travel', role: 'Hotel staff', prompt: '酒店入住及查詢設施', accent: 'blue' },
  { id: 'more', icon: MoreHorizontal, title: '更多', en: 'More', role: 'Teacher', prompt: '日常英語情境練習', accent: 'gray' }
]

function getJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function today() { return new Date().toISOString().slice(0, 10) }
function updateStats(type) {
  const stats = getJSON(STORAGE.stats, { scenarios: 0, readings: 0, translations: 0, days: [] })
  if (type === 'scenario') stats.scenarios += 1
  if (type === 'reading') stats.readings += 1
  if (type === 'translation') stats.translations += 1
  if (!stats.days.includes(today())) stats.days.push(today())
  setJSON(STORAGE.stats, stats)
}

async function askAI(task, payload) {
  try {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, payload }) })
    const data = await res.json()
    if (!res.ok || data?.error) throw new Error(data?.error || 'AI request failed')
    return data
  } catch (e) {
    console.warn('AI backend unavailable, mock fallback used:', e)
    return mockAI(task, payload)
  }
}

function mockScenario(payload = {}) {
  const s = SCENARIOS.find(x => x.id === payload.scenarioId) || SCENARIOS[0]
  const lines = s.id === 'restaurant' ? [
    { speaker: '你 (You)', role: 'you', en: "Hi, could I have a table for two, please?", zh: '你好，請問有兩位的座位嗎？' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'Sure. Would you like to sit inside or outside?', zh: '當然可以。你想坐室內還是室外？' },
    { speaker: '你 (You)', role: 'you', en: "Inside, please. What do you recommend?", zh: '室內，謝謝。你有什麼推薦？' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'Our grilled chicken and tomato pasta are very popular.', zh: '我們的烤雞和番茄意粉都很受歡迎。' },
    { speaker: '你 (You)', role: 'you', en: "Great. I'll have the pasta, please.", zh: '好，那我要意粉，謝謝。' }
  ] : s.id === 'takeaway' ? [
    { speaker: '你 (You)', role: 'you', en: "Hi, I'd like to order takeaway, please.", zh: '你好，我想叫外賣。' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'Sure. What would you like to order?', zh: '好的。你想點什麼？' },
    { speaker: '你 (You)', role: 'you', en: "Can I have one chicken rice and a lemon tea?", zh: '我要一個雞飯和一杯檸檬茶。' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'No problem. It will be ready in fifteen minutes.', zh: '沒問題。十五分鐘後可以取。' }
  ] : [
    { speaker: '你 (You)', role: 'you', en: "Hello, I'd like to make an appointment.", zh: '你好，我想預約。' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'Sure, no problem. What time are you available?', zh: '當然可以，請問你什麼時間方便？' },
    { speaker: '你 (You)', role: 'you', en: 'How about next Monday morning?', zh: '下星期一早上可以嗎？' },
    { speaker: `對方 (${s.role})`, role: 'other', en: 'Let me check... We have a slot at 10 a.m. Is that ok for you?', zh: '我看看……我們早上10點有空。可以嗎？' },
    { speaker: '你 (You)', role: 'you', en: "Yes, that's perfect. Thank you!", zh: '可以，謝謝！' },
    { speaker: `對方 (${s.role})`, role: 'other', en: "You're welcome! See you then.", zh: '不客氣！到時見。' }
  ]
  return {
    title: `${s.title}（${s.prompt}）`,
    situation: `你正在練習「${s.prompt}」的日常英文對話。`,
    lines,
    keySentences: ["I'd like to ...", 'What time are you available?', 'Could I have ...?', 'Let me check...', 'Is that ok for you?'],
    vocabulary: [
      { word: 'appointment', zh: '預約', note: 'make an appointment = 預約' },
      { word: 'available', zh: '有空的', note: '常用於約時間' },
      { word: 'recommend', zh: '推薦', note: '餐廳、購物常用' },
      { word: 'takeaway', zh: '外賣', note: '英式英文常用' }
    ],
    tips: ['先用禮貌開場，例如 Hello / Excuse me。', '提出請求可用 I’d like to... 或 Could I have...?', '確認時間、價錢、地點後再結束對話。'],
    practice: ['請把第一句改成「我想改約時間」。', '請用英文問：「有沒有其他時間？」', '請朗讀一次整段對話。']
  }
}

function mockAI(task, payload) {
  if (task === 'scenario') return mockScenario(payload)
  if (task === 'reading') {
    const topic = payload.customTopic || payload.topic || 'AI'
    return { title: `${topic}: A New Way to Learn English`, article: `In recent years, ${topic} has become an important topic around the world. Many learners read short articles, watch videos, and use AI tools to understand new ideas. Learning English through real topics can make vocabulary more memorable and useful. Instead of memorising isolated words, students can see how language works in context.`, translation: `近年，${topic} 已成為全球重要議題。許多學習者會閱讀短文、觀看影片，並使用 AI 工具理解新概念。透過真實主題學英文，可以令詞彙更容易記住和應用。`, vocabulary: [{ word: 'memorable', pos: 'adj.', zh: '容易記住的', example: 'Stories make words more memorable.' }, { word: 'context', pos: 'n.', zh: '語境', example: 'Learn vocabulary in context.' }], keyPoints: ['真實主題能提升學習動機', '語境記憶比死背有效', 'AI 可成為個人化英文老師'], grammar: ['Present perfect: has become', 'Instead of + verb-ing'], questions: [{ q: 'Why is learning through real topics useful?', a: 'Because it makes vocabulary more memorable and practical.' }], teacher: '閱讀時先抓主題句，再圈出重複出現的關鍵詞。' }
  }
  return { original: payload.text || 'Learning English is easier when you read with purpose.', bilingual: [{ en: payload.text || 'Learning English is easier when you read with purpose.', zh: '當你有目的地閱讀時，學英文會變得更容易。' }], vocabulary: [{ word: 'purpose', zh: '目的', note: 'with purpose = 有目的地' }], grammar: ['when 引導時間／條件感的副詞子句'], keyPoints: ['先理解中心意思', '學習常用片語'], quick: '有目標地閱讀，可以令英文學習更有效。', teacher: '重點是 “with purpose”，表示帶著目標閱讀。' }
}

function App() {
  const [tab, setTab] = useState('scenario')
  const [settings, setSettings] = useState(getJSON(STORAGE.settings, defaultSettings))
  const tabs = [['scenario', Home, '情境學習'], ['reading', Newspaper, '閱讀理解'], ['translator', Languages, '翻譯學習'], ['learning', UserRound, '學習中心']]
  const setTheme = theme => { const next = { ...settings, theme }; setSettings(next); setJSON(STORAGE.settings, next) }
  return <div className={`app ${settings.theme}`}>
    <header className="topBar">
      <button className="ghostBtn" onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}>{settings.theme === 'light' ? <Moon/> : <Sun/>}</button>
      <div className="brand"><span className="aiBadge">AI</span><div><h1>English Master <b>AI</b></h1><p>學英文，不再死背</p></div></div>
      <span className="vip">👑 VIP</span>
    </header>
    <main>
      {tab === 'scenario' && <ScenarioHome />}
      {tab === 'reading' && <Reading />}
      {tab === 'translator' && <Translator />}
      {tab === 'learning' && <Learning />}
    </main>
    <nav className="bottomNav">{tabs.map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
  </div>
}

function ScenarioHome() {
  const [selected, setSelected] = useState('phone')
  const [result, setResult] = useState(mockScenario({ scenarioId: 'phone' }))
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const stats = getJSON(STORAGE.stats, { scenarios: 0, days: [] })
  const scenario = SCENARIOS.find(x => x.id === selected) || SCENARIOS[0]
  async function generate(id = selected) {
    setLoading(true)
    const s = SCENARIOS.find(x => x.id === id) || scenario
    const data = await askAI('scenario', { scenarioId: id, title: s.title, prompt: s.prompt, role: s.role })
    setResult(data)
    updateStats('scenario')
    const history = getJSON(STORAGE.scenarios, [])
    setJSON(STORAGE.scenarios, [{ title: data.title, date: today(), scenario: s.title }, ...history].slice(0, 30))
    setLoading(false)
  }
  function speak(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u) } catch {} }
  return <section className="mobilePage">
    <div className="welcome"><div><h2>👋 早安！一起練習英文吧！</h2><p>選擇一個情境，AI 會生成模擬對話＋旁邊教學框。</p></div><div className="todayRing"><b>{Math.min(100, 35 + stats.scenarios * 8)}%</b><span>今日進度</span></div></div>
    <div className="scenarioScroller">{SCENARIOS.map(s => { const Icon = s.icon; return <button key={s.id} className={`scenarioCard ${selected === s.id ? 'active' : ''}`} onClick={() => { setSelected(s.id); generate(s.id) }}><Icon size={26}/><b>{s.title}</b><span>{s.en}</span></button> })}</div>
    {loading && <Loading/>}
    <div className="lessonLayout" ref={ref}>
      <section className="conversationPanel">
        <div className="sectionHead"><div><h2>✨ 情境模擬對話</h2><span>{result.title}</span></div><button className="outlineBtn" onClick={() => generate()}><RefreshCw size={17}/> 換一個情境</button></div>
        <div className="situationBox"><div><b>情境描述</b><p>{result.situation}</p></div><div className="teacherAvatar">👩🏻‍🏫</div></div>
        <div className="chatList">{result.lines?.map((line, i) => <div className={`chatRow ${line.role}`} key={i}><div className="avatar">{line.role === 'you' ? '🧑🏻' : '👩🏻'}</div><div className="bubble"><b>{line.speaker}</b><p>{line.en}</p><span>{line.zh}</span><button className="sound" onClick={() => speak(line.en)}><Volume2 size={16}/></button></div></div>)}</div>
        <div className="practiceBtns"><button><Mic size={18}/> 錄音練習</button><button className="softBtn"><Play size={18}/> 播放全部</button><button className="softBtn" onClick={() => generate()}><RefreshCw size={18}/> 換一個</button></div>
      </section>
      <aside className="teachingPanel">
        <h2>學習重點</h2>
        <LessonBlock icon={<MessageCircle/>} title="重點句型" items={result.keySentences}/>
        <div className="lessonBlock"><div className="lessonTitle"><BookOpen/> <b>實用單字</b></div>{result.vocabulary?.map(v => <div className="wordLine" key={v.word}><b>{v.word}</b><span>{v.zh}</span><small>{v.note}</small></div>)}</div>
        <LessonBlock icon={<Lightbulb/>} title="小貼士" items={result.tips}/>
        <LessonBlock icon={<Headphones/>} title="延伸練習" items={result.practice}/>
      </aside>
    </div>
    <ShareBox refEl={ref} fileName="scenario-lesson" />
    <h3 className="moreTitle">更多日常場景</h3>
    <div className="miniScenarioGrid">{['酒店入住','問路指路','搭乘交通','看醫生','面試求職','更多場景'].map((x,i)=><div className="miniScene" key={x}><span>{['🏨','🗺️','🚌','🩺','👨🏻‍💼','•••'][i]}</span><b>{x}</b><small>{10+i} 對話</small></div>)}</div>
  </section>
}

function Reading() {
  const [form, setForm] = useState({ topic: 'AI', customTopic: '', level: 'Intermediate', style: 'BBC News', words: '500' })
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const ref = useRef(null)
  async function generate() { setLoading(true); const data = await askAI('reading', form); setResult(data); updateStats('reading'); const list = getJSON(STORAGE.readings, []); setJSON(STORAGE.readings, [{ title: data.title, date: today(), topic: form.customTopic || form.topic }, ...list].slice(0, 30)); setLoading(false) }
  return <section className="page"><div className="panel"><h2>📰 AI Reading</h2><div className="formGrid"><Select label="主題" v={form.topic} set={v=>setForm({...form,topic:v})} opts={['科技','健康','環保','旅遊','心理學','歷史','商業','AI','金融','教育','自訂主題']}/><input className="field" value={form.customTopic} onChange={e=>setForm({...form,customTopic:e.target.value})} placeholder="自訂主題，可留空"/><Select label="難度" v={form.level} set={v=>setForm({...form,level:v})} opts={['Beginner','Elementary','Intermediate','Upper Intermediate','Advanced','IELTS','DSE','TOEFL','Academic']}/><Select label="文章風格" v={form.style} set={v=>setForm({...form,style:v})} opts={['BBC News','TED Talk','National Geographic','The Economist','CNN','Scientific American','Story','Conversation','Business Report','Custom']}/><Select label="字數" v={form.words} set={v=>setForm({...form,words:v})} opts={['300','500','800','1200']}/></div><button className="primary" onClick={generate}><Wand2 size={18}/> Generate Article</button></div>{loading && <Loading/>}{result && <><article ref={ref} className="panel shareCard"><h2>{result.title}</h2><TwoCol leftTitle="英文文章" rightTitle="中文翻譯" left={result.article} right={result.translation}/><Vocabulary items={result.vocabulary}/><Block title="Key Points" items={result.keyPoints}/><Block title="Grammar Focus" items={result.grammar}/><h3>Reading Questions</h3>{result.questions?.map((q,i)=><div className="qa" key={i}><b>Q{i+1}. {q.q}</b><p>Answer: {q.a}</p></div>)}<Teacher text={result.teacher}/></article><ShareBox refEl={ref} fileName="ai-reading" /></>}</section>
}

function Translator() {
  const [text,setText] = useState('Learning English is easier when you read with purpose.')
  const [result,setResult] = useState(null); const [loading,setLoading] = useState(false); const ref = useRef(null)
  async function analyze(){ setLoading(true); const data = await askAI('translator',{text}); setResult(data); updateStats('translation'); setLoading(false) }
  function loadFile(e){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>setText(String(reader.result||'')); reader.readAsText(file) }
  return <section className="page"><div className="panel"><h2>🌏 AI Translator</h2><p className="hint">貼上英文文章，AI 會做中英對照翻譯及重點教學。</p><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="貼上英文文章..."/><div className="actionRow"><label className="upload"><Upload size={18}/> 上傳 TXT<input type="file" accept=".txt,.md" onChange={loadFile}/></label><button className="primary" onClick={analyze}><Sparkles size={18}/> 開始分析</button></div></div>{loading && <Loading/>}{result && <><article ref={ref} className="panel shareCard"><h2>中英對照教材</h2><h3>原文</h3><p>{result.original}</p><h3>段落翻譯</h3>{result.bilingual?.map((b,i)=><TwoCol key={i} leftTitle={`Original ${i+1}`} rightTitle="中文" left={b.en} right={b.zh}/>) }<h3>重要字彙</h3><div className="vocabGrid">{result.vocabulary?.map(v=><div className="mini" key={v.word}><b>{v.word}</b><span>{v.zh}</span><p>{v.note}</p></div>)}</div><Block title="Grammar Analysis" items={result.grammar}/><Block title="Key Learning Points" items={result.keyPoints}/><Teacher title="一分鐘速讀版" text={result.quick}/><Teacher text={result.teacher}/></article><ShareBox refEl={ref} fileName="translator-learning" /></>}</section>
}

function Learning() {
  const stats = getJSON(STORAGE.stats, { scenarios:0, readings:0, translations:0, days:[] })
  const histories = getJSON(STORAGE.scenarios, [])
  const readings = getJSON(STORAGE.readings, [])
  function clearData(){ if(confirm('確定清空所有學習資料？')){ Object.values(STORAGE).forEach(k=>localStorage.removeItem(k)); location.reload() } }
  const advice = useMemo(()=> stats.scenarios < 3 ? '建議先每天完成 3 個日常情境對話，建立開口講英文的信心。' : '你已開始建立學習節奏，可以加入閱讀理解和翻譯練習。', [stats.scenarios])
  return <section className="page grid2"><div className="panel"><h2>👤 My Learning</h2><div className="statsGrid"><Stat label="情境練習" value={stats.scenarios}/><Stat label="閱讀篇數" value={stats.readings}/><Stat label="翻譯次數" value={stats.translations}/><Stat label="學習天數" value={stats.days.length}/></div><Teacher title="AI 學習分析" text={advice}/><h3>最近情境</h3><div className="list">{histories.slice(0,6).map((r,i)=><div className="listItem" key={i}><b>{r.title}</b><span>{r.date}</span></div>)}{!histories.length && <p className="hint">暫未完成情境練習。</p>}</div><h3>最近閱讀</h3><div className="list">{readings.slice(0,6).map((r,i)=><div className="listItem" key={i}><b>{r.title}</b><span>{r.date}</span></div>)}</div></div><aside className="panel"><h3>AI 後台設定</h3><div className="backendBox"><b>✅ Vercel 後台 API 模式</b><p>API Key 不會放在前端。請到 Vercel Environment Variables 設定：</p><code>AI_PROVIDER=openai</code><code>OPENAI_API_KEY=你的Key</code><code>或 GEMINI_API_KEY=你的Key</code></div><button className="danger" onClick={clearData}><Trash2 size={18}/> 清空資料</button><Teacher title="每日任務" text="完成 1 個情境對話、朗讀 3 句英文、記低 5 個實用句型。"/></aside></section>
}

function Loading(){ return <div className="loading"><Sparkles/> AI 老師正在準備教材...</div> }
function Stat({label,value}){ return <div className="stat"><b>{value}</b><span>{label}</span></div> }
function Block({title,items}){ return <div><h3>{title}</h3><ul className="niceList">{items?.map((x,i)=><li key={i}>{x}</li>)}</ul></div> }
function LessonBlock({icon,title,items}){ return <div className="lessonBlock"><div className="lessonTitle">{icon}<b>{title}</b></div><ul>{items?.map((x,i)=><li key={i}>{x}</li>)}</ul></div> }
function Teacher({title='AI Teacher',text}){ return <div className="teacher"><GraduationCap size={18}/><div><b>{title}</b><p>{text}</p></div></div> }
function Select({label,v,set,opts}){ return <label className="select"><span>{label}</span><select value={v} onChange={e=>set(e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label> }
function TwoCol({leftTitle,rightTitle,left,right}){ return <div className="twoCol"><div><h3>{leftTitle}</h3><p>{left}</p></div><div><h3>{rightTitle}</h3><p>{right}</p></div></div> }
function Vocabulary({items=[]}){ return <div><h3>Vocabulary</h3><div className="vocabGrid">{items.map((v,i)=><div className="mini" key={i}><b>{v.word}</b><span>{v.pos} · {v.zh}</span><p>{v.example}</p></div>)}</div></div> }
function ShareBox({refEl, fileName}) {
  async function toImage() { if(!refEl.current) return; const canvas = await html2canvas(refEl.current, { scale: 2, backgroundColor: '#ffffff' }); const a = document.createElement('a'); a.download = `${fileName}.png`; a.href = canvas.toDataURL('image/png'); a.click() }
  async function toPDF() { if(!refEl.current) return; const canvas = await html2canvas(refEl.current, { scale: 2, backgroundColor: '#ffffff' }); const img = canvas.toDataURL('image/png'); const pdf = new jsPDF('p','mm','a4'); const w = 210; const h = canvas.height * w / canvas.width; pdf.addImage(img,'PNG',0,0,w,Math.min(h,297)); pdf.save(`${fileName}.pdf`) }
  return <div className="shareBtns"><button onClick={toPDF}><Download size={18}/> 生成 PDF</button><button onClick={toImage}><ImageIcon size={18}/> 生成圖片</button></div>
}

createRoot(document.getElementById('root')).render(<App />)
