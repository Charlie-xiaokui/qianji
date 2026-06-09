import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "上传" },
  { href: "/review", label: "审核" },
  { href: "/export", label: "导出" },
  { href: "/mock", label: "Mock" }
];

export function AppShell({
  children,
  title,
  description,
  className
}: {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">QianJi Screenshot Importer</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <nav className="hidden items-center gap-1 rounded-md bg-muted p-1 sm:flex">
          {navItems.map((item) => (
            <Link
              className="rounded px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <section className={cn("flex-1 py-5", className)}>{children}</section>
      <nav className="grid grid-cols-4 gap-1 border-t bg-background py-2 sm:hidden">
        {navItems.map((item) => (
          <Link
            className="rounded py-2 text-center text-sm font-medium text-muted-foreground"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
