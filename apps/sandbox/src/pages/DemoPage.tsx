export function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/30 bg-background">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side: Logo and links */}
            <div className="flex items-center gap-8">
              <div className="w-24 h-6 bg-muted rounded"></div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-4 bg-muted rounded"></div>
                <div className="w-16 h-4 bg-muted rounded"></div>
                <div className="w-16 h-4 bg-muted rounded"></div>
                <div className="w-14 h-4 bg-muted rounded"></div>
              </div>
            </div>
            {/* Right side: Link */}
            <div>
              <div className="w-16 h-4 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="container mx-auto px-6 py-8">
        {/* Wide search bar */}
        <div className="mb-8">
          <div className="w-full h-12 rounded-lg bg-muted"></div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left column */}
          <div className="col-span-8 space-y-6">
            {/* Top card */}
            <div className="h-96 rounded-lg bg-muted"></div>

            {/* Three cards below */}
            <div className="grid grid-cols-3 gap-6">
              <div className="h-48 rounded-lg bg-muted"></div>
              <div className="h-48 rounded-lg bg-muted"></div>
              <div className="h-48 rounded-lg bg-muted"></div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-4 space-y-6">
            {/* Top card */}
            <div className="h-96 rounded-lg bg-muted"></div>

            {/* Three list items below */}
            <div className="space-y-3">
              <div className="h-16 rounded-lg bg-muted"></div>
              <div className="h-16 rounded-lg bg-muted"></div>
              <div className="h-16 rounded-lg bg-muted"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
