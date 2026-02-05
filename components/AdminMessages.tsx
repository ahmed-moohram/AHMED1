import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, MessageSquareText, Lock, Unlock, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type ConversationRow = {
  id: string;
  user_id: string;
  updated_at: string;
  last_message_at?: string | null;
  last_message_body?: string | null;
  unread_admin?: number | null;
  is_closed?: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  student_id: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'student' | 'admin';
  body: string;
  created_at: string;
};

type UiMessage = MessageRow & { optimistic?: boolean };

const createUuid = () => {
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  c?.getRandomValues?.(bytes);
  if (bytes.every((b: number) => b === 0)) {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '';
  }
};

const AdminMessages: React.FC<{ currentUserId: string | null }> = ({ currentUserId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const msgChannelRef = useRef<any>(null);
  const pendingBroadcastRef = useRef<UiMessage[]>([]);
  const [channelReady, setChannelReady] = useState(false);

  const fetchConversations = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: e1 } = await supabase
        .from('support_conversations')
        .select('id, user_id, updated_at, last_message_at, last_message_body, unread_admin, is_closed')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (e1) throw e1;

      const rows = (data || []) as ConversationRow[];
      setConversations(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length === 0) {
        setProfilesById({});
        return;
      }

      const { data: p, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name, student_id')
        .in('id', userIds);

      if (e2) throw e2;

      const map: Record<string, ProfileRow> = {};
      (p || []).forEach((row: any) => {
        map[row.id] = row as ProfileRow;
      });
      setProfilesById(map);
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  };

  const clearSelectedChat = async () => {
    if (!selectedConversationId) return;
    if (!isSupabaseConfigured) return;
    const ok = globalThis.confirm?.('مسح كل رسائل هذه المحادثة؟ لا يمكن التراجع.');
    if (!ok) return;

    setClearing(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('support_admin_clear_conversation', {
        p_conversation_id: selectedConversationId,
        p_delete_conversation: false,
      });
      if (error) throw error;

      setMessages([]);
      const nowIso = new Date().toISOString();
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? {
                ...c,
                updated_at: nowIso,
                last_message_at: null,
                last_message_body: null,
                unread_admin: 0,
              }
            : c
        )
      );

      try {
        void msgChannelRef.current?.send({
          type: 'broadcast',
          event: 'clear',
          payload: { conversation_id: selectedConversationId },
        });
      } catch {
      }
    } catch (e: any) {
      setError(e?.message || 'فشل مسح المحادثة');
    } finally {
      setClearing(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!isSupabaseConfigured) return;
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('id, conversation_id, sender_id, sender_role, body, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(300);
      if (error) throw error;
      const incoming = ((data || []) as UiMessage[]).map((m) => ({ ...m, optimistic: false }));
      setMessages((prev) => {
        const incomingIds = new Set(incoming.map((m) => m.id));
        const optimisticOnly = prev.filter((m) => m.optimistic && !incomingIds.has(m.id));
        return [...incoming, ...optimisticOnly].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل الرسائل');
    } finally {
      setMessagesLoading(false);
    }
  };

  const markAdminRead = async (conversationId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('support_conversations')
        .update({ admin_last_read_at: new Date().toISOString(), unread_admin: 0 })
        .eq('id', conversationId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchConversations();

    if (!isSupabaseConfigured) return;
    const ch = supabase
      .channel('support_conversations_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (!isSupabaseConfigured) return;
    const convId = selectedConversationId;

    setChannelReady(false);
    const ch = supabase
      .channel(`support_messages_${convId}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        const next = (payload as any)?.payload as UiMessage;
        if (!next?.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === next.id)) return prev;
          return [...prev, { ...(next as any), optimistic: false }];
        });
      })
      .on('broadcast', { event: 'clear' }, () => {
        setMessages([]);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });

          if (m.sender_role === 'student') {
            markAdminRead(convId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannelReady(true);
          const pending = pendingBroadcastRef.current;
          pendingBroadcastRef.current = [];
          pending.forEach((m) => {
            try {
              void msgChannelRef.current?.send({
                type: 'broadcast',
                event: 'message',
                payload: { ...m, optimistic: false },
              });
            } catch {
            }
          });
        }
      });

    msgChannelRef.current = ch;

    fetchMessages(convId);
    markAdminRead(convId);

    return () => {
      supabase.removeChannel(ch);
      if (msgChannelRef.current === ch) msgChannelRef.current = null;
      pendingBroadcastRef.current = [];
      setChannelReady(false);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const p = profilesById[c.user_id];
      const name = (p?.full_name || '').toLowerCase();
      const sid = String(p?.student_id || '').toLowerCase();
      const last = String(c.last_message_body || '').toLowerCase();
      return name.includes(q) || sid.includes(q) || last.includes(q);
    });
  }, [conversations, profilesById, search]);

  const handleSend = async () => {
    if (!selectedConversationId) return;
    if (!currentUserId) return;
    const body = draft.trim();
    if (!body) return;
    if (!isSupabaseConfigured) return;

    setSending(true);
    setError(null);
    let messageId: string | null = null;
    try {
      messageId = createUuid();
      const nowIso = new Date().toISOString();
      const optimistic: UiMessage = {
        id: messageId,
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        sender_role: 'admin',
        body,
        created_at: nowIso,
        optimistic: true,
      };

      setDraft('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === optimistic.id)) return prev;
        return [...prev, optimistic];
      });

      const { error } = await supabase.from('support_messages').insert([
        {
          id: messageId,
          conversation_id: selectedConversationId,
          sender_id: currentUserId,
          sender_role: 'admin',
          body,
        },
      ]);
      if (error) throw error;

      const broadcastMsg: UiMessage = { ...optimistic, optimistic: false };
      if (channelReady) {
        try {
          void msgChannelRef.current?.send({
            type: 'broadcast',
            event: 'message',
            payload: broadcastMsg,
          });
        } catch {
        }
      } else {
        pendingBroadcastRef.current.push(broadcastMsg);
      }

      markAdminRead(selectedConversationId);
    } catch (e: any) {
      if (messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      setError(e?.message || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const toggleClosed = async () => {
    if (!selectedConversationId || !selectedConversation) return;
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('support_conversations')
        .update({ is_closed: !selectedConversation.is_closed })
        .eq('id', selectedConversationId);
    } catch (e: any) {
      setError(e?.message || 'فشل تحديث حالة المحادثة');
    }
  };

  const selectedProfile = selectedConversation ? profilesById[selectedConversation.user_id] : null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-dark">المسجات</div>
            <div className="text-xs font-bold text-gray-400">دعم الطلاب (Realtime)</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="بحث بالاسم أو ID"
                className="w-full sm:w-72 px-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSearch(searchDraft)}
                className="px-4 py-2.5 rounded-xl bg-dark text-white font-bold text-sm hover:bg-black"
              >
                بحث
              </button>
              <button
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                }}
                className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
              >
                مسح
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="p-6 text-center text-sm font-bold text-gray-400">Supabase غير مُعد</div>
      ) : loading ? (
        <div className="p-6 text-center text-sm font-bold text-gray-400">جاري التحميل...</div>
      ) : error ? (
        <div className="p-6 text-center text-sm font-bold text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-l border-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-sm font-bold text-gray-400">لا توجد محادثات</div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto">
                {filteredConversations.map((c) => {
                  const p = profilesById[c.user_id];
                  const name = p?.full_name || 'مستخدم';
                  const sid = p?.student_id || '';
                  const unread = Number(c.unread_admin ?? 0);
                  const active = c.id === selectedConversationId;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`w-full text-right p-4 border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${active ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-dark text-sm truncate">{name}</div>
                          <div className="text-[11px] font-bold text-gray-400 truncate" dir="ltr">
                            {sid ? `ID: ${sid}` : 'ID: —'}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="text-[10px] font-black text-gray-400" dir="ltr">
                            {formatTime(c.last_message_at || c.updated_at)}
                          </div>
                          {unread > 0 && (
                            <div className="min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
                              {unread > 99 ? '99+' : unread}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-xs font-bold text-gray-500 truncate">
                        {c.last_message_body || '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {!selectedConversation ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <MessageSquareText size={22} className="text-gray-400" />
                </div>
                <div className="text-sm font-black text-dark">اختر محادثة</div>
                <div className="text-xs font-bold text-gray-400 mt-1">هتلاقي كل رسائل الدعم هنا</div>
              </div>
            ) : (
              <div className="flex flex-col h-[640px]">
                <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-dark text-sm truncate">{selectedProfile?.full_name || 'مستخدم'}</div>
                    <div className="text-[11px] font-bold text-gray-400" dir="ltr">
                      {selectedProfile?.student_id ? `ID: ${selectedProfile.student_id}` : 'ID: —'}
                      {selectedConversation.last_message_at ? `  ·  ${formatDate(selectedConversation.last_message_at)}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearSelectedChat}
                      disabled={clearing}
                      className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                      title="مسح كل الرسائل"
                    >
                      <Trash2 size={14} />
                      {clearing ? 'جاري المسح...' : 'مسح الشات'}
                    </button>

                    <button
                      onClick={toggleClosed}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 ${selectedConversation.is_closed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-dark text-white hover:bg-black'}`}
                      title={selectedConversation.is_closed ? 'فتح المحادثة' : 'إغلاق المحادثة'}
                    >
                      {selectedConversation.is_closed ? <Unlock size={14} /> : <Lock size={14} />}
                      {selectedConversation.is_closed ? 'فتح' : 'إغلاق'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
                  {messagesLoading ? (
                    <div className="text-center text-xs font-bold text-gray-400 mt-12">جاري التحميل...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-xs font-bold text-gray-400 mt-12">لا توجد رسائل بعد</div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((m) => {
                        const isMe = m.sender_role === 'admin';
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm font-bold ${isMe ? 'bg-dark text-white rounded-br-md' : 'bg-white border border-gray-200 text-dark rounded-bl-md'}`}>
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
                  {selectedConversation.is_closed ? (
                    <div className="text-center text-xs font-bold text-gray-400 py-3">المحادثة مغلقة</div>
                  ) : (
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
                        placeholder="اكتب رد..."
                        className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 font-bold text-sm"
                        disabled={sending}
                      />
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSend}
                        disabled={sending || !draft.trim()}
                        className="w-12 h-12 rounded-2xl bg-dark text-white flex items-center justify-center hover:bg-black disabled:opacity-50"
                        title="إرسال"
                      >
                        <Send size={18} />
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
