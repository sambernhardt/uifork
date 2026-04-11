import { Card } from "../components/Card";

const REVENUE_CATEGORIES = [
  { id: "product", label: "Product Sales", value: "$198,000", color: "bg-green-900" },
  { id: "subscription", label: "Subscriptions", value: "$142,500", color: "bg-green-600" },
  { id: "services", label: "Services", value: "$72,000", color: "bg-green-400" },
  { id: "licensing", label: "Licensing", value: "$37,500", color: "bg-[hsl(95,45%,75%)]" },
] as const;

const BAR_CHART_DATA = [
  { label: "Jan", values: [25, 18, 12, 10] },
  { label: "Feb", values: [28, 20, 15, 15] },
  { label: "Mar", values: [32, 22, 18, 18] },
  { label: "Apr", values: [26, 21, 14, 11] },
  { label: "May", values: [30, 24, 17, 17] },
  { label: "Jun", values: [34, 25, 20, 16] },
];

export default function PromptTestTopSection() {
  const maxRowTotal = Math.max(
    ...BAR_CHART_DATA.map((d) => d.values.reduce((a, b) => a + b, 0))
  );

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
          <div className="grid grid-cols-2 gap-4">
            {REVENUE_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center gap-3">
                <div
                  className={`w-[3px] shrink-0 rounded-full ${category.color} self-stretch min-h-[2.5rem]`}
                />
                <div>
                  <span className="block text-xs mb-1 text-muted-foreground">
                    {category.label}
                  </span>
                  <span className="block text-lg font-medium text-card-foreground">
                    {category.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 lg:pt-0 lg:pl-6 flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue by month</h3>
          <div className="flex flex-col gap-3 pb-6">
            {BAR_CHART_DATA.map((item) => {
              const rowTotal = item.values.reduce((a, b) => a + b, 0);
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{item.label}</span>
                  <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden flex">
                    {item.values.map((value, idx) => (
                      <div
                        key={idx}
                        className={`h-full ${REVENUE_CATEGORIES[idx].color} min-w-[2px] first:rounded-l-full last:rounded-r-full`}
                        style={{
                          width: `${(value / maxRowTotal) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{rowTotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
