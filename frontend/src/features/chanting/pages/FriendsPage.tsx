"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, HeartHandshake, Search, Trophy, UserRoundSearch, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { makeFriendRequest, useChanting } from "../ChantingContext";
import { latestChantUpdate, latestUpdateLabel, leaderboardRange, rankUsersInRange, readableError } from "../domain";
import { ActionEmptyState, Avatar, EmptyState, Field, FilterBar, Leaderboard, LeaderboardSkeleton, MetricSkeletonGrid, PageHeader, Panel, PanelSkeleton, PeriodHistoryControls, PeriodTabs, PublicUserCard, StatCard, StatGrid } from "../ui";

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
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const forcedRefreshUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || forcedRefreshUserRef.current === currentUser.id) return;
    forcedRefreshUserRef.current = currentUser.id;
    ensureFriendsData(true);
  }, [currentUser, ensureFriendsData]);

  useEffect(() => setPeriodOffset(0), [period]);

  if (!currentUser) return null;

  const friendUsers = state.users.filter((user) => friends.includes(user.id) || user.id === currentUser.id);
  const acceptedRequests = state.friendRequests.filter(
    (request) =>
      request.status === "accepted" &&
      (request.fromUserId === currentUser.id || request.toUserId === currentUser.id)
  );
  const incomingRequests = state.friendRequests.filter(
    (request) => request.toUserId === currentUser.id && request.status === "pending"
  );
  const outgoingRequests = state.friendRequests.filter(
    (request) => request.fromUserId === currentUser.id && request.status === "pending"
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
      {isLoadingFriends && !hasFriendData ? (
        <MetricSkeletonGrid />
      ) : (
        <PageHeader
          eyebrow="Friend circle"
          icon={<HeartHandshake size={16} />}
          title="Friends"
          description="Manage requests and compare chanting progress with accepted friends."
          stats={
            <StatGrid columns={3}>
              <StatCard label="Accepted" value={acceptedRequests.length} tone="saffron" />
              <StatCard label="Incoming" value={incomingRequests.length} tone="peacock" />
              <StatCard label="Outgoing" value={outgoingRequests.length} tone="stone" />
            </StatGrid>
          }
        />
      )}
      {!isLoadingFriends && !hasFriendData && (
        <ActionEmptyState
          icon={<UserRoundSearch size={20} />}
          title="Build your friends leaderboard"
          text="Search a username, send a request, and accepted friends will get a private leaderboard with you."
        >
          <button
            type="button"
            className="rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white shadow-sm"
            onClick={jumpToSearch}
          >
            Search username
          </button>
        </ActionEmptyState>
      )}
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
              <EmptyState text="No incoming friend requests." />
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
              <EmptyState text="Sent friend requests will appear here until accepted." />
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
      <Panel title="Friends" icon={<HeartHandshake size={18} />}>
        {isLoadingFriends && !hasFriendData ? (
          <div className="-m-4 sm:-m-5">
            <PanelSkeleton rows={2} title={false} />
          </div>
        ) : acceptedRequests.length === 0 ? (
          <ActionEmptyState
            icon={<HeartHandshake size={20} />}
            title="No accepted friends yet"
            text="Send a request by username. Once accepted, they will appear here and on your friends leaderboard."
          >
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
              onClick={jumpToSearch}
            >
              Find friends
            </button>
          </ActionEmptyState>
        ) : (
          <>
          <FilterBar meta={`Showing ${visibleAcceptedRequests.length} of ${acceptedRequests.length}`}>
            <div className="min-w-[220px] flex-1">
              <Field
                label="Search friends"
                value={friendSearch}
                onChange={setFriendSearch}
                placeholder="username, name, or country"
                inputMode="search"
              />
            </div>
          </FilterBar>
          {visibleAcceptedRequests.length === 0 ? (
            <EmptyState text={`No accepted friends match "${friendSearch.trim()}".`} />
          ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleAcceptedRequests.map((request) => {
              const friendId = request.fromUserId === currentUser.id ? request.toUserId : request.fromUserId;
              const friend = state.users.find((user) => user.id === friendId);
              const friendToday = friend
                ? state.chantTotals
                    .filter((total) => total.userId === friend.id && total.localDate === todayKey)
                    .reduce((sum, total) => sum + total.rounds, 0)
                : 0;
              return (
                friend ? (
                <PublicUserCard
                  key={request.id}
                  user={friend}
                  currentUserId={currentUser.id}
                  meta={`Friends since ${new Date(request.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
                  stats={[{ label: "today", value: friendToday, tone: "peacock" }]}
                  onOpenProfile={() => setSelectedPublicUserId(friend.id)}
                  showCountry={friend.privacy?.showCountry ?? true}
                  compact
                  actions={
                    <>
                      <button
                        className="rounded-md bg-white px-3 py-2 text-sm font-bold text-peacock-900 ring-1 ring-peacock-100"
                        onClick={() => setSelectedPublicUserId(friend.id)}
                      >
                        Profile
                      </button>
                    <button
                      className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700"
                      disabled={isBusy}
                      onClick={() => deleteFriendRequest(request.id, "Friend removed.")}
                    >
                      Remove
                    </button>
                    </>
                  }
                />
                ) : (
                  <EmptyState key={request.id} text="Friend profile is not loaded yet. Refresh friends and try again." />
                )
              );
            })}
          </div>
          )}
          </>
        )}
      </Panel>
      <Panel title="Friends leaderboard" icon={<Trophy size={18} />}>
        {isLoadingFriends && !hasFriendData ? (
          <LeaderboardSkeleton />
        ) : (
          <>
            <PeriodTabs value={period} onChange={setPeriod} options={["daily", "weekly", "monthly"]} />
            <PeriodHistoryControls offset={periodOffset} onChange={setPeriodOffset} label={range.label} />
            <FriendLeaderboardToggle showAll={showAllFriends} onChange={setShowAllFriends} />
            <Leaderboard
              title=""
              period={period}
              periodText={range.label}
              currentUserId={currentUser.id}
              emptyText="No friends have added rounds for this period yet."
              visibility={showAllFriends ? "all" : "active"}
              rows={rankUsersInRange(friendUsers, state.chantTotals, range.start, range.end)}
              lastUpdated={lastUpdated}
              isRefreshing={isBusy || isLoadingFriends}
              onRefresh={() => refreshRemoteState(currentUser.id)}
            />
          </>
        )}
      </Panel>
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
      <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
    </div>
  );
}

function FriendLeaderboardToggle({ showAll, onChange }: { showAll: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="mb-3 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm sm:mb-4">
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${!showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(false)}
      >
        Active only
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-1.5 text-sm font-black transition sm:py-2 ${showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(true)}
      >
        All friends
      </button>
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
            return (
              <PublicUserCard
                key={user.id}
                user={user}
                currentUserId={currentUser.id}
                badges={[isExact ? "Exact" : "", alreadyRelated ? "Connected" : ""].filter(Boolean)}
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
                    {alreadyRelated ? "Added" : "Add"}
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
