import React from 'react';
import { CEFR_LEVELS, WORD_CATEGORIES } from '../../utils/languages';
export function LevelTabs({ activeLevel, onSelect, isPro }) {
  return (
    <div className="level-tabs">
      {CEFR_LEVELS.map(level => {
        const locked = !isPro && !['A1','A2'].includes(level.code);
        return (
          <button key={level.code} className={"level-tab" + (activeLevel===level.code?" active":"") + (locked?" locked":"")} onClick={() => !locked && onSelect(level.code)} style={{'--level-color': level.color}}>
            <span className="level-code">{level.code}</span>
            <span className="level-label">{level.label}</span>
            {locked && <span style={{fontSize:10}}>🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
export function CategoryFilter({ level, activeCategory, onSelect }) {
  const cats = ['All', ...(WORD_CATEGORIES[level] || [])];
  return (
    <div className="category-filter">
      {cats.map(c => <button key={c} className={"cat-pill" + (activeCategory===c?" active":"")} onClick={() => onSelect(c)}>{c}</button>)}
    </div>
  );
}