import { useEffect, useState } from "react";
import type { AppNotification } from "@eol-tracker/shared";
import { api } from "../api/client";
import { ThresholdSettings } from "../components/ThresholdSettings";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function load() {
    setLoading(true);
    api
      .listNotifications()
      .then((r) => setNotifications(r.result))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCheckNow() {
    setChecking(true);
    setError(null);
    try {
      await api.generateNotifications();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function handleRead(id: string) {
    await api.markNotificationRead(id);
    load();
  }

  async function handleDismiss(id: string) {
    await api.dismissNotification(id);
    load();
  }

  const unread = notifications.filter((n) => n.status === "unread");
  const rest = notifications.filter((n) => n.status !== "unread");

  return (
    <div className="notifications-page">
      <div className="dashboard-toolbar">
        <h2>Notifications</h2>
        <button type="button" onClick={handleCheckNow} disabled={checking}>
          {checking ? "Checking..." : "Check thresholds now"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <h3>Unread ({unread.length})</h3>
          {unread.length === 0 ? (
            <p>Nothing unread.</p>
          ) : (
            <ul className="notification-list">
              {unread.map((n) => (
                <li key={n.id} className="notification-item unread">
                  <span>{n.message}</span>
                  <div className="notification-actions">
                    <button type="button" onClick={() => handleRead(n.id)}>
                      Mark read
                    </button>
                    <button type="button" onClick={() => handleDismiss(n.id)}>
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {rest.length > 0 && (
            <>
              <h3>Earlier</h3>
              <ul className="notification-list">
                {rest.map((n) => (
                  <li key={n.id} className={`notification-item ${n.status}`}>
                    <span>{n.message}</span>
                    <span className="notification-status">{n.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <hr />
      <ThresholdSettings />
    </div>
  );
}
