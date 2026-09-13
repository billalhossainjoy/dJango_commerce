"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { platformAdminNavigation } from "@/components/platform-admin/navigation";
import { cn } from "@/lib/utils";

export function PlatformAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-slate-950 text-white md:block">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">
          P
        </span>
        <div>
          <p className="font-semibold tracking-tight">Platform</p>
          <p className="text-xs text-slate-400">Control center</p>
        </div>
      </div>

      <nav aria-label="Platform administration" className="px-4">
        {platformAdminNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            className={cn(
              "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActivePath(pathname, item.href)
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/platform-admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
