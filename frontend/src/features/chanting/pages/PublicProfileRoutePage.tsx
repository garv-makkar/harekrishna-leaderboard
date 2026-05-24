"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, ExternalLink, Home, Loader2, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ProfilePrivacy } from "@/lib/types";
import {
  addDays,
  computeMilestones,
  createSeedState,
  defaultProfilePrivacy,
  formatDate,
  loadState,
  localDateKey,
  readableError,
  roundsForDate,
  sumRounds
} from "../domain";
import { Avatar, EmptyState, Panel, PrivacyVisibilitySummary } from "../ui";

type PublicProfilePayload = {
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
    country: string | null;
    joinedAt: string;
    privacy: ProfilePrivacy;
    featuredMilestoneIds: string[];
  };
  todayKey: string;
  stats: {
    todayRounds: number;
    weeklyRounds: number;
    monthlyRounds: number;
    allTimeRounds: number;
    positiveEntryCount: number;
    groupCount: number;
    createdGroupCount: number;
    friendCount: number;
  };
  recentHistory: { dateKey: string; rounds: number }[];
  positiveDates: string[];
  groups: { name: string; imageUrl: string; role: string }[];
};

export function PublicProfileRoutePage({ username }: { username: string }) {
  const cleanUsername = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  const [payload, setPayload] = useState<PublicProfilePayload | null>(null);
  const [status, setStatus] = useState("Loading public profile...");
  const [isLoading, setIsLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setStatus("Loading public profile...");
      try {
        const data = supabase ? await loadRemoteProfile(cleanUsername) : loadDemoProfile(cleanUsername);
        if (cancelled) return;
        if (!data) {
          setPayload(null);
          setStatus("No public profile found for that username.");
          return;
        }
        setPayload(data);
        setStatus("");
      } catch (error) {
        if (cancelled) return;
        setPayload(null);
        const message = readableError(error);
        setStatus(
          message.toLowerCase().includes("get_public_profile")
            ? "Run migration 013_public_profile_rpc.sql in Supabase to enable public profile links."
            : message
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cleanUsername]);

  const privacy = { ...defaultProfilePrivacy, ...(payload?.profile.privacy || {}) };
  const streakNow = useMemo(
    () => (payload && privacy.showStreak ? currentStreakFromDates(payload.positiveDates, payload.todayKey) : 0),
    [payload, privacy.showStreak]
  );
  const streakBest = useMemo(
    () => (payload && (privacy.showStreak || privacy.showMilestones) ? bestStreakFromDates(payload.positiveDates) : 0),
    [payload, privacy.showMilestones, privacy.showStreak]
  );
  const milestones = useMemo(() => (payload && privacy.showMilestones ? publicMilestones(payload, streakBest) : []), [payload, privacy.showMilestones, streakBest]);
  const featuredMilestones = useMemo(
    () =>
      payload && privacy.showMilestones
        ? (payload.profile.featuredMilestoneIds || [])
            .map((id) => milestones.find((milestone) => milestone.id === id && milestone.earned))
            .filter(Boolean)
            .slice(0, 3) as typeof milestones
        : [],
    [milestones, payload, privacy.showMilestones]
  );
  const highestRecentRounds = Math.max(1, ...(payload?.recentHistory || []).map((item) => item.rounds));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed,transparent_32%),linear-gradient(135deg,#fffaf0,#f5fffb_48%,#fff7ed)] px-3 py-3 text-stone-900 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 shadow-sm ring-1 ring-saffron-200 sm:w-fit"
          >
            <Home size={17} /> Hare Krishna Leaderboard
          </Link>
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100 sm:w-fit">
            <ShieldCheck size={16} /> Public profile
          </span>
        </div>

        {isLoading && (
          <div className="rounded-lg border border-saffron-200 bg-white/90 p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3 text-saffron-900">
              <Loader2 className="animate-spin" size={20} />
              <p className="font-black">{status}</p>
            </div>
          </div>
        )}

        {!isLoading && !payload && (
          <Panel title="Profile unavailable" icon={<ShieldCheck size={18} />}>
            <EmptyState text={status || "This public profile could not be loaded."} />
          </Panel>
        )}

        {payload && (
          <div className="space-y-4 sm:space-y-5">
            <section className="overflow-hidden rounded-lg border border-saffron-200 bg-white/94 text-center shadow-soft">
              <div className="border-b border-saffron-100 bg-saffron-50/80 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-lg ring-1 ring-saffron-200 sm:h-20 sm:w-20">
                  {payload.profile.avatarUrl ? (
                    <img src={payload.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="lotus-mark grid h-full w-full place-items-center text-xl font-black text-white">
                      {(payload.profile.displayName || payload.profile.username).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <h1 className="text-xl font-black tracking-normal text-stone-950 sm:text-3xl">
                  {payload.profile.displayName || payload.profile.username}
                </h1>
                <p className="mt-1 text-sm font-bold text-stone-600">@{payload.profile.username}</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-stone-600 sm:leading-6">
                  {payload.profile.country ? `${payload.profile.country}. ` : ""}
                  Joined {formatDate(payload.profile.joinedAt.slice(0, 10))}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
                <PublicHeroMetric label="Today" value={payload.stats.todayRounds} />
                <PublicHeroMetric label="Week" value={payload.stats.weeklyRounds} />
                <PublicHeroMetric label="Month" value={payload.stats.monthlyRounds} />
                <PublicHeroMetric label="All time" value={payload.stats.allTimeRounds} />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Panel title="Stats" icon={<Trophy size={18} />}>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {privacy.showStreak ? (
                    <>
                      <PublicMetric label="Current streak" value={streakNow} note={`Best ${streakBest}`} compact />
                      <PublicMetric label="Best streak" value={streakBest} note="active days" compact />
                    </>
                  ) : (
                    <HiddenBlock text="Streak details are private." />
                  )}
                  <PublicMetric label="Friends" value={payload.stats.friendCount} note="accepted connections" compact />
                  {privacy.showGroups ? (
                    <PublicMetric label="Groups" value={payload.stats.groupCount} note="joined groups" compact />
                  ) : (
                    <HiddenBlock text="Group count is private." />
                  )}
                </div>
              </Panel>

              <Panel title="Share profile" icon={<ExternalLink size={18} />}>
                <p className="text-sm leading-5 text-stone-600 sm:leading-6">
                  This public page can be shared without showing private email or phone details.
                </p>
                {shareStatus && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{shareStatus}</p>}
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(
                        () => {
                          setShareStatus("Profile link copied.");
                          window.setTimeout(() => setShareStatus(""), 2500);
                        },
                        () => setShareStatus(url)
                      );
                    }}
                  >
                    Copy profile link
                  </button>
                  <Link
                    href="/"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
                  >
                    Open app
                  </Link>
                </div>
              </Panel>
            </div>

            <PrivacyVisibilitySummary privacy={privacy} />

            {privacy.showRecentHistory ? (
              <Panel title="Recent 7 days" icon={<CalendarDays size={18} />}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <div className="grid min-w-[490px] gap-2 [grid-template-columns:repeat(7,minmax(0,1fr))] sm:min-w-0">
                    {payload.recentHistory.map((item) => {
                      const barHeight = Math.max(8, Math.round((item.rounds / highestRecentRounds) * 90));
                      return (
                        <div key={item.dateKey} className="flex min-w-0 flex-col items-center gap-2 rounded-md border border-stone-200 bg-white px-1 py-2 text-center shadow-sm">
                          <div className="flex h-20 w-full items-end rounded-md bg-stone-50 px-1 py-1 sm:h-24">
                            <div
                              className={`w-full rounded-sm ${item.rounds > 0 ? "bg-peacock-500" : "bg-stone-200"}`}
                              style={{ height: `${item.rounds > 0 ? barHeight : 8}px` }}
                            />
                          </div>
                          <p className="text-sm font-black text-stone-900">{item.rounds}</p>
                          <p className="max-w-full truncate text-xs text-stone-500">{item.dateKey === payload.todayKey ? "Today" : shortDate(item.dateKey)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>
            ) : (
              <HiddenBlock text="Recent history is private." />
            )}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              {privacy.showMilestones ? (
                <Panel title="Featured milestones" icon={<Award size={18} />}>
                  {featuredMilestones.length === 0 ? (
                    <EmptyState text="No featured milestones selected yet." />
                  ) : (
                    <div className="space-y-2">
                      {featuredMilestones.map((milestone) => (
                        <div key={milestone.id} className="rounded-md border border-saffron-200 bg-saffron-50 px-3 py-2.5">
                          <p className="font-black text-stone-950">{milestone.title}</p>
                          <p className="mt-1 text-sm leading-5 text-stone-600">{milestone.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              ) : (
                <HiddenBlock text="Milestones are private." />
              )}

              {privacy.showGroups ? (
                <Panel title="Groups" icon={<Users size={18} />}>
                  {payload.groups.length === 0 ? (
                    <EmptyState text="No public groups to show yet." />
                  ) : (
                    <div className="space-y-2">
                      {payload.groups.slice(0, 8).map((group) => (
                        <div key={`${group.name}-${group.role}`} className="flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                          <Avatar src={group.imageUrl} label={group.name} />
                          <div className="min-w-0">
                            <p className="truncate font-black text-stone-950">{group.name}</p>
                            <p className="text-sm capitalize text-stone-600">{group.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              ) : (
                <HiddenBlock text="Joined groups are private." />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

async function loadRemoteProfile(username: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_profile", { profile_username: username });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data as PublicProfilePayload | null;
}

function loadDemoProfile(username: string) {
  const state = typeof window === "undefined" ? createSeedState() : loadState();
  const user = state.users.find((item) => item.username.toLowerCase() === username);
  if (!user) return null;
  const todayKey = localDateKey(new Date(), user.timezone);
  const recentHistory = Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDays(todayKey, -(6 - index));
    return { dateKey, rounds: roundsForDate(state.chantTotals, user.id, dateKey) };
  });
  const privacy = { ...defaultProfilePrivacy, ...(user.privacy || {}) };
  return {
    profile: {
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      country: privacy.showCountry ? user.country : null,
      joinedAt: user.joinedAt,
      privacy,
      featuredMilestoneIds: user.featuredMilestoneIds || []
    },
    todayKey,
    stats: {
      todayRounds: sumRounds(state.chantTotals, user.id, "daily", todayKey),
      weeklyRounds: sumRounds(state.chantTotals, user.id, "weekly", todayKey),
      monthlyRounds: sumRounds(state.chantTotals, user.id, "monthly", todayKey),
      allTimeRounds: sumRounds(state.chantTotals, user.id, "allTime", todayKey),
      positiveEntryCount: state.chantTotals.filter((total) => total.userId === user.id && total.rounds > 0).length,
      groupCount: state.groupMembers.filter((member) => member.userId === user.id).length,
      createdGroupCount: state.groups.filter((group) => group.ownerId === user.id).length,
      friendCount: state.friendRequests.filter(
        (request) =>
          request.status === "accepted" &&
          (request.fromUserId === user.id || request.toUserId === user.id)
      ).length
    },
    recentHistory: privacy.showRecentHistory ? recentHistory : [],
    positiveDates:
      privacy.showStreak || privacy.showMilestones
        ? state.chantTotals
            .filter((total) => total.userId === user.id && total.rounds > 0)
            .map((total) => total.localDate)
            .sort()
        : [],
    groups: privacy.showGroups
      ? state.groupMembers
          .filter((member) => member.userId === user.id)
          .map((member) => {
            const group = state.groups.find((item) => item.id === member.groupId);
            return { name: group?.name || "Group", imageUrl: group?.imageUrl || "", role: member.role };
          })
      : []
  } satisfies PublicProfilePayload;
}

function publicMilestones(payload: PublicProfilePayload, streakBest: number) {
  const demoState = createSeedState();
  return computeMilestones(
    {
      ...demoState,
      users: [],
      chantTotals: [],
      groups: Array.from({ length: payload.stats.createdGroupCount }, (_, index) => ({
        id: `created-${index}`,
        ownerId: "public-user",
        name: "Group",
        code: `PUBLIC${index}`,
        imageUrl: "",
        announcement: "",
        targetDaily: 0,
        targetWeekly: 0,
        createdAt: payload.profile.joinedAt
      })),
      groupMembers: Array.from({ length: payload.stats.groupCount }, (_, index) => ({
        groupId: `group-${index}`,
        userId: "public-user",
        role: index === 0 && payload.stats.createdGroupCount > 0 ? "owner" : "member",
        joinedAt: payload.profile.joinedAt
      })),
      friendRequests: Array.from({ length: payload.stats.friendCount }, (_, index) => ({
        id: `friend-${index}`,
        fromUserId: "public-user",
        toUserId: `friend-user-${index}`,
        status: "accepted",
        createdAt: payload.profile.joinedAt
      }))
    },
    {
      id: "public-user",
      username: payload.profile.username,
      email: "",
      phone: "",
      passwordHash: "",
      country: payload.profile.country || "",
      timezone: "Asia/Kolkata",
      displayName: payload.profile.displayName,
      avatarUrl: payload.profile.avatarUrl,
      dailyGoal: 16,
      reminderEnabled: false,
      reminderTime: "20:00",
      privacy: payload.profile.privacy,
      featuredMilestoneIds: payload.profile.featuredMilestoneIds || [],
      joinedAt: payload.profile.joinedAt
    },
    payload.todayKey
  ).map((milestone) => {
    if (milestone.id === "first-entry") return { ...milestone, progress: Math.min(payload.stats.positiveEntryCount, 1), earned: payload.stats.positiveEntryCount >= 1 };
    if (milestone.id === "seven-day-streak") return { ...milestone, progress: Math.min(streakBest, 7), earned: streakBest >= 7 };
    if (milestone.id === "thirty-day-streak") return { ...milestone, progress: Math.min(streakBest, 30), earned: streakBest >= 30 };
    if (milestone.id === "rounds-108") return { ...milestone, progress: Math.min(payload.stats.allTimeRounds, 108), earned: payload.stats.allTimeRounds >= 108 };
    if (milestone.id === "rounds-1008") return { ...milestone, progress: Math.min(payload.stats.allTimeRounds, 1008), earned: payload.stats.allTimeRounds >= 1008 };
    return milestone;
  });
}

function currentStreakFromDates(dateKeys: string[], todayKey: string) {
  const dateSet = new Set(dateKeys);
  let cursor = dateSet.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function bestStreakFromDates(dateKeys: string[]) {
  let best = 0;
  let current = 0;
  let previous = "";
  dateKeys.sort().forEach((dateKey) => {
    current = previous && addDays(previous, 1) === dateKey ? current + 1 : 1;
    best = Math.max(best, current);
    previous = dateKey;
  });
  return best;
}

function PublicMetric({ label, value, note, compact = false }: { label: string; value: number; note: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-saffron-200/80 bg-white/90 px-2.5 py-2 shadow-soft sm:px-4 sm:py-3">
      <p className="text-xs font-bold text-stone-600 sm:text-sm">{label}</p>
      <p className={`${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} mt-0.5 font-black text-saffron-900`}>{value}</p>
      <p className="text-xs text-stone-600 sm:text-sm">{note}</p>
    </div>
  );
}

function PublicHeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-t border-saffron-100 px-2 py-2.5 last:border-r-0 even:border-r-0 sm:even:border-r sm:last:border-r-0 sm:px-3 sm:py-3">
      <p className="text-xl font-black text-saffron-900 sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs font-black uppercase text-stone-500">{label}</p>
    </div>
  );
}

function HiddenBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-bold leading-6 text-stone-600 sm:px-4">
      {text}
    </div>
  );
}

function shortDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });
}
