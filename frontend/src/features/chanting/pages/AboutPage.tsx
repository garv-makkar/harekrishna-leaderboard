"use client";

import { Flame, Github, HeartHandshake, Linkedin, Mail, Sparkles, Trophy } from "lucide-react";
import { PageHeader, Panel } from "../ui";

export function AboutPage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Hare Krishna Leaderboard"
        icon={<Flame size={16} />}
        title="A simple place for honest chanting consistency."
        description="Track daily rounds, keep gentle accountability with friends and groups, and make progress visible without making the practice complicated."
      />
      <Panel title="About the website" icon={<Flame size={18} />}>
        <div className="grid gap-3 md:grid-cols-3">
          <AboutTile icon={<Flame size={18} />} title="Daily practice" text="Enter rounds for today or any date since joining." />
          <AboutTile icon={<HeartHandshake size={18} />} title="Friends and groups" text="Build small accountability circles with people you know." />
          <AboutTile icon={<Trophy size={18} />} title="Leaderboards" text="View daily, weekly, and monthly ranking with tied ranks." />
        </div>
      </Panel>
      <Panel title="About the developer" icon={<Sparkles size={18} />}>
        <div className="space-y-4">
          <p className="max-w-3xl text-sm leading-6 text-stone-700 sm:text-base">
            I am Garv Makkar. I started my spirituality journey in 2026 and built this app to keep chanting progress simple, visible, and accountable.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <InfoPill label="College" value="IIIT Delhi" />
            <InfoPill label="Company" value="Oracle" />
            <InfoPill label="Home" value="Delhi" />
            <InfoPill label="Currently" value="Bengaluru" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ContactLink
              icon={<Mail size={17} />}
              label="Email"
              value="garv.makkar03@gmail.com"
              href="mailto:garv.makkar03@gmail.com"
            />
            <ContactLink
              icon={<Linkedin size={17} />}
              label="LinkedIn"
              value="garvmakkar"
              href="https://www.linkedin.com/in/garvmakkar/"
            />
            <ContactLink
              icon={<Github size={17} />}
              label="GitHub"
              value="To be added"
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AboutTile({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-peacock-50 text-peacock-900 ring-1 ring-peacock-100">
        {icon}
      </div>
      <p className="font-black text-stone-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-stone-900">{value}</p>
    </div>
  );
}

function ContactLink({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-saffron-50 text-saffron-900 ring-1 ring-saffron-100">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase text-stone-500">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-black text-stone-900">{value}</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-saffron-200 hover:bg-saffron-50"
    >
      {content}
    </a>
  );
}
