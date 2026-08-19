import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import ReportReasonModal from '../../src/components/ReportReasonModal';
import { reportContent, blockUser, getBlockedUserIds } from '../../src/lib/moderation-service';

interface Message {
  id: string;
  body: string;
  senderId: string;
  fromMe: boolean;
  time: string;
}

export default function Chat() {
  const { bookingId, hostName, conversationId: paramConvId } = useLocalSearchParams<{
    bookingId?: string;
    hostName?: string;
    conversationId?: string;
  }>();

  const [conversationId, setConversationId] = useState<string | null>(paramConvId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  // Every user id this account has blocked (not scoped to this
  // conversation) — deliberately not derived from hosts.user_id/
  // assigned_user_id. A message's sender_id is the authoritative identity
  // of who actually sent it, so blocking (and the resulting filtering)
  // is keyed off real sender_ids from the conversation's own messages,
  // never off listing-ownership metadata.
  const [blockedSenderIds, setBlockedSenderIds] = useState<Set<string>>(new Set());
  const [reportTargetMessageId, setReportTargetMessageId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  // FAT-013: was `[]` — only ran once, so navigating directly from one
  // conversation to another (same screen instance, new route params) never
  // re-loaded messages or re-subscribed, leaving the previous
  // conversation's messages/subscription showing. Depending on the actual
  // route params re-runs init() (and its cleanup, tearing down the old
  // realtime subscription) whenever they point at a different
  // conversation/booking.
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, [paramConvId, bookingId]);

  async function init() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(traveller)/messages'); return; }
    setMyId(user.id);

    // Always source the starting conversation id fresh from the current
    // route param rather than local state — conversationId state can be
    // stale from a previous conversation this same screen instance was
    // showing before this effect re-ran.
    let convId = paramConvId ?? null;

    // Create or find conversation from bookingId
    if (!convId && bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('host_id, traveller_id')
        .eq('id', bookingId)
        .single();

      if (booking) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('booking_id', bookingId)
          .single();

        if (existing) {
          convId = existing.id;
        } else {
          const { data: created } = await supabase
            .from('conversations')
            .insert({ booking_id: bookingId, traveller_id: booking.traveller_id, host_id: booking.host_id })
            .select('id')
            .single();
          convId = created?.id ?? null;
        }
      }
    }

    if (!convId) { setLoading(false); return; }
    setConversationId(convId);

    // Load this account's full block list before messages, so the very
    // first render already filters correctly rather than flashing
    // unfiltered content first. Not scoped to this conversation — it's
    // just this user's own blocked_users rows (own-row RLS).
    setBlockedSenderIds(await getBlockedUserIds(user.id));

    await loadMessages(convId, user.id);
    subscribeRealtime(convId, user.id);
    setLoading(false);
  }

  async function loadMessages(convId: string, userId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, body, sender_id, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages((data ?? []).map((m: any) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender_id,
      fromMe: m.sender_id === userId,
      time: new Date(m.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    })));
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);

    // Mark the other participant's messages as read now that this
    // conversation is open (FAT-008) — (traveller)/messages.tsx's unread
    // badge is computed purely from read_at IS NULL, and nothing here
    // ever set it. RLS policy for this already exists ("Participants can
    // mark messages as read"), so this is the only piece that was missing.
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .is('read_at', null)
      .neq('sender_id', userId);
  }

  function subscribeRealtime(convId: string, userId: string) {
    channelRef.current = supabase
      .channel(`messages:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload: any) => {
        const m = payload.new;
        // FAT-017: send() reloads the full message list right after
        // inserting, so this realtime INSERT for that same row can arrive
        // afterward and append a second copy. Skip if a message with this
        // exact id is already in state — never skips a genuinely new id.
        const incomingId = m.id;
        setMessages(prev => prev.some(existing => existing.id === incomingId) ? prev : [...prev, {
          id: m.id,
          body: m.body,
          senderId: m.sender_id,
          fromMe: m.sender_id === userId,
          time: new Date(m.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  }

  async function send() {
    if (!input.trim() || !conversationId || !myId) return;
    const body = input.trim();
    setInput('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: myId,
      body,
    });

    if (error) {
      console.error('Message insert error:', error);
      setInput(body); // restore input if failed
      if (error.code === '23514' && error.message?.includes('_no_objectionable_language')) {
        Alert.alert('Message not sent', "Your message contains language that isn't allowed. Please revise it and try again.");
      } else if (error.code === '42501') {
        // RLS rejection — either party has blocked the other. Never expose
        // the raw Postgres/RLS error; a neutral message is enough (this
        // path is also unreachable from the blocker's own composer, since
        // it's hidden once a blocked sender is detected in this
        // conversation — this covers the OTHER side: someone who has been
        // blocked, sending without knowing it).
        Alert.alert('Message not sent', "This message couldn't be sent. Please try again later.");
      } else {
        Alert.alert('Message not sent', 'Something went wrong. Please try again.');
      }
      return;
    }

    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Always reload after send — Realtime may not fire on web without replica identity
    await loadMessages(conversationId, myId);
  }

  function showMessageActions(m: Message) {
    Alert.alert(
      'Message options',
      undefined,
      [
        { text: 'Report message', onPress: () => setReportTargetMessageId(m.id) },
        { text: 'Block user', style: 'destructive', onPress: () => handleBlockSender(m.senderId) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleReportMessage(reason: string) {
    if (!reportTargetMessageId) return;
    setReportSubmitting(true);
    const result = await reportContent('message', reportTargetMessageId, reason);
    setReportSubmitting(false);
    setReportTargetMessageId(null);
    if (result.ok) {
      Alert.alert('Report submitted', "Thanks — we'll take a look at this.");
    } else {
      Alert.alert('Could not submit report', 'Please try again in a moment.');
    }
  }

  // Blocks the actual sender of the message the "•••" menu was opened
  // from — message.sender_id is the authoritative identity of who sent
  // it, not something derived from listing-ownership metadata (a listing
  // can have a separate owner vs. assigned manager, and either may be the
  // one actually messaging — the message itself already tells us which).
  async function handleBlockSender(senderId: string) {
    if (!myId) return;
    Alert.alert(
      `Block ${hostName || 'this user'}?`,
      "You won't be able to message each other. Existing messages aren't deleted.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockUser(myId, senderId);
            if (result.ok) {
              setBlockedSenderIds(prev => new Set(prev).add(senderId));
            } else {
              Alert.alert('Could not block this user', result.error ?? 'Please try again.');
            }
          },
        },
      ]
    );
  }

  // Derived, not stored — the smallest reliable way to know "is the other
  // side of this conversation blocked" without any listing-ownership
  // metadata: check whether any real sender seen in this conversation's
  // own messages is in my blocked list. Naturally handles a listing with
  // more than one messaging participant (owner + assigned manager) the
  // same way the database's own RESTRICTIVE policy already does — blocking
  // any one of them disables the composer, since the DB would reject a
  // send to this conversation either way.
  const conversationIsBlocked = messages.some(m => !m.fromMe && blockedSenderIds.has(m.senderId));
  const visibleMessages = messages.filter(m => !(m.senderId !== myId && blockedSenderIds.has(m.senderId)));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(traveller)/messages')}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/messages')}
        >
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerName}>{hostName || 'Host'}</Text>
          <Text style={styles.headerStatus}>🟢 Usually replies quickly</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          // Only blocked senders' own messages are hidden — my own sent
          // history stays visible to me. The underlying rows are never
          // touched; this is a render-only filter.
          data={visibleMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello to {hostName || 'your host'} 👋</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
              {!item.fromMe && (
                <TouchableOpacity
                  style={styles.msgMenuBtn}
                  onPress={() => showMessageActions(item)}
                  // @ts-ignore
                  onClick={() => showMessageActions(item)}
                >
                  <Text style={styles.msgMenuBtnText}>•••</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.bubbleText, item.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                {item.body}
              </Text>
              <Text style={[styles.bubbleTime, item.fromMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                {item.time}
              </Text>
            </View>
          )}
        />
      )}

      {conversationIsBlocked ? (
        <View style={styles.blockedBar}>
          <Text style={styles.blockedBarText}>🚫 You blocked this user. You can't send or receive messages here.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={Colors.textLight}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={send}
              // @ts-ignore
              onClick={send}
              disabled={!input.trim()}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <ReportReasonModal
        visible={!!reportTargetMessageId}
        submitting={reportSubmitting}
        onSelect={handleReportMessage}
        onClose={() => setReportTargetMessageId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 24, color: Colors.textPrimary },
  headerName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerStatus: { fontSize: 12, color: Colors.success },
  messagesList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 16, color: Colors.textSecondary },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12, marginBottom: 4 },
  bubbleMe: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border, paddingRight: 28, position: 'relative' },
  msgMenuBtn: { position: 'absolute', top: 2, right: 4, paddingHorizontal: 6, paddingVertical: 4 },
  msgMenuBtnText: { fontSize: 13, color: Colors.textLight, fontWeight: '800' },
  blockedBar: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  blockedBarText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  bubbleTextThem: { color: Colors.textPrimary },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  bubbleTimeThem: { color: Colors.textLight },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, maxHeight: 100, borderWidth: 1.5, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: Colors.white, fontWeight: '700' },
});
