import { useTheme } from "../components/theme-provider";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import FakeMessages from "../components/FakeMessages";
import CyclingContentWheel from "../components/CycleText";
import { Container } from "../components/Container";

const headingClassName = "text-base font-semibold text-foreground tracking-tight";

export function IndexPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen p-8 pb-24">
      <Container className="space-y-16">
        <header className="flex items-center justify-between">
          <div />
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

        <div className="space-y-16 text-sm">
          <div className="flex flex-col gap-0">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">uifork</h1>
            <p className="font-pixel-square text-muted-foreground inline-flex items-center gap-1">
              <span className="inline-block">
                <CyclingContentWheel
                  items={["Structured", "Organized", "Fast", "Embedded", "Deployable"]}
                  radius={14}
                  transitionDuration={500}
                  intervalMs={5000}
                  renderItem={(word: string, distance: number) => (
                    <div style={{ opacity: 1 - distance * 3 }}>{word}</div>
                  )}
                />
              </span>
              iteration for humans and agents.
            </p>
          </div>
        </div>
      </Container>

      {/* Fake messages */}
      <Container className="my-16">
        <FakeMessages />
      </Container>

      <Container className="space-y-16 text-sm">
        <section className="space-y-4">
          <p className="text-muted-foreground leading-relaxed font-pixel-square">
            uifork is a dev tool for iterating on UI designs. Versions are filed-based and can
            easily be spun
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={headingClassName}>Introducing UIFork</h2>
          <p className="text-lg font-medium text-foreground">
            Structured UI iteration for agents and humans.
          </p>
          <ul className="space-y-2 text-muted-foreground leading-relaxed">
            <li>Fork a component.</li>
            <li>Browse versions instantly.</li>
            <li>Deploy all your iterations to a single URL.</li>
          </ul>
        </section>
      </Container>
    </div>
  );
}
