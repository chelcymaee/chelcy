// Edge Function: notify-new-message
// Triggered by a Supabase Database Webhook on INSERT to the messages table.
// Looks up the recipient's Expo push token and fires a push notification.
//
// Deploy: supabase functions deploy notify-new-message
// Set secrets: supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-access-token>
//
// Database Webhook setup (Supabase Dashboard → Database → Webhooks):
//   Table: messages    Event: INSERT
//   URL: https://<project>.supabase.co/functions/v1/notify-new-message

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record; // The inserted messages row

    if (!message?.conversation_id || !message?.sender_id || !message?.body) {
      return new Response('invalid payload', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find conversation to determine recipient
    const { data: conv } = await supabase
      .from('conversations')
      .select('traveller_id, host_id')
      .eq('id', message.conversation_id)
      .single();

    if (!conv) return new Response('conversation not found', { status: 404 });

    // Determine recipient (whoever isn't the sender)
    let recipientUserId: string;
    if (message.sender_id === conv.traveller_id) {
      // Sender is traveller → notify host
      const { data: host } = await supabase
        .from('hosts')
        .select('user_id, assigned_user_id')
        .eq('id', conv.host_id)
        .single();
      recipientUserId = host?.assigned_user_id ?? host?.user_id;
    } else {
      // Sender is host → notify traveller
      recipientUserId = conv.traveller_id;
    }

    if (!recipientUserId) return new Response('recipient not found', { status: 404 });

    // Get sender name
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', message.sender_id)
      .single();
    const senderName = sender?.full_name?.trim() || sender?.email?.split('@')[0] || 'Someone';

    // Look up recipient push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipientUserId);

    if (!tokens || tokens.length === 0) {
      // No push tokens registered — in-app notification already created by DB trigger
      return new Response('no push tokens', { status: 200 });
    }

    // Send Expo push notifications
    const expoPushMessages = tokens.map(({ token }) => ({
      to: token,
      title: `New message from ${senderName}`,
      body: message.body.length > 100 ? message.body.substring(0, 97) + '…' : message.body,
      data: { conversation_id: message.conversation_id, type: 'new_message' },
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(expoPushMessages),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('notify-new-message error:', e);
    return new Response('error', { status: 500 });
  }
});
