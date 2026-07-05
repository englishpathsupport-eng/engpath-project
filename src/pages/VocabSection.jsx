import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useVocab } from '../hooks/useVocab';
import { useVocabProgress } from '../hooks/useVocabProgress';
import { getLangConfig } from '../utils/languages';
import VocabCard from '../components/vocab/VocabCard';
import LanguagePicker from '../components/vocab/LanguagePicker';
import { LevelTabs, CategoryFilter } from '../components/vocab/LevelTabs';
import VocabProgress from '../components/vocab/VocabProgress';
import '../styles/vocab.css';
const PAGE_SIZE = 20;
export default function VocabSection() {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [langCode, setLangCode] = useState('ml');
  const [ready, setReady] = useState(false);
  const [activeLevel, setLevel] = useState('A1');
  const [activeCategory, setCat] = useState('All');
  const [page, setPage] = useState(0);
  const [view, setView] = useState('learn');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user; setUser(u);
      if (u) loadSettings(u.id); else setReady(true);
    });
  }, []);
  async function loadSettings(uid) {
    let { data } = await supabase.from('user_settings').select('preferred_language,current_level,is_pro').eq('user_id', uid).maybeSingle();
    if (!data) { await supabase.from('user_settings').insert({ user_id: uid }); data = { preferred_language: 'ml', current_level: 'A1', is_pro: false }; }
    setLangCode(data.preferred_language || 'ml'); setLevel(data.current_level || 'A1'); setIsPro(data.is_pro || false); setReady(true);
  }
  async function saveLang(code) {
    setLangCode(code);
    if (user) await supabase.from('user_settings').upsert({ user_id: user.id, preferred_language: code });
  }
  const langCfg = getLangConfig(langCode);
  const { words, loading, total } = useVocab({ level: activeLevel, category: activeCategory, languageCode: langCode, page, pageSize: PAGE_SIZE });
  const { progress, stats, markSeen, submitReview, toggleFavorite } = useVocabProgress(user?.id);
  const favWords = words.filter(w => progress[w.id]?.is_favorite);
  const displayWords = view === 'favorites' ? favWords : words;
  if (!ready) return <div className="vocab-loading"><div className="spinner-large"/><p>Loading...</p></div>;
  return (
    <div className="vocab-page">
      <div className="vocab-topbar">
        <div className="topbar-left"><h1 className="vocab-title">Vocabulary</h1>{isPro?<span className="pro-badge">PRO</span>:<span className="free-badge">FREE</span>}</div>
        <LanguagePicker value={langCode} onChange={saveLang}/>
      </div>
      <LevelTabs activeLevel={activeLevel} onSelect={l=>{setLevel(l);setCat('All');setPage(0);}} isPro={isPro}/>
      <CategoryFilter level={activeLevel} activeCategory={activeCategory} onSelect={c=>{setCat(c);setPage(0);}}/>
      <VocabProgress stats={stats} level={activeLevel} total={total}/>
      <div className="view-tabs">
        {[{id:'learn',icon:'📖',label:'Learn'},{id:'favorites',icon:'♥',label:'Saved ('+favWords.length+')'}].map(v=>(
          <button key={v.id} className={"view-tab"+(view===v.id?" active":"")} onClick={()=>setView(v.id)}><span>{v.icon}</span><span>{v.label}</span></button>
        ))}
      </div>
      {!isPro && activeLevel!=='A1' && (
        <div className="upgrade-banner"><span className="upgrade-icon">⭐</span><div><strong>Upgrade to Pro</strong><p>Unlock all {total}+ words in {activeLevel}</p></div><button className="upgrade-btn">Get Pro</button></div>
      )}
      {loading ? (
        <div className="words-loading">{Array(6).fill(0).map((_,i)=><div key={i} className="word-skeleton"/>)}</div>
      ) : displayWords.length===0 ? (
        <div className="words-empty"><span className="empty-icon">📚</span><p>{view==='favorites'?'No saved words yet. Tap ♡ on any card.':'No words found.'}</p></div>
      ) : (
        <div className="words-grid">
          {displayWords.map(word=>(
            <VocabCard key={word.id} word={word} langCode={langCode} langName={langCfg.name} userProgress={progress[word.id]} onMarkSeen={markSeen} onToggleFavorite={toggleFavorite} onSubmitReview={submitReview} isPro={isPro}/>
          ))}
        </div>
      )}
      {!loading && total>PAGE_SIZE && (
        <div className="pagination">
          <button className="page-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Prev</button>
          <span className="page-info">{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} of {total}</span>
          <button className="page-btn" disabled={(page+1)*PAGE_SIZE>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
        </div>
      )}
    </div>
  );
}