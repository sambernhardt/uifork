// Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card text-card-foreground rounded-lg border border-border p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// Browser Frame Component
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-white dark:bg-stone-900 rounded-lg border border-border overflow-hidden shadow-lg">
      {/* Browser Header */}
      <div className="h-8 bg-stone-100 dark:bg-stone-800 border-b border-border flex items-center px-3 gap-2">
        {/* Window Controls - Three Dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
        </div>
        {/* Address Bar */}
        <div className="flex-1 mx-4 h-5 bg-white dark:bg-stone-900 border border-border rounded text-[10px] flex items-center px-2 text-muted-foreground">
          localhost:5173
        </div>
      </div>
      {/* Browser Content */}
      <div className="h-[calc(100%-2rem)] overflow-auto">{children}</div>
    </div>
  );
}

// Code Editor Component
function CodeEditor({
  code = `export function HomeContent() {
  return (
    <div className="...">
      <div className="...">Home > Quotes</div>
      <h1 className="...">Overview</h1>
      <div className="...">
        <Card>
          <span className="...">Lead-to-Quote Ratio</span>
          <div className="...">59.8% - 450/752</div>
        </Card>
        <Card>
          <span className="...">Project Load</span>
          <div className="...">12.9% - 129/1K</div>
        </Card>
        <Card>
          <span className="...">Win Probability</span>
          <div className="...">85.1% - 280/329</div>
        </Card>
      </div>
    </div>
  );
}`,
}: {
  code?: string;
}) {
  return (
    <div className="w-full h-full bg-card rounded-lg border border-border overflow-hidden shadow-lg flex flex-col">
      {/* Top Toolbar */}
      <div className="h-8 bg-muted border-b border-border flex items-center px-3">
        {/* Three Dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
        </div>
        {/* Centered App Name */}
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">Cursor</span>
        </div>
        {/* Spacer for balance */}
        <div className="w-12"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer Sidebar */}
        <div className="w-32 bg-muted border-r border-border flex flex-col">
          <div className="flex-1 overflow-auto p-1">
            <div className="space-y-0.5">
              <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">src</div>
              <div className="pl-3 pr-1.5 py-0.5 text-[10px] text-muted-foreground">components</div>
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">Card.tsx</div>
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-foreground bg-accent">
                HomeContent.tsx
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="h-8 bg-muted border-b border-border flex items-end px-2 gap-1">
            <div className="px-2 py-1 bg-card border border-b-0 border-border rounded-t text-[10px] text-card-foreground flex items-center gap-1.5 -mb-px">
              <span>HomeContent.tsx</span>
              <svg
                className="w-3 h-3 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          {/* Editor Content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-[10px] bg-card">
            <pre className="text-foreground">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// Home Content Component
function HomeContent() {
  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="text-[10px] text-muted-foreground mb-2">Home &gt; Quotes</div>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">Overview</h1>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground border border-border rounded px-2 py-1">
                Last 365 days
              </div>
              <button className="text-[10px] text-muted-foreground border border-border rounded px-2 py-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Report Filters
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 border-b border-border flex gap-4">
          <div className="text-[10px] text-muted-foreground py-2">Overview</div>
          <div className="text-[10px] text-card-foreground font-medium py-2 border-b-2 border-blue-600">
            Monitoring
          </div>
          <div className="text-[10px] text-muted-foreground py-2">Audits</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground">Lead-to-Quote Ratio</span>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">59.8% - 450/752</div>
                {/* Bar chart icon - orange, 2 bars filled */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 bg-orange-500 h-3"></div>
                  <div className="w-1 bg-orange-500 h-3"></div>
                  <div className="w-1 bg-stone-300 dark:bg-stone-600 h-2"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground">Project Load</span>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">12.9% - 129/1K</div>
                {/* Bar chart icon - red, 1 bar filled */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 bg-red-500 h-2"></div>
                  <div className="w-1 bg-stone-300 dark:bg-stone-600 h-2"></div>
                  <div className="w-1 bg-stone-300 dark:bg-stone-600 h-2"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground">Win Probability</span>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">85.1% - 280/329</div>
                {/* Bar chart icon - green, all 3 bars filled */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 bg-green-500 h-3"></div>
                  <div className="w-1 bg-green-500 h-3"></div>
                  <div className="w-1 bg-green-500 h-3"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-card-foreground mb-0.5">
                    Inherent risk
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Risk scenarios over time grouped by risk level.
                  </p>
                </div>
                <div className="h-24 bg-muted rounded flex items-end justify-around p-2 gap-1">
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "60%" }}></div>
                  <div className="flex-1 bg-stone-300 rounded-t" style={{ height: "80%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "45%" }}></div>
                  <div className="flex-1 bg-stone-300 rounded-t" style={{ height: "70%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "55%" }}></div>
                  <div className="flex-1 bg-stone-300 rounded-t" style={{ height: "65%" }}></div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-card-foreground mb-0.5">
                    Quote-to-Deal ratio
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Number of quotes compared to total deal size for given month.
                  </p>
                </div>
                <div className="h-24 bg-muted rounded flex items-end justify-around p-2 gap-1">
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "40%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "30%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "50%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "70%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "80%" }}></div>
                  <div className="flex-1 bg-blue-600 rounded-t" style={{ height: "90%" }}></div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Explainer Animation Component
export default function ExplainerAnimation() {
  return (
    <div className="w-full aspect-video bg-muted rounded-lg border border-border p-4 overflow-hidden">
      <div className="w-full h-full grid grid-cols-2 gap-4">
        {/* Left: Code Editor */}
        <div className="h-full">
          <CodeEditor />
        </div>
        {/* Right: Browser Frame with Dashboard */}
        <div className="h-full">
          <BrowserFrame>
            <div className="bg-stone-50 dark:bg-stone-950 min-h-full overflow-auto">
              <div className="scale-75 origin-top-left w-[133.33%] h-[133.33%]">
                <HomeContent />
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>
    </div>
  );
}
