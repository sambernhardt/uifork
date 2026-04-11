import { Card } from "../components/Card";

const BAR_CHART_DATA = [
  { label: "Jan", value: 65 },
  { label: "Feb", value: 78 },
  { label: "Mar", value: 90 },
  { label: "Apr", value: 72 },
  { label: "May", value: 88 },
  { label: "Jun", value: 95 },
];

export default function PromptTestTopSection() {
  const maxBarValue = Math.max(...BAR_CHART_DATA.map((d) => d.value));

  return (
    <Card className="p-6 rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col gap-6 pr-6 lg:border-r lg:border-border">
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
        </div>

        <div className="pt-6 lg:pt-0 lg:pl-6 flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue by month</h3>
          <div className="flex flex-col gap-3">
            {BAR_CHART_DATA.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8 shrink-0">{item.label}</span>
                <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full min-w-1"
                    style={{ width: `${(item.value / maxBarValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
