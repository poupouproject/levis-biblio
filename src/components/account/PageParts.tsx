import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}

interface StatCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'alert' | 'success';
}

const TONES = {
  default: 'text-[#d4a853]',
  alert: 'text-red-600 dark:text-red-400',
  success: 'text-green-600 dark:text-green-400',
} as const;

export function StatCard({
  href,
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
}: StatCardProps): JSX.Element {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md focus:ring-2 focus:ring-[#d4a853] focus:outline-none dark:border-zinc-800 dark:bg-[#1a1a1a] dark:hover:border-zinc-700"
    >
      <span className="flex items-center justify-between text-xs font-semibold tracking-wider text-zinc-500 uppercase">
        <span className="flex items-center gap-1.5">
          <Icon className={`h-4 w-4 ${TONES[tone]}`} aria-hidden />
          {label}
        </span>
        <ChevronRight
          className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-[#d4a853] dark:text-zinc-600"
          aria-hidden
        />
      </span>
      <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{value}</span>
      {detail && <span className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</span>}
    </Link>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
      <Icon className="h-8 w-8 text-zinc-300 dark:text-zinc-600" aria-hidden />
      <p className="font-semibold text-zinc-700 dark:text-zinc-300">{title}</p>
      {children && <div className="text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Card({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-[#1a1a1a]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
          {Icon && <Icon className="h-5 w-5 text-[#d4a853]" aria-hidden />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
