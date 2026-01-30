import { Card } from "../components/Card";

export function Example1() {
  return (
    <Card className="w-[400px]">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Total Revenue</span>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            +12.5%
          </span>
        </div>
        <div className="text-4xl font-semibold text-card-foreground">
          $45,231
        </div>
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Users</span>
            <span className="text-sm font-medium text-card-foreground">
              1,234
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conversion</span>
            <span className="text-sm font-medium text-card-foreground">
              3.2%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
