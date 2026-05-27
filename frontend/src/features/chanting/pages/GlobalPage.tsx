"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Trophy, Users } from "lucide-react";
import { useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange, sumRounds } from "../domain";
import { Avatar, EmptyState, FilterBar, Leaderboard, Panel, PanelSkeleton } from "../ui";

export function GlobalPage() {
  const { state, currentUser, period, setPeriod, todayKey, refreshRemoteState, loadingRemoteSlices } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showCommunityList, setShowCommunityList] = useState(true);
  const [communitySearch, setCommunitySearch] = useState("");
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    void refreshRemoteState(currentUser.id, "core");
  }, [currentUser, refreshRemoteState]);

  useEffect(() => setPeriodOffset(0), [period]);
  if (!currentUser) return null;
  const range = leaderboardRange(period, todayKey, periodOffset);
  const lastUpdated = latestUpdateLabel(latestChantUpdate(state.chantTotals, state.users.map((user) => user.id), range.start, range.end));
  const activeUserCount = state.users.filter((user) =>
    state.chantTotals.some((total) => total.userId === user.id && total.localDate >= range.start && total.localDate <= range.end && total.rounds > 0)
  ).length;
  const cleanCommunitySearch = communitySearch.trim().toLowerCase();
  const visibleUsers = state.users.filter((user) => {
    if (!cleanCommunitySearch) return true;
    return (
      user.username.toLowerCase().includes(cleanCommunitySearch) ||
      (user.displayName || "").toLowerCase().includes(cleanCommunitySearch) ||
      user.country.toLowerCase().includes(cleanCommunitySearch)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <details
        className="group overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft"
        open={showCommunityList}
        onToggle={(event) => setShowCommunityList(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
              <Users size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black text-stone-950">Community</span>
              <span className="block truncate text-xs font-bold text-stone-500">
                {activeUserCount} active in {range.label.toLowerCase()}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900 ring-1 ring-peacock-100 sm:inline-flex">
              {state.users.length} users
            </span>
            <ChevronRight className="text-stone-400 transition group-open:rotate-90" size={18} />
          </span>
        </summary>
        <div className="border-t border-saffron-100 p-3 sm:p-4">
          {loadingRemoteSlices.core && state.users.length === 0 ? (
            <div className="-m-3 sm:-m-4">
              <PanelSkeleton rows={3} title={false} />
            </div>
          ) : state.users.length === 0 ? (
            <EmptyState text="No community profiles are loaded yet." />
          ) : (
            <>
              <FilterBar meta={`Showing ${visibleUsers.length} of ${state.users.length}`}>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search community</span>
                  <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                    value={communitySearch}
                    onChange={(event) => setCommunitySearch(event.target.value)}
                    placeholder="Search community by username, name, or country"
                    type="search"
                  />
                </label>
              </FilterBar>
              {visibleUsers.length === 0 ? (
                <EmptyState text={`No community profiles match "${communitySearch.trim()}".`} />
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {visibleUsers.map((user) => {
                    const todayRounds = sumRounds(state.chantTotals, user.id, "daily", todayKey);
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <div
                        key={user.id}
                        className={`rounded-lg border p-3 shadow-sm ${
                          isCurrent ? "border-saffron-500 bg-saffron-50" : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={user.avatarUrl} label={user.displayName || user.username} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-stone-900">{user.displayName || user.username}</p>
                            <p className="truncate text-sm text-stone-600">@{user.username}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {isCurrent && (
                            <span className="rounded-md bg-saffron-500 px-2 py-1 text-xs font-black text-white">
                              You
                            </span>
                          )}
                          <span className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900">
                            {todayRounds} today
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
                            {user.country}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </details>

      <Panel title="Global leaderboard" icon={<Trophy size={18} />}>
        <LeaderboardControlBar
          period={period}
          setPeriod={setPeriod}
          periodOffset={periodOffset}
          setPeriodOffset={setPeriodOffset}
          rangeLabel={range.label}
          chips={[
            `${state.users.length} user${state.users.length === 1 ? "" : "s"}`,
            `${activeUserCount} active`,
            lastUpdated ? `Updated ${lastUpdated}` : "No updates yet"
          ]}
        />
        <Leaderboard
          compact
          title=""
          period={period}
          periodText={range.label}
          currentUserId={currentUser.id}
          emptyText="No global rounds saved for this period yet."
          visibility="all"
          rows={rankUsersInRange(state.users, state.chantTotals, range.start, range.end)}
        />
      </Panel>
    </div>
  );
}

function LeaderboardControlBar({
  period,
  setPeriod,
  periodOffset,
  setPeriodOffset,
  rangeLabel,
  chips
}: {
  period: "daily" | "weekly" | "monthly" | "allTime";
  setPeriod: (period: "daily" | "weekly" | "monthly" | "allTime") => void;
  periodOffset: number;
  setPeriodOffset: (offset: number) => void;
  rangeLabel: string;
  chips: string[];
}) {
  return (
    <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 p-2 shadow-sm">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:flex">
          {(["daily", "weekly", "monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
                period === option ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setPeriod(option)}
            >
              {option === "daily" ? "Today" : option === "weekly" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 sm:flex xl:shrink-0">
          <button
            type="button"
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm"
            onClick={() => setPeriodOffset(periodOffset + 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm disabled:text-stone-400"
            disabled={periodOffset === 0}
            onClick={() => setPeriodOffset(Math.max(0, periodOffset - 1))}
          >
            Next
          </button>
          <button
            type="button"
            className="rounded-md bg-saffron-50 px-3 py-1.5 text-sm font-black text-saffron-900 ring-1 ring-saffron-100"
            onClick={() => setPeriodOffset(0)}
          >
            {rangeLabel}
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <span key={chip} className="rounded-md bg-peacock-50 px-2.5 py-1.5 text-xs font-black text-peacock-900 ring-1 ring-peacock-100">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
