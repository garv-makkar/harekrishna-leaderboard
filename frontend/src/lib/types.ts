export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "allTime";
export type GroupRole = "owner" | "moderator" | "member";

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

export type ModerationReport = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
};

export type AppState = {
  users: UserProfile[];
  chantTotals: ChantTotal[];
  groups: Group[];
  groupMembers: GroupMember[];
  friendRequests: FriendRequest[];
  moderationReports: ModerationReport[];
  currentUserId: string | null;
};
