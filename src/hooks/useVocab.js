import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

async function generateWordContent(word, wordData, languageCode, langName) {
  const prompt = `You are an expert English vocabulary teacher. Generate rich learning content for the word "${word}". Word: part_of_speech=${wordData.part_of_speech}, level=${wordData.level}, category=${wordData.category}. Return ONLY valid JSON (no markdown): {"english_meaning":"Clear definition","native_meaning":"Meaning in ${langName}","synonyms":["w1","w2","w3"],"antonyms":["w1","w2"],"collocations":["p1","p2","p3"],"phrases":["p1","p2"],"examples":[{"en":"Ex 1","native":"Translation in ${langName}"},{"en":"Ex 2","native":"Translation"},{"en":"Ex 3","native":"Translation"}],"usage_notes":"Note in ${langName}","common_mistakes":"Mistake in ${langName}","memory_tip":"Tip in ${langName}"}`;
  const r = await fetch('/api/generate-vocab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
  if (!r.ok) throw new Error('AI generation failed');
  return (await r.json()).content;
}

export function useVocab({ level, category, languageCode, page = 0, pageSize = 20 }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  useEffect(() => { if (level && languageCode) fetchWords(); }, [level, category, languageCode, page]);
  async function fetchWords() {
    setLoading(true); setError(null);
    try {
      let q = supabase.from('vocab_words').select('*', { count: 'exact' }).eq('level', level).order('frequency_rank', { ascending: true }).range(page * pageSize, (page + 1) * pageSize - 1);
      if (category && category !== 'All') q = q.eq('category', category);
      const { data: wordData, error: wErr, count } = await q;
      if (wErr) throw wErr;
      setTotal(count || 0);
      if (!wordData?.length) { setWords([]); setLoading(false); return; }
      const ids = wordData.map(w => w.id);
      const { data: cached } = await supabase.from('vocab_content_cache').select('*').in('word_id', ids).eq('language_code', languageCode);
      const cacheMap = {};
      (cached || []).forEach(c => { cacheMap[c.word_id] = c; });
      setWords(wordData.map(w => ({ ...w, content: cacheMap[w.id] || null })));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return { words, loading, error, total, refetch: fetchWords };
}

export function useWordContent(wordData, languageCode, langName) {
  const [content, setContent] = useState(wordData?.content || null);
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    if (wordData?.content) { setContent(wordData.content); return; }
    if (wordData && !content) loadOrGenerate();
  }, [wordData?.id, languageCode]);
  async function loadOrGenerate() {
    if (!wordData) return;
    const { data: cached } = await supabase.from('vocab_content_cache').select('*').eq('word_id', wordData.id).eq('language_code', languageCode).maybeSingle();
    if (cached) { setContent(cached); return; }
    setGenerating(true);
    try {
      const generated = await generateWordContent(wordData.word, wordData, languageCode, langName);
      const { data: saved } = await supabase.from('vocab_content_cache').upsert({ word_id: wordData.id, language_code: languageCode, ...generated }).select().single();
      setContent(saved || generated);
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  }
  return { content, generating };
}