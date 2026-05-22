"use client";

import { ChantingProvider } from "@/features/chanting/ChantingContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ChantingProvider>{children}</ChantingProvider>;
}
