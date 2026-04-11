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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 rounded-2xl flex flex-col gap-6">
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

      <Card className="p-6 rounded-2xl">
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
  );
}
