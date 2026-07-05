import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../utils/languages';
export default function LanguagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const sel = SUPPORTED_LANGUAGES.find(l => l.code === value) || SUPPORTED_LANGUAGES[0];
  return (
    <div className="lang-picker">
      <button className="lang-trigger" onClick={() => setOpen(o => !o)}>
        <span>{sel.flag}</span><span className="lang-name">{sel.native}</span><span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          <p className="lang-dropdown-title">Meaning language</p>
          {SUPPORTED_LANGUAGES.map(l => (
            <button key={l.code} className={"lang-option" + (value === l.code ? " selected" : "")} onClick={() => { onChange(l.code); setOpen(false); }}>
              <span>{l.flag}</span>
              <div className="lang-info"><span className="lang-name">{l.name}</span><span className="lang-native">{l.native}</span></div>
              {value === l.code && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}