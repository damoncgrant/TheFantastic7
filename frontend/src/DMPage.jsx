import { useEffect, useRef, useState } from 'react';
import { fetchConversations, fetchMessages, sendMessage as sendMessageRequest } from './api.js';

const messagePollInterval = 3000;

function messagePreview(conversation, currentProfileId) {
  const message = conversation.latest_message;
  if (!message) return 'Your match is ready to chat.';
  return `${String(message.sender_id) === String(currentProfileId) ? 'You: ' : ''}${message.body}`;
}

function EmptyInbox({ isRecruiter }) {
  return (
    <div className="message-empty-state">
      <svg className="message-empty-art" viewBox="0 0 220 150" aria-hidden="true">
        <path className="message-path" d="M24 114c32-56 77-80 135-72" />
        <circle className="message-star star-one" cx="47" cy="50" r="5" />
        <circle className="message-star star-two" cx="173" cy="39" r="4" />
        <path className="message-briefcase" d="M88 70h44a8 8 0 0 1 8 8v29a8 8 0 0 1-8 8H88a8 8 0 0 1-8-8V78a8 8 0 0 1 8-8Zm11 0v-7h22v7m-41 17h60" />
        <path className="message-handshake" d="m95 93 8 8 7-7 7 7 9-9" />
      </svg>
      <div>
        <span className="match-emoji" aria-hidden="true">💼 🤝</span>
        <h3>{isRecruiter ? 'Your next great hire is out there.' : 'It’s quiet in here… for now.'}</h3>
        <p>{isRecruiter ? 'Accept a candidate and your conversation will spark right here.' : 'Keep swiping to spark a connection with an employer.'}</p>
      </div>
    </div>
  );
}

function MatchCelebration({ onDismiss }) {
  return (
    <div className="match-celebration" role="status">
      <div className="celebration-confetti" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>
      <span className="celebration-emoji" aria-hidden="true">💼🤝</span>
      <div><strong>It’s a match!</strong><span>Your conversation is officially open.</span></div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss match celebration">×</button>
    </div>
  );
}

export default function DMPage({ user, notifications }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const lastReadMessageId = useRef(null);

  const activeConversation = conversations.find((conversation) => conversation.application_id === activeConversationId);
  const currentProfileId = user?.profile_id ?? user?.candidateId;
  const isRecruiter = user?.role === 'employer' || user?.role === 'recruiter';
  const requestedConversationId = Number(new URLSearchParams(window.location.hash.split('?')[1] || '').get('conversation')) || null;

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let initialLoad = true;

    async function pollConversations() {
      try {
        if (initialLoad) setLoading(true);
        const data = await fetchConversations({ signal: controller.signal });
        if (controller.signal.aborted) return;
        setConversations(data.conversations);
        setError('');
        setActiveConversationId((current) => (
          current
          ?? data.conversations.find((conversation) => conversation.application_id === requestedConversationId)?.application_id
          ?? data.conversations[0]?.application_id
          ?? null
        ));
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Could not load messages.');
      } finally {
        if (!controller.signal.aborted) {
          if (initialLoad) setLoading(false);
          initialLoad = false;
          timer = window.setTimeout(pollConversations, messagePollInterval);
        }
      }
    }
    pollConversations();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [requestedConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setThreadLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    let timer;
    let initialLoad = true;

    async function pollThread() {
      try {
        if (initialLoad) setThreadLoading(true);
        const data = await fetchMessages(activeConversationId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setMessages(data.messages);
          setError('');
          const latestIncomingMessage = [...data.messages]
            .reverse()
            .find((message) => String(message.sender_id) !== String(currentProfileId));
          if (latestIncomingMessage && latestIncomingMessage.id !== lastReadMessageId.current) {
            lastReadMessageId.current = latestIncomingMessage.id;
            notifications?.markMessagesRead(activeConversationId);
          }
        }
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Could not load this conversation.');
      } finally {
        if (!controller.signal.aborted) {
          if (initialLoad) setThreadLoading(false);
          initialLoad = false;
          timer = window.setTimeout(pollThread, messagePollInterval);
        }
      }
    }
    pollThread();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeConversationId, currentProfileId, notifications?.markMessagesRead]);

  useEffect(() => {
    if (isRecruiter || messages.length !== 1 || !activeConversationId) return;
    const celebrationKey = `jobbler-match-seen-${activeConversationId}`;
    if (window.sessionStorage.getItem(celebrationKey)) return;
    window.sessionStorage.setItem(celebrationKey, 'true');
    setShowCelebration(true);
    const timeout = window.setTimeout(() => setShowCelebration(false), 5500);
    return () => window.clearTimeout(timeout);
  }, [activeConversationId, isRecruiter, messages.length]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeConversation || sending) return;
    try {
      setSending(true);
      setError('');
      const message = await sendMessageRequest(activeConversation.application_id, body);
      setMessages((current) => [...current, message]);
      setConversations((current) => current.map((conversation) => (
        conversation.application_id === activeConversation.application_id
          ? { ...conversation, latest_message: message }
          : conversation
      )));
      setDraft('');
    } catch (sendError) {
      setError(sendError.message || 'Your message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  const audienceLabel = isRecruiter ? 'Matched candidates' : 'Matched employers';
  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">{audienceLabel}</p><h1>Messages</h1><p>Keep conversations moving toward the right opportunity.</p></div>
      </header>
      {error && <p className="recruiter-form-error" role="alert">{error}</p>}
      <section className="content-panel page-panel message-inbox" aria-labelledby="inbox-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Inbox</p><h2 id="inbox-heading">{isRecruiter ? 'Candidate conversations' : 'Employer conversations'}</h2></div>
          {!loading && conversations.length > 0 && <span className="match-count">{conversations.length} match{conversations.length === 1 ? '' : 'es'} <span aria-hidden="true">🤝</span></span>}
        </div>
        {loading ? <p role="status">Loading conversations…</p> : conversations.length === 0 ? <EmptyInbox isRecruiter={isRecruiter} /> : (
          <div className="application-list">
            {conversations.map((conversation) => (
              <button className={`application-row conversation-row ${activeConversationId === conversation.application_id ? 'selected' : ''}`} type="button" onClick={() => setActiveConversationId(conversation.application_id)} aria-pressed={activeConversationId === conversation.application_id} key={conversation.application_id}>
                <span className="company-mark" aria-hidden="true">{conversation.participant.name.charAt(0)}</span>
                <div className="application-details"><strong>{conversation.participant.name}</strong><span>{conversation.role} · {conversation.company} · {messagePreview(conversation, currentProfileId)}</span></div>
              </button>
            ))}
          </div>
        )}
      </section>
      {activeConversation && <section className="content-panel page-panel conversation-thread" aria-labelledby="thread-heading">
        {showCelebration && <MatchCelebration onDismiss={() => setShowCelebration(false)} />}
        <div className="section-heading">
          <div><p className="eyebrow">{isRecruiter ? 'Matched candidate' : 'Matched employer'}</p><h2 id="thread-heading">{activeConversation.participant.name}</h2><p>{activeConversation.role} · {activeConversation.company}</p></div>
          <span className="thread-match-badge" title="This application is matched">💼 <span>matched</span> 🤝</span>
        </div>
        <div
          className="message-thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label={`Conversation with ${activeConversation.participant.name}`}
        >
          {threadLoading ? <p role="status">Loading conversation…</p> : messages.map((message, index) => (
            <div className={`message-bubble ${String(message.sender_id) === String(currentProfileId) ? 'me' : 'employer'} ${index === 0 && messages.length === 1 ? 'match-message' : ''}`} key={message.id}>
              {index === 0 && messages.length === 1 && <span className="automated-label">✨ New match</span>}
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <form className="message-composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-draft">Write a message to {activeConversation.participant.name}</label>
          <input id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${activeConversation.participant.name}…`} maxLength="4000" disabled={sending} />
          <button className="primary-button" type="submit" disabled={!draft.trim() || sending}>{sending ? 'Sending…' : 'Send ✨'}</button>
        </form>
      </section>}
    </>
  );
}
