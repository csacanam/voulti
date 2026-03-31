"use client"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; Voulti {year} &middot; A <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">Saka Labs</a> product</p>
          <p>Built by <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">Saka Labs</a></p>
        </div>
      </div>
    </footer>
  )
}
