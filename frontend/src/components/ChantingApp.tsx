"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Globe2,
  HeartHandshake,
  Home,
  LineChart,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { publicSupabaseConfig, runtimeLabel } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { AboutPage } from "@/features/chanting/pages/AboutPage";
import { AuthPanel } from "@/features/chanting/AuthPanel";
import { type ActionFeedback, useChanting } from "@/features/chanting/ChantingContext";
import { FriendsPage } from "@/features/chanting/pages/FriendsPage";
import { GlobalPage } from "@/features/chanting/pages/GlobalPage";
import { GroupsPage } from "@/features/chanting/pages/GroupsPage";
import { HomePage } from "@/features/chanting/pages/HomePage";
import { ProfilePage } from "@/features/chanting/pages/ProfilePage";
import { ActivityPage } from "@/features/chanting/pages/ActivityPage";
import { AdminPage } from "@/features/chanting/pages/AdminPage";
import {
  bestStreak,
  computeMilestones,
  currentStreak,
  formatDate,
  recentChantingHistory,
  sumRounds
} from "@/features/chanting/domain";
import { Avatar, MilestoneGrid, SkeletonBlock } from "@/features/chanting/ui";
import type { TabId } from "@/features/chanting/domain";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "groups", label: "Groups", icon: Users },
  { id: "friends", label: "Friends", icon: HeartHandshake },
  { id: "global", label: "Global", icon: Globe2 },
  { id: "activity", label: "Activity", icon: LineChart },
  { id: "profile", label: "Profile", icon: Settings },
  { id: "admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
  { id: "about", label: "About", icon: Sparkles }
] as const;

export default function ChantingApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const { authMode, currentUser, isLoaded } = useChanting();

  if (!isLoaded) {
    return <LoadingShell />;
  }

  if (authMode === "newPassword" || authMode === "checkEmail" || !currentUser) {
    return <AuthPanel />;
  }

  return <AppShell activeTab={activeTab} onTabChange={setActiveTab} />;
}

function LoadingShell() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1500px] gap-5 lg:grid-cols-[284px_minmax(0,1fr)]">
        <aside className="hidden rounded-lg border border-saffron-200 bg-white/90 p-4 shadow-soft lg:block">
          <BrandLockup />
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-md px-3 py-3">
                <SkeletonBlock className="h-9 w-9" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            ))}
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-lg border border-saffron-200 bg-white/90 p-5 shadow-soft">
            <div className="mb-5 flex items-center gap-3">
              <div className="lotus-mark grid h-12 w-12 place-items-center rounded-lg text-lg font-black text-white shadow-soft">
                HK
              </div>
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-5 w-48 max-w-full" />
                <SkeletonBlock className="mt-2 h-3 w-32" />
              </div>
            </div>
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-36" />
          </div>
          <SkeletonBlock className="h-64" />
        </section>
      </div>
    </main>
  );
}

function AppShell({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const {
    acceptFriendRequest,
    actionFeedback,
    clearActionFeedback,
    currentUser,
    emailVerified,
    ensureFriendsData,
    friends,
    isAdmin,
    message,
    saveState,
    selectedPublicUserId,
    setSelectedPublicUserId,
    state
  } = useChanting();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    ensureFriendsData();
  }, [ensureFriendsData]);

  useEffect(() => {
    setShowMobileNav(false);
    setShowNotifications(false);
  }, [activeTab]);

  const incomingRequestCount = currentUser
    ? state.friendRequests.filter((request) => request.toUserId === currentUser.id && request.status === "pending").length
    : 0;
  const notifications = buildNotifications(state, currentUser?.id || "", emailVerified, message);
  const urgentNotificationCount = notifications.filter((item) => item.tone !== "success").length;
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Dashboard";

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setShowMobileNav(false);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    saveState({ ...state, currentUserId: null });
  };

  return (
    <main className="min-h-screen">
      {showMobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/45 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setShowMobileNav(false)}
          />
          <aside className="relative flex h-full w-[min(340px,88vw)] flex-col border-r border-saffron-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-saffron-100 px-4 py-4">
              <BrandLockup compact />
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-md bg-stone-100 text-stone-700"
                onClick={() => setShowMobileNav(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <NavigationList
              activeTab={activeTab}
              currentUserAvatar={currentUser?.avatarUrl || ""}
              friendsCount={friends.length}
              incomingRequestCount={incomingRequestCount}
              isAdmin={isAdmin}
              onTabChange={handleTabChange}
            />
            <div className="mt-auto border-t border-saffron-100 p-4">
              <UserCard />
              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-3 py-3 text-sm font-semibold text-white"
                onClick={signOut}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[284px_minmax(0,1fr)]">
        <aside className="hidden border-r border-saffron-200/80 bg-white/65 px-4 py-5 backdrop-blur lg:block">
          <div className="sticky top-5 flex h-[calc(100vh-2.5rem)] flex-col rounded-lg border border-saffron-200 bg-white/90 p-4 shadow-soft">
            <BrandLockup />
            <NavigationList
              activeTab={activeTab}
              currentUserAvatar={currentUser?.avatarUrl || ""}
              friendsCount={friends.length}
              incomingRequestCount={incomingRequestCount}
              isAdmin={isAdmin}
              onTabChange={handleTabChange}
            />
            <div className="mt-auto space-y-3">
              <UserCard />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-3 py-3 text-sm font-semibold text-white"
                onClick={signOut}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-saffron-200/80 bg-white/82 backdrop-blur">
            <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-saffron-200 bg-white text-stone-800 shadow-sm lg:hidden"
                  onClick={() => setShowMobileNav(true)}
                  aria-label="Open menu"
                >
                  <Menu size={22} />
                </button>
                <div className="lg:hidden">
                  <BrandLockup compact />
                </div>
                <div className="hidden min-w-0 lg:block">
                  <p className="text-sm font-bold text-stone-500">Dashboard</p>
                  <h1 className="truncate text-2xl font-black tracking-normal text-stone-950">{activeTabLabel}</h1>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-end gap-2">
                <span
                  className={`hidden rounded-md px-3 py-2 text-xs font-black sm:inline-flex ${
                    publicSupabaseConfig.mode === "supabase"
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                      : publicSupabaseConfig.mode === "misconfigured"
                        ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                        : "bg-stone-100 text-stone-700 ring-1 ring-stone-200"
                  }`}
                  title={[...publicSupabaseConfig.issues, ...publicSupabaseConfig.warnings].join(" ") || runtimeLabel(publicSupabaseConfig.mode)}
                >
                  {runtimeLabel(publicSupabaseConfig.mode)}
                </span>
                <span className="hidden max-w-[260px] truncate rounded-md border border-peacock-200 bg-peacock-50 px-3 py-2 text-xs font-bold text-peacock-900 md:inline-flex">
                  {currentUser?.country} | {currentUser?.timezone}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm"
                    onClick={() => setShowNotifications((value) => !value)}
                  >
                    <Bell size={17} />
                    <span className="hidden sm:inline">Notifications</span>
                    {urgentNotificationCount > 0 && (
                      <span className="rounded-md bg-saffron-500 px-2 py-0.5 text-xs font-black text-white">
                        {urgentNotificationCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 z-30 mt-3 w-[min(380px,calc(100vw-2rem))] rounded-lg border border-saffron-200 bg-white p-3 shadow-soft">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-black text-stone-900">Notifications</p>
                        <button
                          type="button"
                          className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700"
                          onClick={() => setShowNotifications(false)}
                        >
                          Close
                        </button>
                      </div>
                      <div className="space-y-2">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              item.tone === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : item.tone === "warning"
                                  ? "border-saffron-200 bg-saffron-50 text-saffron-900"
                                  : "border-peacock-100 bg-peacock-50 text-peacock-900"
                            }`}
                          >
                            <p className="font-black">{item.title}</p>
                            <p>{item.body}</p>
                            {item.action && (
                              <button
                                type="button"
                                className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-black text-stone-800 ring-1 ring-stone-200"
                                onClick={async () => {
                                  if (item.action?.type === "accept-friend") {
                                    await acceptFriendRequest(item.action.requestId);
                                    setShowNotifications(false);
                                  }
                                  if (item.action?.type === "open-tab") {
                                    handleTabChange(item.action.tab);
                                    setShowNotifications(false);
                                  }
                                }}
                              >
                                {item.action.label}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="hidden h-11 items-center gap-2 rounded-md bg-stone-900 px-3 text-sm font-semibold text-white sm:inline-flex lg:hidden"
                  onClick={signOut}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </header>

          <section className="min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {(message || actionFeedback) && (
            <FeedbackBanner
              feedback={actionFeedback}
              message={message}
              onAction={(tab) => {
                handleTabChange(tab);
                clearActionFeedback();
              }}
              onDismiss={clearActionFeedback}
            />
          )}
          {activeTab === "home" && <HomePage />}
          {activeTab === "groups" && <GroupsPage />}
          {activeTab === "friends" && <FriendsPage />}
          {activeTab === "global" && <GlobalPage />}
          {activeTab === "activity" && <ActivityPage />}
          {activeTab === "profile" && <ProfilePage />}
          {activeTab === "admin" && <AdminPage />}
          {activeTab === "about" && <AboutPage />}
        </section>
      </div>
      </div>
      {selectedPublicUserId && (
        <PublicUserDialog userId={selectedPublicUserId} onClose={() => setSelectedPublicUserId("")} />
      )}
    </main>
  );
}

function FeedbackBanner({
  feedback,
  message,
  onAction,
  onDismiss
}: {
  feedback: ActionFeedback | null;
  message: string;
  onAction: (tab: TabId) => void;
  onDismiss: () => void;
}) {
  if (!feedback) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-peacock-200 bg-peacock-50 px-4 py-3 text-sm font-semibold text-peacock-900">
        <span>{message}</span>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/70 text-peacock-900 ring-1 ring-peacock-100"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const isInfo = feedback.tone === "info";
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 shadow-sm ${
      isInfo ? "border-peacock-200 bg-peacock-50 text-peacock-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white ring-1 ${
            isInfo ? "text-peacock-700 ring-peacock-100" : "text-emerald-700 ring-emerald-100"
          }`}>
            <CheckCircle2 size={19} />
          </span>
          <div className="min-w-0">
            <p className="font-black">{feedback.title}</p>
            <p className="mt-0.5 text-sm leading-5 text-stone-700">{feedback.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {feedback.action && (
            <button
              type="button"
              className="rounded-md bg-white px-3 py-2 text-sm font-black text-stone-900 ring-1 ring-stone-200"
              onClick={() => onAction(feedback.action!.tab)}
            >
              {feedback.action.label}
            </button>
          )}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md bg-white/75 text-stone-700 ring-1 ring-stone-200"
            aria-label="Dismiss message"
            onClick={onDismiss}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${compact ? "" : "mb-5"}`}>
      <div className={`${compact ? "h-10 w-10 text-sm" : "h-12 w-12 text-lg"} lotus-mark grid shrink-0 place-items-center rounded-lg font-black text-white shadow-soft`}>
        HK
      </div>
      <div className="min-w-0">
        <p className={`${compact ? "text-base" : "text-lg"} truncate font-black tracking-normal text-saffron-900`}>
          Hare Krishna
        </p>
        <p className="truncate text-xs font-bold uppercase text-stone-500">Leaderboard</p>
      </div>
    </div>
  );
}

function NavigationList({
  activeTab,
  currentUserAvatar,
  friendsCount,
  incomingRequestCount,
  isAdmin,
  onTabChange
}: {
  activeTab: TabId;
  currentUserAvatar: string;
  friendsCount: number;
  incomingRequestCount: number;
  isAdmin: boolean;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav className="mt-4 space-y-1 overflow-y-auto px-4 pb-4 lg:mt-0 lg:px-0">
      {tabs.filter((tab) => !("adminOnly" in tab) || isAdmin).map((tab) => {
        const Icon = tab.icon;
        const badgeValue = tab.id === "friends" ? incomingRequestCount || friendsCount : 0;
        return (
          <button
            key={tab.id}
            type="button"
            className={`group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold transition ${
              activeTab === tab.id
                ? "bg-saffron-500 text-white shadow-sm"
                : "text-stone-700 hover:bg-saffron-50 hover:text-saffron-900"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
                activeTab === tab.id ? "bg-white/18 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 group-hover:text-saffron-800"
              }`}
            >
              {tab.id === "profile" && currentUserAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt=""
                  className={`h-6 w-6 rounded-sm object-cover ${
                    activeTab === tab.id ? "ring-1 ring-white/70" : "ring-1 ring-saffron-200"
                  }`}
                />
              ) : (
                <Icon size={18} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">{tab.label}</span>
            {badgeValue > 0 && (
              <span
                className={`rounded-md px-2 py-1 text-xs font-black ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-peacock-50 text-peacock-900"
                }`}
                title={incomingRequestCount > 0 ? "Pending friend requests" : "Accepted friends"}
              >
                {badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const { currentUser } = useChanting();
  if (!currentUser) return null;
  return (
    <div className="rounded-lg border border-peacock-100 bg-peacock-50/80 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={currentUser.avatarUrl} label={currentUser.displayName || currentUser.username} />
        <div className="min-w-0">
          <p className="truncate font-black text-stone-900">{currentUser.displayName || currentUser.username}</p>
          <p className="truncate text-sm text-stone-600">@{currentUser.username}</p>
        </div>
      </div>
      <p className="mt-3 truncate text-xs font-bold text-peacock-900">
        {currentUser.country} | {currentUser.timezone}
      </p>
    </div>
  );
}

function PublicUserDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { currentUser, todayKey, state } = useChanting();
  const user = state.users.find((item) => item.id === userId);
  if (!user || !currentUser) return null;
  const groupCount = state.groupMembers.filter((member) => member.userId === user.id).length;
  const userGroups = state.groupMembers
    .filter((member) => member.userId === user.id)
    .map((member) => state.groups.find((group) => group.id === member.groupId))
    .filter(Boolean);
  const friendCount = state.friendRequests.filter(
    (request) =>
      request.status === "accepted" &&
      (request.fromUserId === user.id || request.toUserId === user.id)
  ).length;
  const milestones = computeMilestones(state, user, todayKey);
  const recentHistory = recentChantingHistory(state.chantTotals, user.id, todayKey, 7);
  const sevenDayRounds = recentHistory.reduce((sum, item) => sum + item.rounds, 0);
  const earnedMilestones = milestones.filter((milestone) => milestone.earned).length;

  return (
    <div className="fixed inset-0 z-40 bg-stone-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-6 max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-saffron-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={user.avatarUrl} label={user.displayName || user.username} />
            <div className="min-w-0">
              <p className="truncate text-xl font-black text-stone-900">{user.displayName || user.username}</p>
              <p className="truncate text-sm text-stone-600">@{user.username}</p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-700"
            onClick={onClose}
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ProfileStat label="Today" value={sumRounds(state.chantTotals, user.id, "daily", todayKey)} />
          <ProfileStat label="This week" value={sumRounds(state.chantTotals, user.id, "weekly", todayKey)} />
          <ProfileStat label="This month" value={sumRounds(state.chantTotals, user.id, "monthly", todayKey)} />
          <ProfileStat label="7 days" value={sevenDayRounds} />
          <ProfileStat label="Streak" value={currentStreak(state.chantTotals, user.id, todayKey)} />
          <ProfileStat label="Groups" value={groupCount} />
        </div>
        <div className="mb-5 rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm text-peacock-900">
          <div className="flex items-center gap-2 font-black">
            <CalendarDays size={16} />
            Public profile
          </div>
          <p className="mt-1">
            Joined {formatDate(user.joinedAt.slice(0, 10))}. {friendCount} accepted friend{friendCount === 1 ? "" : "s"}.
            Best streak is {bestStreak(state.chantTotals, user.id)} day{bestStreak(state.chantTotals, user.id) === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-black text-stone-900">Recent 7 days</p>
              <span className="rounded-md bg-saffron-50 px-2 py-1 text-xs font-black text-saffron-900">
                {sevenDayRounds} rounds
              </span>
            </div>
            <div className="grid gap-2 [grid-template-columns:repeat(7,minmax(32px,1fr))]">
              {recentHistory.map((item) => (
                <div key={item.dateKey} className="rounded-md bg-stone-50 px-1 py-2 text-center">
                  <p className="text-sm font-black text-stone-900">{item.rounds}</p>
                  <p className="truncate text-[11px] font-bold text-stone-500">
                    {item.dateKey === todayKey ? "Today" : formatDate(item.dateKey).replace(/,.*$/, "")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
            <p className="font-black text-saffron-900">Milestones</p>
            <p className="mt-2 text-3xl font-black text-stone-950">{earnedMilestones}/{milestones.length}</p>
            <p className="text-sm text-stone-600">earned</p>
          </div>
        </div>
        {userGroups.length > 0 && (
          <div className="mb-5 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="mb-2 font-black text-stone-900">Groups</p>
            <div className="flex flex-wrap gap-2">
              {userGroups.slice(0, 6).map((group) => (
                <span key={group!.id} className="rounded-md bg-white px-3 py-2 text-sm font-bold text-stone-700 ring-1 ring-stone-200">
                  {group!.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <MilestoneGrid milestones={milestones} limit={4} />
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function buildNotifications(
  state: ReturnType<typeof useChanting>["state"],
  currentUserId: string,
  emailVerified: boolean | null,
  message: string
) {
  const currentUser = state.users.find((user) => user.id === currentUserId);
  const incoming = state.friendRequests.filter((request) => request.toUserId === currentUserId && request.status === "pending");
  const outgoing = state.friendRequests.filter((request) => request.fromUserId === currentUserId && request.status === "pending");
  const groups = state.groupMembers
    .filter((member) => member.userId === currentUserId)
    .map((member) => state.groups.find((group) => group.id === member.groupId))
    .filter(Boolean);
  const openReports = (state.moderationReports || []).filter((report) => report.reporterId === currentUserId && report.status === "open");
  const items = [
    ...incoming.map((request) => {
      const sender = state.users.find((user) => user.id === request.fromUserId);
      return {
        id: `friend-${request.id}`,
        tone: "warning" as const,
        title: "Friend request",
        body: `@${sender?.username || "Someone"} sent you a friend request.`,
        action: { type: "accept-friend" as const, requestId: request.id, label: "Accept request" }
      };
    }),
    ...outgoing.slice(0, 2).map((request) => {
      const receiver = state.users.find((user) => user.id === request.toUserId);
      return {
        id: `outgoing-${request.id}`,
        tone: "info" as const,
        title: "Request pending",
        body: `Waiting for @${receiver?.username || "that user"} to accept your friend request.`,
        action: { type: "open-tab" as const, tab: "friends" as TabId, label: "View requests" }
      };
    }),
    ...(emailVerified === false
      ? [{
          id: "email-unverified",
          tone: "warning" as const,
          title: "Email not verified",
          body: "Confirm your email to keep account recovery reliable.",
          action: { type: "open-tab" as const, tab: "profile" as TabId, label: "Open profile" }
        }]
      : []),
    ...(openReports.length > 0
      ? [{
          id: "reports-open",
          tone: "info" as const,
          title: "Reports submitted",
          body: `${openReports.length} report${openReports.length === 1 ? "" : "s"} waiting for future moderator review.`
        }]
      : []),
    {
      id: "groups-summary",
      tone: "success" as const,
      title: "Groups",
      body: groups.length > 0 ? `You are in ${groups.length} group${groups.length === 1 ? "" : "s"}.` : "Create or join a group to start a group leaderboard.",
      action: { type: "open-tab" as const, tab: "groups" as TabId, label: groups.length > 0 ? "View groups" : "Create group" }
    },
    {
      id: "profile-summary",
      tone: "success" as const,
      title: "Profile",
      body: currentUser?.avatarUrl ? "Your profile picture is set." : "Add a profile picture from Profile settings.",
      action: { type: "open-tab" as const, tab: "profile" as TabId, label: "Open profile" }
    },
    ...(message
      ? [{
          id: "latest-message",
          tone: "success" as const,
          title: "Latest update",
          body: message
        }]
      : [])
  ];
  return items;
}
