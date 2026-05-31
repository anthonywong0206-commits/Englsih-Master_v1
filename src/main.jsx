import React, { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, Languages, Newspaper, UserRound, Heart, Sparkles, Download, Image as ImageIcon, Moon, Sun, Save, Wand2, Search, Upload, Trash2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './styles.css'

const STORAGE = {
  words: 'ema_saved_words_v1',
  readings: 'ema_readings_v1',
  settings: 'ema_settings_v1',
  stats: 'ema_stats_v1'
}

const defaultSettings = {
  provider: 'mock',
  apiKey: '',
  theme: 'dark'
}

function getJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

async function askAI(task, payload) {
  const settings = getJSON(STORAGE.settings, defaultSettings)
  if (!settings.apiKey || settings.provider === 'mock') return mockAI(task, payload)

  const system = `You are English Master AI, a bilingual English teacher for Hong Kong learners. Return clean JSON only. Teach in Traditional Chinese and English.`
  const user = JSON.stringify({ task, payload })

  try {
    if (settings.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7 })
      })
      const data = await res.json()
      return JSON.parse(data.choices?.[0]?.message?.content || '{}')
    }
    if (settings.provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${settings.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n${user}` }] }] })
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, '') || '{}'
      return JSON.parse(text)
    }
  } catch (e) {
    console.warn('AI fallback used:', e)
  }
  return mockAI(task, payload)
}

function mockAI(task, payload) {
  if (task === 'dictionary') {
    const word = payload.word || 'environment'
    return {
      word: cap(word), phonetic: '/ɪnˈvaɪrənmənt/', translation: word.toLowerCase() === 'beautiful' ? '美麗的' : word.toLowerCase() === 'apple' ? '蘋果' : '環境', partOfSpeech: word.toLowerCase() === 'beautiful' ? 'Adjective' : 'Noun',
      meanings: ['常見核心意思', '在日常或文章中的延伸意思', '學術或新聞語境中的用法'],
      example: `The ${word} is important in daily English learning.`, exampleZh: `「${word}」在日常英文學習中很重要。`,
      levels: [
        { level: '簡單版', en: `I learned the word ${word} today.`, zh: `我今日學了 ${word} 這個字。` },
        { level: '中級版', en: `This word is useful when reading news and school articles.`, zh: `閱讀新聞和學校文章時，這個字很有用。` },
        { level: '高級版', en: `A strong vocabulary helps learners express complex ideas with confidence.`, zh: `穩固的詞彙量有助學習者自信表達複雜想法。` }
      ],
      synonyms: ['nature', 'surroundings', 'context'], antonyms: ['pollution', 'damage'], collocations: [`learn ${word}`, `${word} skills`, `daily ${word}`],
      note: '此字常見於 BBC、IELTS、新聞報導及學術文章。建議連同例句和配搭一起記。'
    }
  }
  if (task === 'reading') {
    const topic = payload.customTopic || payload.topic || 'AI'
    return {
      title: `${topic}: A New Way to Learn English`,
      article: `In recent years, ${topic} has become an important topic around the world. Many learners read short articles, watch videos, and use AI tools to understand new ideas. Learning English through real topics can make vocabulary more memorable and useful. Instead of memorising isolated words, students can see how language works in context. This method also improves reading speed, grammar awareness, and confidence.`,
      translation: `近年，${topic} 已成為全球重要議題。許多學習者會閱讀短文、觀看影片，並使用 AI 工具理解新概念。透過真實主題學英文，可以令詞彙更容易記住和應用。學生不再只是死背單字，而是能在語境中看見語言如何運作。這種方法亦有助提升閱讀速度、文法意識和自信。`,
      vocabulary: [
        { word: 'memorable', pos: 'adj.', zh: '容易記住的', example: 'Stories make words more memorable.' },
        { word: 'context', pos: 'n.', zh: '語境', example: 'Learn vocabulary in context.' },
        { word: 'confidence', pos: 'n.', zh: '自信', example: 'Practice builds confidence.' }
      ],
      keyPoints: ['真實主題能提升學習動機', '語境記憶比死背有效', 'AI 可成為個人化英文老師'],
      grammar: ['Present perfect: has become', 'Instead of + verb-ing', 'Modal verb: can'],
      questions: [
        { q: 'Why is learning through real topics useful?', a: 'Because it makes vocabulary more memorable and practical.' },
        { q: 'True or False: Students should only memorise isolated words.', a: 'False.' }
      ],
      teacher: '閱讀時先抓主題句，再圈出重複出現的關鍵詞。不要每個字都查，先理解段落大意，再回頭學重點字。'
    }
  }
  return {
    original: payload.text || 'Learning English is easier when you read with purpose.',
    bilingual: [{ en: payload.text || 'Learning English is easier when you read with purpose.', zh: '當你有目的地閱讀時，學英文會變得更容易。' }],
    vocabulary: [{ word: 'purpose', zh: '目的', note: 'with purpose = 有目的地' }, { word: 'easier', zh: '更容易', note: '比較級 adjective + er' }],
    grammar: ['when 引導時間／條件感的副詞子句', '比較級 easier 的用法'],
    keyPoints: ['先理解中心意思', '學習常用片語', '留意句子結構'],
    quick: '有目標地閱讀，可以令英文學習更有效。',
    teacher: '這句的重點是 “with purpose”，表示不是隨便讀，而是帶著目標閱讀。'
  }
}

function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1) }
function today() { return new Date().toISOString().slice(0, 10) }
function updateStats(type) {
  const stats = getJSON(STORAGE.stats, { words: 0, readings: 0, translations: 0, days: [] })
  if (type === 'word') stats.words += 1
  if (type === 'reading') stats.readings += 1
  if (type === 'translation') stats.translations += 1
  if (!stats.days.includes(today())) stats.days.push(today())
  setJSON(STORAGE.stats, stats)
}

function App() {
  const [tab, setTab] = useState('dictionary')
  const [settings, setSettings] = useState(getJSON(STORAGE.settings, defaultSettings))
  const tabs = [
    ['dictionary', BookOpen, 'Dictionary'], ['reading', Newspaper, 'AI Reading'], ['translator', Languages, 'Translator'], ['learning', UserRound, 'My Learning']
  ]
  const setTheme = (theme) => { const next = { ...settings, theme }; setSettings(next); setJSON(STORAGE.settings, next) }
  return <div className={`app ${settings.theme}`}>
    <div className="bgOrb orb1" /><div className="bgOrb orb2" /><div className="bgOrb orb3" />
    <header className="hero">
      <div><span className="pill"><Sparkles size={16}/> AI English Coach</span><h1>English Master AI</h1><p>學英文，不再死背。讓 AI 成為你的私人英語老師。</p></div>
      <button className="iconBtn" onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}>{settings.theme === 'dark' ? <Sun/> : <Moon/>}</button>
    </header>
    <main>
      {tab === 'dictionary' && <Dictionary />}
      {tab === 'reading' && <Reading />}
      {tab === 'translator' && <Translator />}
      {tab === 'learning' && <Learning settings={settings} setSettings={setSettings} />}
    </main>
    <nav className="bottomNav">{tabs.map(([id, Icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </div>
}

function Dictionary() {
  const [word, setWord] = useState('environment')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const saved = getJSON(STORAGE.words, [])
  async function searchWord() { setLoading(true); const data = await askAI('dictionary', { word }); setResult(data); updateStats('word'); setLoading(false) }
  function saveWord() { const list = getJSON(STORAGE.words, []); if (!list.find(x => x.word === result.word)) setJSON(STORAGE.words, [{ ...result, savedAt: today() }, ...list]); alert('已加入我的單字庫') }
  return <section className="page grid2"><div className="panel mainPanel"><h2>📖 AI 字典學習</h2><div className="searchRow"><input value={word} onChange={e=>setWord(e.target.value)} placeholder="輸入英文單字，例如 environment"/><button onClick={searchWord}><Search size={18}/>搜尋</button></div>{loading && <Loading/>}{result && <div className="resultCard shareCard"><div className="wordHead"><div><h3>{result.word}</h3><p>{result.phonetic} · {result.partOfSpeech}</p></div><button className="heart" onClick={saveWord}><Heart/> 收藏</button></div><div className="bigTranslation">{result.translation}</div><Block title="常見意思" items={result.meanings}/><Quote en={result.example} zh={result.exampleZh}/><h4>延伸例句</h4>{result.levels.map(x=><Quote key={x.level} label={x.level} en={x.en} zh={x.zh}/>)}<Chips title="相似詞" items={result.synonyms}/><Chips title="反義詞" items={result.antonyms}/><Chips title="常見搭配" items={result.collocations}/><Teacher text={result.note}/></div>}</div><aside className="panel"><h3>學習紀錄</h3><Stat label="已收藏單字" value={saved.length}/><Stat label="今日搜尋" value={getJSON(STORAGE.stats,{words:0}).words || 0}/><p className="hint">提示：記單字時不要只背中文，最好連 collocation 一起記。</p></aside></section>
}

function Reading() {
  const [form, setForm] = useState({ topic: 'AI', customTopic: '', level: 'Intermediate', style: 'BBC News', words: '500' })
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const ref = useRef(null)
  async function generate() { setLoading(true); const data = await askAI('reading', form); setResult(data); updateStats('reading'); const list = getJSON(STORAGE.readings, []); setJSON(STORAGE.readings, [{ title: data.title, date: today(), topic: form.customTopic || form.topic }, ...list].slice(0, 30)); setLoading(false) }
  return <section className="page"><div className="panel"><h2>📰 AI Reading</h2><div className="formGrid"><Select label="主題" v={form.topic} set={v=>setForm({...form,topic:v})} opts={['科技','健康','環保','旅遊','心理學','歷史','商業','AI','金融','教育','自訂主題']}/><input className="field" value={form.customTopic} onChange={e=>setForm({...form,customTopic:e.target.value})} placeholder="自訂主題，可留空"/><Select label="難度" v={form.level} set={v=>setForm({...form,level:v})} opts={['Beginner','Elementary','Intermediate','Upper Intermediate','Advanced','IELTS','DSE','TOEFL','Academic']}/><Select label="文章風格" v={form.style} set={v=>setForm({...form,style:v})} opts={['BBC News','TED Talk','National Geographic','The Economist','CNN','Scientific American','Story','Conversation','Business Report','Custom']}/><Select label="字數" v={form.words} set={v=>setForm({...form,words:v})} opts={['300','500','800','1200']}/></div><button className="primary" onClick={generate}><Wand2 size={18}/> Generate Article</button></div>{loading && <Loading/>}{result && <ShareBox refEl={ref} fileName="ai-reading"><article ref={ref} className="panel shareCard"><h2>{result.title}</h2><TwoCol leftTitle="英文文章" rightTitle="中文翻譯" left={result.article} right={result.translation}/><Vocabulary items={result.vocabulary}/><Block title="Key Points" items={result.keyPoints}/><Block title="Grammar Focus" items={result.grammar}/><h3>Reading Questions</h3>{result.questions.map((q,i)=><div className="qa" key={i}><b>Q{i+1}. {q.q}</b><p>{q.a}</p></div>)}<Teacher text={result.teacher}/></article></ShareBox>}</section>
}

function Translator() {
  const [text, setText] = useState('Learning English is easier when you read with purpose.')
  const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const ref = useRef(null)
  async function analyze() { setLoading(true); const data = await askAI('translator', { text }); setResult(data); updateStats('translation'); setLoading(false) }
  function upload(e) { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setText(String(reader.result)); reader.readAsText(file) }
  return <section className="page"><div className="panel"><h2>🌏 AI Translator</h2><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="貼上英文文章，AI 會生成中英對照、重點字彙及文法教學。"/><div className="actionRow"><label className="upload"><Upload size={18}/> 上傳 TXT<input type="file" accept=".txt,.md,.csv" onChange={upload}/></label><button className="primary" onClick={analyze}><Wand2 size={18}/> 分析文章</button></div><p className="hint">PDF / DOCX 匯入已預留 UI；純前端版建議先轉成文字貼上。正式版可加後端解析。</p></div>{loading && <Loading/>}{result && <ShareBox refEl={ref} fileName="translator-learning-card"><article ref={ref} className="panel shareCard"><h2>英文文章學習卡</h2><h3>原文</h3><p>{result.original}</p><h3>中英對照翻譯</h3>{result.bilingual.map((p,i)=><Quote key={i} en={p.en} zh={p.zh}/>)}<h3>重要字彙</h3><div className="vocabGrid">{result.vocabulary.map((v,i)=><div className="mini" key={i}><b>{v.word}</b><span>{v.zh}</span><p>{v.note}</p></div>)}</div><Block title="Grammar Analysis" items={result.grammar}/><Block title="Key Learning Points" items={result.keyPoints}/><Teacher title="一分鐘速讀版" text={result.quick}/><Teacher text={result.teacher}/></article></ShareBox>}</section>
}

function Learning({ settings, setSettings }) {
  const stats = getJSON(STORAGE.stats, { words: 0, readings: 0, translations: 0, days: [] })
  const words = getJSON(STORAGE.words, [])
  const readings = getJSON(STORAGE.readings, [])
  function saveSettings(next) { setSettings(next); setJSON(STORAGE.settings, next) }
  function clearData() { if (confirm('確定清空所有學習紀錄？')) { Object.values(STORAGE).forEach(k=>localStorage.removeItem(k)); location.reload() } }
  const advice = useMemo(() => stats.readings > stats.words ? '你閱讀量不錯，可以加強單字收藏和重溫。' : '建議每日先學 5 個單字，再讀一篇短文。', [stats])
  return <section className="page grid2"><div className="panel"><h2>👤 My Learning</h2><div className="statsGrid"><Stat label="累積閱讀篇數" value={stats.readings}/><Stat label="學習單字數" value={stats.words}/><Stat label="翻譯分析" value={stats.translations}/><Stat label="學習天數" value={stats.days.length}/></div><Teacher title="AI 學習分析" text={advice}/><h3>收藏單字</h3><div className="list">{words.slice(0,8).map(w=><div className="listItem" key={w.word}><b>{w.word}</b><span>{w.translation}</span></div>)}{!words.length && <p className="hint">暫未收藏單字。</p>}</div><h3>最近閱讀</h3><div className="list">{readings.slice(0,6).map((r,i)=><div className="listItem" key={i}><b>{r.title}</b><span>{r.date}</span></div>)}</div></div><aside className="panel"><h3>AI API 設定</h3><Select label="AI Provider" v={settings.provider} set={v=>saveSettings({...settings,provider:v})} opts={['mock','openai','gemini']}/><input className="field" type="password" value={settings.apiKey} onChange={e=>saveSettings({...settings,apiKey:e.target.value})} placeholder="API Key（個人測試用）"/><p className="hint">mock 模式不需要 API Key。正式公開網站建議使用後端 API Proxy。</p><button className="primary" onClick={()=>alert('設定已保存')}><Save size={18}/> 保存設定</button><button className="danger" onClick={clearData}><Trash2 size={18}/> 清空資料</button><Teacher title="每日建議" text="今日任務：學 5 個單字、讀 1 篇 300 字短文、把 3 句好句加入筆記。"/></aside></section>
}

function Loading(){ return <div className="loading"><Sparkles/> AI 老師正在準備教材...</div> }
function Stat({label,value}){ return <div className="stat"><b>{value}</b><span>{label}</span></div> }
function Block({title,items}){ return <div><h3>{title}</h3><ul className="niceList">{items?.map((x,i)=><li key={i}>{x}</li>)}</ul></div> }
function Quote({label,en,zh}){ return <div className="quote">{label && <b>{label}</b>}<p>{en}</p><span>{zh}</span></div> }
function Chips({title,items}){ return <div><h3>{title}</h3><div className="chips">{items?.map(x=><span key={x}>{x}</span>)}</div></div> }
function Teacher({title='AI Teacher',text}){ return <div className="teacher"><Sparkles size={18}/><div><b>{title}</b><p>{text}</p></div></div> }
function Select({label,v,set,opts}){ return <label className="select"><span>{label}</span><select value={v} onChange={e=>set(e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label> }
function TwoCol({leftTitle,rightTitle,left,right}){ return <div className="twoCol"><div><h3>{leftTitle}</h3><p>{left}</p></div><div><h3>{rightTitle}</h3><p>{right}</p></div></div> }
function Vocabulary({items}){ return <div><h3>Vocabulary</h3><div className="vocabGrid">{items.map((v,i)=><div className="mini" key={i}><b>{v.word}</b><span>{v.pos} · {v.zh}</span><p>{v.example}</p></div>)}</div></div> }
function ShareBox({children, refEl, fileName}) {
  async function toImage() { const canvas = await html2canvas(refEl.current, { scale: 2, backgroundColor: null }); const a = document.createElement('a'); a.download = `${fileName}.png`; a.href = canvas.toDataURL('image/png'); a.click() }
  async function toPDF() { const canvas = await html2canvas(refEl.current, { scale: 2, backgroundColor: '#0b1020' }); const img = canvas.toDataURL('image/png'); const pdf = new jsPDF('p','mm','a4'); const w = 210; const h = canvas.height * w / canvas.width; pdf.addImage(img,'PNG',0,0,w,h); pdf.save(`${fileName}.pdf`) }
  return <div><div className="shareBtns"><button onClick={toPDF}><Download size={18}/> 生成 PDF</button><button onClick={toImage}><ImageIcon size={18}/> 生成圖片</button></div>{children}</div>
}

createRoot(document.getElementById('root')).render(<App />)
