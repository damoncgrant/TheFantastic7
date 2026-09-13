import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiRequest,
  fetchCsrf,
  fetchUnreadMessageCount,
  markMessagesRead as markConversationMessagesRead,
} from './api';

export function useNotifications(enabled, accountEmail) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const requestId = useRef(0);

  const refresh = useCallback(async (signal) => {
    const id = ++requestId.current;
    try {
      const [data, messageData] = await Promise.all([
        apiRequest('/api/notifications/', { signal }),
        fetchUnreadMessageCount({ signal }),
      ]);
      if (!Array.isArray(data.notifications)) throw new Error('Could not load notifications. Please try again.');
      if (id === requestId.current) {
        setItems(data.notifications);
        setUnreadMessageCount(Number(messageData.unreadMessageCount) || 0);
        setError('');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current && !signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setUnreadMessageCount(0);
    setError('');
    setLoading(enabled);
    if (!enabled) return;
    const controller = new AbortController();
    let timer;
    async function poll() {
      await refresh(controller.signal);
      if (!controller.signal.aborted) timer = window.setTimeout(poll, 3000);
    }
    poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [enabled, accountEmail, refresh]);

  async function markRead(id) {
    setBusy(true);
    setError('');
    // Invalidate older list responses while marking notifications as read.
    requestId.current += 1;
    try {
      await fetchCsrf();
      await apiRequest(id ? `/api/notifications/${id}/read/` : '/api/notifications/read-all/', { method: 'POST' });
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not update notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const markMessagesRead = useCallback(async (applicationId) => {
    try {
      await fetchCsrf();
      await markConversationMessagesRead(applicationId);
      await refresh();
    } catch {
      // The next poll will retry the badge state without disrupting the inbox.
    }
  }, [refresh]);

  return {
    items,
    loading,
    error,
    busy,
    refresh,
    markRead,
    markMessagesRead,
    unreadCount: items.filter((item) => !item.readAt).length,
    unreadMessageCount,
  };
}

export default function NotificationsPage({ notifications }) {
  const [filter, setFilter] = useState('all');
  const { items, loading, error, busy, refresh, markRead, unreadCount } = notifications;
  const visibleItems = filter === 'unread' ? items.filter((item) => !item.readAt) : items;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Stay in the loop</p>
          <h1>Notifications</h1>
          <p>Application status updates.</p>
        </div>
        <button className="secondary-button notifications-mark-all" type="button" disabled={!unreadCount || busy} onClick={() => markRead()}>
          Mark all as read
        </button>
      </header>

      <div className="filter-row" aria-label="Notification filters">
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-chip ${filter === 'unread' ? 'active' : ''}`} type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread ({unreadCount})</button>
      </div>

      <section className="content-panel page-panel" aria-label="Notifications" aria-busy={loading}>
        {loading && <p role="status">Loading notifications…</p>}
        {error && <div className="notification-error"><p role="alert">{error}</p><button className="secondary-button" type="button" onClick={() => refresh()}>Try again</button></div>}
        {!loading && !error && visibleItems.length === 0 && <div className="notifications-empty">
          <h2>{filter === 'unread' ? 'You’re all caught up.' : 'No notifications yet.'}</h2>
          <p>{filter === 'unread' ? 'New updates will appear here.' : 'Application status updates will appear here.'}</p>
        </div>}
        <div className="notification-list">
          {visibleItems.map((item) => (
            <article className={`notification-row ${item.readAt ? '' : 'unread'}`} key={item.id}>
              <span className="company-mark" aria-hidden="true">↗</span>
              <div className="notification-content">
                <div className="notification-title">
                  <h2>Application status updated</h2>
                  {!item.readAt && <span className="status">Unread</span>}
                </div>
                <p className="notification-context">{item.jobTitle} · {item.company}</p>
                <p className="notification-body">{item.body}</p>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                <div className="notification-actions">
                  {!item.readAt && <button className="secondary-button" type="button" disabled={busy} onClick={() => markRead(item.id)} aria-label={`Mark notification about ${item.jobTitle} as read`}>Mark as read</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
