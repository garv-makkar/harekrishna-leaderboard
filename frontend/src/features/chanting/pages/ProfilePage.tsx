"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Award, CheckCircle2, Circle, Download, ImageUp, KeyRound, Mail, MapPin, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChanting } from "../ChantingContext";
import {
  countries,
  computeMilestones,
  countryDialCode,
  createSeedState,
  formatDate,
  hashPassword,
  localDayBoundaryText,
  normalizePhone,
  readableError,
  passwordProblem,
  passwordRules,
  timezoneForCountry,
  usernameHelpText,
  usernamePattern
} from "../domain";
import { Field, InlineNotice, MilestoneGrid, Panel, PasswordChecklist, TimezoneSelect } from "../ui";

export function ProfilePage() {
  const {
    state,
    saveState,
    currentUser,
    isBusy,
    runRemote,
    refreshRemoteState,
    showMessage,
    emailVerified,
    profileForm,
    setProfileForm,
    deleteConfirmation,
    setDeleteConfirmation,
    setAuthMode,
    todayKey,
    joinedGroups,
    friends
  } = useChanting();
  const [avatarStatus, setAvatarStatus] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!currentUser) return null;
  const profileCompletionItems = [
    { label: "Profile picture", done: Boolean(currentUser.avatarUrl) },
    { label: "Display name", done: Boolean(currentUser.displayName && currentUser.displayName !== currentUser.username) },
    { label: "Email verified", done: Boolean(emailVerified) },
    { label: "Timezone set", done: Boolean(currentUser.timezone) },
    { label: "Joined a group", done: joinedGroups.length > 0 },
    { label: "Added a friend", done: friends.length > 0 },
    { label: "Logged rounds", done: state.chantTotals.some((total) => total.userId === currentUser.id && total.rounds > 0) }
  ];

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAvatarError("");
    setAvatarStatus("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Profile picture must be 2 MB or smaller.");
      return;
    }

    if (!supabase) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileForm({ ...profileForm, avatarUrl: String(reader.result || "") });
        setAvatarStatus("Profile picture preview ready. Save profile to keep it in demo mode.");
      };
      reader.onerror = () => setAvatarError("Could not read that image.");
      reader.readAsDataURL(file);
      return;
    }

    const client = supabase;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
    const objectPath = `${currentUser.id}/avatar-${Date.now()}.${safeExtension}`;

    await runRemote(async () => {
      setAvatarStatus("Uploading profile picture...");
      const { error } = await client.storage.from("avatars").upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true
      });
      if (error) throw error;
      const { data } = client.storage.from("avatars").getPublicUrl(objectPath);
      setProfileForm({ ...profileForm, avatarUrl: data.publicUrl });
      setAvatarStatus("Profile picture uploaded. Save profile to apply it.");
    }).catch((error: Error) => {
      setAvatarStatus("");
      setAvatarError(readableError(error));
    });
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      showMessage("Type DELETE to confirm account deletion.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Please sign in again before deleting your account.");
        const response = await fetch("/api/delete-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ confirmation: deleteConfirmation })
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Account deletion failed.");
        await client.auth.signOut();
        setDeleteConfirmation("");
        saveState({ ...createSeedState(), currentUserId: null, users: [], chantTotals: [], groups: [], groupMembers: [], friendRequests: [] });
        setAuthMode("signup");
        showMessage("Account deleted.");
      }).catch((error: Error) => showMessage(readableError(error)));
      return;
    }
    saveState({
      ...state,
      currentUserId: null,
      users: state.users.filter((user) => user.id !== currentUser.id),
      chantTotals: state.chantTotals.filter((total) => total.userId !== currentUser.id),
      groups: state.groups.filter((group) => group.ownerId !== currentUser.id),
      groupMembers: state.groupMembers.filter((member) => member.userId !== currentUser.id),
      friendRequests: state.friendRequests.filter(
        (request) => request.fromUserId !== currentUser.id && request.toUserId !== currentUser.id
      )
    });
    setDeleteConfirmation("");
    setAuthMode("signup");
    showMessage("Account deleted.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const profile = {
      username: profileForm.username.trim().toLowerCase(),
      displayName: profileForm.displayName.trim(),
      email: profileForm.email.trim().toLowerCase(),
      phone: profileForm.phone.trim(),
      country: profileForm.country,
      timezone: profileForm.timezone.trim(),
      avatarUrl: profileForm.avatarUrl
    };
    profile.phone = normalizePhone(profile.phone, profile.country);
    const username = profile.username;
    if (!usernamePattern.test(username)) {
      showMessage(`Username must follow this rule: ${usernameHelpText()}`);
      return;
    }
    if (state.users.some((user) => user.id !== currentUser.id && user.username.toLowerCase() === username)) {
      showMessage("That username is already taken.");
      return;
    }
    if (state.users.some((user) => user.id !== currentUser.id && user.email.toLowerCase() === profile.email)) {
      showMessage("That email is already registered.");
      return;
    }
    if (state.users.some((user) => user.id !== currentUser.id && user.phone === profile.phone)) {
      showMessage("That phone number is already registered.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        if (profile.email !== currentUser.email) {
          const { error: authError } = await client.auth.updateUser({ email: profile.email });
          if (authError) throw authError;
        }
        const { error } = await client
          .from("profiles")
          .update({
            username: profile.username,
            email: profile.email,
            phone: profile.phone,
            display_name: profile.displayName,
            country: profile.country,
            timezone: profile.timezone,
            avatar_url: profile.avatarUrl
          })
          .eq("id", currentUser.id);
        if (error) throw error;
        await refreshRemoteState(currentUser.id);
        if (profile.avatarUrl) setAvatarStatus("Profile picture saved. It now appears in the header and Profile tab.");
        showMessage("Profile updated.");
      }).catch((error: Error) => showMessage(readableError(error, "profile")));
      return;
    }
    saveState({
      ...state,
      users: state.users.map((user) =>
        user.id === currentUser.id ? { ...user, ...profile, username } : user
      )
    });
    if (profile.avatarUrl) setAvatarStatus("Profile picture saved. It now appears in the header and Profile tab.");
    showMessage("Profile updated.");
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-saffron-200/80 bg-white/92 shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 lg:p-6">
            {profileForm.avatarUrl ? (
              <img
                src={profileForm.avatarUrl}
                alt=""
                className="h-20 w-20 rounded-lg border border-stone-200 object-cover shadow-sm"
              />
            ) : (
              <div className="lotus-mark grid h-20 w-20 shrink-0 place-items-center rounded-lg text-xl font-black text-white shadow-soft">
                {(profileForm.displayName || profileForm.username || "HK").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-saffron-50 px-3 py-2 text-sm font-black text-saffron-900 ring-1 ring-saffron-100">
                <UserRound size={16} /> @{currentUser.username}
              </div>
              <h2 className="truncate text-2xl font-black tracking-normal text-stone-950">
                {currentUser.displayName || currentUser.username}
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Joined {formatDate(currentUser.joinedAt.slice(0, 10))}. Your public profile uses this name, picture, country, and timezone.
              </p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-saffron-100 bg-saffron-50/70 p-4 sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0">
            <ProfileStatusCard label="Email status" value={emailVerified ? "Verified" : "Unverified"} tone={emailVerified ? "peacock" : "saffron"} />
            <ProfileStatusCard label="Timezone" value={currentUser.timezone} tone="stone" />
          </div>
        </div>
      </section>

      <ProfileCompletionPanel items={profileCompletionItems} />

      <form className="space-y-6" onSubmit={submit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title="Public profile" icon={<UserRound size={18} />}>
            <div className="space-y-4">
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {profileForm.avatarUrl ? (
                      <img
                        src={profileForm.avatarUrl}
                        alt=""
                        className="h-16 w-16 rounded-md border border-stone-200 object-cover"
                      />
                    ) : (
                      <div className="lotus-mark grid h-16 w-16 place-items-center rounded-md text-sm font-black text-white">
                        {(profileForm.displayName || profileForm.username || "HK").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-black text-stone-900">Profile picture</p>
                      <p>Shown in leaderboards, groups, and your profile.</p>
                      {avatarStatus && <p className="mt-1 font-bold text-peacock-900">{avatarStatus}</p>}
                      {avatarError && <p className="mt-1 font-bold text-red-700">{avatarError}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadAvatar}
                    />
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageUp size={18} /> Upload
                    </button>
                    {profileForm.avatarUrl && (
                      <button
                        type="button"
                        className="rounded-md bg-stone-100 px-4 py-3 font-bold text-stone-700"
                        disabled={isBusy}
                        onClick={() => {
                          setProfileForm({ ...profileForm, avatarUrl: "" });
                          setAvatarStatus("Profile picture removed. Save profile to apply it.");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <Field label="Username" value={profileForm.username} onChange={(value) => setProfileForm({ ...profileForm, username: value })} required helper={usernameHelpText()} />
                <Field label="Display name" value={profileForm.displayName} onChange={(value) => setProfileForm({ ...profileForm, displayName: value })} />
              </div>
            </div>
          </Panel>

          <Panel title="Contact and local day" icon={<MapPin size={18} />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email" value={profileForm.email} onChange={(value) => setProfileForm({ ...profileForm, email: value })} type="email" required helper="Changing email may require confirmation before it becomes active." />
              <Field
                label={`Phone (${countryDialCode(profileForm.country)})`}
                value={profileForm.phone}
                onChange={(value) => setProfileForm({ ...profileForm, phone: value })}
                required
                helper={`Use a local number for ${profileForm.country}; saved value will include ${countryDialCode(profileForm.country)}.`}
              />
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                <p className="font-black text-stone-900">Phone preview</p>
                <p>{profileForm.phone.trim() ? normalizePhone(profileForm.phone, profileForm.country) : "Enter a phone number to preview the saved value."}</p>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-stone-700">Country</span>
                <select
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
                  value={profileForm.country}
                  onChange={(event) => {
                    const country = event.target.value;
                    setProfileForm({
                      ...profileForm,
                      country,
                      timezone: timezoneForCountry(country, profileForm.timezone)
                    });
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.name} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <TimezoneSelect country={profileForm.country} value={profileForm.timezone} onChange={(timezone) => setProfileForm({ ...profileForm, timezone })} />
              </div>
              <div className="rounded-md border border-peacock-100 bg-peacock-50 px-4 py-3 text-sm leading-6 text-peacock-900 md:col-span-2">
                {localDayBoundaryText(profileForm.timezone)}
              </div>
            </div>
          </Panel>
        </div>

        <div className="sticky bottom-4 z-10 rounded-lg border border-saffron-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Mail size={16} />
              <span>Profile, contact, and timezone changes save together.</span>
            </div>
            <button className="rounded-md bg-saffron-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-saffron-600" disabled={isBusy}>
              Save profile
            </button>
          </div>
        </div>
      </form>

      <Panel title="Milestones" icon={<Award size={18} />}>
        <MilestoneGrid milestones={computeMilestones(state, currentUser, todayKey)} />
      </Panel>

      <DataPrivacyPanel />

      <ChangePasswordPanel />

      <Panel title="Delete account" icon={<Trash2 size={18} />}>
        <div className="space-y-4">
          <InlineNotice tone="error">
            This permanently deletes your account. Your profile, rounds, group memberships, and friend requests will be removed. Owned groups are also removed.
          </InlineNotice>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
            <p className="font-black">Before deleting</p>
            <p>Make sure this is the account you want to remove: {currentUser.email}</p>
            <p>This cannot be undone from the app.</p>
          </div>
          <Field
            label="Confirmation"
            name="delete-confirmation"
            value={deleteConfirmation}
            onChange={setDeleteConfirmation}
            placeholder="DELETE"
            autoComplete="off"
            helper="Type DELETE exactly to enable account deletion."
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-3 font-bold text-white"
            disabled={isBusy || deleteConfirmation !== "DELETE"}
            onClick={deleteAccount}
          >
            <Trash2 size={18} /> Delete my account
          </button>
        </div>
      </Panel>
    </div>
  );
}

function DataPrivacyPanel() {
  const { state, currentUser, joinedGroups, friends, showMessage } = useChanting();
  if (!currentUser) return null;

  const userGroups = state.groupMembers
    .filter((member) => member.userId === currentUser.id)
    .map((member) => ({
      membership: member,
      group: state.groups.find((group) => group.id === member.groupId) || null
    }));
  const friendConnections = state.friendRequests.filter(
    (request) =>
      request.fromUserId === currentUser.id ||
      request.toUserId === currentUser.id
  );
  const submittedReports = (state.moderationReports || []).filter((report) => report.reporterId === currentUser.id);
  const exportAccountData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        phone: currentUser.phone,
        displayName: currentUser.displayName,
        country: currentUser.country,
        timezone: currentUser.timezone,
        avatarUrl: currentUser.avatarUrl,
        joinedAt: currentUser.joinedAt
      },
      chantingTotals: state.chantTotals
        .filter((total) => total.userId === currentUser.id)
        .sort((a, b) => a.localDate.localeCompare(b.localDate)),
      groups: userGroups,
      friendRequests: friendConnections,
      submittedReports
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hare-krishna-leaderboard-data-${currentUser.username}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMessage("Account data exported.");
  };

  return (
    <Panel title="Data and privacy" icon={<Download size={18} />}>
      <div className="space-y-4">
        <InlineNotice tone="info">
          This export contains your profile, chanting totals, group memberships, friend connections, and reports submitted by you.
        </InlineNotice>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PrivacyMetric label="Rounds entries" value={state.chantTotals.filter((total) => total.userId === currentUser.id).length} />
          <PrivacyMetric label="Groups" value={joinedGroups.length} />
          <PrivacyMetric label="Friends" value={friends.length} />
          <PrivacyMetric label="Reports" value={submittedReports.length} />
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
          <p className="font-black text-stone-900">Stored for your account</p>
          <p>Identity fields: username, email, phone, display name, country, timezone, profile picture URL, and join date.</p>
          <p>App activity: daily round totals, group memberships, friend requests, and moderation reports you submit.</p>
          <p>Passwords are handled by Supabase Auth and are not included in this export.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white"
          onClick={exportAccountData}
        >
          <Download size={18} /> Download my data
        </button>
      </div>
    </Panel>
  );
}

function ProfileCompletionPanel({ items }: { items: { label: string; done: boolean }[] }) {
  const completed = items.filter((item) => item.done).length;
  const percent = Math.round((completed / Math.max(1, items.length)) * 100);
  const nextItem = items.find((item) => !item.done);
  return (
    <Panel title="Profile completeness" icon={<CheckCircle2 size={18} />}>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3">
          <p className="text-sm font-black text-saffron-900">{percent}% complete</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-saffron-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            {nextItem ? `Next: ${nextItem.label}.` : "Everything looks complete."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
                item.done ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-50 text-stone-600"
              }`}
            >
              {item.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function PrivacyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function ProfileStatusCard({ label, value, tone }: { label: string; value: string; tone: "saffron" | "peacock" | "stone" }) {
  const toneClass =
    tone === "peacock"
      ? "border-peacock-100 bg-white text-peacock-900"
      : tone === "saffron"
        ? "border-saffron-200 bg-white text-saffron-900"
        : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`min-w-0 rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-1 truncate font-black">{value}</p>
    </div>
  );
}

function ChangePasswordPanel() {
  const { currentUser, state, saveState, isBusy, runRemote, showMessage } = useChanting();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const rules = passwordRules(newPassword);
  const isPasswordReady = rules.every((rule) => rule.met) && newPassword === confirmPassword;

  if (!currentUser) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");
    const passwordError = passwordProblem(newPassword);
    if (passwordError) {
      setFormError(`New password is not strong enough. ${passwordError}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation do not match.");
      return;
    }
    if (supabase) {
      const client = supabase;
      await runRemote(async () => {
        setFormStatus("Verifying current password...");
        const { error: signinError } = await client.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword
        });
        if (signinError) throw signinError;
        setFormStatus("Saving new password...");
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFormStatus("");
        showMessage("Password changed.");
      }).catch((error: Error) => {
        setFormStatus("");
        setFormError(readableError(error, "signin"));
      });
      return;
    }
    if (currentUser.passwordHash !== hashPassword(currentPassword)) {
      setFormError("Current password is incorrect.");
      return;
    }
    saveState({
      ...state,
      users: state.users.map((user) =>
        user.id === currentUser.id ? { ...user, passwordHash: hashPassword(newPassword) } : user
      )
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showMessage("Password changed.");
  };

  return (
    <Panel title="Change password" icon={<KeyRound size={18} />}>
      <form className="space-y-4" onSubmit={submit}>
        <InlineNotice tone="info">Use this when you are already signed in. Forgot-password remains available on the sign-in screen.</InlineNotice>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Current password" name="current-password" value={currentPassword} onChange={setCurrentPassword} type="password" required autoComplete="current-password" />
          <Field label="New password" name="new-password" value={newPassword} onChange={setNewPassword} type="password" required autoComplete="new-password" />
          <Field label="Confirm new password" name="confirm-new-password" value={confirmPassword} onChange={setConfirmPassword} type="password" required autoComplete="new-password" />
        </div>
        <PasswordChecklist rules={rules} touched={newPassword.length > 0} />
        {confirmPassword && newPassword !== confirmPassword && <InlineNotice tone="error">New password and confirmation do not match.</InlineNotice>}
        <button className="inline-flex items-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white" disabled={isBusy || !isPasswordReady || !currentPassword}>
          <ShieldCheck size={18} /> Change password
        </button>
      </form>
    </Panel>
  );
}
