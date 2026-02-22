import FakeMessages from "../components/FakeMessages";
import { Container } from "../components/Container";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

const headingClassName = "text-base font-semibold text-foreground tracking-tight";

export function IndexPage() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <Container>
        <header className="mb-10 flex items-center justify-between">
          <div />
          <ThemeSwitcher />
        </header>

        <div className="text-sm">
          <div className="mb-16 flex flex-col gap-0">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">uifork</h1>
            <p className="font-pixel-square text-muted-foreground">
              Iteration for humans and agents
            </p>
          </div>
        </div>
      </Container>

      {/* Fake messages */}
      {false && (
        <Container className="my-16">
          <FakeMessages />
        </Container>
      )}

      <Container className="m-y-16 text-sm">
        <section>
          <p className="mb-4 text-muted-foreground leading-relaxed">
            A dev tool for quickly iterating on UI. Versions are filed-based and can be easily
            explored while running your app. Deploy all your iterations to a single URL, then
            promote the best one for a clean diff.
          </p>
        </section>

        <section>
          <h2 className={`${headingClassName} mb-4`}>Introducing UIFork</h2>
          <p className="mb-4 text-lg font-medium text-foreground">
            Structured UI iteration for agents and humans.
          </p>
          <ul className="text-muted-foreground leading-relaxed [&>li]:mb-2 [&>li:last-child]:mb-0">
            <li>Fork a component.</li>
            <li>Browse versions instantly.</li>
            <li>Deploy all your iterations to a single URL.</li>
          </ul>
        </section>
      </Container>
    </div>
  );
}
