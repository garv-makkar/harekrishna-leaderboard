"use client";

import { FormEvent, useState } from "react";
import { Flame, Plus, ShieldCheck, Trophy, Users } from "lucide-react";
import { publicSupabaseConfig, runtimeLabel } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { useChanting } from "./ChantingContext";
import {
  countries,
  countryDialCode,
  countryPhoneExample,
  detectTimezone,
  hashPassword,
  isAccountNotFoundError,
  localDayBoundaryText,
  normalizePhone,
  passwordProblem,
  passwordRules,
  readableError,
  timezoneForCountry,
  uid,
  usernameHelpText,
  usernamePattern
} from "./domain";
import { Field, InlineNotice, PasswordChecklist, TimezoneSelect } from "./ui";

function AuthHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-black tracking-normal text-saffron-900">{title}</h2>
      <p className="text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

export function AuthPanel() {
  const { authMode, message } = useChanting();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 sm:px-6 lg:py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-lg border border-saffron-200 bg-white/95 shadow-soft lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1fr)]">
        <section className="relative overflow-hidden bg-saffron-500 p-6 text-white sm:p-8 lg:p-10">
          <div className="relative z-10">
            <div className="lotus-mark mb-4 grid h-12 w-12 place-items-center rounded-lg text-base font-black shadow-soft sm:h-14 sm:w-14 sm:text-lg">
              HK
            </div>
            <h1 className="max-w-md text-3xl font-black tracking-normal lg:text-4xl">Hare Krishna Leaderboard</h1>
            <p className="mt-3 max-w-md leading-7 text-saffron-50 sm:mt-4">
              Track chanting rounds with groups, friends, and global leaderboards.
            </p>
            <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-1">
              <AuthFeature icon={<Flame size={18} />} title="Daily rounds" body="Log today and recent days." />
              <AuthFeature icon={<Users size={18} />} title="Groups" body="Create circles with invite codes." />
              <AuthFeature icon={<Trophy size={18} />} title="Leaderboards" body="View daily, weekly, and monthly rankings." />
            </div>
          </div>
        </section>
        <section className="p-5 sm:p-8 lg:p-10">
          <AuthModeTabs />
          {message && (
            <div className="mb-4 rounded-md border border-peacock-200 bg-peacock-50 px-4 py-3 text-sm font-semibold text-peacock-900">
              {message}
            </div>
          )}
          <ConfigNotice />
          {authMode === "signin" && <SignInForm />}
          {authMode === "signup" && <SignUpForm />}
          {authMode === "otp" && <EmailOtpForm />}
          {authMode === "forgot" && <ForgotForm />}
          {authMode === "newPassword" && <NewPasswordForm />}
          {authMode === "checkEmail" && <CheckEmailScreen />}
          <p className="mt-5 rounded-md border border-stone-100 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-600">
            {supabase
              ? `${runtimeLabel(publicSupabaseConfig.mode)}. Email confirmation, password reset, and OTP use Supabase.`
              : `${runtimeLabel(publicSupabaseConfig.mode)}. Demo login: demo@example.com or gauranga_das, password HareKrishna108. Data is stored in this browser.`}
          </p>
        </section>
      </div>
    </main>
  );
}

function AuthFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/12 p-3 backdrop-blur">
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-md bg-white/18">{icon}</div>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-5 text-saffron-50">{body}</p>
    </div>
  );
}

function ConfigNotice() {
  if (publicSupabaseConfig.mode === "supabase" && publicSupabaseConfig.warnings.length === 0) return null;
  const tone = publicSupabaseConfig.mode === "misconfigured" ? "error" : "info";
  return (
    <div className="mb-4">
      <InlineNotice tone={tone}>
        <div className="space-y-1">
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
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-saffron-100 bg-saffron-50 p-1 sm:grid-cols-4">
      {(["signin", "signup", "forgot", "otp"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-bold capitalize transition ${
            authMode === mode ? "bg-white text-saffron-900 shadow-sm" : "text-stone-600 hover:bg-white/60"
          }`}
          onClick={() => setAuthMode(mode)}
        >
          {mode === "forgot" ? "Reset" : mode === "otp" ? "Email OTP" : mode}
        </button>
      ))}
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
          setFormError("No account found for this username, email, or phone. Please create an account first.");
          setAuthMode("signup");
          showMessage("Create your account first.");
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
        item.email.toLowerCase() === target ||
        item.phone.toLowerCase() === target
    );
    if (!user || user.passwordHash !== hashPassword(password)) {
      setFormError("No matching account found, or the password is incorrect. Please create an account if you are new.");
      setAuthMode("signup");
      return;
    }
    saveState({ ...state, currentUserId: user.id });
    showMessage("Welcome back.");
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <AuthHeader title="Welcome back" body="Sign in with your username, email, or phone number and your password." />
      <InlineNotice tone="info">
        New here? Use Signup first. If your email is not confirmed, open the confirmation email before signing in.
      </InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      <Field label="Username, email, or phone" name="signin-identifier" value={identifier} onChange={setIdentifier} required autoComplete="username" />
      <Field label="Password" name="signin-password" value={password} onChange={setPassword} type="password" required autoComplete="current-password" />
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" disabled={localBusy}>
        <ShieldCheck size={18} /> Sign in
      </button>
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
    country: "India",
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
    const phone = normalizePhone(form.phone, form.country);
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
    if (!phone || phone.length < 6) {
      setFormError("Enter a valid phone number. The country code will be added automatically.");
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
    if (state.users.some((user) => user.phone === phone)) {
      setFormError("That phone number is already registered. Try signing in instead.");
      return;
    }
    if (supabase) {
      const client = supabase;
      setLocalBusy(true);
      try {
        setFormStatus("Checking username, email, and phone...");
        await checkIdentityConflicts(username, email, phone);
        setFormStatus("Creating account in Supabase...");
        const { data, error } = await client.auth.signUp({
          email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username,
              phone,
              country: form.country,
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
      country: form.country,
      timezone: form.timezone || detectTimezone(),
      displayName: username,
      avatarUrl: "",
      joinedAt: new Date().toISOString()
    };
    saveState({ ...state, users: [...state.users, user], currentUserId: user.id });
    showMessage("Account created.");
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <AuthHeader title="Create account" body="Choose a public username, verify your email, and start tracking rounds from your local timezone." />
      <InlineNotice tone="info">After signup, check your inbox for the confirmation email. You will sign in after confirming.</InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
      <Field label="Username" name="signup-username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} required autoComplete="username" placeholder="garv_makkar" helper={`${usernameHelpText()} Do not use your email here.`} />
      <Field label="Email" name="signup-email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" required autoComplete="email" placeholder="you@example.com" />
      <Field
        label={`Phone number (${countryDialCode(form.country)})`}
        name="signup-phone"
        value={form.phone}
        onChange={(value) => setForm({ ...form, phone: value })}
        required
        autoComplete="tel"
        inputMode="tel"
        placeholder={countryPhoneExample(form.country)}
        helper={form.country === "Other" ? "Include your country code, for example +491701234567." : `Enter local number only. We will store it as ${countryDialCode(form.country)} plus your number.`}
      />
      {form.phone.trim() && <InlineNotice tone="info">Phone will be saved as {normalizePhone(form.phone, form.country)}.</InlineNotice>}
      <Field label="Password" name="signup-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} type="password" required autoComplete="new-password" />
      <PasswordChecklist rules={rules} touched={form.password.length > 0} />
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-stone-700">Country</span>
        <select
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-stone-900 shadow-sm outline-none transition focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100"
          value={form.country}
          onChange={(event) => {
            const country = event.target.value;
            setForm({ ...form, country, timezone: timezoneForCountry(country, form.timezone) });
          }}
        >
          {countries.map((country) => (
            <option key={country.name} value={country.name}>{country.name}</option>
          ))}
        </select>
      </label>
      <TimezoneSelect country={form.country} value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })} />
      <InlineNotice tone="info">{localDayBoundaryText(form.timezone)}</InlineNotice>
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" disabled={localBusy || !isPasswordReady}>
        <Plus size={18} /> Create account
      </button>
    </form>
  );
}

function ForgotForm() {
  const { state, saveState, resolveLoginEmail, setPendingAuthNotice, setAuthMode } = useChanting();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const rules = passwordRules(password);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");
    const target = identifier.trim().toLowerCase();
    if (supabase) {
      const client = supabase;
      setLocalBusy(true);
      try {
        setFormStatus("Looking up account...");
        const email = await resolveLoginEmail(target);
        setFormStatus(`Sending password reset email to ${email}...`);
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setFormStatus("");
        setPendingAuthNotice({
          title: "Password reset email sent",
          body: "Open the reset link in your inbox. The app will show a new password form after the link opens.",
          email,
          next: "forgot"
        });
        setAuthMode("checkEmail");
      } catch (error) {
        setFormStatus("");
        setFormError(readableError(error, "reset"));
      } finally {
        setLocalBusy(false);
      }
      return;
    }
    const user = state.users.find(
      (item) =>
        item.username.toLowerCase() === target ||
        item.email.toLowerCase() === target ||
        item.phone.toLowerCase() === target
    );
    if (!user) {
      setFormError("No account found for that identifier. Please create an account first.");
      setAuthMode("signup");
      return;
    }
    const passwordError = passwordProblem(password);
    if (passwordError) {
      setFormError(`Password is not strong enough. ${passwordError}`);
      return;
    }
    saveState({
      ...state,
      users: state.users.map((item) =>
        item.id === user.id ? { ...item, passwordHash: hashPassword(password) } : item
      )
    });
    setAuthMode("signin");
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <AuthHeader title="Reset password" body="Enter your email, username, or phone number. We will send a secure reset link to your email." />
      <InlineNotice tone="info">Keep this tab open until the email arrives. The reset link will bring you back here.</InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
      <Field label="Username, email, or phone" name="reset-identifier" value={identifier} onChange={setIdentifier} required autoComplete="username" />
      {!supabase && (
        <>
          <Field label="New password" name="reset-password" value={password} onChange={setPassword} type="password" required autoComplete="new-password" />
          <PasswordChecklist rules={rules} touched={password.length > 0} />
        </>
      )}
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white" disabled={localBusy}>
        <ShieldCheck size={18} /> {supabase ? "Send reset email" : "Update password"}
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
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white" disabled={localBusy || !isPasswordReady}>
        <ShieldCheck size={18} /> Save new password
      </button>
    </form>
  );
}

function EmailOtpForm() {
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
    <form className="space-y-4" onSubmit={verifyOtp}>
      <AuthHeader title="Email OTP" body="Receive a one-time code by email and use it to sign in without a password." />
      <InlineNotice tone="info">This works for existing confirmed accounts. Do not refresh this page after requesting the code.</InlineNotice>
      {formError && <InlineNotice tone="error">{formError}</InlineNotice>}
      {formStatus && <InlineNotice tone="info">{formStatus}</InlineNotice>}
      {hasSent && <InlineNotice tone="success">Code sent to {email.trim().toLowerCase()}. Keep this tab open and enter the code from your email.</InlineNotice>}
      <Field label="Account email" name="otp-email" value={email} onChange={setEmail} type="email" required autoComplete="email" placeholder="you@example.com" />
      <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" disabled={localBusy} onClick={sendOtp}>
        <ShieldCheck size={18} /> Send email OTP
      </button>
      {hasSent && (
        <>
          <Field label="OTP code" name="otp-code" value={token} onChange={setToken} required autoComplete="one-time-code" inputMode="numeric" placeholder="123456" />
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-peacock-600 px-4 py-3 font-bold text-white" disabled={localBusy || token.trim().length < 6}>
            <ShieldCheck size={18} /> Verify and sign in
          </button>
        </>
      )}
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
        <button type="button" className="rounded-md bg-peacock-600 px-4 py-3 font-bold text-white disabled:bg-peacock-300" disabled={localBusy || !pendingAuthNotice.email} onClick={resendConfirmation}>
          Resend email
        </button>
        <button type="button" className="rounded-md bg-saffron-500 px-4 py-3 font-bold text-white" onClick={() => setAuthMode(pendingAuthNotice.next)}>
          Back
        </button>
        <button type="button" className="rounded-md bg-stone-900 px-4 py-3 font-bold text-white" onClick={() => setAuthMode("signin")}>
          Go to sign in
        </button>
      </div>
    </div>
  );
}
