const conversations = [
    {
        id: 1,
        company: 'Northstar Labs',
        role: 'Frontend Developer',
        preview: 'Bro, we would love to schedule a quick interview.',
        unread: 2,
    },
    {
        id: 2,
        company: 'Cedar Systems',
        role: 'Software Developer',
        preview: 'Thanks for sharing your application!',
        unread: 0,
    },
];

export default function DMPage() {
    return (
        <>
          <header className="page-header">
            <div>
                <p className="eyebrow">Your matched employers</p>
                <h1>Messages</h1>
                <p>Keep conversations moving toward your next opportunity</p>
            </div>
          </header>

          <section className="content-panel page-panel" aria-labelledby="inbox-heading">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Inbox</p>
                    <h2 id="inbox-heading">Employer conversations</h2>
                </div>
                <span className="status interview">2 unread</span>
            </div>

            <div className="application-list">
                {conversations.map((conversation) => (
                    <article className="application-row" key={conversation.id}>
                        <span className="company-mark" aria-hidden="true">
                            {conversation.company.charAt(0)}
                        </span>

                        <div className="application-details">
                            <strong>{conversation.company}</strong>
                            <span>{conversation.role} • {conversation.preview}</span>
                        </div>

                        {conversation.unread > 0 && (
                            <span className="status">
                                {conversation.unread} new
                            </span>
                        )}
                    </article>
                ))}
            </div>
          </section>
        </>      
    );
}