import { Card } from "../components/Card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

const REVENUE_CATEGORIES = [
  { id: "product", label: "Product Sales", value: "$198,000", color: "bg-green-900" },
  { id: "subscription", label: "Subscriptions", value: "$142,500", color: "bg-green-600" },
  { id: "services", label: "Services", value: "$72,000", color: "bg-green-400" },
  { id: "licensing", label: "Licensing", value: "$37,500", color: "bg-[hsl(95,45%,75%)]" },
] as const;

const BAR_CHART_DATA = [
  { label: "January", values: [25, 18, 12, 10] },
  { label: "February", values: [28, 20, 15, 15] },
  { label: "March", values: [32, 22, 18, 18] },
  { label: "April", values: [26, 21, 14, 11] },
  { label: "May", values: [30, 24, 17, 17] },
  { label: "June", values: [34, 25, 20, 16] },
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
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
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col gap-1.5 pb-6">
              {BAR_CHART_DATA.map((item) => {
                const rowTotal = item.values.reduce((a, b) => a + b, 0);
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer rounded-md -mx-2 px-2 py-0.5 hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}</span>
                        <div className="flex-1 flex items-center gap-1 min-w-0 max-w-[375px]">
                          <div
                            className="h-6 rounded-[6px] overflow-hidden flex min-w-0 shrink-0"
                            style={{ width: `${(rowTotal / maxRowTotal) * 100}%` }}
                          >
                            {item.values.map((value, idx) => (
                              <div
                                key={idx}
                                className={`h-full ${REVENUE_CATEGORIES[idx].color} min-w-[2px] first:rounded-l-[6px] last:rounded-r-[6px] transition-opacity`}
                                style={{
                                  width: `${(value / rowTotal) * 100}%`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground shrink-0">{rowTotal}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={6} className="max-w-xs">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground/80">{item.label}</span>
                        {item.values.map((value, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`inline-block w-2 h-2 rounded-sm shrink-0 ${REVENUE_CATEGORIES[idx].color}`}
                              />
                              {REVENUE_CATEGORIES[idx].label}
                            </span>
                            <span className="text-muted-foreground">${value}K</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-border">
                          <span className="font-medium">Total</span>
                          <span className="font-medium">${rowTotal}K</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
