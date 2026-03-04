import { Card } from "../components/Card";

const BAR_CHART_DATA = [
  { label: "Jan", value: 65 },
  { label: "Feb", value: 78 },
  { label: "Mar", value: 90 },
  { label: "Apr", value: 72 },
  { label: "May", value: 88 },
  { label: "Jun", value: 95 },
];

const TABLE_DATA = [
  { name: "Acme Corp", email: "alice@acme.com", amount: "$12,400", status: "Paid" },
  { name: "Globex Inc", email: "bob@globex.com", amount: "$8,200", status: "Pending" },
  { name: "Initech", email: "carol@initech.com", amount: "$24,100", status: "Paid" },
  { name: "Umbrella Co", email: "dave@umbrella.com", amount: "$5,600", status: "Overdue" },
  { name: "Cyberdyne", email: "eve@cyberdyne.com", amount: "$18,900", status: "Paid" },
];

export function PromptTestPage() {
  const maxBarValue = Math.max(...BAR_CHART_DATA.map((d) => d.value));

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="border-b border-border/50 bg-background">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-foreground hover:text-foreground/80">
              Dashboard
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Payments
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Customers
            </a>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
            aria-label="Account switcher"
          >
            <span className="text-xs font-medium text-muted-foreground">S</span>
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">Welcome back, Sam</h1>
          <p className="mt-1 text-muted-foreground">Here’s what’s happening with your business today.</p>
        </header>

        {/* Top section: Revenue card + Bar chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 flex flex-col gap-6">
            <div>
              <span className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                Total Revenue
                <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs font-medium ml-2">
                  +12.5%
                </span>
              </span>
              <div className="text-6xl font-semibold text-card-foreground">$450,000</div>
            </div>
            <div className="flex flex-row gap-0">
              <div className="flex-1 pr-6">
                <span className="block text-xs mb-1 text-muted-foreground">Active Users</span>
                <span className="block text-lg font-medium text-card-foreground">1,234</span>
              </div>
              <div className="border-l border-border h-auto my-2 shrink-0" />
              <div className="flex-1 pl-6">
                <span className="block text-xs mb-1 text-muted-foreground">Conversion</span>
                <span className="block text-lg font-medium text-card-foreground">3.2%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue by month</h3>
            <div className="flex items-end gap-3 h-28">
              {BAR_CHART_DATA.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end h-24">
                    <div
                      className="w-full bg-primary/80 rounded-t min-h-1"
                      style={{ height: `${(item.value / maxBarValue) * 96}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Table section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent transactions</h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Amount</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_DATA.map((row) => (
                  <tr key={row.email} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                    <td className="px-4 py-3">{row.amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.status === "Paid"
                            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                            : row.status === "Pending"
                              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                              : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
