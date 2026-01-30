import { useTheme } from "./components/theme-provider";
import { ExampleContainer } from "./components/ExampleContainer";
import { Example1 } from "./examples/Example1";
import { Example2 } from "./examples/Example2";
import { Example3 } from "./examples/Example3";

function App() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-16">
        <header className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-muted-foreground">uifork</h1>
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as "light" | "dark" | "system")
            }
            className="text-xs px-2 py-1 rounded border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
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
    </div>
  );
}

export default App;
