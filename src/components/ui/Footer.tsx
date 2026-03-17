export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Projet citoyen open source — Indépendant de la Ville de Lévis
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com/poupouproject/levis-biblio"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <span aria-hidden="true">•</span>
            <span>© {new Date().getFullYear()} LévisBiblio</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
