"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, Circle, Filter, Inbox, ShieldAlert } from "lucide-react";
import type { AppNotification } from "@/lib/types";
import type { TabId } from "../domain";
import { useChanting } from "../ChantingContext";
import { DataFreshness, EmptyState, FilterBar, PageHeader, Panel, StatCard, StatGrid } from "../ui";

type NotificationFilter = "all" | "unread" | "success" | "info" | "warning";

const filters: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
  { id: "warning", label: "Warnings" }
];

export function NotificationsPage({ onOpenTab }: { onOpenTab: (tab: TabId) => void }) {
  const { state, currentUser, markNotificationRead, markAllNotificationsRead, refreshRemoteState, isBusy, loadingRemoteSlices, lastRemoteRefresh, remoteRefreshErrors } = useChanting();
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
      <PageHeader
        eyebrow="Notification center"
        icon={<Bell size={16} />}
        title="Notifications"
        description="Review saved updates from rounds, milestones, groups, and friends."
        actions={
          <>
            <DataFreshness
              label="Notifications"
              lastUpdatedAt={lastRemoteRefresh.core}
              error={remoteRefreshErrors.core}
              isRefreshing={loadingRemoteSlices.core}
              onRefresh={() => {
                if (!currentUser) return;
                return refreshRemoteState(currentUser.id, "core");
              }}
            />
            <button
              type="button"
              className="rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white disabled:bg-peacock-200"
              disabled={unreadCount === 0}
              onClick={() => void markAllNotificationsRead()}
            >
              Mark all read
            </button>
          </>
        }
        stats={
          <StatGrid columns={3}>
            <StatCard label="Total" value={notifications.length} tone="stone" />
            <StatCard label="Unread" value={unreadCount} tone="peacock" />
            <StatCard label="Warnings" value={warningCount} tone="saffron" />
          </StatGrid>
        }
      />

      <Panel title="Timeline" icon={<Inbox size={18} />}>
        <FilterBar
          label={
            <span className="inline-flex items-center gap-2">
              <Filter size={14} /> Filter
            </span>
          }
          meta={`Showing ${visibleNotifications.length}`}
        >
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
        </FilterBar>

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
