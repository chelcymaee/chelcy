// Edge Function: send-push
// Generic Expo push notification sender.
// Accepts: { user_id, title, body, data? }
// Auth: x-admin-secret header (server-to-server) OR valid Supabase JWT (client)
//
// Deploy: npx supabase functions deploy send-push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Authenticate: x-admin-secret (server) or Supabase JWT (client)
    const adminSecret = req.headers.get('x-admin-secret');
    const authHeader = req.headers.get('authorization');
    let authed = false;

    if (adminSecret === ADMIN_SECRET) {
      authed = true;
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user } } = await adminClient.auth.getUser(token);
      authed = !!user;
    }

    if (!authed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title and body are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      title,
      body: body.length > 150 ? body.substring(0, 147) + '…' : body,
      data: data ?? {},
      sound: 'default',
    }));

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    console.log(`send-push: sent ${messages.length} push(es) to user ${user_id}, expo status ${pushRes.status}`);

    return new Response(JSON.stringify({ sent: messages.length }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-push error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
