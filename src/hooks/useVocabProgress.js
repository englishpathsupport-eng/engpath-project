import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
export function useVocabProgress(userId) {
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (userId) fetchProgress(); }, [userId]);
  async function fetchProgress() {
    const { data } = await supabase.from('user_vocab_progress').select('word_id,status,is_favorite,next_review,seen_count,correct_count').eq('user_id', userId);
    const map = {};
    (data || []).forEach(p => { map[p.word_id] = p; });
    setProgress(map);
    const counts = { new: 0, learning: 0, familiar: 0, mastered: 0 };
    (data || []).forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    setStats({ ...counts, total: data?.length || 0 });
    setLoading(false);
  }
  const markSeen = useCallback(async (wordId) => {
    if (!userId) return;
    await supabase.from('user_vocab_progress').upsert({ user_id: userId, word_id: wordId, status: progress[wordId]?.status || 'learning', last_seen: new Date().toISOString(), seen_count: (progress[wordId]?.seen_count || 0) + 1 }, { onConflict: 'user_id,word_id' });
    setProgress(p => ({ ...p, [wordId]: { ...p[wordId], seen_count: (p[wordId]?.seen_count || 0) + 1 } }));
  }, [userId, progress]);
  const submitReview = useCallback(async (wordId, quality) => {
    if (!userId) return;
    await supabase.rpc('update_spaced_repetition', { p_user_id: userId, p_word_id: wordId, p_quality: quality });
    await fetchProgress();
  }, [userId]);
  const toggleFavorite = useCallback(async (wordId) => {
    if (!userId) return;
    const cur = progress[wordId]?.is_favorite || false;
    await supabase.from('user_vocab_progress').upsert({ user_id: userId, word_id: wordId, is_favorite: !cur }, { onConflict: 'user_id,word_id' });
    setProgress(p => ({ ...p, [wordId]: { ...p[wordId], is_favorite: !cur } }));
  }, [userId, progress]);
  return { progress, stats, loading, markSeen, submitReview, toggleFavorite };
}