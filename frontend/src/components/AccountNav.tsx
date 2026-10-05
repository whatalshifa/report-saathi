"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getMe, type User } from "@/lib/api";

const AUTH_PAGES = ["/login", "/signup"];

export function AccountNav() {
  const onAuthPage = AUTH_PAGES.includes(usePathname());
  return onAuthPage ? null : <SignedInNav />;
}

function SignedInNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;
  if (user === null) {
    return (
      <Link href="/login" className="text-sm font-medium text-teal-700 dark:text-teal-400">
        Sign in
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/family" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        Family
      </Link>
      <Link
        href="/account"
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-900 dark:text-teal-200"
        >
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
      </Link>
    </nav>
  );
}
