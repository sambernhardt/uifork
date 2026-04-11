import { useState, useRef, useCallback } from "react";
import { Card } from "../components/Card";

const REVENUE_CATEGORIES = [
  { id: "product", label: "Product Sales", value: "$198,000", color: "bg-[#14b8a6]" },
  { id: "subscription", label: "Subscriptions", value: "$142,500", color: "bg-[#6ecddb]" },
  { id: "services", label: "Services", value: "$72,000", color: "bg-[#a78bfa]" },
  { id: "licensing", label: "Licensing", value: "$37,500", color: "bg-[#6366f1]" },
] as const;

const BAR_CHART_DATA = [
  { label: "Jan", values: [25, 18, 12, 10] },
  { label: "Feb", values: [28, 20, 15, 15] },
  { label: "Mar", values: [32, 22, 18, 18] },
  { label: "Apr", values: [26, 21, 14, 11] },
  { label: "May", values: [30, 24, 17, 17] },
  { label: "Jun", values: [34, 25, 20, 16] },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

export default function PromptTestTopSection() {
  const [hoveredMonth, setHoveredMonth] = useState<(typeof BAR_CHART_DATA)[0] | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = chartContainerRef.current;
      if (!container) return;
      const rows = container.querySelectorAll<HTMLDivElement>("[data-month]");
      if (rows.length === 0) return;

      const clientY = e.clientY;

      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          const label = row.getAttribute("data-month");
          const item = BAR_CHART_DATA.find((d) => d.label === label);
          if (item) setHoveredMonth(item);
          return;
        }
      }

      // In a gap between rows – find the closest row
      let closestRow: Element | null = null;
      let minDist = Infinity;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        const distToTop = Math.abs(clientY - rect.top);
        const distToBottom = Math.abs(clientY - rect.bottom);
        const dist = Math.min(distToTop, distToBottom);
        if (dist < minDist) {
          minDist = dist;
          closestRow = row;
        }
      }
      if (closestRow) {
        const label = closestRow.getAttribute("data-month");
        const item = BAR_CHART_DATA.find((d) => d.label === label);
        if (item) setHoveredMonth(item);
      }
    },
    []
  );

  const maxRowTotal = Math.max(
    ...BAR_CHART_DATA.map((d) => d.values.reduce((a, b) => a + b, 0))
  );

  const title = hoveredMonth ? `${hoveredMonth.label} Revenue` : "Total Revenue";
  const totalValue = hoveredMonth
    ? formatCurrency(hoveredMonth.values.reduce((a, b) => a + b, 0) * 1000)
    : "$450,000";
  const categoryValues = hoveredMonth
    ? hoveredMonth.values.map((v) => formatCurrency(v * 1000))
    : REVENUE_CATEGORIES.map((c) => c.value);

  return (
    <Card className="p-6 rounded-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col gap-6 pr-6 lg:border-r lg:border-border">
          <div>
            <span className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {title}
              {!hoveredMonth && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs font-medium ml-2">
                  +12.5%
                </span>
              )}
            </span>
            <div className="text-6xl font-semibold text-card-foreground">{totalValue}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {REVENUE_CATEGORIES.map((category, idx) => (
              <div key={category.id} className="flex items-center gap-3">
                <div
                  className={`w-[3px] shrink-0 rounded-full ${category.color} self-stretch min-h-[2.5rem]`}
                />
                <div>
                  <span className="block text-xs mb-1 text-muted-foreground">
                    {category.label}
                  </span>
                  <span className="block text-lg font-medium text-card-foreground">
                    {categoryValues[idx]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 lg:pt-0 lg:pl-6 flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue by month</h3>
          <div
            ref={chartContainerRef}
            className="flex flex-col gap-3 pb-3"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={() => setHoveredMonth(null)}
          >
            {BAR_CHART_DATA.map((item) => {
              const rowTotal = item.values.reduce((a, b) => a + b, 0);
              const isHovered = hoveredMonth?.label === item.label;
              return (
                <div
                  key={item.label}
                  data-month={item.label}
                  className={`flex items-center gap-3 cursor-pointer rounded-md -mx-2 px-2 py-1 ${
                    isHovered ? "bg-muted/60" : ""
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{item.label}</span>
                  <div className="flex-1 h-6 bg-muted/50 rounded-[6px] overflow-hidden flex min-w-0">
                    {item.values.map((value, idx) => (
                      <div
                        key={idx}
                        className={`h-full ${REVENUE_CATEGORIES[idx].color} min-w-[2px] first:rounded-l-[6px] last:rounded-r-[6px]`}
                        style={{
                          width: `${(value / maxRowTotal) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">${rowTotal}K</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
