import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Conversation = {
  id: string;
  user_id: string;
  updated_at?: string | null;
  last_message_at?: string | null;
  last_message_body?: string | null;
  unread_user?: number | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'student' | 'admin';
  body: string;
  created_at: string;
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const SupportChatWidget: React.FC<{ isAuthenticated: boolean; isAdmin: boolean }>= ({ isAuthenticated, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const unread = useMemo(() => {
    const n = Number(conversation?.unread_user ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [conversation?.unread_user]);

  const ensureConversation = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) throw new Error('غير مسجل دخول');

    const { data: existing, error: e1 } = await supabase
      .from('support_conversations')
      .select('id, user_id, updated_at, last_message_at, last_message_body, unread_user')
      .eq('user_id', uid)
      .maybeSingle();

    if (!e1 && existing?.id) return existing as Conversation;

    const { data: created, error: e2 } = await supabase
      .from('support_conversations')
      .insert([{ user_id: uid }])
      .select('id, user_id, updated_at, last_message_at, last_message_body, unread_user')
      .single();

    if (e2) throw e2;
    return created as Conversation;
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, conversation_id, sender_id, sender_role, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    setMessages((data || []) as Message[]);
  };

  const markRead = async (conversationId: string) => {
    try {
      await supabase
        .from('support_conversations')
        .update({ user_last_read_at: new Date().toISOString(), unread_user: 0 })
        .eq('id', conversationId);
    } catch {
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!isAuthenticated || isAdmin) return;

    let mounted = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;

        const { data: existing, error } = await supabase
          .from('support_conversations')
          .select('id, user_id, updated_at, last_message_at, last_message_body, unread_user')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) return;
        if (!mounted) return;
        setConversation((existing as Conversation) || null);
      } catch {
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!isAuthenticated || isAdmin) return;
    if (!conversation?.id) return;

    const convId = conversation.id;
    const convChannel = supabase
      .channel(`support_conversation_${convId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_conversations', filter: `id=eq.${convId}` },
        (payload) => {
          const next = payload.new as any;
          setConversation((prev) => ({ ...(prev || ({} as any)), ...(next as any) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [isAuthenticated, isAdmin, conversation?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isSupabaseConfigured) return;

    let mounted = true;
    let msgChannel: any = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const conv = conversation?.id ? conversation : await ensureConversation();
        if (!mounted) return;
        if (!conversation?.id) setConversation(conv);

        await loadMessages(conv.id);
        if (!mounted) return;
        await markRead(conv.id);

        msgChannel = supabase
          .channel(`support_messages_${conv.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conv.id}` },
            (payload) => {
              const next = payload.new as Message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === next.id)) return prev;
                return [...prev, next];
              });
            }
          )
          .subscribe();
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'فشل تحميل الرسائل');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (msgChannel) supabase.removeChannel(msgChannel);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOpen]);

  const handleSend = async () => {
    const conv = conversation?.id ? conversation : null;
    const body = draft.trim();
    if (!body) return;
    if (!isSupabaseConfigured) return;

    setSending(true);
    setError(null);
    try {
      const ensured = conv || (await ensureConversation());
      if (!conversation?.id) setConversation(ensured);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('غير مسجل دخول');

      const { error } = await supabase.from('support_messages').insert([
        {
          conversation_id: ensured.id,
          sender_id: uid,
          sender_role: 'student',
          body,
        },
      ]);
      if (error) throw error;
      setDraft('');
      await markRead(ensured.id);
    } catch (e: any) {
      setError(e?.message || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated || isAdmin) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[90]">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="relative w-14 h-14 rounded-full bg-dark text-white shadow-2xl hover:bg-black transition-colors flex items-center justify-center"
          title="الدعم"
        >
          <MessageCircle size={22} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-4 z-[90] w-[92vw] max-w-sm bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-dark">الدعم</div>
                <div className="text-[11px] font-bold text-gray-400">رد سريع داخل المنصة</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-[340px] bg-gray-50 p-3 overflow-y-auto">
              {!isSupabaseConfigured ? (
                <div className="text-center text-xs font-bold text-gray-400 mt-12">Supabase غير مُعد</div>
              ) : loading ? (
                <div className="text-center text-xs font-bold text-gray-400 mt-12">جاري التحميل...</div>
              ) : error ? (
                <div className="text-center text-xs font-bold text-red-500 mt-12">{error}</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs font-bold text-gray-400 mt-12">ابدأ رسالتك الأولى</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const isMe = m.sender_role === 'student';
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm font-bold ${isMe ? 'bg-dark text-white rounded-br-md' : 'bg-white border border-gray-200 text-dark rounded-bl-md'}`}>
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`mt-1 text-[10px] font-black ${isMe ? 'text-white/70' : 'text-gray-400'}`} dir="ltr">
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 font-bold text-sm"
                  disabled={!isSupabaseConfigured || sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!isSupabaseConfigured || sending || !draft.trim()}
                  className="w-12 h-12 rounded-2xl bg-dark text-white flex items-center justify-center hover:bg-black disabled:opacity-50"
                  title="إرسال"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatWidget;
