import { Card } from "../components/Card";

function Example1() {
  return (
    <Card className="w-[400px] p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="block text-sm text-muted-foreground mb-1 flex items-center gap-2">
            Total Revenue
            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs font-medium ml-2">
              +12.5%
            </span>
          </span>
          <div className="text-6xl font-semibold text-card-foreground">$450,000</div>
        </div>
      </div>
      <div className="flex flex-row gap-0">
        <div className="flex-1 pr-6">
          <span className="block text-xs mb-1 text-muted-foreground">Active Users</span>
          <span className="block text-lg font-medium text-card-foreground">1,234</span>
        </div>
        <div className="border-l border-border h-auto my-2"></div>
        <div className="flex-1 pl-6">
          <span className="block text-xs mb-1 text-muted-foreground">Conversion</span>
          <span className="block text-lg font-medium text-card-foreground">3.2%</span>
        </div>
      </div>
    </Card>
  );
}

export default Example1;
