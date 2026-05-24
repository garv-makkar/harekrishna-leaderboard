"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Clock3, Copy, ImageUp, Link, MessageSquare, Plus, RefreshCw, Search, Settings, Share2, Trash2, Trophy, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Group, GroupMember, GroupRole, UserProfile } from "@/lib/types";
import { useChanting } from "../ChantingContext";
import { addDays, currentStreak, formatDate, groupCodeProblem, latestChantUpdate, latestUpdateLabel, leaderboardRange, normalizeGroupCode, rankUsersInRange, readableError, sumRounds, uid } from "../domain";
import { ActionEmptyState, Avatar, Card, EmptyState, Field, FilterBar, InlineNotice, Leaderboard, LeaderboardSkeleton, PageHeader, Panel, PanelSkeleton, PeriodHistoryControls, PeriodTabs, StatCard, StatGrid } from "../ui";

export function GroupsPage({
  inviteCode = "",
  onInviteHandled
}: {
  inviteCode?: string;
  onInviteHandled?: () => void;
}) {
  const {
    state,
    currentUser,
    joinedGroups,
    selectedGroup,
    setSelectedGroupId,
    groupMemberCount,
    currentUserGroupRole,
    copyGroupCode,
    copyGroupInvite,
    period,
    setPeriod,
    todayKey,
    ensureGroupsData,
    loadingRemoteSlices,
    isBusy,
    runRemote,
    refreshRemoteState,
    saveState,
    showMessage
  } = useChanting();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [actionMode, setActionMode] = useState<"join" | "create">("join");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [recentCopy, setRecentCopy] = useState("");
  const [inviteModalGroup, setInviteModalGroup] = useState<Group | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const actionPanelRef = useRef<HTMLDivElement | null>(null);
  const refreshedUserRef = useRef("");

  useEffect(() => {
    if (!currentUser || refreshedUserRef.current === currentUser.id) return;
    refreshedUserRef.current = currentUser.id;
    ensureGroupsData(true);
  }, [currentUser, ensureGroupsData]);

  useEffect(() => setPeriodOffset(0), [period, selectedGroup?.id]);

  useEffect(() => {
    if (!inviteCode) return;
    setActionMode("join");
    window.requestAnimationFrame(() => actionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [inviteCode]);

  if (!currentUser) return null;

  const selectedRole = selectedGroup ? currentUserGroupRole(selectedGroup.id) : undefined;
  const range = leaderboardRange(period, todayKey, periodOffset);
  const selectedMemberCount = selectedGroup ? groupMemberCount(selectedGroup.id) : 0;
  const isLoadingGroups = loadingRemoteSlices.groups;
  const selectedMemberIds = selectedGroup
    ? state.groupMembers.filter((member) => member.groupId === selectedGroup.id).map((member) => member.userId)
    : [];
  const selectedLastUpdated = latestUpdateLabel(latestChantUpdate(state.chantTotals, selectedMemberIds, range.start, range.end));
  const openActionPanel = (mode: "join" | "create") => {
    setActionMode(mode);
    window.requestAnimationFrame(() => actionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const rememberCopy = (text: string) => {
    setRecentCopy(text);
    window.setTimeout(() => setRecentCopy(""), 5000);
  };
  const copyCode = async (code: string) => {
    await copyGroupCode(code);
    rememberCopy(`Code ${code} copied.`);
  };
  const copyInvite = async (group: Group) => {
    await copyGroupInvite(group);
    rememberCopy(`Invite for ${group.name} copied with join link.`);
  };
  const copyInviteLink = async (group: Group) => {
    const inviteUrl = groupInviteUrl(group);
    await copyText(inviteUrl, `Invite link for ${group.name} copied.`);
  };
  const copyShortInviteMessage = async (group: Group) => {
    const inviteText = groupInviteShortMessage(group);
    await copyText(inviteText, `Short invite message for ${group.name} copied.`);
  };
  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      rememberCopy(successMessage);
      showMessage(successMessage);
    } catch {
      rememberCopy(text);
      showMessage(text);
    }
  };
  const invitedGroup = inviteCode
    ? state.groups.find((group) => group.code.toUpperCase() === inviteCode.toUpperCase())
    : undefined;
  const invitedOwner = invitedGroup ? state.users.find((user) => user.id === invitedGroup.ownerId) : undefined;
  const isInvitedMember = invitedGroup
    ? state.groupMembers.some((member) => member.groupId === invitedGroup.id && member.userId === currentUser.id)
    : false;
  const cleanGroupSearch = groupSearch.trim().toLowerCase();
  const visibleJoinedGroups = joinedGroups.filter((group) => {
    if (!cleanGroupSearch) return true;
    return (
      group.name.toLowerCase().includes(cleanGroupSearch) ||
      group.code.toLowerCase().includes(cleanGroupSearch) ||
      (currentUserGroupRole(group.id) || "").includes(cleanGroupSearch)
    );
  });

  const leaveSelectedGroup = async () => {
    if (!selectedGroup || selectedRole === "owner") return;
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("group_members")
          .delete()
          .eq("group_id", selectedGroup.id)
          .eq("user_id", currentUser.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "groups");
        setSelectedGroupId("");
        showMessage(`Left ${selectedGroup.name}.`);
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groupMembers: state.groupMembers.filter(
        (member) => !(member.groupId === selectedGroup.id && member.userId === currentUser.id)
      )
    });
    setSelectedGroupId("");
    showMessage(`Left ${selectedGroup.name}.`);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={`${joinedGroups.length} joined`}
        icon={<Users size={16} />}
        title={selectedGroup ? selectedGroup.name : "Your chanting groups"}
        description="Select a group to view its leaderboard, copy invites, and manage members."
        actions={
          selectedGroup ? (
            <>
              <span className="rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100">
                {selectedMemberCount} member{selectedMemberCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
                {selectedRole}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-peacock-600 px-3 py-2 text-sm font-bold text-white"
                onClick={() => setInviteModalGroup(selectedGroup)}
              >
                <Share2 size={15} /> Invite
              </button>
            </>
          ) : undefined
        }
        stats={
          <StatGrid columns={2}>
            <StatCard label="Created groups" value={state.groups.filter((group) => group.ownerId === currentUser.id).length} tone="saffron" />
            <StatCard label="Memberships" value={joinedGroups.length} tone="peacock" />
          </StatGrid>
        }
      >
        {recentCopy && (
          <p className="inline-flex rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
            {recentCopy}
          </p>
        )}
      </PageHeader>

      {inviteCode && (
        <GroupInviteLandingCard
          code={inviteCode}
          group={invitedGroup}
          owner={invitedOwner}
          memberCount={invitedGroup ? groupMemberCount(invitedGroup.id) : 0}
          isMember={isInvitedMember}
          isLoading={isLoadingGroups}
          isBusy={isBusy}
          onOpen={() => {
            if (!invitedGroup) return;
            setSelectedGroupId(invitedGroup.id);
            onInviteHandled?.();
          }}
          onRefresh={() => refreshRemoteState(currentUser.id, "groups")}
          onJoined={onInviteHandled}
        />
      )}

      <Panel title="Your groups" icon={<Users size={18} />}>
        {isLoadingGroups && joinedGroups.length === 0 ? (
          <div className="-m-4 sm:-m-5">
            <PanelSkeleton rows={3} title={false} />
          </div>
        ) : joinedGroups.length === 0 ? (
          <ActionEmptyState
            icon={<UserPlus size={20} />}
            title="No groups yet"
            text="Join with a code from a group owner, or create your own group and share the code with others."
          >
            <button
              type="button"
              className="rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white shadow-sm"
              onClick={() => openActionPanel("join")}
            >
              Join by code
            </button>
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
              onClick={() => openActionPanel("create")}
            >
              Create group
            </button>
          </ActionEmptyState>
        ) : (
          <>
          <FilterBar meta={`Showing ${visibleJoinedGroups.length} of ${joinedGroups.length}`}>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-sm font-bold text-stone-700">Search your groups</span>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="name, code, or role"
                type="search"
              />
            </label>
          </FilterBar>
          {visibleJoinedGroups.length === 0 ? (
            <EmptyState text={`No joined groups match "${groupSearch.trim()}".`} />
          ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleJoinedGroups.map((group) => {
              const groupMembers = state.groupMembers.filter((member) => member.groupId === group.id);
              const todayTotal = groupMembers.reduce(
                (sum, member) => sum + sumRounds(state.chantTotals, member.userId, "daily", todayKey),
                0
              );
              const activeToday = groupMembers.filter((member) => sumRounds(state.chantTotals, member.userId, "daily", todayKey) > 0).length;
              return (
              <div
                key={group.id}
                className={`rounded-lg border p-3 shadow-sm ${
                  selectedGroup?.id === group.id ? "border-saffron-500 bg-saffron-50" : "border-stone-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={group.imageUrl} label={group.name} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-stone-900">{group.name}</p>
                      <p className="text-sm text-stone-600">{groupMemberCount(group.id)} member{groupMemberCount(group.id) === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-black uppercase text-peacock-900">
                    {currentUserGroupRole(group.id)}
                  </span>
                  <span className="rounded-md bg-saffron-50 px-2 py-1 text-xs font-black text-saffron-900">
                    {todayTotal} today
                  </span>
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
                    {activeToday}/{groupMembers.length} active
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md bg-peacock-50 px-2 py-1 text-xs font-bold text-peacock-900"
                    onClick={() => setInviteModalGroup(group)}
                  >
                    <Share2 size={13} /> Invite
                  </button>
                </div>
              </div>
            );})}
          </div>
          )}
          </>
        )}
      </Panel>
      {selectedGroup && (
        <>
        <GroupSectionJumpBar />
        <div id="group-leaderboard">
          <Panel title={`${selectedGroup.name} leaderboard`} icon={<Trophy size={18} />}>
            {isLoadingGroups && selectedMemberCount === 0 ? (
              <LeaderboardSkeleton />
            ) : (
              <>
                <PeriodTabs value={period} onChange={setPeriod} options={["daily", "weekly", "monthly"]} />
                <PeriodHistoryControls offset={periodOffset} onChange={setPeriodOffset} label={range.label} />
                <GroupLeaderboardToggle showAll={showAllMembers} onChange={setShowAllMembers} />
                <Leaderboard
                  title=""
                  period={period}
                  periodText={range.label}
                  currentUserId={currentUser.id}
                  emptyText="No one in this group has added rounds for this period yet."
                  visibility={showAllMembers ? "all" : "active"}
                  lastUpdated={selectedLastUpdated}
                  isRefreshing={isBusy || isLoadingGroups}
                  onRefresh={() => refreshRemoteState(currentUser.id)}
                  rows={rankUsersInRange(
                    state.groupMembers
                      .filter((member) => member.groupId === selectedGroup.id)
                      .map((member) => state.users.find((user) => user.id === member.userId))
                      .filter(Boolean) as UserProfile[],
                    state.chantTotals,
                    range.start,
                    range.end
                  )}
                />
              </>
            )}
          </Panel>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <div className="space-y-4">
            <div id="group-invite">
              <GroupInviteCard
                group={selectedGroup}
                role={selectedRole}
                memberCount={selectedMemberCount}
                onOpenInvite={() => setInviteModalGroup(selectedGroup)}
              />
            </div>
            {selectedRole === "owner" && (
              <GroupOwnerDashboard
                group={selectedGroup}
                onOpenInvite={() => setInviteModalGroup(selectedGroup)}
                onRefresh={() => refreshRemoteState(currentUser.id)}
              />
            )}
            <GroupTargetPanel group={selectedGroup} />
          </div>
          <div className="space-y-4">
            <div id="group-activity">
              <GroupActivityFeed group={selectedGroup} />
            </div>
            <div id="group-members">
              <GroupMemberRoster group={selectedGroup} />
            </div>
            <GroupAccountabilityPanel group={selectedGroup} />
          </div>
        </div>
        <div id="group-controls">
          <Panel title={`${selectedGroup.name} controls`} icon={<Settings size={18} />}>
            {selectedRole === "owner" ? (
              <GroupOwnerControls group={selectedGroup} role={selectedRole} />
            ) : selectedRole === "moderator" ? (
              <GroupOwnerControls group={selectedGroup} role={selectedRole} />
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                <div>
                  <p className="font-black text-stone-900">Member controls</p>
                  <p className="text-sm text-stone-600">You can leave this group. Your chanting history stays on your profile.</p>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-stone-900 px-4 py-2.5 text-sm font-bold text-white"
                  disabled={isBusy}
                  onClick={leaveSelectedGroup}
                >
                  Leave group
                </button>
              </div>
            )}
          </Panel>
        </div>
        </>
      )}
      <div ref={actionPanelRef}>
        <Panel title="Create or join" icon={<Plus size={18} />}>
          <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-black transition ${
                actionMode === "join" ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setActionMode("join")}
            >
              Join by code
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-black transition ${
                actionMode === "create" ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"
              }`}
              onClick={() => setActionMode("create")}
            >
              Create group
            </button>
          </div>
          {actionMode === "join" ? (
            <JoinGroupForm embedded initialCode={inviteCode} onJoined={onInviteHandled} />
          ) : (
          <CreateGroupForm embedded />
          )}
        </Panel>
      </div>
      {inviteModalGroup && (
        <InviteMembersModal
          group={inviteModalGroup}
          owner={state.users.find((user) => user.id === inviteModalGroup.ownerId)}
          memberCount={groupMemberCount(inviteModalGroup.id)}
          onClose={() => setInviteModalGroup(null)}
          onCopyCode={() => copyCode(inviteModalGroup.code)}
          onCopyLink={() => copyInviteLink(inviteModalGroup)}
          onCopyMessage={() => copyInvite(inviteModalGroup)}
          onCopyShortMessage={() => copyShortInviteMessage(inviteModalGroup)}
        />
      )}
    </div>
  );
}

function GroupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-0.5 text-xl font-black text-stone-950 sm:text-2xl">{value}</p>
    </div>
  );
}

function GroupSectionJumpBar() {
  const sections = [
    { id: "group-invite", label: "Invite" },
    { id: "group-activity", label: "Activity" },
    { id: "group-members", label: "Members" },
    { id: "group-leaderboard", label: "Leaderboard" },
    { id: "group-controls", label: "Controls" }
  ];

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="rounded-lg border border-saffron-200 bg-white/90 p-2 shadow-soft backdrop-blur lg:sticky lg:top-[76px] lg:z-20">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <span className="shrink-0 px-2 text-xs font-black uppercase text-stone-500">Jump to</span>
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className="shrink-0 rounded-md bg-stone-100 px-3 py-2 text-sm font-black text-stone-700 transition hover:bg-saffron-50 hover:text-saffron-900"
            onClick={() => jumpTo(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function groupInviteUrl(group: Group) {
  const path = `/g/${encodeURIComponent(group.code)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function groupInviteShortMessage(group: Group) {
  return `Join my Hare Krishna Leaderboard group "${group.name}" using code ${group.code}.`;
}

function groupInviteMessage(group: Group) {
  return `${groupInviteShortMessage(group)} Link: ${groupInviteUrl(group)}`;
}

function InviteMembersModal({
  group,
  owner,
  memberCount,
  onClose,
  onCopyCode,
  onCopyLink,
  onCopyMessage,
  onCopyShortMessage
}: {
  group: Group;
  owner: UserProfile | undefined;
  memberCount: number;
  onClose: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  onCopyShortMessage: () => void;
}) {
  const inviteLink = groupInviteUrl(group);
  const fullMessage = groupInviteMessage(group);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-4 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-saffron-200 bg-white shadow-soft">
        <div className="flex items-start justify-between gap-3 border-b border-saffron-100 p-3 sm:p-4">
          <div className="flex min-w-0 gap-3">
            <Avatar src={group.imageUrl} label={group.name} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-peacock-700">Invite members</p>
              <h2 className="truncate text-xl font-black tracking-normal text-stone-950">{group.name}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {memberCount} member{memberCount === 1 ? "" : "s"}
                {owner ? ` | owner @${owner.username}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100 text-stone-700"
            onClick={onClose}
            aria-label="Close invite modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-xs font-black uppercase text-stone-500">Group code</p>
              <p className="mt-2 rounded-md bg-stone-950 px-4 py-2.5 text-center text-xl font-black tracking-normal text-white sm:text-2xl">
                {group.code}
              </p>
            </div>
            <div className="rounded-lg border border-peacock-100 bg-peacock-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-xs font-black uppercase text-peacock-800">Direct invite link</p>
              <p className="mt-2 break-all rounded-md bg-white px-3 py-2 text-sm font-bold leading-6 text-stone-800 ring-1 ring-peacock-100">
                {inviteLink}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-xs font-black uppercase text-saffron-900">Message preview</p>
            <p className="mt-2 text-sm font-bold leading-6 text-stone-800">{fullMessage}</p>
          </div>

          {group.announcement && (
            <div className="rounded-md border border-peacock-100 bg-white px-3 py-2.5 text-sm leading-6 text-stone-700 sm:px-4 sm:py-3">
              <p className="font-black text-stone-950">Pinned group announcement</p>
              <p>{group.announcement}</p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-black text-white"
              onClick={onCopyCode}
            >
              <Copy size={16} /> Copy code
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white"
              onClick={onCopyLink}
            >
              <Link size={16} /> Copy link
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white"
              onClick={onCopyMessage}
            >
              <MessageSquare size={16} /> Copy full message
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-stone-800 ring-1 ring-stone-200"
              onClick={onCopyShortMessage}
            >
              <Share2 size={16} /> Copy short message
            </button>
          </div>

          <p className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">
            Anyone with the code can join this group. Existing members stay in the group even if the owner changes the code later.
          </p>
        </div>
      </div>
    </div>
  );
}

function GroupInviteLandingCard({
  code,
  group,
  owner,
  memberCount,
  isMember,
  isLoading,
  isBusy,
  onOpen,
  onRefresh,
  onJoined
}: {
  code: string;
  group: Group | undefined;
  owner: UserProfile | undefined;
  memberCount: number;
  isMember: boolean;
  isLoading: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onRefresh: () => void | Promise<void>;
  onJoined?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-peacock-200 bg-white shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-4 sm:p-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100">
            <UserPlus size={16} /> Group invite
          </div>
          {isLoading && !group ? (
            <InlineNotice tone="info">Checking invite code {code}...</InlineNotice>
          ) : group ? (
            <div className="space-y-4">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar src={group.imageUrl} label={group.name} />
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-normal text-stone-950">{group.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                    {owner ? ` | owned by @${owner.username}` : ""}
                  </p>
                </div>
              </div>
              {isMember ? (
                <InlineNotice tone="success">
                  You are already a member of this group. Open it to view the leaderboard and group controls.
                </InlineNotice>
              ) : (
                <InlineNotice tone="info">
                  This invite is ready. Join the group and your future round updates will appear on its leaderboards.
                </InlineNotice>
              )}
              {group.announcement && (
                <div className="rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm leading-6 text-saffron-950">
                  <p className="font-black">Pinned announcement</p>
                  <p>{group.announcement}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <InlineNotice tone="error">
                No group was found for code {code}. Check the invite link, or ask the group owner to copy the invite again.
              </InlineNotice>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-stone-800 ring-1 ring-stone-200"
                disabled={isBusy}
                onClick={() => void onRefresh()}
              >
                <RefreshCw size={16} /> Check again
              </button>
            </div>
          )}
        </div>
        <div className="border-t border-peacock-100 bg-peacock-50/75 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-black uppercase text-stone-500">Invite code</p>
          <p className="mt-2 rounded-md bg-stone-950 px-4 py-3 text-center text-2xl font-black tracking-normal text-white">
            {code}
          </p>
          <div className="mt-4">
            {group && isMember ? (
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-3 text-sm font-black text-white disabled:bg-saffron-300"
                disabled={isBusy}
                onClick={onOpen}
              >
                <CheckCircle2 size={16} /> Open group
              </button>
            ) : group ? (
              <JoinGroupForm embedded initialCode={code} onJoined={onJoined} />
            ) : (
              <p className="rounded-md bg-white px-3 py-2 text-sm font-bold leading-5 text-stone-700 ring-1 ring-peacock-100">
                You can still paste a corrected code in the Create or join panel below.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function GroupInviteCard({
  group,
  role,
  memberCount,
  onOpenInvite
}: {
  group: Group;
  role: GroupRole | undefined;
  memberCount: number;
  onOpenInvite: () => void;
}) {
  const inviteText = groupInviteShortMessage(group);
  return (
    <section className="overflow-hidden rounded-lg border border-peacock-100 bg-peacock-50/80 shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-peacock-900">
            <MessageSquare size={18} />
            <p className="font-black">Invite members</p>
          </div>
          <p className="text-sm leading-6 text-stone-700">
            Share this code with people you want in the group. Group codes are global and unique.
          </p>
          <div className="mt-4 rounded-lg border border-peacock-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase text-stone-500">Share message preview</p>
            <p className="mt-1 text-sm font-bold text-stone-800">{inviteText}</p>
          </div>
          {role === "owner" && (
            <p className="mt-3 rounded-md bg-white/75 px-3 py-2 text-sm font-bold text-peacock-900 ring-1 ring-peacock-100">
              Owner tip: keep codes memorable but specific. You can change the code in group controls.
            </p>
          )}
          {group.announcement && (
            <div className="mt-3 rounded-md border border-saffron-200 bg-saffron-50 px-3 py-2 text-sm text-saffron-950">
              <p className="font-black">Pinned announcement</p>
              <p>{group.announcement}</p>
            </div>
          )}
        </div>
        <div className="border-t border-peacock-100 bg-white/80 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-black uppercase text-stone-500">Group code</p>
          <p className="mt-2 rounded-md bg-stone-950 px-4 py-3 text-center text-2xl font-black tracking-normal text-white">
            {group.code}
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 text-sm font-black text-white"
              onClick={onOpenInvite}
            >
              <Share2 size={16} /> Invite members
            </button>
          </div>
          <p className="mt-3 text-center text-sm font-bold text-stone-600">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </section>
  );
}

function GroupTargetPanel({ group }: { group: Group }) {
  const { state, todayKey } = useChanting();
  const memberIds = state.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
  const week = leaderboardRange("weekly", todayKey, 0);
  const todayTotal = state.chantTotals
    .filter((total) => memberIds.includes(total.userId) && total.localDate === todayKey)
    .reduce((sum, total) => sum + total.rounds, 0);
  const weekTotal = state.chantTotals
    .filter((total) => memberIds.includes(total.userId) && total.localDate >= week.start && total.localDate <= week.end)
    .reduce((sum, total) => sum + total.rounds, 0);
  if (!group.targetDaily && !group.targetWeekly && !group.announcement) return null;
  return (
    <Panel title="Group focus" icon={<Trophy size={18} />}>
      {group.announcement && (
        <div className="mb-4 rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm leading-6 text-saffron-950">
          <p className="font-black">Pinned message</p>
          <p>{group.announcement}</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <TargetProgress label="Daily target" value={todayTotal} target={group.targetDaily} />
        <TargetProgress label="Weekly target" value={weekTotal} target={group.targetWeekly} />
      </div>
    </Panel>
  );
}

function TargetProgress({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-black text-stone-900">{label}</p>
        <span className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-black text-peacock-900">
          {target > 0 ? `${percent}%` : "Not set"}
        </span>
      </div>
      <p className="text-2xl font-black text-stone-950">
        {value} <span className="text-sm text-stone-500">/ {target || "-"}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full bg-peacock-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function GroupOwnerDashboard({
  group,
  onOpenInvite,
  onRefresh
}: {
  group: Group;
  onOpenInvite: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  const { state, todayKey, isBusy } = useChanting();
  const memberIds = state.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
  const week = leaderboardRange("weekly", todayKey, 0);
  const rows = memberIds.map((userId) => {
    const user = state.users.find((item) => item.id === userId);
    const entry = state.chantTotals.find((total) => total.userId === userId && total.localDate === todayKey);
    const weekEntries = state.chantTotals.filter((total) => total.userId === userId && total.localDate >= week.start && total.localDate <= week.end);
    return { user, entry, weekEntries };
  });
  const updatedToday = rows.filter((row) => row.entry).length;
  const notUpdatedToday = rows.filter((row) => !row.entry).length;
  const todayRounds = rows.reduce((sum, row) => sum + (row.entry?.rounds || 0), 0);
  const targetPercent = group.targetDaily > 0 ? Math.min(100, Math.round((todayRounds / group.targetDaily) * 100)) : 0;
  const weeklyTotal = rows.reduce((sum, row) => sum + row.weekEntries.reduce((entrySum, entry) => entrySum + entry.rounds, 0), 0);
  const bestContributor = [...rows]
    .map((row) => ({
      user: row.user,
      rounds: row.weekEntries.reduce((sum, entry) => sum + entry.rounds, 0),
      activeDays: row.weekEntries.filter((entry) => entry.rounds > 0).length
    }))
    .sort((a, b) => b.rounds - a.rounds)[0];
  const mostConsistent = [...rows]
    .map((row) => ({
      user: row.user,
      activeDays: row.weekEntries.filter((entry) => entry.rounds > 0).length
    }))
    .sort((a, b) => b.activeDays - a.activeDays)[0];
  const inactiveCount = rows.filter((row) => row.weekEntries.every((entry) => entry.rounds === 0)).length;

  return (
    <Panel title="Owner dashboard" icon={<Settings size={18} />}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <GroupStat label="Updated today" value={updatedToday} />
            <GroupStat label="Not updated" value={notUpdatedToday} />
            <GroupStat label="Today rounds" value={todayRounds} />
          </div>
          {group.targetDaily > 0 && (
            <div className="mt-4 rounded-lg border border-peacock-100 bg-peacock-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-black text-peacock-950">Daily group target</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-peacock-900">{targetPercent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full bg-peacock-500" style={{ width: `${targetPercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-peacock-950">
                {todayRounds} / {group.targetDaily} rounds from {memberIds.length} member{memberIds.length === 1 ? "" : "s"}.
              </p>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OwnerDigestTile label="Weekly total" value={`${weeklyTotal}`} note={week.label} />
            <OwnerDigestTile label="Best contributor" value={bestContributor?.user?.username || "-"} note={`${bestContributor?.rounds || 0} rounds`} />
            <OwnerDigestTile label="Most consistent" value={mostConsistent?.user?.username || "-"} note={`${mostConsistent?.activeDays || 0} active days`} />
            <OwnerDigestTile label="Inactive this week" value={`${inactiveCount}`} note="members with no rounds" />
          </div>
        </div>
        <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3">
          <p className="font-black text-saffron-950">Owner actions</p>
          <p className="mt-1 text-sm leading-6 text-stone-700">Quickly refresh the leaderboard or share the current invite.</p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 text-sm font-black text-white disabled:bg-peacock-200"
              disabled={isBusy}
              onClick={() => void onRefresh()}
            >
              <RefreshCw size={16} /> Refresh group
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-3 text-sm font-black text-white"
              onClick={onOpenInvite}
            >
              <Share2 size={16} /> Invite members
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

type GroupActivityItem = {
  id: string;
  at: string;
  title: string;
  body: string;
  user?: UserProfile;
  tone: "rounds" | "member" | "group" | "announcement";
};

function GroupActivityFeed({ group }: { group: Group }) {
  const { state, todayKey, setSelectedPublicUserId } = useChanting();
  const memberships = state.groupMembers.filter((member) => member.groupId === group.id);
  const memberIds = new Set(memberships.map((member) => member.userId));
  const owner = state.users.find((user) => user.id === group.ownerId);

  const roundItems: GroupActivityItem[] = state.chantTotals
    .filter((total) => memberIds.has(total.userId) && total.updatedAt)
    .map((total) => {
      const user = state.users.find((item) => item.id === total.userId);
      const name = user?.displayName || user?.username || "A member";
      return {
        id: `round-${total.userId}-${total.localDate}`,
        at: total.updatedAt,
        title: `${name} logged ${total.rounds} round${total.rounds === 1 ? "" : "s"}`,
        body: `${activityDateLabel(total.localDate, todayKey)} | Updated ${latestUpdateLabel(total.updatedAt)}`,
        user,
        tone: "rounds"
      };
    });

  const memberItems: GroupActivityItem[] = memberships.map((member) => {
    const user = state.users.find((item) => item.id === member.userId);
    const name = user?.displayName || user?.username || "A member";
    return {
      id: `member-${member.groupId}-${member.userId}`,
      at: member.joinedAt,
      title: `${name} joined the group`,
      body: `${member.role === "owner" ? "Owner" : member.role === "moderator" ? "Moderator" : "Member"} | ${latestUpdateLabel(member.joinedAt)}`,
      user,
      tone: "member"
    };
  });

  const groupItems: GroupActivityItem[] = [
    {
      id: `group-created-${group.id}`,
      at: group.createdAt,
      title: `${group.name} was created`,
      body: owner ? `Created by @${owner.username} | ${latestUpdateLabel(group.createdAt)}` : latestUpdateLabel(group.createdAt),
      user: owner,
      tone: "group"
    },
    ...(group.announcement
      ? [{
          id: `announcement-${group.id}`,
          at: group.createdAt,
          title: "Pinned announcement is active",
          body: group.announcement,
          tone: "announcement" as const
        }]
      : [])
  ];

  const items = [...roundItems, ...memberItems, ...groupItems]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  const todayRoundUpdates = roundItems.filter((item) => item.body.startsWith("Today")).length;

  return (
    <Panel title="Group activity" icon={<Clock3 size={18} />}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <GroupStat label="Recent items" value={items.length} />
        <GroupStat label="Today updates" value={todayRoundUpdates} />
        <GroupStat label="Members tracked" value={memberships.length} />
      </div>
      {items.length === 0 ? (
        <EmptyState text="No group activity yet. Round updates and member joins will appear here." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  {item.user ? (
                    <button
                      type="button"
                      className="shrink-0"
                      onClick={() => setSelectedPublicUserId(item.user!.id)}
                      aria-label={`Open ${item.user.username}'s profile`}
                    >
                      <Avatar src={item.user.avatarUrl} label={item.user.displayName || item.user.username} />
                    </button>
                  ) : (
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${activityIconClass(item.tone)}`}>
                      {activitySymbol(item.tone)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-black text-stone-950">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{item.body}</p>
                    {item.user && <p className="mt-1 text-xs font-bold text-stone-500">@{item.user.username}</p>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase ${activityBadgeClass(item.tone)}`}>
                  {activityLabel(item.tone)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function activityDateLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "Today";
  if (dateKey === addDays(todayKey, -1)) return "Yesterday";
  return formatDate(dateKey);
}

function activityLabel(tone: GroupActivityItem["tone"]) {
  if (tone === "rounds") return "Rounds";
  if (tone === "member") return "Member";
  if (tone === "announcement") return "Pinned";
  return "Group";
}

function activitySymbol(tone: GroupActivityItem["tone"]) {
  if (tone === "announcement") return "!";
  if (tone === "group") return "HK";
  if (tone === "member") return "+";
  return "#";
}

function activityBadgeClass(tone: GroupActivityItem["tone"]) {
  if (tone === "rounds") return "bg-peacock-50 text-peacock-900";
  if (tone === "member") return "bg-saffron-50 text-saffron-900";
  if (tone === "announcement") return "bg-emerald-50 text-emerald-800";
  return "bg-stone-100 text-stone-700";
}

function activityIconClass(tone: GroupActivityItem["tone"]) {
  if (tone === "announcement") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (tone === "group") return "lotus-mark text-white";
  if (tone === "member") return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
}

function GroupMemberRoster({ group }: { group: Group }) {
  const { state, todayKey, setSelectedPublicUserId } = useChanting();
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<GroupRole | "all">("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "today" | "week" | "inactive-week">("all");
  const members = state.groupMembers
    .filter((member) => member.groupId === group.id)
    .map((membership) => ({
      membership,
      user: state.users.find((item) => item.id === membership.userId)
    }))
    .filter((item) => item.user) as { membership: GroupMember; user: UserProfile }[];

  const rows = members
    .map(({ membership, user }) => {
      const latestUpdate = latestChantUpdate(state.chantTotals, [user.id], "0000-01-01", todayKey);
      return {
        membership,
        user,
        todayRounds: sumRounds(state.chantTotals, user.id, "daily", todayKey),
        weekRounds: sumRounds(state.chantTotals, user.id, "weekly", todayKey),
        streak: currentStreak(state.chantTotals, user.id, todayKey),
        latestUpdate
      };
    })
    .sort((a, b) => {
      const roleOrder = { owner: 0, moderator: 1, member: 2 };
      const roleDiff = roleOrder[a.membership.role] - roleOrder[b.membership.role];
      if (roleDiff !== 0) return roleDiff;
      if (b.todayRounds !== a.todayRounds) return b.todayRounds - a.todayRounds;
      return a.user.username.localeCompare(b.user.username);
    });

  const activeToday = rows.filter((row) => row.todayRounds > 0).length;
  const activeThisWeek = rows.filter((row) => row.weekRounds > 0).length;
  const cleanSearch = searchText.trim().toLowerCase();
  const visibleRows = rows.filter((row) => {
    const matchesSearch =
      !cleanSearch ||
      row.user.username.toLowerCase().includes(cleanSearch) ||
      (row.user.displayName || "").toLowerCase().includes(cleanSearch) ||
      row.membership.role.includes(cleanSearch);
    const matchesRole = roleFilter === "all" || row.membership.role === roleFilter;
    const matchesActivity =
      activityFilter === "all" ||
      (activityFilter === "today" && row.todayRounds > 0) ||
      (activityFilter === "week" && row.weekRounds > 0) ||
      (activityFilter === "inactive-week" && row.weekRounds === 0);
    return matchesSearch && matchesRole && matchesActivity;
  });

  return (
    <Panel title="Group members" icon={<Users size={18} />}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <GroupStat label="Members" value={rows.length} />
        <GroupStat label="Active today" value={activeToday} />
        <GroupStat label="Active week" value={activeThisWeek} />
      </div>
      <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px]">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Search members</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
              <input
                className="w-full rounded-md border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="username, name, or role"
                type="search"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Role</span>
            <select
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as GroupRole | "all")}
            >
              <option value="all">All roles</option>
              <option value="owner">Owner</option>
              <option value="moderator">Moderators</option>
              <option value="member">Members</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-stone-700">Activity</span>
            <select
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)}
            >
              <option value="all">All activity</option>
              <option value="today">Active today</option>
              <option value="week">Active this week</option>
              <option value="inactive-week">Inactive this week</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-stone-600 ring-1 ring-stone-200">
            Showing {visibleRows.length} of {rows.length}
          </span>
          {(searchText || roleFilter !== "all" || activityFilter !== "all") && (
            <button
              type="button"
              className="rounded-md bg-white px-3 py-2 text-sm font-black text-stone-800 ring-1 ring-stone-200"
              onClick={() => {
                setSearchText("");
                setRoleFilter("all");
                setActivityFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="No members are visible in this group yet." />
      ) : visibleRows.length === 0 ? (
        <EmptyState text="No members match the current search and filters." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleRows.map((row) => (
            <div key={row.user.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Avatar src={row.user.avatarUrl} label={row.user.displayName || row.user.username} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-stone-950">{row.user.displayName || row.user.username}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${roleBadgeClass(row.membership.role)}`}>
                        {row.membership.role}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-stone-600">@{row.user.username}</p>
                    <p className="mt-2 text-xs font-bold text-stone-500">
                      {row.latestUpdate ? `Last updated ${latestUpdateLabel(row.latestUpdate)}` : "No rounds logged yet"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${memberActivityBadgeClass(row.todayRounds, row.weekRounds)}`}>
                        {memberActivityText(row.todayRounds, row.weekRounds)}
                      </span>
                      {row.streak > 1 && (
                        <span className="rounded-md bg-saffron-50 px-2 py-1 text-xs font-black text-saffron-900">
                          {row.streak} day streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-stone-900 px-3 py-2 text-sm font-black text-white"
                  onClick={() => setSelectedPublicUserId(row.user.id)}
                >
                  View profile
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MemberRosterStat label="Today" value={row.todayRounds} />
                <MemberRosterStat label="Week" value={row.weekRounds} />
                <MemberRosterStat label="Streak" value={row.streak} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MemberRosterStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-center">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function memberActivityText(todayRounds: number, weekRounds: number) {
  if (todayRounds > 0) return "Active today";
  if (weekRounds > 0) return "Active this week";
  return "Inactive this week";
}

function memberActivityBadgeClass(todayRounds: number, weekRounds: number) {
  if (todayRounds > 0) return "bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100";
  if (weekRounds > 0) return "bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100";
  return "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
}

function OwnerDigestTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-stone-950">{value}</p>
      <p className="text-sm text-stone-600">{note}</p>
    </div>
  );
}

function GroupAccountabilityPanel({ group }: { group: Group }) {
  const { state, todayKey, setSelectedPublicUserId } = useChanting();
  const members = state.groupMembers
    .filter((member) => member.groupId === group.id)
    .map((member) => state.users.find((user) => user.id === member.userId))
    .filter(Boolean) as UserProfile[];
  const rows = members.map((user) => {
    const entry = state.chantTotals.find((total) => total.userId === user.id && total.localDate === todayKey);
    return { user, entry };
  });
  const updated = rows.filter((row) => row.entry);
  const pending = rows.filter((row) => !row.entry);

  return (
    <Panel title="Today accountability" icon={<Users size={18} />}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <GroupStat label="Updated today" value={updated.length} />
        <GroupStat label="Not updated" value={pending.length} />
        <GroupStat label="Members" value={members.length} />
      </div>
      {pending.length === 0 ? (
        <InlineNotice tone="success">Everyone in this group has logged an entry for today.</InlineNotice>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-bold text-stone-600">Members not updated today</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {pending.map(({ user }) => (
              <button
                key={user.id}
                type="button"
                className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:border-saffron-200 hover:bg-saffron-50"
                onClick={() => setSelectedPublicUserId(user.id)}
              >
                <Avatar src={user.avatarUrl} label={user.displayName || user.username} />
                <div className="min-w-0">
                  <p className="truncate font-black text-stone-900">{user.displayName || user.username}</p>
                  <p className="truncate text-sm text-stone-600">@{user.username}</p>
                </div>
                <span className="ml-auto rounded-md bg-stone-100 px-2 py-1 text-xs font-black text-stone-600">
                  No entry
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function GroupLeaderboardToggle({ showAll, onChange }: { showAll: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        className={`rounded-md px-3 py-2 text-sm font-black transition ${!showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(false)}
      >
        Active only
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-2 text-sm font-black transition ${showAll ? "bg-saffron-500 text-white shadow-sm" : "text-stone-700 hover:bg-saffron-50"}`}
        onClick={() => onChange(true)}
      >
        All members
      </button>
    </div>
  );
}

function GroupOwnerControls({ group, role }: { group: Group; role: "owner" | "moderator" }) {
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, setSelectedGroupId, showMessage } = useChanting();
  const [name, setName] = useState(group.name);
  const [code, setCode] = useState(group.code);
  const [imageUrl, setImageUrl] = useState(group.imageUrl);
  const [announcement, setAnnouncement] = useState(group.announcement);
  const [targetDaily, setTargetDaily] = useState(String(group.targetDaily || ""));
  const [targetWeekly, setTargetWeekly] = useState(String(group.targetWeekly || ""));
  const [deleteText, setDeleteText] = useState("");
  const [formError, setFormError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const members = state.groupMembers
    .filter((member) => member.groupId === group.id)
    .map((member) => ({
      membership: member,
      user: state.users.find((user) => user.id === member.userId)
    }))
    .filter((item) => item.user) as { membership: GroupMember; user: UserProfile }[];
  const cleanMemberSearch = memberSearch.trim().toLowerCase();
  const visibleMembers = cleanMemberSearch
    ? members.filter(({ user, membership }) =>
        `${user.username} ${user.displayName} ${membership.role}`.toLowerCase().includes(cleanMemberSearch)
      )
    : members;
  const canEditGroup = role === "owner";

  useEffect(() => {
    setName(group.name);
    setCode(group.code);
    setImageUrl(group.imageUrl);
    setAnnouncement(group.announcement);
    setTargetDaily(group.targetDaily ? String(group.targetDaily) : "");
    setTargetWeekly(group.targetWeekly ? String(group.targetWeekly) : "");
    setDeleteText("");
    setFormError("");
  }, [group]);

  const updateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!canEditGroup) return;
    if (!currentUser) return;
    const cleanCode = normalizeGroupCode(code);
    if (!name.trim()) {
      setFormError("Add a group name.");
      return;
    }
    const codeError = groupCodeProblem(cleanCode);
    if (codeError) {
      setFormError(codeError);
      return;
    }
    if (state.groups.some((item) => item.id !== group.id && item.code.toUpperCase() === cleanCode)) {
      setFormError("That group code is already used. Try a more specific code.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("groups")
          .update({
            name: name.trim(),
            code: cleanCode,
            image_url: imageUrl.trim(),
            announcement: announcement.trim(),
            target_daily: Math.max(0, Math.floor(Number(targetDaily) || 0)),
            target_weekly: Math.max(0, Math.floor(Number(targetWeekly) || 0))
          })
          .eq("id", group.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "groups");
        showMessage("Group updated.");
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groups: state.groups.map((item) =>
        item.id === group.id
          ? {
              ...item,
              name: name.trim(),
              code: cleanCode,
              imageUrl: imageUrl.trim(),
              announcement: announcement.trim(),
              targetDaily: Math.max(0, Math.floor(Number(targetDaily) || 0)),
              targetWeekly: Math.max(0, Math.floor(Number(targetWeekly) || 0))
            }
          : item
      )
    });
    showMessage("Group updated.");
  };

  const deleteGroup = async () => {
    if (!canEditGroup) return;
    if (!currentUser || deleteText !== group.code) {
      setFormError(`Type ${group.code} to delete this group.`);
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("groups").delete().eq("id", group.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "groups");
        setSelectedGroupId("");
        showMessage("Group deleted.");
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groups: state.groups.filter((item) => item.id !== group.id),
      groupMembers: state.groupMembers.filter((member) => member.groupId !== group.id)
    });
    setSelectedGroupId("");
    showMessage("Group deleted.");
  };

  const canRemoveRole = (targetRole: GroupRole) => role === "owner" ? targetRole !== "owner" : targetRole === "member";

  const removeMember = async (userId: string, username: string, targetRole: GroupRole) => {
    if (!currentUser || userId === currentUser.id) return;
    if (!canRemoveRole(targetRole)) {
      setFormError("You do not have permission to remove that role.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("group_members")
          .delete()
          .eq("group_id", group.id)
          .eq("user_id", userId)
          .in("role", role === "owner" ? ["member", "moderator"] : ["member"]);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "groups");
        showMessage(`Removed @${username} from ${group.name}.`);
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groupMembers: state.groupMembers.filter(
        (member) => !(member.groupId === group.id && member.userId === userId && canRemoveRole(member.role))
      )
    });
    showMessage(`Removed @${username} from ${group.name}.`);
  };

  const changeMemberRole = async (userId: string, username: string, nextRole: "member" | "moderator") => {
    if (!currentUser || role !== "owner") return;
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("group_members")
          .update({ role: nextRole })
          .eq("group_id", group.id)
          .eq("user_id", userId)
          .in("role", ["member", "moderator"]);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "groups");
        showMessage(`@${username} is now a ${nextRole}.`);
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groupMembers: state.groupMembers.map((member) =>
        member.groupId === group.id && member.userId === userId && member.role !== "owner"
          ? { ...member, role: nextRole }
          : member
      )
    });
    showMessage(`@${username} is now a ${nextRole}.`);
  };

  return (
    <div className="space-y-5">
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {canEditGroup ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <form className="space-y-3" onSubmit={updateGroup}>
            <Field label="Group name" value={name} onChange={setName} required />
            <Field
              label="Group code"
              value={code}
              onChange={(value) => setCode(normalizeGroupCode(value))}
              required
              helper="Changing this affects future joins. Existing members stay in the group."
            />
            <GroupImagePicker imageUrl={imageUrl} setImageUrl={setImageUrl} label={name || group.name} />
            <Field
              label="Pinned announcement"
              value={announcement}
              onChange={setAnnouncement}
              helper="Short message shown to all group members."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Daily group target"
                value={targetDaily}
                onChange={setTargetDaily}
                type="number"
                min={0}
                max={99999}
                helper="Use 0 or blank to hide the daily target."
              />
              <Field
                label="Weekly group target"
                value={targetWeekly}
                onChange={setTargetWeekly}
                type="number"
                min={0}
                max={999999}
                helper="Weeks start Monday."
              />
            </div>
            <button className="rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" disabled={isBusy}>
              Save group
            </button>
          </form>
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-center gap-2">
              <Trash2 size={18} />
              <p className="font-black">Delete group</p>
            </div>
            <p>This removes the group and its memberships. User chanting history is not deleted.</p>
            <Field
              label="Type group code"
              value={deleteText}
              onChange={(value) => setDeleteText(normalizeGroupCode(value))}
              placeholder={group.code}
              helper={`Type ${group.code} exactly to enable deletion.`}
            />
            <button
              type="button"
              className="rounded-md bg-red-700 px-4 py-3 font-bold text-white disabled:bg-red-300"
              disabled={isBusy || deleteText !== group.code}
              onClick={deleteGroup}
            >
              Delete group
            </button>
          </div>
        </div>
      ) : (
        <InlineNotice tone="info">
          Moderators can remove regular members. Only owners can edit group details, change codes, promote moderators, or delete the group.
        </InlineNotice>
      )}
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-black text-stone-900">Members</p>
            <p className="text-sm text-stone-600">
              {role === "owner"
                ? "Owners can promote moderators, demote moderators, and remove members or moderators."
                : "Moderators can remove regular members. Owner and moderator roles are protected."}
            </p>
          </div>
          <span className="rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mb-3">
          <Field
            label="Search members"
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="username, name, or role"
            helper="Filter this group list without changing member data."
          />
        </div>
        <div className="space-y-2">
          {visibleMembers.length === 0 && <EmptyState text="No members match that search." />}
          {visibleMembers.map(({ membership, user }) => (
            <div key={user.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={user.avatarUrl} label={user.displayName || user.username} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-stone-900">{user.displayName || user.username}</p>
                    <p className="truncate text-sm text-stone-600">@{user.username}</p>
                    <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-black uppercase ${roleBadgeClass(membership.role)}`}>
                      {membership.role}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {role === "owner" && membership.role === "member" && (
                    <button
                      type="button"
                      className="rounded-md bg-peacock-600 px-3 py-2 text-sm font-bold text-white"
                      disabled={isBusy}
                      onClick={() => changeMemberRole(user.id, user.username, "moderator")}
                    >
                      Make moderator
                    </button>
                  )}
                  {role === "owner" && membership.role === "moderator" && (
                    <button
                      type="button"
                      className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700"
                      disabled={isBusy}
                      onClick={() => changeMemberRole(user.id, user.username, "member")}
                    >
                      Demote
                    </button>
                  )}
                  {canRemoveRole(membership.role) && (
                    <button
                      type="button"
                      className="rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white"
                      disabled={isBusy}
                      onClick={() => removeMember(user.id, user.username, membership.role)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupImagePicker({
  imageUrl,
  setImageUrl,
  label
}: {
  imageUrl: string;
  setImageUrl: (value: string) => void;
  label: string;
}) {
  const { currentUser, isBusy, runRemote } = useChanting();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [errorText, setErrorText] = useState("");

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setStatus("");
    setErrorText("");
    if (!file || !currentUser) return;
    if (!file.type.startsWith("image/")) {
      setErrorText("Choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorText("Group picture must be 2 MB or smaller.");
      return;
    }
    if (!supabase) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(String(reader.result || ""));
        setStatus("Group picture preview ready. Save group to keep it in demo mode.");
      };
      reader.onerror = () => setErrorText("Could not read that image.");
      reader.readAsDataURL(file);
      return;
    }
    const client = supabase;

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
    const objectPath = `${currentUser.id}/groups/group-${Date.now()}.${safeExtension}`;

    await runRemote(async () => {
      setStatus("Uploading group picture...");
      const { error } = await client.storage.from("group-images").upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true
      });
      if (error) throw error;
      const { data } = client.storage.from("group-images").getPublicUrl(objectPath);
      setImageUrl(data.publicUrl);
      setStatus("Group picture uploaded. Save group to apply it.");
    }).catch((error: Error) => {
      setStatus("");
      setErrorText(readableError(error));
    });
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-14 w-14 rounded-md border border-stone-200 object-cover" />
          ) : (
            <div className="lotus-mark grid h-14 w-14 place-items-center rounded-md text-sm font-black text-white">
              {(label || "HK").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-black text-stone-900">Group picture</p>
            <p>Upload JPG, PNG, WebP, or GIF up to 2 MB.</p>
            {status && <p className="mt-1 font-bold text-peacock-900">{status}</p>}
            {errorText && <p className="mt-1 font-bold text-red-700">{errorText}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp size={18} /> Upload
          </button>
          {imageUrl && (
            <button
              type="button"
              className="rounded-md bg-stone-100 px-4 py-3 font-bold text-stone-700"
              disabled={isBusy}
              onClick={() => {
                setImageUrl("");
                setStatus("Group picture removed. Save group to apply it.");
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function roleBadgeClass(role: GroupRole) {
  if (role === "owner") return "bg-saffron-50 text-saffron-900";
  if (role === "moderator") return "bg-peacock-50 text-peacock-900";
  return "bg-stone-100 text-stone-700";
}

function CreateGroupForm({ embedded = false }: { embedded?: boolean }) {
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, setSelectedGroupId, showActionFeedback, addNotification } = useChanting();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [formError, setFormError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!currentUser) return;
    const cleanCode = normalizeGroupCode(code);
    if (!name.trim()) {
      setFormError("Add a group name.");
      return;
    }
    const codeError = groupCodeProblem(cleanCode);
    if (codeError) {
      setFormError(codeError);
      return;
    }
    if (state.groups.some((group) => group.code.toUpperCase() === cleanCode)) {
      setFormError("That group code is already used. Try a more specific code.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { data, error } = await client
          .from("groups")
          .insert({ name: name.trim(), code: cleanCode, owner_id: currentUser.id, image_url: imageUrl.trim() })
          .select("id, created_at")
          .single();
        if (error) throw error;
        const { error: memberError } = await client.from("group_members").insert({
          group_id: data.id,
          user_id: currentUser.id,
          role: "owner"
        });
        if (memberError) throw memberError;
        const createdAt = data.created_at || new Date().toISOString();
        const group: Group = {
          id: data.id,
          name: name.trim(),
          code: cleanCode,
          ownerId: currentUser.id,
          imageUrl: imageUrl.trim(),
          announcement: "",
          targetDaily: 0,
          targetWeekly: 0,
          createdAt
        };
        saveState({
          ...state,
          groups: [group, ...state.groups.filter((item) => item.id !== group.id)],
          groupMembers: [
            { groupId: group.id, userId: currentUser.id, role: "owner", joinedAt: createdAt },
            ...state.groupMembers.filter((member) => !(member.groupId === group.id && member.userId === currentUser.id))
          ]
        });
        setSelectedGroupId(data.id);
        setName("");
        setCode("");
        setImageUrl("");
        void refreshRemoteState(currentUser.id, "groups");
        await addNotification({
          title: "Group created",
          body: `${group.name} is ready. Share code ${cleanCode} with members.`,
          tone: "success",
          actionTab: "groups",
          dedupeKey: `group-created-${group.id}`
        });
        showActionFeedback({
          title: "Group created",
          body: `${name.trim()} is ready. Share code ${cleanCode} with members to start the group leaderboard.`,
          action: { label: "View group", tab: "groups" }
        });
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    const group: Group = {
      id: uid("group"),
      name: name.trim(),
      code: cleanCode,
      ownerId: currentUser.id,
      imageUrl: imageUrl.trim(),
      announcement: "",
      targetDaily: 0,
      targetWeekly: 0,
      createdAt: new Date().toISOString()
    };
    saveState({
      ...state,
      groups: [...state.groups, group],
      groupMembers: [
        ...state.groupMembers,
        { groupId: group.id, userId: currentUser.id, role: "owner", joinedAt: new Date().toISOString() }
      ]
    });
    setSelectedGroupId(group.id);
    setName("");
    setCode("");
    setImageUrl("");
    await addNotification({
      title: "Group created",
      body: `${group.name} is ready. Share code ${cleanCode} with members.`,
      tone: "success",
      actionTab: "groups",
      dedupeKey: `group-created-${group.id}`
    });
    showActionFeedback({
      title: "Group created",
      body: `${group.name} is ready. Share code ${cleanCode} with members to start the group leaderboard.`,
      action: { label: "View group", tab: "groups" }
    });
  };

  const content = (
      <form className="space-y-3" onSubmit={submit}>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        <Card level="section" className="space-y-3">
          <Field label="Group name" value={name} onChange={setName} required />
          <Field
            label="Unique group code"
            value={code}
            onChange={(value) => setCode(normalizeGroupCode(value))}
            required
            placeholder="JAPA108"
            helper="At least 6 characters with letters and numbers. Use this code to invite members."
          />
        </Card>
        <GroupImagePicker imageUrl={imageUrl} setImageUrl={setImageUrl} label={name || "Group"} />
        <button className="rounded-md bg-saffron-500 px-4 py-2.5 font-bold text-white" disabled={isBusy}>
          Create group
        </button>
      </form>
  );
  if (embedded) return content;
  return <Panel title="Create group" icon={<Plus size={18} />}>{content}</Panel>;
}

function JoinGroupForm({
  embedded = false,
  initialCode = "",
  onJoined
}: {
  embedded?: boolean;
  initialCode?: string;
  onJoined?: () => void;
}) {
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, setSelectedGroupId, showActionFeedback, addNotification } = useChanting();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialCode) setCode(normalizeGroupCode(initialCode));
  }, [initialCode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!currentUser) return;
    const cleanCode = normalizeGroupCode(code);
    if (!cleanCode) {
      setFormError("Enter the group code shared by the owner.");
      return;
    }
    const group = state.groups.find((item) => item.code.toUpperCase() === cleanCode);
    if (!group) {
      setFormError(`No group found for code ${cleanCode}. Check the code and try again.`);
      return;
    }
    if (state.groupMembers.some((member) => member.groupId === group.id && member.userId === currentUser.id)) {
      setFormError(`You are already a member of ${group.name}.`);
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("group_members").insert({
          group_id: group.id,
          user_id: currentUser.id,
          role: "member"
        });
        if (error) throw error;
        const joinedAt = new Date().toISOString();
        saveState({
          ...state,
          groupMembers: [
            ...state.groupMembers,
            { groupId: group.id, userId: currentUser.id, role: "member", joinedAt }
          ]
        });
        setSelectedGroupId(group.id);
        setCode("");
        onJoined?.();
        void refreshRemoteState(currentUser.id, "groups");
        await addNotification({
          title: "Group joined",
          body: `You joined ${group.name}. Your rounds now count on this group leaderboard.`,
          tone: "success",
          actionTab: "groups",
          dedupeKey: `group-joined-${group.id}`
        });
        showActionFeedback({
          title: "Group joined",
          body: `You joined ${group.name}. Your rounds now count on this group leaderboard.`,
          action: { label: "View leaderboard", tab: "groups" }
        });
      }).catch((error: Error) => setFormError(readableError(error)));
      return;
    }
    saveState({
      ...state,
      groupMembers: [
        ...state.groupMembers,
        { groupId: group.id, userId: currentUser.id, role: "member", joinedAt: new Date().toISOString() }
      ]
    });
    setSelectedGroupId(group.id);
    setCode("");
    onJoined?.();
    await addNotification({
      title: "Group joined",
      body: `You joined ${group.name}. Your rounds now count on this group leaderboard.`,
      tone: "success",
      actionTab: "groups",
      dedupeKey: `group-joined-${group.id}`
    });
    showActionFeedback({
      title: "Group joined",
      body: `You joined ${group.name}. Your rounds now count on this group leaderboard.`,
      action: { label: "View leaderboard", tab: "groups" }
    });
  };

  const content = (
      <form className="space-y-3" onSubmit={submit}>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        <Card level="section">
          <Field
            label="Group code"
            value={code}
            onChange={(value) => setCode(normalizeGroupCode(value))}
            required
            placeholder="JAPA108"
            helper="Ask the group owner for the exact code."
          />
        </Card>
        <button className="rounded-md bg-peacock-600 px-4 py-2.5 font-bold text-white" disabled={isBusy}>
          Join group
        </button>
      </form>
  );
  if (embedded) return content;
  return <Panel title="Join group" icon={<Search size={18} />}>{content}</Panel>;
}
