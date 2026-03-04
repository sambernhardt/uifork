import { Card } from "../components/Card";

function Example3() {
  return (
    <Card className="w-[400px] h-[300px]">
      <div className="flex h-full gap-6">
        <div className="w-24 h-24 shrink-0 bg-muted rounded-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
          JD
        </div>
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="font-semibold text-xl text-card-foreground">John Doe</h3>
          <p className="text-muted-foreground text-sm mt-0.5">Software Engineer</p>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Projects</span>
              <span className="font-semibold text-card-foreground">127</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Followers</span>
              <span className="font-semibold text-card-foreground">89</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Following</span>
              <span className="font-semibold text-card-foreground">42</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Example3;
