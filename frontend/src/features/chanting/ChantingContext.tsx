"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AppState,
  FriendRequest,
  Group,
  GroupRole,
  LeaderboardPeriod,
  ModerationReport,
  UserProfile
} from "@/lib/types";
import {
  ChantTotalRow,
  FriendRequestRow,
  GroupMemberRow,
  GroupRow,
  ModerationReportRow,
  ProfileRow,
  STORAGE_KEY,
  AuthMode,
  TabId,
  createSeedState,
  detectTimezone,
  formatDate,
  fromChantTotalRow,
  fromFriendRequestRow,
  fromGroupRow,
  fromModerationReportRow,
  fromProfileRow,
  lastEditableDates,
  loadState,
  localDateKey,
  MAX_DAILY_ROUNDS,
  readableError,
  uid,
  urlAuthError,
  urlLooksLikePasswordRecovery
} from "./domain";

type PendingAuthNotice = {
  title: string;
  body: string;
  email: string;
  next: "signin" | "signup" | "forgot" | "otp";
};

type ProfileForm = {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  country: string;
  timezone: string;
  avatarUrl: string;
};

export type ActionFeedback = {
  title: string;
  body: string;
  tone?: "success" | "info";
  action?: {
    label: string;
    tab: TabId;
  };
};

type ChantingContextValue = {
  state: AppState;
  saveState: (next: AppState) => void;
  isLoaded: boolean;
  isBusy: boolean;
  isAdmin: boolean;
  loadedRemoteSlices: RemoteSliceStatus;
  loadingRemoteSlices: RemoteSliceStatus;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  pendingAuthNotice: PendingAuthNotice;
  setPendingAuthNotice: (notice: PendingAuthNotice) => void;
  message: string;
  showMessage: (text: string) => void;
  actionFeedback: ActionFeedback | null;
  showActionFeedback: (feedback: ActionFeedback) => void;
  clearActionFeedback: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  roundInput: string;
  setRoundInput: (value: string) => void;
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  selectedPublicUserId: string;
  setSelectedPublicUserId: (id: string) => void;
  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  emailVerified: boolean | null;
  profileForm: ProfileForm;
  setProfileForm: (form: ProfileForm) => void;
  currentUser: UserProfile | null;
  todayKey: string;
  editableDates: string[];
  currentRounds: number;
  draftRounds: number;
  draftDelta: number;
  friends: string[];
  joinedGroups: Group[];
  selectedGroup: Group | undefined;
  setDailyRounds: (dateKey: string, rounds: number) => Promise<void>;
  adjustDraftRounds: (amount: number) => void;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  deleteFriendRequest: (requestId: string, successMessage: string) => Promise<void>;
  groupMemberCount: (groupId: string) => number;
  currentUserGroupRole: (groupId: string) => GroupRole | undefined;
  copyGroupCode: (code: string) => Promise<void>;
  copyGroupInvite: (group: Group) => Promise<void>;
  updateUserPreferences: (updates: Partial<Pick<UserProfile, "dailyGoal" | "reminderEnabled" | "reminderTime">>) => Promise<void>;
  runRemote: (action: () => Promise<void>) => Promise<void>;
  refreshRemoteState: (currentUserId: string, scope?: RemoteScope) => Promise<void>;
  ensureGroupsData: () => Promise<void>;
  ensureFriendsData: () => Promise<void>;
  ensureAdminData: () => Promise<void>;
  resolveLoginEmail: (identifier: string) => Promise<string>;
  checkIdentityConflicts: (username: string, email: string, phone: string) => Promise<void>;
  submitUserReport: (reportedUserId: string, reason: string, details: string) => Promise<void>;
  updateModerationReportStatus: (reportId: string, status: ModerationReport["status"]) => Promise<void>;
};

type RemoteScope = "core" | "groups" | "friends" | "admin" | "all";

type RemoteSliceStatus = {
  groups: boolean;
  friends: boolean;
  admin: boolean;
};

const ChantingContext = createContext<ChantingContextValue | null>(null);

export function useChanting() {
  const value = useContext(ChantingContext);
  if (!value) throw new Error("useChanting must be used inside ChantingProvider.");
  return value;
}

export function ChantingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createSeedState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [pendingAuthNotice, setPendingAuthNotice] = useState<PendingAuthNotice>({
    title: "",
    body: "",
    email: "",
    next: "signin"
  });
  const [message, setMessage] = useState("");
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [roundInput, setRoundInput] = useState("0");
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedPublicUserId, setSelectedPublicUserId] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [loadedRemoteSlices, setLoadedRemoteSlices] = useState({
    groups: false,
    friends: false,
    admin: false
  });
  const [loadingRemoteSlices, setLoadingRemoteSlices] = useState({
    groups: false,
    friends: false,
    admin: false
  });
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    username: "",
    displayName: "",
    email: "",
    phone: "",
    country: "India",
    timezone: detectTimezone(),
    avatarUrl: ""
  });

  useEffect(() => {
    const initialize = async () => {
      if (supabase) {
        const authError = urlAuthError();
        if (authError) {
          setPendingAuthNotice({
            title: "Link could not be used",
            body: readableError(new Error(authError), "reset"),
            email: "",
            next: "forgot"
          });
          setAuthMode("checkEmail");
        }
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          if (urlLooksLikePasswordRecovery()) {
            setAuthMode("newPassword");
            setPendingAuthNotice({
              title: "Create a new password",
              body: "Your recovery link was accepted. Set a new password before returning to the app.",
              email: data.session.user.email || "",
              next: "signin"
            });
          }
          await refreshRemoteState(data.session.user.id, "core");
        } else {
          setState({ ...createSeedState(), currentUserId: null, users: [], chantTotals: [], groups: [], groupMembers: [], friendRequests: [] });
        }
        setIsLoaded(true);
        setSelectedDate(localDateKey(new Date(), detectTimezone()));
        return;
      }
      const loaded = loadState();
      setState(loaded);
      setIsLoaded(true);
      const current = loaded.users.find((user) => user.id === loaded.currentUserId);
      setSelectedDate(localDateKey(new Date(), current?.timezone || detectTimezone()));
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("newPassword");
        setPendingAuthNotice({
          title: "Create a new password",
          body: "Your recovery link was accepted. Set a new password before returning to the dashboard.",
          email: session?.user?.email || "",
          next: "signin"
        });
        if (session?.user) refreshRemoteState(session.user.id, "core");
      }
      if (event === "SIGNED_IN" && session?.user) refreshRemoteState(session.user.id, "core");
      if (event === "SIGNED_OUT") {
        setState({ ...createSeedState(), currentUserId: null, users: [], chantTotals: [], groups: [], groupMembers: [], friendRequests: [] });
        setIsAdmin(false);
        setLoadedRemoteSlices({ groups: false, friends: false, admin: false });
        setLoadingRemoteSlices({ groups: false, friends: false, admin: false });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoaded && !supabase) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isLoaded, state]);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) || null,
    [state]
  );
  const todayKey = currentUser ? localDateKey(new Date(), currentUser.timezone) : localDateKey(new Date(), detectTimezone());
  const editableDates = lastEditableDates(todayKey);

  useEffect(() => {
    if (!selectedDate && currentUser) setSelectedDate(todayKey);
  }, [currentUser, selectedDate, todayKey]);

  useEffect(() => {
    if (!currentUser || !selectedDate) return;
    const total =
      state.chantTotals.find((item) => item.userId === currentUser.id && item.localDate === selectedDate)?.rounds || 0;
    setRoundInput(String(total));
  }, [currentUser, selectedDate, state.chantTotals]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileForm({
      username: currentUser.username,
      displayName: currentUser.displayName,
      email: currentUser.email,
      phone: currentUser.phone,
      country: currentUser.country,
      timezone: currentUser.timezone,
      avatarUrl: currentUser.avatarUrl
    });
  }, [currentUser]);

  const saveState = (next: AppState) => setState(next);

  const refreshRemoteState = useCallback(async (currentUserId: string, scope: RemoteScope = "all") => {
    if (!supabase) return;
    const shouldLoadCore = scope === "core" || scope === "all";
    const shouldLoadGroups = scope === "groups" || scope === "all";
    const shouldLoadFriends = scope === "friends" || scope === "all";
    const shouldLoadAdmin = scope === "admin";

    const [profilesResult, totalsResult, groupsResult, membersResult, requestsResult, reportsResult] = await Promise.all([
      shouldLoadCore ? supabase.from("profiles").select("*").order("username") : Promise.resolve({ data: null, error: null }),
      shouldLoadCore ? supabase.from("chant_totals").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadGroups ? supabase.from("groups").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: null, error: null }),
      shouldLoadGroups ? supabase.from("group_members").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadFriends ? supabase.from("friend_requests").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadAdmin ? supabase.from("moderation_reports").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: null, error: null })
    ]);

    const error = profilesResult.error || totalsResult.error || groupsResult.error || membersResult.error || requestsResult.error || reportsResult.error;

    if (error) {
      showMessage(readableError(error));
      return;
    }

    const nextState: AppState = {
      currentUserId,
      users: shouldLoadCore ? ((profilesResult.data || []) as ProfileRow[]).map(fromProfileRow) : state.users,
      chantTotals: shouldLoadCore ? ((totalsResult.data || []) as ChantTotalRow[]).map(fromChantTotalRow) : state.chantTotals,
      groups: shouldLoadGroups ? ((groupsResult.data || []) as GroupRow[]).map(fromGroupRow) : state.groups,
      groupMembers: shouldLoadGroups
        ? ((membersResult.data || []) as GroupMemberRow[]).map((row) => ({
            groupId: row.group_id,
            userId: row.user_id,
            role: row.role,
            joinedAt: row.joined_at
          }))
        : state.groupMembers,
      friendRequests: shouldLoadFriends ? ((requestsResult.data || []) as FriendRequestRow[]).map(fromFriendRequestRow) : state.friendRequests,
      moderationReports: shouldLoadAdmin ? ((reportsResult.data || []) as ModerationReportRow[]).map(fromModerationReportRow) : state.moderationReports || []
    };
    setState(nextState);
    setLoadedRemoteSlices((current) => ({
      groups: current.groups || shouldLoadGroups,
      friends: current.friends || shouldLoadFriends,
      admin: current.admin || shouldLoadAdmin
    }));
    const { data: authData } = await supabase.auth.getUser();
    setEmailVerified(Boolean(authData.user?.email_confirmed_at));
    const { data: adminData, error: adminError } = await supabase.rpc("is_app_admin");
    if (!adminError) setIsAdmin(Boolean(adminData));
    const current = nextState.users.find((user) => user.id === currentUserId);
    setSelectedDate(localDateKey(new Date(), current?.timezone || detectTimezone()));
  }, [state.chantTotals, state.friendRequests, state.groupMembers, state.groups, state.moderationReports, state.users]);

  const ensureGroupsData = useCallback(async () => {
    if (!supabase || !currentUser || loadedRemoteSlices.groups || loadingRemoteSlices.groups) return;
    setLoadingRemoteSlices((current) => ({ ...current, groups: true }));
    try {
      await refreshRemoteState(currentUser.id, "groups");
    } finally {
      setLoadingRemoteSlices((current) => ({ ...current, groups: false }));
    }
  }, [currentUser, loadedRemoteSlices.groups, loadingRemoteSlices.groups, refreshRemoteState]);

  const ensureFriendsData = useCallback(async () => {
    if (!supabase || !currentUser || loadedRemoteSlices.friends || loadingRemoteSlices.friends) return;
    setLoadingRemoteSlices((current) => ({ ...current, friends: true }));
    try {
      await refreshRemoteState(currentUser.id, "friends");
    } finally {
      setLoadingRemoteSlices((current) => ({ ...current, friends: false }));
    }
  }, [currentUser, loadedRemoteSlices.friends, loadingRemoteSlices.friends, refreshRemoteState]);

  const ensureAdminData = useCallback(async () => {
    if (!supabase || !currentUser || !isAdmin || loadedRemoteSlices.admin || loadingRemoteSlices.admin) return;
    setLoadingRemoteSlices((current) => ({ ...current, admin: true }));
    try {
      await refreshRemoteState(currentUser.id, "admin");
    } finally {
      setLoadingRemoteSlices((current) => ({ ...current, admin: false }));
    }
  }, [currentUser, isAdmin, loadedRemoteSlices.admin, loadingRemoteSlices.admin, refreshRemoteState]);

  const runRemote = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  };

  const resolveLoginEmail = async (identifier: string) => {
    if (!supabase) return identifier;
    if (identifier.includes("@")) return identifier;
    const { data, error } = await supabase.rpc("resolve_login_identifier", {
      login_identifier: identifier
    });
    if (error) throw error;
    if (!data) throw new Error("No account found for that username or phone number.");
    return String(data);
  };

  const checkIdentityConflicts = async (username: string, email: string, phone: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("profile_identity_conflicts", {
      desired_username: username,
      desired_email: email,
      desired_phone: phone
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      throw new Error(
        `Already registered: ${data
          .map((field) => String(field))
          .join(", ")}. Change that field or sign in instead.`
      );
    }
    if (!error) return;

    const { data: available, error: availabilityError } = await supabase.rpc("is_profile_identity_available", {
      desired_username: username,
      desired_email: email,
      desired_phone: phone
    });
    if (availabilityError) throw availabilityError;
    if (!available) throw new Error("Username, email, or phone is already registered.");
  };

  function showMessage(text: string) {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setActionFeedback(null);
    setMessage(text);
    messageTimeoutRef.current = window.setTimeout(() => setMessage(""), 3500);
  }

  function showActionFeedback(feedback: ActionFeedback) {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(feedback.title);
    setActionFeedback(feedback);
    messageTimeoutRef.current = window.setTimeout(() => {
      setMessage("");
      setActionFeedback(null);
    }, 7000);
  }

  function clearActionFeedback() {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage("");
    setActionFeedback(null);
  }

  const currentRounds =
    state.chantTotals.find((total) => total.userId === currentUser?.id && total.localDate === selectedDate)?.rounds || 0;
  const draftRounds = Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(Number(roundInput) || 0)));
  const draftDelta = draftRounds - currentRounds;

  const setDailyRounds = async (dateKey: string, rounds: number) => {
    if (!currentUser) return;
    if (!editableDates.includes(dateKey)) {
      showMessage("You can edit only today and the previous 6 days.");
      return;
    }
    const cleanRounds = Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(rounds || 0)));
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("chant_totals").upsert({
          user_id: currentUser.id,
          local_date: dateKey,
          rounds: cleanRounds,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        await refreshRemoteState(currentUser.id);
        setRoundInput(String(cleanRounds));
        showActionFeedback({
          title: "Rounds saved",
          body: `${cleanRounds} round${cleanRounds === 1 ? "" : "s"} saved for ${formatDate(dateKey)}.`,
          action: { label: "View global leaderboard", tab: "global" }
        });
      }).catch((error: Error) => showMessage(readableError(error, "rounds")));
      return;
    }
    const existing = state.chantTotals.find(
      (total) => total.userId === currentUser.id && total.localDate === dateKey
    );
    const nextTotals = existing
      ? state.chantTotals.map((total) =>
          total.userId === currentUser.id && total.localDate === dateKey
            ? { ...total, rounds: cleanRounds, updatedAt: new Date().toISOString() }
            : total
        )
      : [
          ...state.chantTotals,
          { userId: currentUser.id, localDate: dateKey, rounds: cleanRounds, updatedAt: new Date().toISOString() }
        ];
    saveState({ ...state, chantTotals: nextTotals });
    setRoundInput(String(cleanRounds));
    showActionFeedback({
      title: "Rounds saved",
      body: `${cleanRounds} round${cleanRounds === 1 ? "" : "s"} saved for ${formatDate(dateKey)}.`,
      action: { label: "View global leaderboard", tab: "global" }
    });
  };

  const adjustDraftRounds = (amount: number) => {
    setRoundInput(String(Math.max(0, Math.min(MAX_DAILY_ROUNDS, draftRounds + amount))));
  };

  const friends = state.friendRequests
    .filter(
      (request) =>
        request.status === "accepted" &&
        currentUser &&
        (request.fromUserId === currentUser.id || request.toUserId === currentUser.id)
    )
    .map((request) => (request.fromUserId === currentUser?.id ? request.toUserId : request.fromUserId));

  const deleteFriendRequest = async (requestId: string, successMessage: string) => {
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("friend_requests").delete().eq("id", requestId);
        if (error) throw error;
        await refreshRemoteState(currentUser!.id);
        showMessage(successMessage);
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({
      ...state,
      friendRequests: state.friendRequests.filter((request) => request.id !== requestId)
    });
    showMessage(successMessage);
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!currentUser) return;
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("friend_requests")
          .update({ status: "accepted" })
          .eq("id", requestId);
        if (error) throw error;
        await refreshRemoteState(currentUser.id);
        showActionFeedback({
          title: "Friend request accepted",
          body: "Your friends leaderboard now includes this devotee.",
          action: { label: "View friends leaderboard", tab: "friends" }
        });
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({
      ...state,
      friendRequests: state.friendRequests.map((request) =>
        request.id === requestId ? { ...request, status: "accepted" } : request
      )
    });
    showActionFeedback({
      title: "Friend request accepted",
      body: "Your friends leaderboard now includes this devotee.",
      action: { label: "View friends leaderboard", tab: "friends" }
    });
  };

  const joinedGroups = currentUser
    ? state.groupMembers
        .filter((member) => member.userId === currentUser.id)
        .map((member) => state.groups.find((group) => group.id === member.groupId))
        .filter(Boolean) as Group[]
    : [];

  const selectedGroup = state.groups.find((group) => group.id === (selectedGroupId || joinedGroups[0]?.id));
  const groupMemberCount = (groupId: string) => state.groupMembers.filter((member) => member.groupId === groupId).length;
  const currentUserGroupRole = (groupId: string) =>
    state.groupMembers.find((member) => member.groupId === groupId && member.userId === currentUser?.id)?.role;

  const copyGroupCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showMessage(`Copied group code ${code}.`);
    } catch {
      showMessage(`Group code: ${code}`);
    }
  };

  const copyGroupInvite = async (group: Group) => {
    const inviteUrl = typeof window === "undefined" ? "" : `${window.location.origin}?group=${group.code}`;
    const text = `Join my Hare Krishna Leaderboard group "${group.name}" with code ${group.code}.${inviteUrl ? ` Link: ${inviteUrl}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      showMessage(`Copied invite for ${group.name}.`);
    } catch {
      showMessage(text);
    }
  };

  const updateUserPreferences = async (updates: Partial<Pick<UserProfile, "dailyGoal" | "reminderEnabled" | "reminderTime">>) => {
    if (!currentUser) return;
    const cleanUpdates = {
      ...(typeof updates.dailyGoal === "number" ? { dailyGoal: Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(updates.dailyGoal))) } : {}),
      ...(typeof updates.reminderEnabled === "boolean" ? { reminderEnabled: updates.reminderEnabled } : {}),
      ...(typeof updates.reminderTime === "string" ? { reminderTime: updates.reminderTime } : {})
    };
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("profiles")
          .update({
            ...(typeof cleanUpdates.dailyGoal === "number" ? { daily_goal: cleanUpdates.dailyGoal } : {}),
            ...(typeof cleanUpdates.reminderEnabled === "boolean" ? { reminder_enabled: cleanUpdates.reminderEnabled } : {}),
            ...(typeof cleanUpdates.reminderTime === "string" ? { reminder_time: cleanUpdates.reminderTime } : {})
          })
          .eq("id", currentUser.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "core");
      }).catch((error: Error) => showMessage(readableError(error, "profile")));
      return;
    }
    saveState({
      ...state,
      users: state.users.map((user) => (user.id === currentUser.id ? { ...user, ...cleanUpdates } : user))
    });
  };

  const submitUserReport = async (reportedUserId: string, reason: string, details: string) => {
    if (!currentUser) return;
    const cleanReason = reason.trim();
    if (!cleanReason) {
      showMessage("Choose a report reason.");
      return;
    }
    if (reportedUserId === currentUser.id) {
      showMessage("You cannot report your own profile.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("moderation_reports").insert({
          reporter_id: currentUser.id,
          reported_user_id: reportedUserId,
          reason: cleanReason,
          details: details.trim(),
          status: "open"
        });
        if (error) throw error;
        const report: ModerationReport = {
          id: uid("report"),
          reporterId: currentUser.id,
          reportedUserId,
          reason: cleanReason,
          details: details.trim(),
          status: "open",
          createdAt: new Date().toISOString()
        };
        saveState({ ...state, moderationReports: [report, ...(state.moderationReports || [])] });
        showMessage("Report submitted for review.");
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    const report: ModerationReport = {
      id: uid("report"),
      reporterId: currentUser.id,
      reportedUserId,
      reason: cleanReason,
      details: details.trim(),
      status: "open",
      createdAt: new Date().toISOString()
    };
    saveState({ ...state, moderationReports: [report, ...(state.moderationReports || [])] });
    showMessage("Report submitted for review.");
  };

  const updateModerationReportStatus = async (reportId: string, status: ModerationReport["status"]) => {
    if (!currentUser || !isAdmin) return;
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client.from("moderation_reports").update({ status }).eq("id", reportId);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "admin");
        showMessage(`Report marked ${status}.`);
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({
      ...state,
      moderationReports: state.moderationReports.map((report) =>
        report.id === reportId ? { ...report, status } : report
      )
    });
    showMessage(`Report marked ${status}.`);
  };

  const value: ChantingContextValue = {
    state,
    saveState,
    isLoaded,
    isBusy,
    isAdmin,
    loadedRemoteSlices,
    loadingRemoteSlices,
    authMode,
    setAuthMode,
    pendingAuthNotice,
    setPendingAuthNotice,
    message,
    showMessage,
    actionFeedback,
    showActionFeedback,
    clearActionFeedback,
    selectedDate,
    setSelectedDate,
    roundInput,
    setRoundInput,
    period,
    setPeriod,
    selectedGroupId,
    setSelectedGroupId,
    selectedPublicUserId,
    setSelectedPublicUserId,
    deleteConfirmation,
    setDeleteConfirmation,
    emailVerified,
    profileForm,
    setProfileForm,
    currentUser,
    todayKey,
    editableDates,
    currentRounds,
    draftRounds,
    draftDelta,
    friends,
    joinedGroups,
    selectedGroup,
    setDailyRounds,
    adjustDraftRounds,
    acceptFriendRequest,
    deleteFriendRequest,
    groupMemberCount,
    currentUserGroupRole,
    copyGroupCode,
    copyGroupInvite,
    updateUserPreferences,
    runRemote,
    refreshRemoteState,
    ensureGroupsData,
    ensureFriendsData,
    ensureAdminData,
    resolveLoginEmail,
    checkIdentityConflicts,
    submitUserReport,
    updateModerationReportStatus
  };

  return <ChantingContext.Provider value={value}>{children}</ChantingContext.Provider>;
}

export function makeFriendRequest(fromUserId: string, toUserId: string): FriendRequest {
  return {
    id: uid("friend"),
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: new Date().toISOString()
  };
}
