import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-theme flex flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
