"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AppNotification,
  AppState,
  FriendRequest,
  Group,
  GroupRole,
  LeaderboardPeriod,
  UserProfile
} from "@/lib/types";
import {
  ChantTotalRow,
  FriendRequestRow,
  GroupMemberRow,
  GroupRow,
  NotificationRow,
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
  fromNotificationRow,
  fromProfileRow,
  editableDatesSinceJoin,
  isEditableSinceJoin,
  loadState,
  localDateKey,
  MAX_DAILY_ROUNDS,
  computeMilestones,
  readableError,
  uid,
  usernamePattern,
  urlAuthError,
  urlLooksLikePasswordRecovery
} from "./domain";

type PendingAuthNotice = {
  title: string;
  body: string;
  email: string;
  next: "signin" | "signup";
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
  updateUserPreferences: (updates: Partial<Pick<UserProfile, "dailyGoal" | "reminderEnabled" | "reminderTime">>) => Promise<boolean>;
  updateFeaturedMilestones: (milestoneIds: string[]) => Promise<void>;
  runRemote: (action: () => Promise<void>) => Promise<void>;
  refreshRemoteState: (currentUserId: string, scope?: RemoteScope) => Promise<void>;
  ensureGroupsData: (force?: boolean) => Promise<void>;
  ensureFriendsData: (force?: boolean) => Promise<void>;
  resolveLoginEmail: (identifier: string) => Promise<string>;
  checkIdentityConflicts: (username: string, email: string, phone: string) => Promise<void>;
  addNotification: (notification: NewNotification) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
};

type NewNotification = {
  title: string;
  body: string;
  tone?: AppNotification["tone"];
  actionTab?: AppNotification["actionTab"];
  dedupeKey?: string;
  userId?: string;
};

type RemoteScope = "core" | "groups" | "friends" | "all";

type RemoteSliceStatus = {
  groups: boolean;
  friends: boolean;
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
    friends: false
  });
  const [loadingRemoteSlices, setLoadingRemoteSlices] = useState({
    groups: false,
    friends: false
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
            next: "signin"
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
          setState({ ...createSeedState(), currentUserId: null, users: [], chantTotals: [], groups: [], groupMembers: [], friendRequests: [], notifications: [] });
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
        setState({ ...createSeedState(), currentUserId: null, users: [], chantTotals: [], groups: [], groupMembers: [], friendRequests: [], notifications: [] });
        setLoadedRemoteSlices({ groups: false, friends: false });
        setLoadingRemoteSlices({ groups: false, friends: false });
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
  const editableDates = currentUser ? editableDatesSinceJoin(todayKey, currentUser.joinedAt) : [todayKey];

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
    const shouldLoadProfiles = shouldLoadCore || shouldLoadGroups || shouldLoadFriends;
    const shouldLoadTotals = shouldLoadCore || shouldLoadGroups || shouldLoadFriends;
    const shouldLoadGroupTables = shouldLoadGroups;

    const [publicProfilesResult, currentProfileResult, totalsResult, groupsResult, membersResult, requestsResult, notificationsResult] = await Promise.all([
      shouldLoadProfiles ? supabase.from("app_public_profiles").select("*").order("username") : Promise.resolve({ data: null, error: null }),
      shouldLoadProfiles ? supabase.rpc("get_current_profile") : Promise.resolve({ data: null, error: null }),
      shouldLoadTotals ? supabase.from("chant_totals").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadGroupTables ? supabase.from("groups").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: null, error: null }),
      shouldLoadGroupTables ? supabase.from("group_members").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadFriends ? supabase.from("friend_requests").select("*") : Promise.resolve({ data: null, error: null }),
      shouldLoadCore ? supabase.from("notifications").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false }).limit(80) : Promise.resolve({ data: null, error: null })
    ]);

    let profileRows = (publicProfilesResult.data || []) as ProfileRow[];
    let profileError = publicProfilesResult.error || currentProfileResult.error;
    if (shouldLoadProfiles && profileError) {
      const fallbackProfiles = await supabase.from("profiles").select("*").order("username");
      profileRows = (fallbackProfiles.data || []) as ProfileRow[];
      profileError = fallbackProfiles.error;
    } else if (shouldLoadProfiles && currentProfileResult.data) {
      const privateProfile = currentProfileResult.data as ProfileRow;
      profileRows = [
        ...profileRows.filter((profile) => profile.id !== privateProfile.id),
        privateProfile
      ].sort((a, b) => a.username.localeCompare(b.username));
    }

    const error = profileError || totalsResult.error || groupsResult.error || membersResult.error || requestsResult.error;

    if (error) {
      showMessage(readableError(error));
      return;
    }

    const nextState: AppState = {
      currentUserId,
      users: shouldLoadProfiles ? profileRows.map(fromProfileRow) : state.users,
      chantTotals: shouldLoadTotals ? ((totalsResult.data || []) as ChantTotalRow[]).map(fromChantTotalRow) : state.chantTotals,
      groups: shouldLoadGroupTables ? ((groupsResult.data || []) as GroupRow[]).map(fromGroupRow) : state.groups,
      groupMembers: shouldLoadGroupTables
        ? ((membersResult.data || []) as GroupMemberRow[]).map((row) => ({
            groupId: row.group_id,
            userId: row.user_id,
            role: row.role,
            joinedAt: row.joined_at
          }))
        : state.groupMembers,
      friendRequests: shouldLoadFriends ? ((requestsResult.data || []) as FriendRequestRow[]).map(fromFriendRequestRow) : state.friendRequests,
      notifications:
        shouldLoadCore && !notificationsResult.error
          ? ((notificationsResult.data || []) as NotificationRow[]).map(fromNotificationRow)
          : state.notifications || []
    };
    setState(nextState);
    setLoadedRemoteSlices((current) => ({
      groups: current.groups || shouldLoadGroups,
      friends: current.friends || shouldLoadFriends
    }));
    const { data: authData } = await supabase.auth.getUser();
    setEmailVerified(Boolean(authData.user?.email_confirmed_at));
    const current = nextState.users.find((user) => user.id === currentUserId);
    setSelectedDate(localDateKey(new Date(), current?.timezone || detectTimezone()));
  }, [state.chantTotals, state.friendRequests, state.groupMembers, state.groups, state.notifications, state.users]);

  const ensureGroupsData = useCallback(async (force = false) => {
    if (!supabase || !currentUser || (!force && loadedRemoteSlices.groups) || loadingRemoteSlices.groups) return;
    setLoadingRemoteSlices((current) => ({ ...current, groups: true }));
    try {
      await refreshRemoteState(currentUser.id, "groups");
    } finally {
      setLoadingRemoteSlices((current) => ({ ...current, groups: false }));
    }
  }, [currentUser, loadedRemoteSlices.groups, loadingRemoteSlices.groups, refreshRemoteState]);

  const ensureFriendsData = useCallback(async (force = false) => {
    if (!supabase || !currentUser || (!force && loadedRemoteSlices.friends) || loadingRemoteSlices.friends) return;
    setLoadingRemoteSlices((current) => ({ ...current, friends: true }));
    try {
      await refreshRemoteState(currentUser.id, "friends");
    } finally {
      setLoadingRemoteSlices((current) => ({ ...current, friends: false }));
    }
  }, [currentUser, loadedRemoteSlices.friends, loadingRemoteSlices.friends, refreshRemoteState]);

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
    if (!usernamePattern.test(identifier)) throw new Error("No account found for that username or email address.");
    const { data, error } = await supabase.rpc("resolve_login_identifier", {
      login_identifier: identifier
    });
    if (error) throw error;
    if (!data) throw new Error("No account found for that username or email address.");
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

  const addNotification = async (notification: NewNotification) => {
    const userId = notification.userId || currentUser?.id;
    if (!userId) return;
    const dedupeKey = notification.dedupeKey || "";
    if (dedupeKey && (state.notifications || []).some((item) => item.userId === userId && item.dedupeKey === dedupeKey)) return;
    const createdAt = new Date().toISOString();
    const nextNotification: AppNotification = {
      id: uid("note"),
      userId,
      title: notification.title,
      body: notification.body,
      tone: notification.tone || "info",
      actionTab: notification.actionTab || "",
      dedupeKey,
      readAt: "",
      createdAt
    };

    setState((current) => ({
      ...current,
      notifications: [nextNotification, ...(current.notifications || [])].slice(0, 80)
    }));

    if (!supabase) return;
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: nextNotification.title,
        body: nextNotification.body,
        tone: nextNotification.tone,
        action_tab: nextNotification.actionTab || null,
        dedupe_key: nextNotification.dedupeKey || null
      })
      .select("*")
      .single();
    if (error) {
      setState((current) => ({
        ...current,
        notifications: (current.notifications || []).filter((item) => item.id !== nextNotification.id)
      }));
      showMessage(readableError(error));
      return;
    }
    if (data) {
      const saved = fromNotificationRow(data as NotificationRow);
      setState((current) => ({
        ...current,
        notifications: [saved, ...(current.notifications || []).filter((item) => item.id !== nextNotification.id)].slice(0, 80)
      }));
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const readAt = new Date().toISOString();
    const previousReadAt = (state.notifications || []).find((item) => item.id === notificationId)?.readAt || "";
    setState((current) => ({
      ...current,
      notifications: (current.notifications || []).map((item) =>
        item.id === notificationId ? { ...item, readAt: item.readAt || readAt } : item
      )
    }));
    if (!supabase) return;
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notificationId);
    if (error) {
      setState((current) => ({
        ...current,
        notifications: (current.notifications || []).map((item) =>
          item.id === notificationId ? { ...item, readAt: previousReadAt } : item
        )
      }));
      showMessage(readableError(error));
    }
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    const readAt = new Date().toISOString();
    const previousNotifications = state.notifications || [];
    setState((current) => ({
      ...current,
      notifications: (current.notifications || []).map((item) =>
        item.userId === currentUser.id ? { ...item, readAt: item.readAt || readAt } : item
      )
    }));
    if (!supabase) return;
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("user_id", currentUser.id).is("read_at", null);
    if (error) {
      setState((current) => ({
        ...current,
        notifications: previousNotifications
      }));
      showMessage(readableError(error));
    }
  };

  const currentRounds =
    state.chantTotals.find((total) => total.userId === currentUser?.id && total.localDate === selectedDate)?.rounds || 0;
  const draftRounds = Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(Number(roundInput) || 0)));
  const draftDelta = draftRounds - currentRounds;

  const setDailyRounds = async (dateKey: string, rounds: number) => {
    if (!currentUser) return;
    if (!isEditableSinceJoin(dateKey, todayKey, currentUser.joinedAt)) {
      showMessage("You can edit dates from your account join date through today.");
      return;
    }
    const cleanRounds = Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(rounds || 0)));
    const nextTotalsPreview = previewTotals(state.chantTotals, currentUser.id, dateKey, cleanRounds);
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
        await notifyRoundSave(dateKey, cleanRounds, nextTotalsPreview);
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
    await notifyRoundSave(dateKey, cleanRounds, nextTotals);
    showActionFeedback({
      title: "Rounds saved",
      body: `${cleanRounds} round${cleanRounds === 1 ? "" : "s"} saved for ${formatDate(dateKey)}.`,
      action: { label: "View global leaderboard", tab: "global" }
    });
  };

  const notifyRoundSave = async (dateKey: string, cleanRounds: number, nextTotals: AppState["chantTotals"]) => {
    if (!currentUser) return;
    await addNotification({
      title: "Rounds saved",
      body: `${cleanRounds} round${cleanRounds === 1 ? "" : "s"} saved for ${formatDate(dateKey)}.`,
      tone: "success",
      actionTab: "activity",
      dedupeKey: `rounds-${dateKey}-${cleanRounds}`
    });
    if (dateKey === todayKey && currentUser.dailyGoal > 0 && cleanRounds >= currentUser.dailyGoal) {
      await addNotification({
        title: "Daily goal reached",
        body: `You reached your ${currentUser.dailyGoal}-round goal for today.`,
        tone: "success",
        actionTab: "home",
        dedupeKey: `daily-goal-${dateKey}`
      });
    }
    const previousMilestones = computeMilestones(state, currentUser, todayKey).filter((item) => item.earned).map((item) => item.id);
    const nextMilestones = computeMilestones({ ...state, chantTotals: nextTotals }, currentUser, todayKey).filter((item) => item.earned);
    for (const milestone of nextMilestones) {
      if (previousMilestones.includes(milestone.id)) continue;
      await addNotification({
        title: `Milestone unlocked: ${milestone.title}`,
        body: milestone.description,
        tone: "success",
        actionTab: "profile",
        dedupeKey: `milestone-${milestone.id}`
      });
    }
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
        await addNotification({
          title: "Friend request accepted",
          body: "Your friends leaderboard now includes this devotee.",
          tone: "success",
          actionTab: "friends",
          dedupeKey: `friend-accepted-${requestId}`
        });
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
    await addNotification({
      title: "Friend request accepted",
      body: "Your friends leaderboard now includes this devotee.",
      tone: "success",
      actionTab: "friends",
      dedupeKey: `friend-accepted-${requestId}`
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
    const inviteUrl = typeof window === "undefined" ? "" : `${window.location.origin}/g/${encodeURIComponent(group.code)}`;
    const text = `Join my Hare Krishna Leaderboard group "${group.name}" with code ${group.code}.${inviteUrl ? ` Link: ${inviteUrl}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      showMessage(`Copied invite for ${group.name}.`);
    } catch {
      showMessage(text);
    }
  };

  const updateUserPreferences = async (updates: Partial<Pick<UserProfile, "dailyGoal" | "reminderEnabled" | "reminderTime">>) => {
    if (!currentUser) return false;
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
      }).catch((error: Error) => {
        showMessage(readableError(error, "profile"));
        throw error;
      });
      return true;
    }
    saveState({
      ...state,
      users: state.users.map((user) => (user.id === currentUser.id ? { ...user, ...cleanUpdates } : user))
    });
    return true;
  };

  const updateFeaturedMilestones = async (milestoneIds: string[]) => {
    if (!currentUser) return;
    const earnedIds = new Set(computeMilestones(state, currentUser, todayKey).filter((milestone) => milestone.earned).map((milestone) => milestone.id));
    const cleanIds = Array.from(new Set(milestoneIds.filter((id) => earnedIds.has(id)))).slice(0, 3);
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { error } = await client
          .from("profiles")
          .update({ featured_milestone_ids: cleanIds })
          .eq("id", currentUser.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id, "core");
        showMessage("Featured milestones saved.");
      }).catch((error: Error) => showMessage(readableError(error, "profile")));
      return;
    }
    saveState({
      ...state,
      users: state.users.map((user) =>
        user.id === currentUser.id ? { ...user, featuredMilestoneIds: cleanIds } : user
      )
    });
    showMessage("Featured milestones saved.");
  };

  const value: ChantingContextValue = {
    state,
    saveState,
    isLoaded,
    isBusy,
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
    updateFeaturedMilestones,
    runRemote,
    refreshRemoteState,
    ensureGroupsData,
    ensureFriendsData,
    resolveLoginEmail,
    checkIdentityConflicts,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead
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

function previewTotals(totals: AppState["chantTotals"], userId: string, dateKey: string, rounds: number) {
  const updatedAt = new Date().toISOString();
  const existing = totals.find((total) => total.userId === userId && total.localDate === dateKey);
  if (existing) {
    return totals.map((total) =>
      total.userId === userId && total.localDate === dateKey ? { ...total, rounds, updatedAt } : total
    );
  }
  return [...totals, { userId, localDate: dateKey, rounds, updatedAt }];
}
