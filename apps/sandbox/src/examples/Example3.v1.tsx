import { Card } from "../components/Card";

function Example3() {
  return (
    <Card className="w-[400px] h-[300px]">
      <div className="flex flex-col items-center space-y-4 h-full justify-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
          JD
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-xl text-card-foreground">John Doe</h3>
          <p className="text-muted-foreground text-sm mt-1">Software Engineer</p>
        </div>
        <div className="flex gap-8 pt-4">
          <div className="text-center">
            <div className="text-xl font-semibold text-card-foreground">127</div>
            <div className="text-xs text-muted-foreground mt-1">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-card-foreground">89</div>
            <div className="text-xs text-muted-foreground mt-1">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-card-foreground">42</div>
            <div className="text-xs text-muted-foreground mt-1">Following</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Example3;
