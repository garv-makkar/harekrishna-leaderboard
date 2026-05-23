"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ChevronRight, Copy, ImageUp, MessageSquare, Plus, RefreshCw, Search, Settings, Trash2, Trophy, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Group, GroupMember, GroupRole, UserProfile } from "@/lib/types";
import { useChanting } from "../ChantingContext";
import { groupCodeProblem, latestChantUpdate, latestUpdateLabel, leaderboardRange, normalizeGroupCode, rankUsersInRange, readableError, uid } from "../domain";
import { ModerationReportButton } from "../ModerationReportButton";
import { ActionEmptyState, Avatar, EmptyState, Field, InlineNotice, Leaderboard, LeaderboardSkeleton, Panel, PanelSkeleton, PeriodHistoryControls, PeriodTabs } from "../ui";

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
  const actionPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureGroupsData();
  }, [ensureGroupsData]);

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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
              <Users size={16} /> {joinedGroups.length} joined
            </div>
            <h2 className="text-2xl font-black tracking-normal text-stone-950">
              {selectedGroup ? selectedGroup.name : "Your chanting groups"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              Select a group to view its leaderboard, copy invites, and manage members. Create or join groups from the action panel.
            </p>
            {selectedGroup && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-peacock-50 px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100">
                  {selectedMemberCount} member{selectedMemberCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
                  Your role: {selectedRole}
                </span>
                <button
                  type="button"
                  className="rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white"
                  onClick={() => copyGroupCode(selectedGroup.code)}
                >
                  Copy code {selectedGroup.code}
                </button>
                <button
                  type="button"
                  className="rounded-md bg-peacock-600 px-3 py-2 text-sm font-bold text-white"
                  onClick={() => copyGroupInvite(selectedGroup)}
                >
                  Copy invite
                </button>
              </div>
            )}
          </div>
          <div className="grid gap-3 border-t border-saffron-100 bg-saffron-50/70 p-4 sm:grid-cols-2 xl:grid-cols-1 xl:border-l xl:border-t-0">
            <GroupStat label="Created groups" value={state.groups.filter((group) => group.ownerId === currentUser.id).length} />
            <GroupStat label="Memberships" value={joinedGroups.length} />
          </div>
        </div>
      </section>

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
              className="rounded-md bg-peacock-600 px-4 py-3 text-sm font-black text-white shadow-sm"
              onClick={() => openActionPanel("join")}
            >
              Join by code
            </button>
            <button
              type="button"
              className="rounded-md bg-white px-4 py-3 text-sm font-black text-stone-800 ring-1 ring-saffron-200"
              onClick={() => openActionPanel("create")}
            >
              Create group
            </button>
          </ActionEmptyState>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {joinedGroups.map((group) => (
              <div
                key={group.id}
                className={`rounded-lg border p-4 shadow-sm ${
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
                  <button
                    type="button"
                    className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700"
                    onClick={() => copyGroupCode(group.code)}
                  >
                    Copy code {group.code}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-peacock-50 px-2 py-1 text-xs font-bold text-peacock-900"
                    onClick={() => copyGroupInvite(group)}
                  >
                    Copy invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      {selectedGroup && (
        <>
        <GroupInviteCard
          group={selectedGroup}
          role={selectedRole}
          memberCount={selectedMemberCount}
          onCopyCode={() => copyGroupCode(selectedGroup.code)}
          onCopyInvite={() => copyGroupInvite(selectedGroup)}
        />
        {selectedRole === "owner" && (
          <GroupOwnerDashboard
            group={selectedGroup}
            onCopyInvite={() => copyGroupInvite(selectedGroup)}
            onRefresh={() => refreshRemoteState(currentUser.id)}
          />
        )}
        <GroupTargetPanel group={selectedGroup} />
        <GroupAccountabilityPanel group={selectedGroup} />
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
        <Panel title={`${selectedGroup.name} controls`} icon={<Settings size={18} />}>
          {selectedRole === "owner" ? (
            <GroupOwnerControls group={selectedGroup} role={selectedRole} />
          ) : selectedRole === "moderator" ? (
            <GroupOwnerControls group={selectedGroup} role={selectedRole} />
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-stone-900">Member controls</p>
                <p className="text-sm text-stone-600">You can leave this group. Your chanting history stays on your profile.</p>
              </div>
              <button
                type="button"
                className="rounded-md bg-stone-900 px-4 py-3 text-sm font-bold text-white"
                disabled={isBusy}
                onClick={leaveSelectedGroup}
              >
                Leave group
              </button>
            </div>
          )}
        </Panel>
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
    </div>
  );
}

function GroupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function GroupInviteCard({
  group,
  role,
  memberCount,
  onCopyCode,
  onCopyInvite
}: {
  group: Group;
  role: GroupRole | undefined;
  memberCount: number;
  onCopyCode: () => void;
  onCopyInvite: () => void;
}) {
  const inviteText = `Join my Hare Krishna Leaderboard group "${group.name}" with code ${group.code}.`;
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-3 text-sm font-black text-white"
              onClick={onCopyCode}
            >
              <Copy size={16} /> Copy code
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 text-sm font-black text-white"
              onClick={onCopyInvite}
            >
              <MessageSquare size={16} /> Copy invite
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
  onCopyInvite,
  onRefresh
}: {
  group: Group;
  onCopyInvite: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  const { state, todayKey, isBusy } = useChanting();
  const memberIds = state.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
  const rows = memberIds.map((userId) => {
    const user = state.users.find((item) => item.id === userId);
    const entry = state.chantTotals.find((total) => total.userId === userId && total.localDate === todayKey);
    return { user, entry };
  });
  const updatedToday = rows.filter((row) => row.entry).length;
  const notUpdatedToday = rows.filter((row) => !row.entry).length;
  const todayRounds = rows.reduce((sum, row) => sum + (row.entry?.rounds || 0), 0);
  const targetPercent = group.targetDaily > 0 ? Math.min(100, Math.round((todayRounds / group.targetDaily) * 100)) : 0;

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
              onClick={onCopyInvite}
            >
              <Copy size={16} /> Copy invite
            </button>
          </div>
        </div>
      </div>
    </Panel>
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
  const members = state.groupMembers
    .filter((member) => member.groupId === group.id)
    .map((member) => ({
      membership: member,
      user: state.users.find((user) => user.id === member.userId)
    }))
    .filter((item) => item.user) as { membership: GroupMember; user: UserProfile }[];
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
          Moderators can remove regular members and report profiles. Only owners can edit group details, change codes, promote moderators, or delete the group.
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
        <div className="space-y-2">
          {members.map(({ membership, user }) => (
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
                  <ModerationReportButton userId={user.id} username={user.username} />
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
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, setSelectedGroupId, showActionFeedback, showMessage } = useChanting();
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
    showActionFeedback({
      title: "Group created",
      body: `${group.name} is ready. Share code ${cleanCode} with members to start the group leaderboard.`,
      action: { label: "View group", tab: "groups" }
    });
  };

  const content = (
      <form className="space-y-3" onSubmit={submit}>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        <Field label="Group name" value={name} onChange={setName} required />
        <Field
          label="Unique group code"
          value={code}
          onChange={(value) => setCode(normalizeGroupCode(value))}
          required
          placeholder="JAPA108"
          helper="At least 6 characters with letters and numbers. Use this code to invite members."
        />
        <GroupImagePicker imageUrl={imageUrl} setImageUrl={setImageUrl} label={name || "Group"} />
        <button className="rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" disabled={isBusy}>
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
  const { state, saveState, currentUser, isBusy, runRemote, refreshRemoteState, setSelectedGroupId, showActionFeedback, showMessage } = useChanting();
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
    showActionFeedback({
      title: "Group joined",
      body: `You joined ${group.name}. Your rounds now count on this group leaderboard.`,
      action: { label: "View leaderboard", tab: "groups" }
    });
  };

  const content = (
      <form className="space-y-3" onSubmit={submit}>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        <Field
          label="Group code"
          value={code}
          onChange={(value) => setCode(normalizeGroupCode(value))}
          required
          placeholder="JAPA108"
          helper="Ask the group owner for the exact code."
        />
        <button className="rounded-md bg-peacock-600 px-4 py-3 font-bold text-white" disabled={isBusy}>
          Join group
        </button>
      </form>
  );
  if (embedded) return content;
  return <Panel title="Join group" icon={<Search size={18} />}>{content}</Panel>;
}
