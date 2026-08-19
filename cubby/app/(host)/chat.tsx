import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import ReportReasonModal from '../../src/components/ReportReasonModal';
import { reportContent, blockUser } from '../../src/lib/moderation-service';

interface Message {
  id: string;
  body: string;
  senderId: string;
  fromMe: boolean;
  time: string;
}

export default function HostChat() {
  const { conversationId, travellerName } = useLocalSearchParams<{
    conversationId: string;
    travellerName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [travellerId, setTravellerId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportTargetMessageId, setReportTargetMessageId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  // FAT-013: was `[]` — only ran once, so navigating directly from one
  // conversation to another (same screen instance, new conversationId
  // param) never re-loaded messages or re-subscribed, leaving the
  // previous conversation's messages/subscription showing. Depending on
  // conversationId re-runs init() (and its cleanup, tearing down the old
  // realtime subscription) whenever the route actually points at a
  // different conversation.
  //
  // FAT-018: travellerId/bookingId were left out of that reset — init()
  // only ever overwrote them once its async conversation lookup resolved,
  // never cleared them first. The header name (a route param) updates
  // instantly on switch, but "View profile" used this stale state, so it
  // could stay pointing at the *previous* conversation's traveller for the
  // brief window before init() finished — tap it then and it opens the
  // wrong person. Clearing them here means the button (already guarded by
  // `!!travellerId && !!bookingId`) simply disappears until the correct
  // ids for the current conversation load, instead of staying tappable
  // with the wrong ones.
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setTravellerId(null);
    setBookingId(null);
    setIsBlocked(false);
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, [conversationId]);

  async function init() {
    if (!isSupabaseConfigured || !conversationId) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(host)/messages'); return; }
    setMyId(user.id);
    // Fetch traveller_id from conversation for profile link
    const { data: convo } = await supabase
      .from('conversations')
      .select('traveller_id, booking_id')
      .eq('id', conversationId)
      .single();
    if (convo?.traveller_id) {
      setTravellerId(convo.traveller_id);
      const { data: blockRow } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', convo.traveller_id)
        .maybeSingle();
      setIsBlocked(!!blockRow);
    }
    if (convo?.booking_id) setBookingId(convo.booking_id);
    await loadMessages(user.id);
    subscribeRealtime(user.id);
    setLoading(false);
  }

  async function loadMessages(userId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, body, sender_id, created_at')
      .eq('conversation_id', conversationId)
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
    // conversation is open (FAT-008) — (host)/messages.tsx's unread badge
    // is computed purely from read_at IS NULL, and nothing here ever set
    // it. RLS policy for this already exists ("Participants can mark
    // messages as read"), so this is the only piece that was missing.
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('read_at', null)
      .neq('sender_id', userId);
  }

  function subscribeRealtime(userId: string) {
    channelRef.current = supabase
      .channel(`host-messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
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

    const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: myId, body });

    if (error) {
      console.error('Message insert error:', error);
      setInput(body);
      if (error.code === '23514' && error.message?.includes('_no_objectionable_language')) {
        Alert.alert('Message not sent', "Your message contains language that isn't allowed. Please revise it and try again.");
      } else if (error.code === '42501') {
        Alert.alert('Message not sent', "This message couldn't be sent. Please try again later.");
      } else {
        Alert.alert('Message not sent', 'Something went wrong. Please try again.');
      }
      return;
    }

    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    await loadMessages(myId);
  }

  function showMessageActions(m: Message) {
    Alert.alert(
      'Message options',
      undefined,
      [
        { text: 'Report message', onPress: () => setReportTargetMessageId(m.id) },
        { text: 'Block user', style: 'destructive', onPress: handleBlockOther },
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

  async function handleBlockOther() {
    if (!myId || !travellerId) return;
    Alert.alert(
      `Block ${travellerName || 'this user'}?`,
      "You won't be able to message each other. Existing messages aren't deleted.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockUser(myId, travellerId);
            if (result.ok) {
              setIsBlocked(true);
            } else {
              Alert.alert('Could not block this user', result.error ?? 'Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(host)/messages')}
          // @ts-ignore
          onClick={() => router.replace('/(host)/messages')}
        >
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{travellerName || 'Traveller'}</Text>
          <Text style={styles.headerSub}>Booking conversation</Text>
        </View>
        {!!travellerId && !!bookingId && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId, bookingId, returnTo: 'messages' } })}
            // @ts-ignore
            onClick={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId, bookingId, returnTo: 'messages' } })}
          >
            <Text style={styles.viewProfileLink}>View profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          // Only the blocked traveller's own messages are hidden — my own
          // sent history stays visible to me. Underlying rows are never
          // touched, this is a render-only filter.
          data={messages.filter(m => !(isBlocked && m.senderId === travellerId))}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet — the traveller will reach out here 👋</Text>
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

      {isBlocked ? (
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
  headerSub: { fontSize: 12, color: Colors.textSecondary },
  viewProfileLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  messagesList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyChatText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
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
