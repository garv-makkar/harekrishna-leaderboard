"use client";

import { FormEvent, useState } from "react";
import { Plus, ShieldCheck, Users } from "lucide-react";
import { publicSupabaseConfig, runtimeLabel } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { useChanting } from "./ChantingContext";
import {
  defaultProfilePrivacy,
  detectTimezone,
  hashPassword,
  isAccountNotFoundError,
  passwordProblem,
  passwordRules,
  readableError,
  uid,
  usernameHelpText,
  usernamePattern
} from "./domain";
import { Field, InlineNotice, PasswordChecklist } from "./ui";

function AuthHeader({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-lg font-black tracking-normal text-saffron-900 sm:text-xl">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-stone-600">{body}</p>
    </div>
  );
}

export function AuthPanel({ inviteCode = "" }: { inviteCode?: string }) {
  const { authMode, message } = useChanting();

  return (
    <main className="grid min-h-dvh place-items-center px-3 py-2 sm:px-6 sm:py-5">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-saffron-200 bg-white/96 shadow-soft">
        <CompactAuthBrand />
        <section className="p-3 sm:p-4 lg:p-5">
          {inviteCode && <SignedOutInviteNotice inviteCode={inviteCode} />}
          <AuthModeTabs />
          {message && (
            <div className="mb-3 rounded-md border border-peacock-200 bg-peacock-50 px-3 py-2 text-sm font-semibold text-peacock-900">
              {message}
            </div>
          )}
          <ConfigNotice />
          {authMode === "signin" && <SignInForm />}
          {authMode === "signup" && <SignUpForm />}
          {authMode === "newPassword" && <NewPasswordForm />}
          {authMode === "checkEmail" && <CheckEmailScreen />}
          {!supabase && (
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">
              {`${runtimeLabel(publicSupabaseConfig.mode)}. Demo login: demo@example.com or gauranga_das, password HareKrishna108. Data is stored in this browser.`}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function CompactAuthBrand() {
  return (
    <section className="flex items-center gap-3 border-b border-saffron-100 bg-saffron-500 px-3 py-3 text-white sm:px-4">
      <div className="lotus-mark grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black shadow-soft">HK</div>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-black tracking-normal sm:text-xl">Hare Krishna Leaderboard</h1>
        <p className="hidden truncate text-xs font-bold text-saffron-50 sm:block sm:text-sm">Track rounds with groups, friends, and leaderboards.</p>
      </div>
    </section>
  );
}

function SignedOutInviteNotice({ inviteCode }: { inviteCode: string }) {
  const { setAuthMode } = useChanting();
  return (
    <div className="mb-5 rounded-lg border border-peacock-200 bg-peacock-50 p-4 text-peacock-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-peacock-900 ring-1 ring-peacock-100">
            <Users size={16} /> Group invite
          </div>
          <p className="text-lg font-black text-stone-950">You were invited to join a chanting group.</p>
          <p className="mt-1 text-sm leading-6 text-stone-700">
            Sign in or create an account to continue. The group code will be ready on the Groups page.
          </p>
        </div>
        <div className="shrink-0 rounded-md bg-stone-950 px-4 py-3 text-center text-xl font-black tracking-normal text-white">
          {inviteCode}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white"
          onClick={() => setAuthMode("signup")}
        >
          <Plus size={16} /> Create account
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-peacock-900 ring-1 ring-peacock-200"
          onClick={() => setAuthMode("signin")}
        >
          <ShieldCheck size={16} /> Sign in
        </button>
      </div>
    </div>
  );
}

function ConfigNotice() {
  if (publicSupabaseConfig.mode === "supabase") return null;
  const tone = publicSupabaseConfig.mode === "misconfigured" ? "error" : "info";
  return (
    <div className="mb-3">
      <InlineNotice tone={tone}>
        <div>
          <p className="font-black">{runtimeLabel(publicSupabaseConfig.mode)}</p>
          {publicSupabaseConfig.mode === "demo" && (
            <p>Supabase env vars are empty, so the app is using browser-only demo data.</p>
          )}
          {publicSupabaseConfig.issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
          {publicSupabaseConfig.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </InlineNotice>
    </div>
  );
}

function AuthModeTabs() {
  const { authMode, setAuthMode } = useChanting();
  if (authMode === "checkEmail" || authMode === "newPassword") return null;
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-saffron-100 bg-saffron-50 p-1">
      {(["signin", "signup"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-bold capitalize transition ${
            authMode === mode ? "bg-white text-saffron-900 shadow-sm" : "text-stone-600 hover:bg-white/60"
          }`}
          onClick={() => setAuthMode(mode)}
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      ))}
    </div>
  );
}

function CompactField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  inputMode,
  helper
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-stone-700">{label}</span>
      <input
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
      />
      {helper && <span className="mt-1 block text-xs leading-4 text-stone-500">{helper}</span>}
    </label>
  );
}

function CompactPasswordChecklist({
  rules,
  touched
}: {
  rules: { label: string; met: boolean }[];
  touched: boolean;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50/90 px-3 py-2">
      <p className="mb-1.5 text-xs font-black uppercase text-stone-500">Password requirements</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs font-semibold leading-4 ${
              rule.met ? "text-emerald-700" : touched ? "text-red-700" : "text-stone-500"
            }`}
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                rule.met ? "bg-emerald-100" : "bg-stone-200"
              }`}
            >
              {rule.met ? "OK" : "-"}
            </span>
            <span className="min-w-0">{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignInForm() {
  const { state, saveState, resolveLoginEmail, refreshRemoteState, showMessage, setAuthMode } = useChanting();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const target = identifier.trim().toLowerCase();
    if (supabase) {
      const client = supabase;
      setLocalBusy(true);
      try {
        const email = await resolveLoginEmail(target);
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Signin failed.");
        await refreshRemoteState(data.user.id);
        showMessage("Welcome back.");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Signin failed.";
        if (isAccountNotFoundError(messageText)) {
          setFormError("No account found for this username or email. Create an account first, or check the spelling and try again.");
          return;
        }
        setFormError(readableError(error, "signin"));
      } finally {
        setLocalBusy(false);
      }
      return;
    }
    const user = state.users.find(
      (item) =>
        item.username.toLowerCase() === target ||
        item.email.toLowerCase() === target
    );
    if (!user || user.passwordHash !== hashPassword(password)) {
      setFormError("No matching account found, or the password is incorrect. Create an account first if you are new.");
      return;
    }
    saveState({ ...state, currentUserId: user.id });
    showMessage("Welcome back.");
  };

  return (
    <div className="space-y-3">
      <AuthHeader title="Welcome back" body="Use password, or use email OTP if you do not want to enter your password." />
      {formError && (
        <InlineNotice tone="error">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{formError}</span>
            {formError.toLowerCase().includes("create an account") && (
              <button
                type="button"
                className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-black text-red-800 ring-1 ring-red-200"
                onClick={() => setAuthMode("signup")}
              >
                Create account
              </button>
            )}
          </div>
        </InlineNotice>
      )}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <form className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3 shadow-sm" onSubmit={submit}>
          <p className="text-sm font-black text-stone-900">Password</p>
          <CompactField label="Username or email" name="signin-identifier" value={identifier} onChange={setIdentifier} required autoComplete="username" />
          <CompactField label="Password" name="signin-password" value={password} onChange={setPassword} type="password" required autoComplete="current-password" />
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white" disabled={localBusy}>
            <ShieldCheck size={16} /> Sign in with password
          </button>
        </form>
        <EmailOtpSignInSection />
      </div>
    </div>
  );
}

function EmailOtpSignInSection() {
  const { refreshRemoteState, showMessage } = useChanting();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [hasSent, setHasSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const sendOtp = async () => {
    setFormError("");
    setFormStatus("");
    if (!email.includes("@")) {
      setFormError("Enter the email address linked to your account.");
      return;
    }
    if (!supabase) {
      setFormError("Email OTP requires Supabase.");
      return;
    }
    const client = supabase;
    setLocalBusy(true);
    try {
      setFormStatus(`Sending email OTP to ${email.trim().toLowerCase()}...`);
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setFormStatus("");
      setHasSent(true);
    } catch (error) {
      setFormStatus("");
      setFormError(readableError(error, "otp"));
    } finally {
      setLocalBusy(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!supabase) return;
    const client = supabase;
    setLocalBusy(true);
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: "email"
      });
      if (error) throw error;
      if (!data.user) throw new Error("OTP verification failed.");
      await refreshRemoteState(data.user.id);
      showMessage("Signed in with email OTP.");
    } catch (error) {
      setFormError(readableError(error, "otp"));
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <form className="space-y-3 rounded-lg border border-peacock-100 bg-peacock-50/65 p-3 shadow-sm" onSubmit={verifyOtp}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-stone-900">Email OTP</p>
            <p className="mt-0.5 text-xs leading-5 text-stone-600">One-time code for existing confirmed accounts.</p>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-peacock-900 ring-1 ring-peacock-100">OR</span>
        </div>
        {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
        {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
        {hasSent && <InlineNotice tone="success">Code sent to {email.trim().toLowerCase()}. Keep this tab open and enter the code from your email.</InlineNotice>}
        <CompactField label="Account email" name="signin-otp-email" value={email} onChange={setEmail} type="email" required autoComplete="email" placeholder="you@example.com" />
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-peacock-900 ring-1 ring-peacock-200" disabled={localBusy} onClick={sendOtp}>
          <ShieldCheck size={16} /> {localBusy ? "Sending..." : hasSent ? "Send again" : "Send email OTP"}
        </button>
        {hasSent && (
          <>
            <CompactField label="OTP code" name="signin-otp-code" value={token} onChange={setToken} required autoComplete="one-time-code" inputMode="numeric" placeholder="123456" />
            <button className="flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-2.5 text-sm font-black text-white" disabled={localBusy || token.trim().length < 6}>
              <ShieldCheck size={16} /> Verify and sign in
            </button>
          </>
        )}
    </form>
  );
}

function SignUpForm() {
  const { state, saveState, checkIdentityConflicts, refreshRemoteState, showMessage, setAuthMode, setPendingAuthNotice } = useChanting();
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    timezone: detectTimezone()
  });
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const rules = passwordRules(form.password);
  const isPasswordReady = rules.every((rule) => rule.met);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");
    const username = form.username.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const phone = "";
    if (username.includes("@")) {
      setFormError("Username cannot be an email address. Use something like garv_makkar or garv108.");
      return;
    }
    if (!usernamePattern.test(username)) {
      setFormError(`Username must follow this rule: ${usernameHelpText()}`);
      return;
    }
    if (!email || !email.includes("@")) {
      setFormError("Enter your email address in the Email field.");
      return;
    }
    const passwordError = passwordProblem(form.password);
    if (passwordError) {
      setFormError(`Password is not strong enough. ${passwordError}`);
      return;
    }
    if (state.users.some((user) => user.username.toLowerCase() === username)) {
      setFormError("That username is already taken.");
      return;
    }
    if (state.users.some((user) => user.email.toLowerCase() === email)) {
      setFormError("That email is already registered. Try signing in instead.");
      return;
    }
    if (supabase) {
      const client = supabase;
      setLocalBusy(true);
      try {
        setFormStatus("Checking username and email...");
        await checkIdentityConflicts(username, email, phone);
        setFormStatus("Creating account in Supabase...");
        const { data, error } = await client.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username,
              phone: phone || null,
              country: "India",
              timezone: form.timezone || detectTimezone(),
              display_name: username
            }
          }
        });
        if (error) throw error;
        setFormStatus("");
        if (!data.session || !data.user) {
          setPendingAuthNotice({
            title: "Confirm your email",
            body: "We created your account. Open the confirmation email from Supabase, then return here and sign in.",
            email,
            next: "signin"
          });
          setAuthMode("checkEmail");
          return;
        }
        await refreshRemoteState(data.user.id);
        showMessage("Account created.");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Account creation failed.";
        setFormStatus("");
        setFormError(readableError(error, "signup"));
        if (messageText.toLowerCase().includes("already")) showMessage("Account may already exist. Try signing in.");
      } finally {
        setLocalBusy(false);
      }
      return;
    }
    const user: UserProfile = {
      id: uid("user"),
      username,
      email,
      phone,
      passwordHash: hashPassword(form.password),
      country: "India",
      timezone: form.timezone || detectTimezone(),
      displayName: username,
      avatarUrl: "",
      dailyGoal: 16,
      reminderEnabled: false,
      reminderTime: "20:00",
      privacy: defaultProfilePrivacy,
      featuredMilestoneIds: [],
      joinedAt: new Date().toISOString()
    };
    saveState({ ...state, users: [...state.users, user], currentUserId: user.id });
    showMessage("Account created.");
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <AuthHeader title="Create account" body="Email is required. Phone and country can be added later in Profile." />
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3 shadow-sm">
          <CompactField label="Username" name="signup-username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} required autoComplete="username" placeholder="garv_makkar" />
          <CompactField label="Email" name="signup-email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3 shadow-sm">
          <CompactField label="Password" name="signup-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} type="password" required autoComplete="new-password" />
          <CompactPasswordChecklist rules={rules} touched={form.password.length > 0} />
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-black text-white" disabled={localBusy || !isPasswordReady}>
        <Plus size={16} /> Create account
      </button>
    </form>
  );
}

function NewPasswordForm() {
  const { pendingAuthNotice, setPendingAuthNotice, setAuthMode, showMessage } = useChanting();
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const rules = passwordRules(password);
  const isPasswordReady = rules.every((rule) => rule.met);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const passwordError = passwordProblem(password);
    if (passwordError) {
      setFormError(`Password is not strong enough. ${passwordError}`);
      return;
    }
    if (!supabase) return;
    const client = supabase;
    setLocalBusy(true);
    try {
      const { data, error } = await client.auth.updateUser({ password });
      if (error) throw error;
      if (data.user) await client.auth.signOut();
      setPendingAuthNotice({
        title: "Password updated",
        body: "Your password has been changed. Sign in again with the new password.",
        email: pendingAuthNotice.email,
        next: "signin"
      });
      setAuthMode("signin");
      showMessage("Password updated. Sign in again.");
    } catch (error) {
      setFormError(readableError(error, "reset"));
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <AuthHeader title="Set new password" body="Your recovery link was accepted. Create a new password, then sign in again." />
      <InlineNotice tone="info">For safety, you will be signed out after changing the password.</InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      <Field label="New password" name="recovery-new-password" value={password} onChange={setPassword} type="password" required autoComplete="new-password" />
      <PasswordChecklist rules={rules} touched={password.length > 0} />
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-2.5 font-bold text-white" disabled={localBusy || !isPasswordReady}>
        <ShieldCheck size={18} /> Save new password
      </button>
    </form>
  );
}

function CheckEmailScreen() {
  const { pendingAuthNotice, setAuthMode } = useChanting();
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const resendConfirmation = async () => {
    setFormError("");
    setFormStatus("");
    if (!pendingAuthNotice.email) {
      setFormError("No email address is available to resend to. Go back and enter your email again.");
      return;
    }
    if (!supabase) {
      setFormError("Resending confirmation requires Supabase.");
      return;
    }
    setLocalBusy(true);
    try {
      setFormStatus(`Sending confirmation email to ${pendingAuthNotice.email}...`);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingAuthNotice.email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setFormStatus("Confirmation email sent. Check inbox, spam, and promotions.");
    } catch (error) {
      setFormStatus("");
      setFormError(readableError(error, "signup"));
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <InlineNotice tone="success">
        <div className="space-y-2">
          <p className="text-base font-black">{pendingAuthNotice.title || "Check your email"}</p>
          <p>{pendingAuthNotice.body || "Open the email from Supabase to continue."}</p>
          {pendingAuthNotice.email && <p className="font-black">{pendingAuthNotice.email}</p>}
        </div>
      </InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
      <div className="rounded-md border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700">
        <p className="font-bold text-stone-900">Nothing arrived?</p>
        <p>Check spam, promotions, and the email address spelling. Supabase may also rate-limit repeated emails for a short time.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" className="rounded-md bg-peacock-600 px-4 py-2.5 font-bold text-white disabled:bg-peacock-300" disabled={localBusy || !pendingAuthNotice.email} onClick={resendConfirmation}>
          Resend email
        </button>
        <button type="button" className="rounded-md bg-saffron-500 px-4 py-2.5 font-bold text-white" onClick={() => setAuthMode(pendingAuthNotice.next)}>
          Back
        </button>
        <button type="button" className="rounded-md bg-stone-900 px-4 py-2.5 font-bold text-white" onClick={() => setAuthMode("signin")}>
          Go to sign in
        </button>
      </div>
    </div>
  );
}
