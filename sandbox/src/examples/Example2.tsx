import { Card } from "../components/Card";

export function Example2() {
  return (
    <Card className="w-[400px]">
      <div className="space-y-4 h-full flex flex-col">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="john@example.com"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg text-sm transition-colors">
          Send Message
        </button>
      </div>
    </Card>
  );
}
