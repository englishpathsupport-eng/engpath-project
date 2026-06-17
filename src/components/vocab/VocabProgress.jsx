import React from 'react';
import { STATUS_CONFIG } from '../../utils/languages';
export default function VocabProgress({ stats, level, total }) {
  if (!stats) return null;
  const pct = total > 0 ? Math.round((stats.mastered / total) * 100) : 0;
  return (
    <div className="vocab-progress">
      <div className="progress-header">
        <div className="progress-main"><span className="progress-pct">{pct}%</span><span className="progress-label"> mastered</span></div>
        <div className="progress-counts">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="progress-stat">
              <span style={{color: v.color}}>{v.icon}</span>
              <span className="stat-num">{stats[k] || 0}</span>
              <span className="stat-label">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="progress-bar-track"><div className="progress-bar-fill" style={{width: pct + '%'}} /></div>
      <p className="progress-hint">{stats.mastered || 0} / {total} words mastered in {level}</p>
    </div>
  );
}