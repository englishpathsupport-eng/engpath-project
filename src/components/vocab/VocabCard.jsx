import React, { useState, useEffect } from 'react';
import { useWordContent } from '../../hooks/useVocab';
import { STATUS_CONFIG, getLevelConfig } from '../../utils/languages';
function speak(word) {
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(word); u.lang='en-US'; u.rate=0.85; window.speechSynthesis.speak(u); }
}
export default function VocabCard({ word, langCode, langName, userProgress, onMarkSeen, onToggleFavorite, onSubmitReview, isPro }) {
  const [flipped, setFlipped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { content, generating } = useWordContent(word, langCode, langName);
  const levelCfg = getLevelConfig(word.level);
  const status = userProgress?.status || 'new';
  const isFav = userProgress?.is_favorite || false;
  const isLocked = !isPro && !word.is_free;
  useEffect(() => { onMarkSeen?.(word.id); }, [word.id]);
  return (
    <div className="vocab-card-wrapper" onClick={() => !isLocked && setFlipped(f => !f)}>
      <div className={"vocab-card" + (flipped ? " flipped" : "")}>
        <div className="card-face card-front">
          <div className="card-header">
            <span className="level-badge" style={{background: levelCfg.color}}>{word.level}</span>
            <span className="category-tag">{word.category}</span>
            <div className="card-actions" onClick={e => e.stopPropagation()}>
              <button className={"favorite-btn" + (isFav?" active":"")} onClick={() => onToggleFavorite?.(word.id)}>{isFav?'♥':'♡'}</button>
              <span style={{color: STATUS_CONFIG[status]?.color, fontSize:12}}>{STATUS_CONFIG[status]?.icon}</span>
            </div>
          </div>
          <div className="word-main">
            <h2 className="word-text">{word.word}</h2>
            <div className="word-meta-row">
              <span className="ipa">{word.ipa}</span>
              <button className="speak-btn" onClick={e => { e.stopPropagation(); speak(word.word); }}>🔊</button>
              <span className="pos-tag">{word.part_of_speech}</span>
            </div>
            <div className="freq-rank">#{word.frequency_rank} most common</div>
          </div>
          <div className="tap-hint">Tap to see meaning →</div>
          {isLocked && <div className="lock-overlay"><span style={{fontSize:28}}>🔒</span><span className="lock-text">Pro Access</span></div>}
        </div>
        <div className="card-face card-back" onClick={e => e.stopPropagation()}>
          {generating ? (
            <div className="generating"><div className="spinner"/><p>Generating in {langName}...</p></div>
          ) : content ? (
            <div className="card-back-content">
              <div className="meaning-block">
                <div className="meaning-en">{content.english_meaning}</div>
                <div className="meaning-native">{content.native_meaning}</div>
              </div>
              {content.examples?.[0] && <div className="examples-preview"><p className="ex-en">"{content.examples[0].en}"</p><p className="ex-native">{content.examples[0].native}</p></div>}
              <button className="expand-btn" onClick={() => setExpanded(true)}>Full Details ↗</button>
              <div className="review-btns">
                <span className="review-label">How well did you know it?</span>
                <div className="quality-row">
                  {[{q:1,l:'Hard',c:'#ef4444'},{q:3,l:'OK',c:'#f59e0b'},{q:5,l:'Easy',c:'#22c55e'}].map(({q,l,c}) => (
                    <button key={q} className="quality-btn" style={{'--q-color':c}} onClick={() => { onSubmitReview?.(word.id,q); setFlipped(false); }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : <div className="generating"><p>Flip to load meaning</p></div>}
        </div>
      </div>
      {expanded && content && <WordDetailModal word={word} content={content} langName={langName} levelCfg={levelCfg} onClose={() => setExpanded(false)} />}
    </div>
  );
}
function WordDetailModal({ word, content, langName, levelCfg, onClose }) {
  const S = ({title, children}) => <div className="modal-section"><h3 className="section-title">{title}</h3>{children}</div>;
  const Chips = ({items, color}) => <div className="chip-row">{items.map(i=><span key={i} className="chip" style={{'--chip-color':color}}>{i}</span>)}</div>;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <h1 className="modal-word">{word.word}</h1>
          <div className="modal-meta"><span className="ipa">{word.ipa}</span><button className="speak-btn" onClick={()=>speak(word.word)}>🔊</button><span className="pos-tag">{word.part_of_speech}</span><span className="level-badge" style={{background:levelCfg.color}}>{word.level}</span></div>
        </div>
        <S title="Meaning"><p className="meaning-en">{content.english_meaning}</p><p className="meaning-native">{content.native_meaning}</p></S>
        {content.synonyms?.length>0 && <S title="Synonyms"><Chips items={content.synonyms} color="#3b82f6"/></S>}
        {content.antonyms?.length>0 && <S title="Antonyms"><Chips items={content.antonyms} color="#ef4444"/></S>}
        {content.collocations?.length>0 && <S title="Collocations"><Chips items={content.collocations} color="#8b5cf6"/></S>}
        {content.phrases?.length>0 && <S title="Common Phrases"><Chips items={content.phrases} color="#f97316"/></S>}
        {content.examples?.length>0 && <S title="Real-Life Examples">{content.examples.map((ex,i)=><div key={i} className="example-full"><span className="ex-num">{i+1}.</span><div><p className="ex-en">"{ex.en}"</p><p className="ex-native">{ex.native}</p></div></div>)}</S>}
        {content.usage_notes && <S title={"Usage Notes ("+langName+")"}><p className="notes-text">{content.usage_notes}</p></S>}
        {content.common_mistakes && <S title="⚠️ Common Mistakes"><p className="mistake-text">{content.common_mistakes}</p></S>}
        {content.memory_tip && <S title="💡 Memory Tip"><p className="tip-text">{content.memory_tip}</p></S>}
      </div>
    </div>
  );
}