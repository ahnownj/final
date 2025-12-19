import { supabase } from './supabaseClient';

const TABLE = 'notes';

export const fetchNoteForPlace = async (placeId) => {
  if (placeId === null || placeId === undefined) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('place_id, author, body, updated_at')
      .eq('place_id', placeId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.warn('노트 불러오기 실패', err);
    return null;
  }
};

export const saveNoteForPlace = async ({ placeId, author, body }) => {
  if (placeId === null || placeId === undefined) return null;

  const payload = {
    place_id: placeId,
    author: author?.trim?.() || 'Unknown',
    body: body || '',
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'place_id', returning: 'minimal' });

    if (error) throw error;
    return payload;
  } catch (err) {
    console.warn('노트 저장 실패', err);
    return null;
  }
};
