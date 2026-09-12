import { useState } from 'react';

const startingConversations = [
  {
    id: 1,
    company: 'Northstar Labs',
    role: 'Frontend Developer',
    unread: 2,
    messages: [
      {
        id: 1,
        sender: 'employer',
        automated: true,
        text: 'Great news! Northstar Labs selected your application. You are now matched and can start a conversation.',
      },
      {
        id: 2,
        sender: 'employer',
        text: 'Hi! We were impressed by your portfolio and would love to schedule a quick interview.',
      },
      {
        id: 3,
        sender: 'me',
        text: 'Thank you! I would be excited to chat about the role.',
      },
    ],
  },
  {
    id: 2,
    company: 'Cedar Systems',
    role: 'Software Developer',
    unread: 0,
    messages: [
      {
        id: 1,
        sender: 'employer',
        automated: true,
        text: 'You matched with Cedar Systems. Their hiring team can now message you here.',
      },
      {
        id: 2,
        sender: 'employer',
        text: 'Thanks for sharing your application. Our team will review it this week.',
      },
    ],
  },
];

export default function DMPage() {
  const [conversations, setConversations] = useState(startingConversations);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [draft, setDraft] = useState('');

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const unreadCount = conversations.reduce(
    (total, conversation) => total + conversation.unread,
    0,
  );

  function selectConversation(id) {
    setActiveConversationId(id);

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === id
          ? { ...conversation, unread: 0 }
          : conversation,
      ),
    );
  }

  function sendMessage(event) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) return;

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text,
    };

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
            }
          : conversation,
      ),
    );

    setDraft('');
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your matched employers</p>
          <h1>Messages</h1>
          <p>Keep conversations moving toward your next opportunity.</p>
        </div>
      </header>

      <section className="content-panel page-panel" aria-labelledby="inbox-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2 id="inbox-heading">Employer conversations</h2>
          </div>

          <span className="status interview">
            {unreadCount} unread
          </span>
        </div>

        <div className="application-list">
          {conversations.map((conversation) => {
            const latestMessage =
              conversation.messages[conversation.messages.length - 1];

            return (
              <button
                className={`application-row conversation-row ${
                  activeConversationId === conversation.id ? 'selected' : ''
                }`}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                aria-pressed={activeConversationId === conversation.id}
                key={conversation.id}
              >
                <span className="company-mark" aria-hidden="true">
                  {conversation.company.charAt(0)}
                </span>

                <div className="application-details">
                  <strong>{conversation.company}</strong>
                  <span>
                    {conversation.role} • {latestMessage.text}
                  </span>
                </div>

                {conversation.unread > 0 && (
                  <span className="status">
                    {conversation.unread} new
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="content-panel page-panel conversation-thread"
        aria-live="polite"
        aria-labelledby="thread-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Matched employer</p>
            <h2 id="thread-heading">{activeConversation.company}</h2>
            <p>{activeConversation.role}</p>
          </div>
        </div>

        <div className="message-thread">
          {activeConversation.messages.map((message) => (
            <div
              className={`message-bubble ${message.sender}`}
              key={message.id}
            >
              {message.automated && (
                <span className="automated-label">New match</span>
              )}
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <form className="message-composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-draft">
            Write a message to {activeConversation.company}
          </label>

          <input
            id="message-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${activeConversation.company}…`}
            maxLength="4000"
          />

          <button
            className="primary-button"
            type="submit"
            disabled={!draft.trim()}
          >
            Send
          </button>
        </form>
      </section>
    </>
  );
}