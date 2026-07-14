import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Message {
  id: string;
  body: string;
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
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  async function init() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(traveller)/messages'); return; }
    setMyId(user.id);

    let convId = conversationId;

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
      fromMe: m.sender_id === userId,
      time: new Date(m.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    })));
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
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
        setMessages(prev => [...prev, {
          id: m.id,
          body: m.body,
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
      return;
    }

    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Always reload after send — Realtime may not fire on web without replica identity
    await loadMessages(conversationId, myId);
  }

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
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello to {hostName || 'your host'} 👋</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
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
  bubbleThem: { backgroundColor: Colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
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
