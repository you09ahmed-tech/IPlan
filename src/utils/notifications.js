const NOTIFICATIONS_KEY = "iplanNotifications";
const MAX_NOTIFICATIONS = 30;

export function loadNotifications() {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error loading notifications:", error);
    return [];
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(message, dedupeKey) {
  const notifications = loadNotifications();

  if (dedupeKey && notifications.some((item) => item.dedupeKey === dedupeKey)) {
    return notifications;
  }

  const newNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    dedupeKey: dedupeKey || null,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated);

  return updated;
}

export function markNotificationRead(id) {
  const notifications = loadNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );

  saveNotifications(notifications);
  return notifications;
}

export function markAllNotificationsRead() {
  const notifications = loadNotifications().map((item) => ({
    ...item,
    read: true,
  }));

  saveNotifications(notifications);
  return notifications;
}

export function clearNotifications() {
  saveNotifications([]);
  return [];
}
