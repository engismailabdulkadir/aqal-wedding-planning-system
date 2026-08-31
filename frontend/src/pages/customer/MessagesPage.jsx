import { useEffect, useState } from 'react';
import { FiMessageCircle, FiSend } from 'react-icons/fi';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/customer/PageState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getConversations, getMessages, sendMessage } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';

export default function MessagesPage() {
  const { user } = useAuth();
  const { activeWeddingId } = useActiveWedding();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const weddingId = searchParams.get('weddingId') || location.state?.weddingId || (user.role === 'customer' ? activeWeddingId : undefined);
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(location.state?.conversationId || '');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => getConversations(weddingId)
    .then((x) => {
      setConversations(x.conversations);
      if (!active && x.conversations[0]) setActive(x.conversations[0]._id);
    })
    .catch((e) => setError(getApiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [weddingId]);
  useEffect(() => {
    if (active) getMessages(active).then((x) => setMessages(x.messages)).catch((e) => setError(getApiError(e)));
  }, [active]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const x = await sendMessage(active, text);
      setMessages([...messages, x.message]);
      setText('');
      load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const name = (c) => c.booking?.vendorProfile?.businessName
    || c.participants.find((p) => p._id !== user._id)?.firstName
    || 'Conversation';

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader eyebrow="Planning Communication" title="Messages" description="Keep vendor, planner, and customer conversations connected to the wedding." />
      <div className="mt-7 grid min-h-[600px] overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-[320px_1fr]">
        <aside className="border-b border-stone-100 md:border-b-0 md:border-r">
          <h2 className="p-5 font-semibold">Conversations</h2>
          {loading ? <p className="p-5 text-sm text-stone-500">Loading…</p> : conversations.length ? conversations.map((c) => (
            <button key={c._id} type="button" onClick={() => setActive(c._id)} className={`w-full border-t border-stone-100 p-4 text-left ${active === c._id ? 'bg-brand-50' : ''}`}>
              <p className="font-semibold text-stone-900">{name(c)}</p>
              <p className="mt-1 truncate text-xs text-stone-500">{c.lastMessage?.text || 'Start the conversation'}</p>
            </button>
          )) : (
            <div className="p-7 text-center">
              <FiMessageCircle className="mx-auto text-3xl text-stone-300" />
              <p className="mt-3 font-semibold">No conversations yet.</p>
            </div>
          )}
        </aside>
        <section className="flex min-h-[500px] flex-col">
          {active ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.map((m) => (
                  <div key={m._id} className={`flex ${m.sender?._id === user._id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${m.sender?._id === user._id ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
                      <p>{m.text}</p>
                      <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={submit} className="flex gap-3 border-t border-stone-100 p-4">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-full border border-stone-200 px-4 text-sm" />
                <button aria-label="Send message" className="rounded-full bg-brand-600 p-3 text-white"><FiSend /></button>
              </form>
            </>
          ) : <div className="grid flex-1 place-items-center text-sm text-stone-500">Select a conversation</div>}
        </section>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
