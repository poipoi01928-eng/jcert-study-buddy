import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const tabs = [
  { id: 'solver', icon: '∑', label: 'Solve' },
  { id: 'notes', icon: '▤', label: 'Notes' },
  { id: 'quiz', icon: '✓', label: 'Quiz' },
  { id: 'explain', icon: '✦', label: 'Explainer' },
];

function App() {
  const [tab, setTab] = useState('solver');
  const [language, setLanguage] = useState(localStorage.getItem('jcert-language') || 'both');
  const [chapter, setChapter] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jcert-chapter') || 'null'); } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('');
  const [image, setImage] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const fileRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => { localStorage.setItem('jcert-language', language); }, [language]);
  useEffect(() => { localStorage.setItem('jcert-chapter', JSON.stringify(chapter)); }, [chapter]);

  const chapterLabel = useMemo(() => chapter ? `${chapter.subject} · ${chapter.name}` : 'No chapter uploaded yet', [chapter]);

  async function uploadPdf(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Please choose a PDF textbook chapter.'); return; }
    setBusy(true); setError(''); setResult('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read this PDF.');
      setChapter({ subject: data.subject || 'Class 9', name: data.name || file.name.replace(/\.pdf$/i, ''), text: data.text, pages: data.pages || null });
      setResult(`Chapter ready! I extracted the text from ${file.name}. You can now ask questions, make notes, or generate a quiz.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function askAI(task, extra = {}) {
    setBusy(true); setError(''); setResult('');
    try {
      const payload = { task, language, chapterText: chapter?.text || '', chapterName: chapter?.name || '', subject: chapter?.subject || '', ...extra };
      const res = await fetch(`${API}/api/study`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed.');
      if (task === 'quiz') { setQuiz(data.quiz); setAnswers({}); setChecked(false); }
      else setResult(data.text || 'No response received.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function solve() {
    if (!question.trim() && !image) { setError('Type a question or add a photo first.'); return; }
    let imageData;
    if (image) imageData = await fileToBase64(image);
    askAI('solve', { question, image: imageData, mimeType: image?.type });
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(file); });
  }
  function renderResult(text) {
    if (!text) return null;
    return <section className="answer"><div className="answer-head"><span className="spark">✦</span><b>AI teacher's answer</b></div><div className="answer-text">{text}</div></section>;
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">✦</div>
      <div className="brand"><strong>Study Buddy</strong><span>CLASS 9 · JCERT</span></div>
      <select aria-label="Answer language" value={language} onChange={e => setLanguage(e.target.value)} className="language">
        <option value="both">HI + EN</option><option value="hindi">हिन्दी</option><option value="english">English</option>
      </select>
    </header>

    <main>
      <section className="welcome">
        <div><p className="eyebrow">YOUR PERSONAL AI CLASSROOM</p><h1>Learn better.<br/><em>Every day.</em></h1><p className="sub">Ask doubts, understand chapters and practise at your own pace.</p></div>
        <div className="hero-orbit"><span>✦</span><small>AI</small></div>
      </section>

      <section className="upload-card">
        <div className="upload-icon">PDF</div>
        <div className="upload-copy"><b>{chapter ? 'Active chapter' : 'Add your textbook chapter'}</b><span>{chapterLabel}</span>{chapter?.pages && <small>{chapter.pages} pages detected</small>}</div>
        <button className="upload-btn" onClick={() => fileRef.current?.click()} disabled={busy}>{chapter ? 'Change' : '＋ Upload'}</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e => uploadPdf(e.target.files?.[0])}/>
      </section>

      <nav className="tabs" aria-label="Study tools">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => { setTab(t.id); setResult(''); setError(''); }}><span>{t.icon}</span>{t.label}</button>)}</nav>

      {tab === 'solver' && <section className="panel"><div className="panel-title"><div><p className="eyebrow">MATHS & DOUBTS</p><h2>Let's solve it</h2></div><span className="pill">STEP BY STEP</span></div><p className="muted">Type your question or share a photo. I'll explain each step and the formula used.</p><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Example: Solve 2x + 5 = 15 and explain each step..." rows="4"/><div className="action-row"><button className="soft-btn" onClick={() => imageRef.current?.click()}>＋ Add question photo</button><input ref={imageRef} hidden type="file" accept="image/*" capture="environment" onChange={e => setImage(e.target.files?.[0] || null)}/>{image && <span className="file-chip">📷 {image.name}</span>}<button className="primary-btn" onClick={solve} disabled={busy}>{busy ? 'Thinking…' : 'Solve question ↗'}</button></div></section>}

      {tab === 'notes' && <section className="panel"><div className="panel-title"><div><p className="eyebrow">CHAPTER NOTES</p><h2>Make learning simple</h2></div><span className="panel-emoji">▤</span></div><p className="muted">Get a chapter summary, important definitions and formulas from your uploaded PDF.</p><button className="primary-btn full" onClick={() => askAI('notes')} disabled={busy || !chapter}>{busy ? 'Preparing notes…' : 'Generate chapter notes ↗'}</button>{!chapter && <p className="hint">Upload a chapter PDF above to unlock chapter-based notes.</p>}</section>}

      {tab === 'quiz' && <section className="panel"><div className="panel-title"><div><p className="eyebrow">PRACTICE QUIZ</p><h2>Test what you know</h2></div><span className="panel-emoji">✓</span></div><p className="muted">Create multiple-choice questions from your chapter or any topic.</p><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Optional topic, e.g. Linear equations"/><button className="primary-btn full" onClick={() => askAI('quiz', { topic })} disabled={busy || (!chapter && !topic.trim())}>{busy ? 'Creating quiz…' : 'Generate 5 questions ↗'}</button>{quiz && <div className="quiz-list">{quiz.questions?.map((q, i) => <div className="quiz-q" key={i}><b>{i+1}. {q.question}</b>{q.options?.map((op, j) => <label className="option" key={j}><input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => { setAnswers(a => ({...a, [i]: j})); setChecked(false); }}/>{op}</label>)}{checked && <div className="explanation"><b>{answers[i] === q.answerIndex ? '✓ Correct' : `Correct answer: ${q.options?.[q.answerIndex]}`}</b><p>{q.explanation}</p></div>}</div>)}<button className="primary-btn full" onClick={() => setChecked(true)}>Check my score</button>{checked && <h3 className="score">Your score: {quiz.questions?.filter((q, i) => answers[i] === q.answerIndex).length || 0} / {quiz.questions?.length || 0}</h3>}</div>}</section>}

      {tab === 'explain' && <section className="panel"><div className="panel-title"><div><p className="eyebrow">AI EXPLAINER</p><h2>Understand anything</h2></div><span className="panel-emoji">✦</span></div><p className="muted">Tell me a topic or chapter. I'll teach it like a friendly teacher, using easy examples in your chosen language.</p><textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What do you want me to explain? Example: The French Revolution, photosynthesis, algebra…" rows="4"/><button className="primary-btn full" onClick={() => askAI('explain', { topic })} disabled={busy || !topic.trim()}>{busy ? 'Preparing explanation…' : 'Explain it to me ↗'}</button></section>}

      {busy && <div className="loading"><span className="loader"/> Your AI teacher is preparing…</div>}
      {error && <div className="error">{error}</div>}
      {renderResult(result)}
      <footer><span>Made for curious minds</span><span>Class 9 · JCERT</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
