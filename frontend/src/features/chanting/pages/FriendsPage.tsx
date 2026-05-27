"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronRight, HeartHandshake, Search, Trophy, UserRoundSearch, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { makeFriendRequest, useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange, readableError } from "../domain";
import { ActionEmptyState, Avatar, EmptyState, Field, FilterBar, Leaderboard, LeaderboardSkeleton, Panel, PanelSkeleton, PublicUserCard } from "../ui";

export function FriendsPage() {
  const {
    state,
    currentUser,
    friends,
    period,
    setPeriod,
    todayKey,
    isBusy,
    deleteFriendRequest,
    acceptFriendRequest,
    ensureFriendsData,
    loadingRemoteSlices,
    refreshRemoteState,
    setSelectedPublicUserId
  } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [friendSearch, setFriendSearch] = useState("");
  const [showFriendList, setShowFriendList] = useState(true);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const forcedRefreshUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || forcedRefreshUserRef.current === currentUser.id) return;
    forcedRefreshUserRef.current = currentUser.id;
    ensureFriendsData(true);
  }, [currentUser, ensureFriendsData]);

  useEffect(() => setPeriodOffset(0), [period]);

  if (!currentUser) return null;

  const friendUsers = useMemo(
    () => state.users.filter((user) => friends.includes(user.id) || user.id === currentUser.id),
    [currentUser.id, friends, state.users]
  );
  const acceptedRequests = useMemo(
    () => state.friendRequests.filter(
      (request) =>
        request.status === "accepted" &&
        (request.fromUserId === currentUser.id || request.toUserId === currentUser.id)
    ),
    [currentUser.id, state.friendRequests]
  );
  const incomingRequests = useMemo(
    () => state.friendRequests.filter(
      (request) => request.toUserId === currentUser.id && request.status === "pending"
    ),
    [currentUser.id, state.friendRequests]
  );
  const outgoingRequests = useMemo(
    () => state.friendRequests.filter(
      (request) => request.fromUserId === currentUser.id && request.status === "pending"
    ),
    [currentUser.id, state.friendRequests]
  );
  const cleanFriendSearch = friendSearch.trim().toLowerCase();
  const visibleAcceptedRequests = acceptedRequests.filter((request) => {
    if (!cleanFriendSearch) return true;
    const friendId = request.fromUserId === currentUser.id ? request.toUserId : request.fromUserId;
    const friend = state.users.find((user) => user.id === friendId);
    return (
      friend?.username.toLowerCase().includes(cleanFriendSearch) ||
      (friend?.displayName || "").toLowerCase().includes(cleanFriendSearch) ||
      friend?.country.toLowerCase().includes(cleanFriendSearch)
    );
  });
  const range = leaderboardRange(period, todayKey, periodOffset);
  const lastUpdated = latestUpdateLabel(latestChantUpdate(state.chantTotals, friendUsers.map((user) => user.id), range.start, range.end));
  const isLoadingFriends = loadingRemoteSlices.friends;
  const hasFriendData = state.friendRequests.some(
    (request) => request.fromUserId === currentUser.id || request.toUserId === currentUser.id
  );
  const jumpToSearch = () => searchPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-4 sm:space-y-5">
      <details
        className="group overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft"
        open={showFriendList}
        onToggle={(event) => setShowFriendList(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-700 ring-1 ring-saffron-100">
              <HeartHandshake size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black text-stone-950">Your friends</span>
              <span className="block truncate text-xs font-bold text-stone-500">
                {acceptedRequests.length === 0 ? "Build your friends leaderboard" : `${acceptedRequests.length} accepted`}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900 ring-1 ring-peacock-100 sm:inline-flex">
              {acceptedRequests.length} friend{acceptedRequests.length === 1 ? "" : "s"}
            </span>
            <ChevronRight className="text-stone-400 transition group-open:rotate-90" size={18} />
          </span>
        </summary>
        <div className="border-t border-saffron-100 p-3 sm:p-4">
          {isLoadingFriends && !hasFriendData ? (
            <div className="-m-3 sm:-m-4">
              <PanelSkeleton rows={3} title={false} />
            </div>
          ) : acceptedRequests.length === 0 ? (
            <ActionEmptyState
              icon={<UserRoundSearch size={20} />}
              title="No accepted friends yet"
              text="Search a username and send a request. Accepted friends appear here and in your leaderboard."
            >
              <button
                type="button"
                className="rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"
                onClick={jumpToSearch}
              >
                Find friends
              </button>
            </ActionEmptyState>
          ) : (
            <>
              <FilterBar meta={`Showing ${visibleAcceptedRequests.length} of ${acceptedRequests.length}`}>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search friends</span>
                  <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                    value={friendSearch}
                    onChange={(event) => setFriendSearch(event.target.value)}
                    placeholder="Search friends by username, name, or country"
                    type="search"
                  />
                </label>
              </FilterBar>
              {visibleAcceptedRequests.length === 0 ? (
                <EmptyState text={`No accepted friends match "${friendSearch.trim()}".`} />
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {visibleAcceptedRequests.map((request) => {
                    const friendId = request.fromUserId === currentUser.id ? request.toUserId : request.fromUserId;
                    const friend = state.users.find((user) => user.id === friendId);
                    const friendToday = friend
                      ? state.chantTotals
                          .filter((total) => total.userId === friend.id && total.localDate === todayKey)
                          .reduce((sum, total) => sum + total.rounds, 0)
                      : 0;
                    return friend ? (
                      <div key={request.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={friend.avatarUrl} label={friend.displayName || friend.username} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-stone-900">{friend.displayName || friend.username}</p>
                            <p className="truncate text-sm text-stone-600">@{friend.username}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900">
                            {friendToday} today
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
                            Since {new Date(request.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                          </span>
                          <button
                            className="rounded-md bg-white px-2 py-1 text-xs font-bold text-peacock-900 ring-1 ring-peacock-100"
                            onClick={() => setSelectedPublicUserId(friend.id)}
                          >
                            Profile
                          </button>
                          <button
                            className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700"
                            disabled={isBusy}
                            onClick={() => deleteFriendRequest(request.id, "Friend removed.")}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EmptyState key={request.id} text="Friend profile is not loaded yet. Refresh friends and try again." />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </details>

      <Panel title="Friends leaderboard" icon={<Trophy size={18} />}>
        {isLoadingFriends && !hasFriendData ? (
          <LeaderboardSkeleton />
        ) : (
          <>
            <LeaderboardControlBar
              period={period}
              setPeriod={setPeriod}
              periodOffset={periodOffset}
              setPeriodOffset={setPeriodOffset}
              rangeLabel={range.label}
              chips={[
                `${acceptedRequests.length} friend${acceptedRequests.length === 1 ? "" : "s"}`,
                lastUpdated ? `Updated ${lastUpdated}` : "No updates yet"
              ]}
            />
            <Leaderboard
              compact
              title=""
              period={period}
              periodText={range.label}
              currentUserId={currentUser.id}
              emptyText="No friends have added rounds for this period yet."
              visibility="all"
              rows={rankUsersInRange(friendUsers, state.chantTotals, range.start, range.end)}
            />
          </>
        )}
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <div ref={searchPanelRef}>
          <FriendSearch />
        </div>
        <div className="space-y-4">
          <Panel title="Incoming requests" icon={<HeartHandshake size={18} />}>
            {isLoadingFriends && !hasFriendData ? (
              <div className="-m-4 sm:-m-5">
                <PanelSkeleton rows={1} title={false} />
              </div>
            ) : incomingRequests.length === 0 ? (
              <EmptyState text="No incoming requests." />
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((request) => {
                  const sender = state.users.find((user) => user.id === request.fromUserId);
                  return (
                    <FriendRequestRow
                      key={request.id}
                      avatar={sender?.avatarUrl || ""}
                      title={sender?.displayName || sender?.username || "User"}
                      subtitle={sender?.username ? `@${sender.username}` : "User not loaded"}
                      actions={
                        <>
                          <button
                            className="flex items-center gap-2 rounded-md bg-peacock-600 px-3 py-2 text-sm font-bold text-white"
                            disabled={isBusy}
                            onClick={() => acceptFriendRequest(request.id)}
                          >
                            <Check size={16} /> Accept
                          </button>
                          <button
                            className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700"
                            disabled={isBusy}
                            onClick={() => deleteFriendRequest(request.id, "Friend request declined.")}
                          >
                            Decline
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Panel>
          <Panel title="Outgoing requests" icon={<Users size={18} />}>
            {isLoadingFriends && !hasFriendData ? (
              <div className="-m-4 sm:-m-5">
                <PanelSkeleton rows={1} title={false} />
              </div>
            ) : outgoingRequests.length === 0 ? (
              <EmptyState text="No outgoing requests." />
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((request) => {
                  const receiver = state.users.find((user) => user.id === request.toUserId);
                  return (
                    <FriendRequestRow
                      key={request.id}
                      avatar={receiver?.avatarUrl || ""}
                      title={receiver?.displayName || receiver?.username || "User"}
                      subtitle={receiver?.username ? `@${receiver.username}` : "User not loaded"}
                      actions={
                        <button
                          className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700"
                          disabled={isBusy}
                          onClick={() => deleteFriendRequest(request.id, "Friend request canceled.")}
                        >
                          Cancel request
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function FriendRequestRow({
  avatar,
  title,
  subtitle,
  actions
}: {
  avatar: string;
  title: string;
  subtitle: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={avatar} label={title} />
        <div className="min-w-0">
          <p className="truncate font-bold">{title}</p>
          <p className="truncate text-sm text-stone-600">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end [&>button]:flex-1 sm:[&>button]:flex-none">{actions}</div>
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

function FriendSearch() {
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, showActionFeedback, showMessage, addNotification, setSelectedPublicUserId } = useChanting();
  const [query, setQuery] = useState("");
  if (!currentUser) return null;

  const cleanQuery = query.trim().toLowerCase();
  const relatedUserIds = new Set(
    state.friendRequests
      .filter((request) => request.fromUserId === currentUser.id || request.toUserId === currentUser.id)
      .flatMap((request) => [request.fromUserId, request.toUserId])
      .filter((userId) => userId !== currentUser.id)
  );
  const relationshipLabel = (userId: string) => {
    const request = state.friendRequests.find(
      (item) =>
        (item.fromUserId === currentUser.id && item.toUserId === userId) ||
        (item.fromUserId === userId && item.toUserId === currentUser.id)
    );
    if (!request) return "";
    if (request.status === "accepted") return "Already friends";
    if (request.fromUserId === currentUser.id) return "Request sent";
    return "Request received";
  };
  const results = state.users
    .filter(
      (user) =>
        user.id !== currentUser.id &&
        (user.username.toLowerCase().includes(cleanQuery) ||
          (user.displayName || "").toLowerCase().includes(cleanQuery)) &&
        cleanQuery.length > 1
    )
    .sort((a, b) => {
      const aName = a.username.toLowerCase();
      const bName = b.username.toLowerCase();
      const aScore = aName === cleanQuery ? 0 : aName.startsWith(cleanQuery) ? 1 : 2;
      const bScore = bName === cleanQuery ? 0 : bName.startsWith(cleanQuery) ? 1 : 2;
      return aScore - bScore || a.username.localeCompare(b.username);
    });

  const sendRequest = async (toUserId: string) => {
    const targetUser = state.users.find((user) => user.id === toUserId);
    const exists = state.friendRequests.some(
      (request) =>
        (request.fromUserId === currentUser.id && request.toUserId === toUserId) ||
        (request.fromUserId === toUserId && request.toUserId === currentUser.id)
    );
    if (exists) {
      showMessage("A friend connection or request already exists.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("friend_requests").insert({
          from_user_id: currentUser.id,
          to_user_id: toUserId,
          status: "pending"
        });
        if (error) throw error;
        await refreshRemoteState(currentUser.id);
        await addNotification({
          title: "Friend request sent",
          body: `Waiting for @${targetUser?.username || "that user"} to accept.`,
          tone: "info",
          actionTab: "friends",
          dedupeKey: `friend-request-sent-${toUserId}`
        });
        showActionFeedback({
          title: "Friend request sent",
          body: `Waiting for @${targetUser?.username || "that user"} to accept. You can track it in outgoing requests.`,
          action: { label: "View requests", tab: "friends" }
        });
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({ ...state, friendRequests: [...state.friendRequests, makeFriendRequest(currentUser.id, toUserId)] });
    await addNotification({
      title: "Friend request sent",
      body: `Waiting for @${targetUser?.username || "that user"} to accept.`,
      tone: "info",
      actionTab: "friends",
      dedupeKey: `friend-request-sent-${toUserId}`
    });
    showActionFeedback({
      title: "Friend request sent",
      body: `Waiting for @${targetUser?.username || "that user"} to accept. You can track it in outgoing requests.`,
      action: { label: "View requests", tab: "friends" }
    });
  };

    return (
    <Panel title="Find friends" icon={<Search size={18} />}>
      <Field
        label="Search username"
        value={query}
        onChange={setQuery}
        placeholder="exact_username"
        helper="Exact username matches appear first, then usernames that start with your search."
      />
      <div className="mt-3 space-y-2">
        {cleanQuery.length <= 1 ? (
          <EmptyState text="Type at least 2 characters to search by username." />
        ) : results.length === 0 ? (
          <EmptyState text={`No users found for "${query.trim()}". Check the username and try again.`} />
        ) : (
          results.map((user) => {
            const isExact = user.username.toLowerCase() === cleanQuery;
            const alreadyRelated = relatedUserIds.has(user.id);
            const statusLabel = relationshipLabel(user.id);
            return (
              <PublicUserCard
                key={user.id}
                user={user}
                currentUserId={currentUser.id}
                badges={[isExact ? "Exact match" : "", statusLabel].filter(Boolean)}
                meta={alreadyRelated ? "Connection exists" : "Available to add"}
                onOpenProfile={() => setSelectedPublicUserId(user.id)}
                showCountry={user.privacy?.showCountry ?? true}
                compact
                actions={
                  <>
                  <button
                    className="rounded-md bg-white px-3 py-2 text-sm font-bold text-peacock-900 ring-1 ring-peacock-100"
                    onClick={() => setSelectedPublicUserId(user.id)}
                  >
                    Profile
                  </button>
                  <button
                    className={`rounded-md px-3 py-2 text-sm font-bold ${
                      alreadyRelated ? "bg-stone-100 text-stone-500" : "bg-saffron-500 text-white"
                    }`}
                    onClick={() => sendRequest(user.id)}
                    disabled={isBusy || alreadyRelated}
                  >
                    {statusLabel || "Add friend"}
                  </button>
                  </>
                }
              />
            );
          })
        )}
      </div>
    </Panel>
  );
}
