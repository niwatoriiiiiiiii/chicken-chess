// Chicken Chess — Badge Edge Function
// shields.io endpoint 形式で累計 Accuracy を返す
//
// 呼び出し例:
//   GET /functions/v1/badge?user=github_username
//
// shields.io バッジURL:
//   https://img.shields.io/endpoint?url=https://YOUR_PROJECT.supabase.co/functions/v1/badge%3Fuser%3DUSERNAME&style=for-the-badge

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const url      = new URL(req.url);
  const username = url.searchParams.get('user');

  if (!username) {
    return new Response(
      JSON.stringify({ error: 'Missing ?user= parameter' }),
      { status: 400, headers: CORS },
    );
  }

  // Service Role Key で DB にアクセス（RLS をバイパス）
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await sb
    .from('game_results')
    .select('accuracy, outcome')
    .eq('github_username', username)
    .order('played_at', { ascending: false })
    .limit(30);

  // ゲーム未プレイ or エラー
  if (error || !data || data.length === 0) {
    return new Response(
      JSON.stringify({
        schemaVersion: 1,
        label:   '🐔 Chess',
        message: 'no games yet',
        color:   '555555',
        style:   'for-the-badge',
      }),
      { headers: CORS },
    );
  }

  // 累計 Accuracy（全ゲームの平均）
  const avgAcc = Math.round(
    data.reduce((sum, r) => sum + r.accuracy, 0) / data.length,
  );

  // Accuracy に応じた色（shields.io の hex カラー）
  const color = avgAcc >= 80 ? '4c9f38'   // 緑
              : avgAcc >= 60 ? 'dfb317'   // 金
              : 'e05d44';                 // 赤

  const badge = {
    schemaVersion: 1,
    label:   '🐔 Chess',
    message: `Acc ${avgAcc}%`,
    color,
    style:   'for-the-badge',
    cacheSeconds: 3600,   // shields.io に1時間キャッシュさせる
  };

  return new Response(JSON.stringify(badge), { headers: CORS });
});
