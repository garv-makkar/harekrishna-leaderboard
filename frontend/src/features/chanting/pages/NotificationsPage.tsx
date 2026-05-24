"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, Circle, Filter, Inbox, ShieldAlert } from "lucide-react";
import type { AppNotification } from "@/lib/types";
import type { TabId } from "../domain";
import { useChanting } from "../ChantingContext";
import { EmptyState, Panel } from "../ui";

type NotificationFilter = "all" | "unread" | "success" | "info" | "warning";

const filters: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
  { id: "warning", label: "Warnings" }
];

export function NotificationsPage({ onOpenTab }: { onOpenTab: (tab: TabId) => void }) {
  const { state, currentUser, markNotificationRead, markAllNotificationsRead, refreshRemoteState } = useChanting();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
  }, [currentUser, refreshRemoteState]);

  const notifications = useMemo(
    () =>
      (state.notifications || [])
        .filter((notification) => notification.userId === currentUser?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [currentUser?.id, state.notifications]
  );
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const warningCount = notifications.filter((notification) => notification.tone === "warning").length;
  const visibleNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.readAt;
    return notification.tone === filter;
  });

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) await markNotificationRead(notification.id);
    if (notification.actionTab) onOpenTab(notification.actionTab as TabId);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-3 sm:p-4 lg:p-5">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
              <Bell size={16} /> Notification center
            </div>
            <h2 className="text-xl font-black tracking-normal text-stone-950 sm:text-2xl">Notifications</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              Review saved updates from rounds, milestones, groups, and friends. Read status is kept with your account after the notifications migration is active.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white disabled:bg-peacock-200"
                disabled={unreadCount === 0}
                onClick={() => void markAllNotificationsRead()}
              >
                Mark all read
              </button>
            </div>
          </div>
          <div className="grid gap-2 border-t border-saffron-100 bg-saffron-50/70 p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-1 xl:border-l xl:border-t-0">
            <NotificationMetric label="Total" value={notifications.length} />
            <NotificationMetric label="Unread" value={unreadCount} />
            <NotificationMetric label="Warnings" value={warningCount} />
          </div>
        </div>
      </section>

      <Panel title="Timeline" icon={<Inbox size={18} />}>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm">
          <span className="inline-flex items-center gap-2 px-2 text-xs font-black uppercase text-stone-500">
            <Filter size={14} /> Filter
          </span>
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${
                filter === item.id ? "bg-saffron-500 text-white shadow-sm" : "bg-stone-100 text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto rounded-md bg-stone-50 px-3 py-2 text-sm font-bold text-stone-600">
            Showing {visibleNotifications.length}
          </span>
        </div>

        {notifications.length === 0 ? (
          <EmptyState text="No saved notifications yet. Save rounds, create or join groups, add friends, and unlock milestones to build your notification history." />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState text="No notifications match this filter." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            {visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`grid gap-3 border-b border-stone-100 px-3 py-3 last:border-b-0 sm:px-4 lg:grid-cols-[1fr_auto] lg:items-center ${
                  notification.readAt ? "bg-white" : "bg-saffron-50/65"
                }`}
              >
                <div className="flex min-w-0 gap-3">
                  <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-md ${toneIconClass(notification.tone)}`}>
                    {notification.readAt ? <CheckCircle2 size={18} /> : notification.tone === "warning" ? <ShieldAlert size={18} /> : <Circle size={18} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-stone-950">{notification.title}</p>
                      {!notification.readAt && (
                        <span className="rounded-sm bg-saffron-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                          New
                        </span>
                      )}
                      <span className={`rounded-md px-2 py-1 text-xs font-black capitalize ${toneBadgeClass(notification.tone)}`}>
                        {notification.tone}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{notification.body}</p>
                    <p className="mt-2 text-xs font-bold text-stone-500">
                      Created {formatNotificationTime(notification.createdAt)}
                      {notification.readAt ? ` | Read ${formatNotificationTime(notification.readAt)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {notification.actionTab && (
                    <button
                      type="button"
                      className="rounded-md bg-peacock-600 px-3 py-2 text-sm font-black text-white"
                      onClick={() => void openNotification(notification)}
                    >
                      Open
                    </button>
                  )}
                  {!notification.readAt && (
                    <button
                      type="button"
                      className="rounded-md bg-white px-3 py-2 text-sm font-black text-stone-800 ring-1 ring-stone-200"
                      onClick={() => void markNotificationRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function NotificationMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-0.5 text-xl font-black text-stone-950 sm:text-2xl">{value}</p>
    </div>
  );
}

function toneIconClass(tone: AppNotification["tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (tone === "warning") return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
}

function toneBadgeClass(tone: AppNotification["tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (tone === "warning") return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
}

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}
