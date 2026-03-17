import Link from 'next/link';

export function Header(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-foreground transition-colors hover:text-primary sm:text-xl"
        >
          <span className="text-primary" aria-hidden="true">
            📚
          </span>
          <span>LévisBiblio</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Future navigation items can be added here */}
        </div>
      </nav>
    </header>
  );
}
