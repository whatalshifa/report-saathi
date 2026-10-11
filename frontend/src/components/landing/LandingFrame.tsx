"use client";

import type { ReactNode } from "react";

import { OpeningToast } from "@/components/shell/AppShell";
import { ShellProvider } from "@/components/shell/ShellContext";

/**
 * The landing page's live product pieces use the app's own components, which expect the app's shell
 * state: signed out, that is the sample family, and a link into it opens the demo like it does in the app.
 */
export function LandingFrame({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return (
    <ShellProvider signedIn={signedIn}>
      {children}
      <OpeningToast />
    </ShellProvider>
  );
}
