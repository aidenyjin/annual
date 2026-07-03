"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";

type ClassItem = { id: string; name: string };

export function Sidebar({
  classes,
  email,
  logoutAction,
}: {
  classes: ClassItem[];
  email: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={() => setOpen(false)}
        className="px-5 py-5 font-serif text-lg text-foreground"
      >
        Annual
      </Link>

      <nav className="flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Classes
        </p>
        <ul className="flex flex-col gap-1">
          {classes.map((c) => {
            const href = `/dashboard/classes/${c.id}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block truncate rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
          {classes.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">No classes yet</li>
          )}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <p className="truncate px-2 pb-2 text-xs text-muted">{email}</p>
        <form action={logoutAction}>
          <SubmitButton
            variant="ghost"
            pendingText="Logging out…"
            className="w-full justify-start px-2"
          >
            Log out
          </SubmitButton>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="font-serif text-lg text-foreground">
          Annual
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground"
        >
          <MenuIcon />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[#1b1a16]/40 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-background md:flex">
        {content}
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
