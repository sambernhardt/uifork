import { useTheme } from "./components/theme-provider";
import { ExampleContainer } from "./components/ExampleContainer";
import Example1 from "./examples/Example1";
import Example2 from "./examples/Example2";
import Example3 from "./examples/Example3";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { TooltipProvider } from "./components/ui/tooltip";
import { FakeDevTool } from "./components/FakeDevTool";
import { ChevronDown } from "lucide-react";
import { UIFork } from "uifork";

function App() {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider>
      {import.meta.env.MODE !== "production" && <UIFork />}
      <div className="min-h-screen p-8 pb-24">
        <div className="max-w-4xl mx-auto space-y-16">
          <header className="flex items-center justify-between">
            <h1 className="text-sm font-medium text-muted-foreground">uifork</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground [&_svg:last-child]:h-3 [&_svg:last-child]:w-3 gap-1"
                >
                  {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
                  <ChevronDown className="ml-1 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end" side="bottom">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={theme === "light"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("light");
                    }}
                  >
                    Light
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("dark");
                    }}
                  >
                    Dark
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={theme === "system"}
                    onCheckedChange={(checked) => {
                      if (checked) setTheme("system");
                    }}
                  >
                    System
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Example 1 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 1</h2>
            <ExampleContainer>
              <Example1 />
            </ExampleContainer>
          </div>

          {/* Example 2 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 2</h2>
            <ExampleContainer>
              <Example2 />
            </ExampleContainer>
          </div>

          {/* Example 3 */}
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">Example 3</h2>
            <ExampleContainer>
              <Example3 />
            </ExampleContainer>
          </div>
        </div>

        <FakeDevTool />
      </div>
    </TooltipProvider>
  );
}

export default App;
