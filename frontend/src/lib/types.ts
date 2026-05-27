export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "allTime";
export type GroupRole = "owner" | "moderator" | "member";

export type ProfilePrivacy = {
  showCountry: boolean;
  showGroups: boolean;
  showStreak: boolean;
  showRecentHistory: boolean;
  showMilestones: boolean;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  country: string;
  timezone: string;
  displayName: string;
  avatarUrl: string;
  dailyGoal: number;
  reminderEnabled: boolean;
  reminderTime: string;
  privacy: ProfilePrivacy;
  featuredMilestoneIds: string[];
  joinedAt: string;
};

export type ChantTotal = {
  userId: string;
  localDate: string;
  rounds: number;
  updatedAt: string;
};

export type Group = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  imageUrl: string;
  announcement: string;
  targetDaily: number;
  targetWeekly: number;
  createdAt: string;
};

export type GroupMember = {
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  tone: "success" | "info" | "warning";
  actionTab: "home" | "groups" | "friends" | "global" | "activity" | "milestones" | "profile" | "about" | "";
  dedupeKey: string;
  readAt: string;
  createdAt: string;
};

export type AppState = {
  users: UserProfile[];
  chantTotals: ChantTotal[];
  groups: Group[];
  groupMembers: GroupMember[];
  friendRequests: FriendRequest[];
  notifications: AppNotification[];
  currentUserId: string | null;
};
