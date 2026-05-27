import type {
  AppNotification,
  AppState,
  ChantTotal,
  FriendRequest,
  Group,
  GroupRole,
  LeaderboardPeriod,
  ProfilePrivacy,
  UserProfile
} from "@/lib/types";

export const STORAGE_KEY = "hare-krishna-leaderboard-state-v1";
export const MAX_DAILY_ROUNDS = 250;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const usernamePattern = /^[a-z][a-z0-9_]{2,23}$/;

export const countries = [
  { name: "India", dialCode: "+91", example: "9876543210", timezones: ["Asia/Kolkata"] },
  {
    name: "United States",
    dialCode: "+1",
    example: "4155550101",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "Pacific/Honolulu"]
  },
  { name: "United Kingdom", dialCode: "+44", example: "7700900123", timezones: ["Europe/London"] },
  {
    name: "Canada",
    dialCode: "+1",
    example: "4165550101",
    timezones: ["America/Toronto", "America/Winnipeg", "America/Edmonton", "America/Vancouver", "America/Halifax"]
  },
  { name: "Australia", dialCode: "+61", example: "412345678", timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide"] },
  { name: "Nepal", dialCode: "+977", example: "9841234567", timezones: ["Asia/Kathmandu"] },
  { name: "Bangladesh", dialCode: "+880", example: "1712345678", timezones: ["Asia/Dhaka"] },
  {
    name: "Other",
    dialCode: "+",
    example: "country code and number",
    timezones: ["Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"]
  }
];

export type RankedUser = {
  user: UserProfile;
  rounds: number;
  rank: number;
  hasEntry: boolean;
  entryCount: number;
  lastEntryDate: string;
  lastUpdatedAt: string;
};

export type Milestone = {
  id: string;
  category: "Chanting" | "Consistency" | "Community" | "Leaderboards";
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  target: number;
};

export type ActivityFeedItem = {
  id: string;
  title: string;
  body: string;
  at: string;
  tone: "saffron" | "peacock" | "emerald" | "stone";
};

export type AuthMode = "signin" | "signup" | "newPassword" | "checkEmail";
export type TabId = "home" | "groups" | "friends" | "global" | "activity" | "milestones" | "profile" | "about";

export type ProfileRow = {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  display_name: string | null;
  country: string | null;
  timezone: string | null;
  avatar_url: string | null;
  daily_goal?: number;
  reminder_enabled?: boolean;
  reminder_time?: string;
  show_country?: boolean;
  show_groups?: boolean;
  show_streak?: boolean;
  show_recent_history?: boolean;
  show_milestones?: boolean;
  featured_milestone_ids?: string[];
  joined_at: string;
};

export const defaultProfilePrivacy: ProfilePrivacy = {
  showCountry: true,
  showGroups: true,
  showStreak: true,
  showRecentHistory: true,
  showMilestones: true
};

export function withDefaultProfilePrivacy(user: UserProfile): UserProfile {
  return {
    ...user,
    featuredMilestoneIds: user.featuredMilestoneIds || [],
    privacy: {
      ...defaultProfilePrivacy,
      ...(user.privacy || {})
    }
  };
}

export type ChantTotalRow = {
  user_id: string;
  local_date: string;
  rounds: number;
  updated_at: string;
};

export type GroupRow = {
  id: string;
  owner_id: string;
  name: string;
  code: string;
  image_url: string;
  announcement?: string;
  target_daily?: number;
  target_weekly?: number;
  created_at: string;
};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
};

export type FriendRequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tone: "success" | "info" | "warning";
  action_tab?: TabId | null;
  dedupe_key?: string | null;
  read_at?: string | null;
  created_at: string;
};

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function hashPassword(password: string) {
  if (typeof btoa === "undefined") {
    return Buffer.from(password, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(password)));
}

export function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
}

export function localDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function editableDatesSinceJoin(todayKey: string, joinedAt: string) {
  const joinedDate = /^\d{4}-\d{2}-\d{2}/.test(joinedAt) ? joinedAt.slice(0, 10) : todayKey;
  const dates: string[] = [];
  for (let dateKey = todayKey; dateKey >= joinedDate; dateKey = addDays(dateKey, -1)) {
    dates.push(dateKey);
  }
  return dates.length ? dates : [todayKey];
}

export function isEditableSinceJoin(dateKey: string, todayKey: string, joinedAt: string) {
  const joinedDate = /^\d{4}-\d{2}-\d{2}/.test(joinedAt) ? joinedAt.slice(0, 10) : todayKey;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dateKey >= joinedDate && dateKey <= todayKey;
}

export function monthStart(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

export function mondayStart(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function periodRange(period: LeaderboardPeriod, todayKey: string) {
  if (period === "daily") return { start: todayKey, end: todayKey };
  if (period === "weekly") return { start: mondayStart(todayKey), end: todayKey };
  if (period === "monthly") return { start: monthStart(todayKey), end: todayKey };
  return { start: "0000-01-01", end: todayKey };
}

export function leaderboardRange(period: LeaderboardPeriod, todayKey: string, offset: number) {
  if (period === "allTime") {
    return { start: "0000-01-01", end: todayKey, label: offset === 0 ? "All time" : "All time" };
  }
  if (period === "daily") {
    const dateKey = addDays(todayKey, -offset);
    return {
      start: dateKey,
      end: dateKey,
      label: offset === 0 ? "Today" : offset === 1 ? "Yesterday" : formatDate(dateKey)
    };
  }
  if (period === "weekly") {
    const currentStart = mondayStart(todayKey);
    const start = addDays(currentStart, -offset * 7);
    const end = offset === 0 ? todayKey : addDays(start, 6);
    return {
      start,
      end,
      label: offset === 0 ? "This week" : offset === 1 ? "Previous week" : `${formatDate(start)} - ${formatDate(end)}`
    };
  }
  const currentMonth = monthStart(todayKey);
  const start = shiftMonthStart(currentMonth, -offset);
  const end = offset === 0 ? todayKey : addDays(shiftMonthStart(start, 1), -1);
  return {
    start,
    end,
    label: offset === 0 ? "This month" : offset === 1 ? "Previous month" : formatMonth(start)
  };
}

function shiftMonthStart(dateKey: string, monthDelta: number) {
  const date = new Date(`${dateKey.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + monthDelta);
  return date.toISOString().slice(0, 10);
}

function formatMonth(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

export function formatDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function passwordProblem(password: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Add a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Add an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Add a number.";
  return "";
}

export function passwordRules(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) }
  ];
}

export function isAccountNotFoundError(message: string) {
  const text = message.toLowerCase();
  return text.includes("no account found") || text.includes("invalid login credentials");
}

export function readableError(error: unknown, context?: "signin" | "signup" | "otp" | "reset" | "rounds" | "profile") {
  const raw = error instanceof Error ? error.message : String(error || "Something went wrong.");
  const text = raw.toLowerCase();

  if (text.includes("profiles_username_key") || (text.includes("username") && text.includes("duplicate"))) {
    return "That username is already taken. Try a different username.";
  }
  if (
    text.includes("profiles_email_key") ||
    text.includes("email address already registered") ||
    text.includes("user already registered") ||
    (text.includes("email") && text.includes("duplicate"))
  ) {
    return "That email is already registered. Try signing in or use email OTP.";
  }
  if (text.includes("profiles_phone_key") || (text.includes("phone") && text.includes("duplicate"))) {
    return "That phone number is already registered. Leave phone blank or use a different number.";
  }
  if (text.includes("groups_code_key") || (text.includes("group") && text.includes("code") && text.includes("duplicate"))) {
    return "That group code is already used. Try a more specific code.";
  }
  if (text.includes("username, email, or phone is already registered")) {
    return "That username, email, or phone is already registered. Try changing that field or sign in.";
  }
  if (text.includes("duplicate key value") || text.includes("unique constraint")) {
    return "That value is already used. Change it and try again.";
  }
  if (text.includes("email not confirmed")) {
    return "Your email is not confirmed yet. Open the confirmation email, then sign in.";
  }
  if (text.includes("rate limit") || text.includes("too many requests") || text.includes("429")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (context === "otp" && (text.includes("invalid") || text.includes("expired") || text.includes("token"))) {
    return "That OTP is invalid or expired. Request a new code and keep this tab open.";
  }
  if (context === "reset" && (text.includes("expired") || text.includes("invalid") || text.includes("session missing"))) {
    return "That password link is invalid or expired. Sign in with email OTP, then change your password from Profile.";
  }
  if (
    context === "rounds" &&
    (text.includes("row-level security") || text.includes("violates row-level security") || text.includes("editable"))
  ) {
    return "The database blocked this edit because the date is before your account join date or after today.";
  }
  if (context === "rounds" && (text.includes("chant_totals_rounds_check") || text.includes("rounds"))) {
    return `Rounds must be between 0 and ${MAX_DAILY_ROUNDS} for one user on one day.`;
  }
  if (text.includes("network")) return "Network error. Check your internet connection and try again.";
  if (text.includes("bucket not found")) return "Storage bucket is missing. Run the latest Supabase Storage migration, then try again.";
  return raw;
}

export function usernameHelpText() {
  return "3-24 characters. Start with a letter. Lowercase letters, numbers, and underscores only.";
}

export function periodLabel(period: LeaderboardPeriod) {
  if (period === "daily") return "Today";
  if (period === "weekly") return "This week";
  if (period === "monthly") return "This month";
  return "All time";
}

export function cleanPhoneInput(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function countryDialCode(countryName: string) {
  return countries.find((country) => country.name === countryName)?.dialCode || "+";
}

export function countryPhoneExample(countryName: string) {
  return countries.find((country) => country.name === countryName)?.example || "country code and number";
}

export function countryTimezones(countryName: string) {
  return countries.find((country) => country.name === countryName)?.timezones || [detectTimezone()];
}

export function timezoneOptions(countryName: string, currentTimezone?: string) {
  const detected = detectTimezone();
  return Array.from(new Set([...countryTimezones(countryName), detected, currentTimezone].filter(Boolean) as string[]));
}

export function timezoneForCountry(countryName: string, currentTimezone?: string) {
  const detected = detectTimezone();
  const options = countryTimezones(countryName);
  if (currentTimezone && options.includes(currentTimezone)) return currentTimezone;
  if (options.includes(detected)) return detected;
  return options[0] || detected;
}

export function localDayBoundaryText(timezone: string) {
  return `Today is ${formatDate(localDateKey(new Date(), timezone))}. Your chanting day runs from 12:00 AM to 11:59 PM in ${timezone}. Weeks start on Monday.`;
}

export const VAISHNAVA_CALENDAR_REFERENCE = {
  name: "Vaisnava Calendar Reminder Services",
  provider: "ISKCON-approved GCal 11 calculations",
  url: "https://www.vaisnavacalendar.info/"
};

export function approximateHinduCalendar(dateKey: string) {
  const tithiNames = [
    "Pratipada",
    "Dvitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima/Amavasya"
  ];
  const date = new Date(`${dateKey}T12:00:00Z`);
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMonthMs = 29.530588853 * 24 * 60 * 60 * 1000;
  const ageMs = ((date.getTime() - knownNewMoon) % synodicMonthMs + synodicMonthMs) % synodicMonthMs;
  const tithi = Math.floor(ageMs / (synodicMonthMs / 30)) + 1;
  const paksha = tithi <= 15 ? "Shukla Paksha" : "Krishna Paksha";
  const tithiInPaksha = ((tithi - 1) % 15) + 1;
  const name = tithiNames[tithiInPaksha - 1];
  const isEkadashi = tithiInPaksha === 11;
  return {
    name,
    paksha,
    tithi,
    tithiInPaksha,
    isEkadashi,
    isDashami: tithiInPaksha === 10,
    isDwadashi: tithiInPaksha === 12,
    note: `Approximate tithi based on lunar phase. For fasting and festival observance, confirm with your local temple panchang or ${VAISHNAVA_CALENDAR_REFERENCE.name}.`
  };
}

export function normalizePhone(phone: string, countryName: string) {
  const cleaned = cleanPhoneInput(phone);
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  const digits = cleaned.replace(/\D/g, "").replace(/^0+/, "");
  const dialCode = countryDialCode(countryName);
  if (dialCode === "+") return `+${digits}`;
  return `${dialCode}${digits}`;
}

export function normalizedOptionalPhone(phone: string, countryName: string) {
  const trimmed = phone.trim();
  return trimmed ? normalizePhone(trimmed, countryName) : "";
}

export function imageFileProblem(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 2 MB or smaller.";
  return "";
}

export function imageExtensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function normalizeGroupCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export function groupCodeProblem(code: string) {
  if (code.length < 6) return "Use at least 6 characters for the group code.";
  if (!/[A-Z]/.test(code) || !/[0-9]/.test(code)) return "Use at least one letter and one number in the code.";
  if (/^(.)\1+$/.test(code)) return "Avoid repeated-character codes.";
  return "";
}

export function urlLooksLikePasswordRecovery() {
  if (typeof window === "undefined") return false;
  const urlText = `${window.location.search}${window.location.hash}`.toLowerCase();
  return urlText.includes("type=recovery");
}

export function urlAuthError() {
  if (typeof window === "undefined") return "";
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    search.get("error_description") ||
    hash.get("error_description") ||
    search.get("error") ||
    hash.get("error") ||
    ""
  ).replace(/\+/g, " ");
}

export function createSeedState(): AppState {
  const joinedAt = new Date().toISOString();
  const users: UserProfile[] = [
    {
      id: "user_demo",
      username: "gauranga_das",
      email: "demo@example.com",
      phone: "9999999999",
      passwordHash: hashPassword("HareKrishna108"),
      country: "India",
      timezone: detectTimezone(),
      displayName: "Gauranga Das",
      avatarUrl: "",
      dailyGoal: 16,
      reminderEnabled: false,
      reminderTime: "20:00",
      privacy: defaultProfilePrivacy,
      featuredMilestoneIds: [],
      joinedAt
    },
    {
      id: "user_radha",
      username: "radha_priya",
      email: "radha@example.com",
      phone: "8888888888",
      passwordHash: hashPassword("HareKrishna108"),
      country: "India",
      timezone: "Asia/Kolkata",
      displayName: "Radha Priya",
      avatarUrl: "",
      dailyGoal: 16,
      reminderEnabled: false,
      reminderTime: "20:00",
      privacy: defaultProfilePrivacy,
      featuredMilestoneIds: [],
      joinedAt
    },
    {
      id: "user_madhava",
      username: "madhava108",
      email: "madhava@example.com",
      phone: "7777777777",
      passwordHash: hashPassword("HareKrishna108"),
      country: "United States",
      timezone: "America/New_York",
      displayName: "Madhava 108",
      avatarUrl: "",
      dailyGoal: 16,
      reminderEnabled: false,
      reminderTime: "20:00",
      privacy: defaultProfilePrivacy,
      featuredMilestoneIds: [],
      joinedAt
    }
  ];
  const today = localDateKey(new Date(), detectTimezone());
  const yesterday = addDays(today, -1);
  return {
    users,
    currentUserId: null,
    chantTotals: [
      { userId: "user_demo", localDate: today, rounds: 16, updatedAt: joinedAt },
      { userId: "user_radha", localDate: today, rounds: 24, updatedAt: joinedAt },
      { userId: "user_madhava", localDate: today, rounds: 16, updatedAt: joinedAt },
      { userId: "user_demo", localDate: yesterday, rounds: 12, updatedAt: joinedAt },
      { userId: "user_radha", localDate: yesterday, rounds: 18, updatedAt: joinedAt }
    ],
    groups: [
      {
        id: "group_japa",
        name: "Morning Japa Circle",
        code: "JAPA108",
        ownerId: "user_demo",
        imageUrl: "",
        announcement: "Remember to update today's rounds after japa.",
        targetDaily: 64,
        targetWeekly: 400,
        createdAt: joinedAt
      }
    ],
    groupMembers: [
      { groupId: "group_japa", userId: "user_demo", role: "owner", joinedAt },
      { groupId: "group_japa", userId: "user_radha", role: "member", joinedAt }
    ],
    friendRequests: [
      {
        id: "friend_seed",
        fromUserId: "user_radha",
        toUserId: "user_demo",
        status: "accepted",
        createdAt: joinedAt
      }
    ],
    notifications: []
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createSeedState();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createSeedState();
  try {
    const parsed = JSON.parse(stored) as AppState;
    return {
      ...parsed,
      users: (parsed.users || []).map(withDefaultProfilePrivacy),
      notifications: parsed.notifications || []
    };
  } catch {
    return createSeedState();
  }
}

export function inRange(dateKey: string, start: string, end: string) {
  return dateKey >= start && dateKey <= end;
}

export function sumRounds(totals: ChantTotal[], userId: string, period: LeaderboardPeriod, todayKey: string) {
  const range = periodRange(period, todayKey);
  return sumRoundsInRange(totals, userId, range.start, range.end);
}

export function sumRoundsInRange(totals: ChantTotal[], userId: string, start: string, end: string) {
  return totals
    .filter((total) => total.userId === userId && inRange(total.localDate, start, end))
    .reduce((sum, total) => sum + total.rounds, 0);
}

export function roundsForDate(totals: ChantTotal[], userId: string, dateKey: string) {
  return totals.find((total) => total.userId === userId && total.localDate === dateKey)?.rounds || 0;
}

export function latestUpdateLabel(updatedAt: string) {
  if (!updatedAt) return "";
  return new Date(updatedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function latestChantUpdate(totals: ChantTotal[], userIds: string[], start: string, end: string) {
  const idSet = new Set(userIds);
  return totals
    .filter((total) => idSet.has(total.userId) && inRange(total.localDate, start, end) && total.updatedAt)
    .map((total) => total.updatedAt)
    .sort()
    .at(-1) || "";
}

export function recentChantingHistory(totals: ChantTotal[], userId: string, todayKey: string, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const dateKey = addDays(todayKey, -(days - 1 - index));
    return {
      dateKey,
      rounds: roundsForDate(totals, userId, dateKey)
    };
  });
}

export function currentStreak(totals: ChantTotal[], userId: string, todayKey: string) {
  let cursor = roundsForDate(totals, userId, todayKey) > 0 ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (roundsForDate(totals, userId, cursor) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(totals: ChantTotal[], userId: string) {
  const dates = totals
    .filter((total) => total.userId === userId && total.rounds > 0)
    .map((total) => total.localDate)
    .sort();
  let best = 0;
  let current = 0;
  let previous = "";

  dates.forEach((dateKey) => {
    current = previous && addDays(previous, 1) === dateKey ? current + 1 : 1;
    best = Math.max(best, current);
    previous = dateKey;
  });

  return best;
}

export function daysChantedThisMonth(totals: ChantTotal[], userId: string, todayKey: string) {
  const start = monthStart(todayKey);
  return totals.filter(
    (total) => total.userId === userId && total.rounds > 0 && inRange(total.localDate, start, todayKey)
  ).length;
}

export function computeMilestones(state: AppState, user: UserProfile, todayKey: string): Milestone[] {
  const userTotals = state.chantTotals.filter((total) => total.userId === user.id);
  const positiveEntries = userTotals.filter((total) => total.rounds > 0);
  const totalRounds = sumRounds(state.chantTotals, user.id, "allTime", todayKey);
  const streakBest = bestStreak(state.chantTotals, user.id);
  const joinedGroupCount = state.groupMembers.filter((member) => member.userId === user.id).length;
  const createdGroupCount = state.groups.filter((group) => group.ownerId === user.id).length;
  const friendCount = state.friendRequests.filter(
    (request) =>
      request.status === "accepted" &&
      (request.fromUserId === user.id || request.toUserId === user.id)
  ).length;
  const leaderboardWins = countLeaderboardWins(state, user.id, todayKey);

  return [
    ...makeMilestoneSeries("Chanting", "entry", positiveEntries.length, [1, 7, 30, 90, 180, 365]),
    ...makeMilestoneSeries("Chanting", "rounds", totalRounds, [108, 500, 1008, 5000, 10000, 25000]),
    ...makeMilestoneSeries("Consistency", "streak", streakBest, [3, 7, 14, 30, 60, 108]),
    ...makeMilestoneSeries("Community", "friend", friendCount, [1, 3, 7, 15, 30]),
    ...makeMilestoneSeries("Community", "joined-group", joinedGroupCount, [1, 3, 5, 10]),
    ...makeMilestoneSeries("Community", "created-group", createdGroupCount, [1, 3, 5]),
    ...makeMilestoneSeries("Leaderboards", "daily-first", leaderboardWins.daily, [1, 3, 7, 14, 30]),
    ...makeMilestoneSeries("Leaderboards", "weekly-first", leaderboardWins.weekly, [1, 2, 4, 8, 12]),
    ...makeMilestoneSeries("Leaderboards", "monthly-first", leaderboardWins.monthly, [1, 2, 3, 6])
  ];
}

function makeMilestoneSeries(
  category: Milestone["category"],
  idPrefix: string,
  progress: number,
  targets: number[]
) {
  return targets.map((target) => {
    const title = milestoneTitle(idPrefix, target);
    return makeMilestone(milestoneId(idPrefix, target), category, title, title, progress, target);
  });
}

function milestoneId(idPrefix: string, target: number) {
  const legacyIds: Record<string, string> = {
    "entry-1": "first-entry",
    "streak-7": "seven-day-streak",
    "streak-30": "thirty-day-streak",
    "rounds-108": "rounds-108",
    "rounds-1008": "rounds-1008",
    "joined-group-1": "joined-group",
    "friend-1": "first-friend",
    "created-group-1": "created-group"
  };
  return legacyIds[`${idPrefix}-${target}`] || `${idPrefix}-${target}`;
}

function milestoneTitle(idPrefix: string, target: number) {
  if (idPrefix === "entry") return `${target} active day${target === 1 ? "" : "s"}`;
  if (idPrefix === "rounds") return `${target} total rounds`;
  if (idPrefix === "streak") return `${target}-day streak`;
  if (idPrefix === "friend") return `${target} friend${target === 1 ? "" : "s"}`;
  if (idPrefix === "joined-group") return `${target} joined group${target === 1 ? "" : "s"}`;
  if (idPrefix === "created-group") return `${target} created group${target === 1 ? "" : "s"}`;
  if (idPrefix === "daily-first") return `${target} daily #1${target === 1 ? "" : "s"}`;
  if (idPrefix === "weekly-first") return `${target} weekly #1${target === 1 ? "" : "s"}`;
  return `${target} monthly #1${target === 1 ? "" : "s"}`;
}

export function milestoneDisplayFromId(id: string): Milestone | null {
  const legacyMilestones: Record<string, { prefix: string; target: number }> = {
    "first-entry": { prefix: "entry", target: 1 },
    "seven-day-streak": { prefix: "streak", target: 7 },
    "thirty-day-streak": { prefix: "streak", target: 30 },
    "joined-group": { prefix: "joined-group", target: 1 },
    "first-friend": { prefix: "friend", target: 1 },
    "created-group": { prefix: "created-group", target: 1 }
  };
  const parsed = legacyMilestones[id] || parseMilestoneId(id);
  if (!parsed) return null;
  const category = milestoneCategory(parsed.prefix);
  if (!category) return null;
  const title = milestoneTitle(parsed.prefix, parsed.target);
  return makeMilestone(id, category, title, title, 1, 1);
}

function parseMilestoneId(id: string) {
  const match = id.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], target: Number(match[2]) };
}

function milestoneCategory(prefix: string): Milestone["category"] | null {
  if (prefix === "entry" || prefix === "rounds") return "Chanting";
  if (prefix === "streak") return "Consistency";
  if (prefix === "friend" || prefix === "joined-group" || prefix === "created-group") return "Community";
  if (prefix === "daily-first" || prefix === "weekly-first" || prefix === "monthly-first") return "Leaderboards";
  return null;
}

function countLeaderboardWins(state: AppState, userId: string, todayKey: string) {
  const activeDates = Array.from(new Set(state.chantTotals.map((total) => total.localDate).filter((dateKey) => dateKey <= todayKey))).sort();
  const activeWeeks = Array.from(new Set(activeDates.map(mondayStart))).sort();
  const activeMonths = Array.from(new Set(activeDates.map(monthStart))).sort();

  return {
    daily: activeDates.filter((dateKey) => userIsRankOne(state, userId, dateKey, dateKey)).length,
    weekly: activeWeeks.filter((start) => userIsRankOne(state, userId, start, minDateKey(addDays(start, 6), todayKey))).length,
    monthly: activeMonths.filter((start) => {
      const nextMonth = shiftMonthStart(start, 1);
      return userIsRankOne(state, userId, start, minDateKey(addDays(nextMonth, -1), todayKey));
    }).length
  };
}

function minDateKey(a: string, b: string) {
  return a <= b ? a : b;
}

function userIsRankOne(state: AppState, userId: string, start: string, end: string) {
  const row = rankUsersInRange(state.users, state.chantTotals, start, end).find((item) => item.user.id === userId);
  return Boolean(row && row.rank === 1 && row.rounds > 0);
}

export function buildActivityFeed(state: AppState, currentUserId: string, todayKey: string): ActivityFeedItem[] {
  const currentUser = state.users.find((user) => user.id === currentUserId);
  const items: ActivityFeedItem[] = [];
  const userTotals = state.chantTotals
    .filter((total) => total.userId === currentUserId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestRoundUpdate = userTotals[0]?.updatedAt || currentUser?.joinedAt || new Date().toISOString();
  const todayRounds = roundsForDate(state.chantTotals, currentUserId, todayKey);

  userTotals.forEach((total) => {
    items.push({
      id: `rounds-${total.localDate}`,
      title: total.rounds > 0 ? `Logged ${total.rounds} round${total.rounds === 1 ? "" : "s"}` : "Logged a zero day",
      body:
        total.localDate === todayKey
          ? "Today's chanting total was updated."
          : `${formatDate(total.localDate)} was updated in your chanting history.`,
      at: total.updatedAt,
      tone: total.rounds > 0 ? "peacock" : "stone"
    });
  });

  if (currentUser && todayRounds >= currentUser.dailyGoal && currentUser.dailyGoal > 0) {
    items.push({
      id: `goal-${todayKey}`,
      title: "Daily goal completed",
      body: `You reached your ${currentUser.dailyGoal}-round goal for today.`,
      at: latestRoundUpdate,
      tone: "emerald"
    });
  }

  const streakNow = currentStreak(state.chantTotals, currentUserId, todayKey);
  if (streakNow >= 2) {
    items.push({
      id: `streak-${streakNow}`,
      title: `${streakNow}-day streak`,
      body: "Your recent daily chanting rhythm is continuing.",
      at: latestRoundUpdate,
      tone: "saffron"
    });
  }

  if (currentUser) {
    computeMilestones(state, currentUser, todayKey)
      .filter((milestone) => milestone.earned)
      .forEach((milestone) => {
        items.push({
          id: `milestone-${milestone.id}`,
          title: `Milestone unlocked: ${milestone.title}`,
          body: milestone.description,
          at: milestoneActivityTime(state, currentUserId, milestone.id, latestRoundUpdate),
          tone: "emerald"
        });
      });
  }

  state.groupMembers
    .filter((member) => member.userId === currentUserId)
    .forEach((member) => {
      const group = state.groups.find((item) => item.id === member.groupId);
      items.push({
        id: `group-member-${member.groupId}`,
        title: member.role === "owner" ? "Created a group" : "Joined a group",
        body: `${member.role === "owner" ? "You created" : "You joined"} ${group?.name || "a group"} as ${member.role}.`,
        at: member.joinedAt,
        tone: member.role === "owner" ? "saffron" : "peacock"
      });
    });

  state.friendRequests
    .filter((request) => request.fromUserId === currentUserId || request.toUserId === currentUserId)
    .forEach((request) => {
      const otherUserId = request.fromUserId === currentUserId ? request.toUserId : request.fromUserId;
      const other = state.users.find((user) => user.id === otherUserId);
      const outgoing = request.fromUserId === currentUserId;
      items.push({
        id: `friend-${request.id}`,
        title: request.status === "accepted" ? "Friend connected" : outgoing ? "Friend request sent" : "Friend request received",
        body:
          request.status === "accepted"
            ? `You and @${other?.username || "this user"} are now friends.`
            : outgoing
              ? `Waiting for @${other?.username || "this user"} to accept your request.`
              : `@${other?.username || "Someone"} sent you a friend request.`,
        at: request.createdAt,
        tone: request.status === "accepted" ? "emerald" : "stone"
      });
    });

  if (currentUser) {
    items.push({
      id: "profile-created",
      title: "Account created",
      body: `@${currentUser.username} joined Hare Krishna Leaderboard.`,
      at: currentUser.joinedAt,
      tone: "stone"
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}

function milestoneActivityTime(state: AppState, currentUserId: string, milestoneId: string, fallback: string) {
  if (milestoneId === "joined-group") {
    return state.groupMembers
      .filter((member) => member.userId === currentUserId)
      .map((member) => member.joinedAt)
      .sort()
      .at(0) || fallback;
  }
  if (milestoneId === "created-group") {
    return state.groups
      .filter((group) => group.ownerId === currentUserId)
      .map((group) => group.createdAt)
      .sort()
      .at(0) || fallback;
  }
  if (milestoneId === "first-friend") {
    return state.friendRequests
      .filter(
        (request) =>
          request.status === "accepted" &&
          (request.fromUserId === currentUserId || request.toUserId === currentUserId)
      )
      .map((request) => request.createdAt)
      .sort()
      .at(0) || fallback;
  }
  return fallback;
}

function makeMilestone(
  id: string,
  category: Milestone["category"],
  title: string,
  description: string,
  progress: number,
  target: number
): Milestone {
  return {
    id,
    category,
    title,
    description,
    earned: progress >= target,
    progress: Math.min(progress, target),
    target
  };
}

export function rankUsers(
  users: UserProfile[],
  totals: ChantTotal[],
  period: LeaderboardPeriod,
  todayKey: string
): RankedUser[] {
  const range = periodRange(period, todayKey);
  return rankUsersInRange(users, totals, range.start, range.end);
}

export function rankUsersInRange(
  users: UserProfile[],
  totals: ChantTotal[],
  start: string,
  end: string
): RankedUser[] {
  let previousScore: number | null = null;
  let previousRank = 0;
  return users
    .map((user) => {
      const entries = totals
        .filter((total) => total.userId === user.id && inRange(total.localDate, start, end))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return {
        user,
        rounds: entries.reduce((sum, total) => sum + total.rounds, 0),
        rank: 0,
        hasEntry: entries.length > 0,
        entryCount: entries.length,
        lastEntryDate: entries.map((entry) => entry.localDate).sort().at(-1) || "",
        lastUpdatedAt: entries[0]?.updatedAt || ""
      };
    })
    .sort((a, b) => b.rounds - a.rounds || a.user.username.localeCompare(b.user.username))
    .map((row, index) => {
      const rank = previousScore === row.rounds ? previousRank : index + 1;
      previousScore = row.rounds;
      previousRank = rank;
      return { ...row, rank };
    });
}

export function fromProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email || "",
    phone: row.phone || "",
    passwordHash: "",
    country: row.country || "India",
    timezone: row.timezone || detectTimezone(),
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url || "",
    dailyGoal: row.daily_goal ?? 16,
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderTime: row.reminder_time || "20:00",
    privacy: {
      showCountry: row.show_country ?? true,
      showGroups: row.show_groups ?? true,
      showStreak: row.show_streak ?? true,
      showRecentHistory: row.show_recent_history ?? true,
      showMilestones: row.show_milestones ?? true
    },
    featuredMilestoneIds: Array.isArray(row.featured_milestone_ids) ? row.featured_milestone_ids : [],
    joinedAt: row.joined_at
  };
}

export function fromChantTotalRow(row: ChantTotalRow): ChantTotal {
  return {
    userId: row.user_id,
    localDate: row.local_date,
    rounds: row.rounds,
    updatedAt: row.updated_at
  };
}

export function fromGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerId: row.owner_id,
    imageUrl: row.image_url || "",
    announcement: row.announcement || "",
    targetDaily: row.target_daily || 0,
    targetWeekly: row.target_weekly || 0,
    createdAt: row.created_at
  };
}

export function fromFriendRequestRow(row: FriendRequestRow): FriendRequest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at
  };
}

export function fromNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    tone: row.tone,
    actionTab: row.action_tab || "",
    dedupeKey: row.dedupe_key || "",
    readAt: row.read_at || "",
    createdAt: row.created_at
  };
}
