import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} from "../utils/notifications";

function formatNotificationTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Sidebar({ setPage }) {
  const [notifications, setNotifications] = useState(loadNotifications);
  const [showPanel, setShowPanel] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function handleLogout() {
    await signOut(auth);
  }

  function togglePanel() {
    setShowPanel((current) => {
      if (!current) {
        setNotifications(loadNotifications());
      }

      return !current;
    });
  }

  function handleMarkRead(id) {
    setNotifications(markNotificationRead(id));
  }

  function handleMarkAllRead() {
    setNotifications(markAllNotificationsRead());
  }

  function handleClearAll() {
    const confirmed = window.confirm(
      "Clear all notifications? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setNotifications(clearNotifications());
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <h2 className="ip-wordmark">IPlan</h2>

        <div className="notification-bell-wrap">
          <button
            type="button"
            className="notification-bell"
            onClick={togglePanel}
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <strong>Notifications</strong>

                {notifications.length > 0 && (
                  <button type="button" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="notification-empty">You're all caught up.</p>
              ) : (
                <div className="notification-list">
                  {notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`notification-item ${
                        item.read ? "read" : "unread"
                      }`}
                      onClick={() => handleMarkRead(item.id)}
                    >
                      <p>{item.message}</p>
                      <span>{formatNotificationTime(item.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  className="notification-clear-btn"
                  onClick={handleClearAll}
                >
                  Clear all
                </button>
              )}

              <p className="notification-disclaimer">
                In-app only — not a push notification.
              </p>
            </div>
          )}
        </div>
      </div>

      <nav>
        <button onClick={() => setPage("dashboard")}>
          Dashboard
        </button>

        <button onClick={() => setPage("subjects")}>
          Subjects
        </button>

        <button onClick={() => setPage("focus")}>
          Focus Mode
        </button>

        <button onClick={() => setPage("analytics")}>
          Analytics
        </button>

        <button onClick={() => setPage("history")}>
          Study History
        </button>

        <button onClick={() => setPage("ai")}>
          AI Assistant
        </button>

        <button onClick={() => setPage("breakdown")}>
          AI Breakdown Planner
        </button>

        <button onClick={() => setPage("plans")}>
          Saved Plans
        </button>

        <button onClick={() => setPage("calendar")}>
          Calendar
        </button>

        <button onClick={() => setPage("vacation")}>
          Vacation Mode
        </button>

        <button onClick={() => setPage("parties")}>
          Study Parties
        </button>

        <button onClick={() => setPage("settings")}>
          Settings
        </button>

        <button onClick={handleLogout}>
          Log Out
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
