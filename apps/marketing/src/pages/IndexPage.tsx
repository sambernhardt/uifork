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

export function IndexPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-16">
        <header className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-muted-foreground">UIFork</h1>
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

        <div className="space-y-16">
          <h1 className="text-4xl font-bold text-foreground">UIFork</h1>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">The value of iteration</h2>
            <p className="text-muted-foreground leading-relaxed">
              I've heard people say that quality work often comes from large amounts of ideas.
              Putting in the effort and time to come up with as many ideas as possible is the
              difference maker. You get past the bad, iterate on the good, and with some feedback
              along the way eventually you find the best.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If that is the case (and I believe it is) then what it means is that your ability to
              iterate is critical in getting to a good solution. Iteration is like a pathfinding
              algorithm, narrowing down dead ends, revealing entirely new routes to explore, and
              ultimately getting you to the solution.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">The power of speed</h2>
            <p className="text-muted-foreground leading-relaxed">
              In my design work, this is a big reason why I invested so heavily in learning keyboard
              shortcuts and using plugins to accelerate my workflow over the years. If I can be
              faster, then I can get to the better idea faster. Quick side bar: in a previous job, I
              would often spin up Figma designs on the spot in the middle of a call to help navigate
              product conversations or get the team aligned. (It's easier to discuss something when
              you have something to point and look at.) That speed brought clarity and that clarity
              pushed the work forward.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Historically, when I used to spend nearly all my day in Figma, my iteration approach
              was like many others: duplicate a frame, make some changes, repeat. I would option +
              drag a frame for hours on end - moving the duplicate to the right or below the
              previous frame. There were 2 things I loved about this approach:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>
                The first was obvious. Duplicating frames was a fast way to iterate on ideas. The
                speed of execution could stay close to the speed of the ideas in my head. New idea,
                option drag, edit. I could stay in{" "}
                <a
                  href="https://lawsofux.com/flow/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  flow
                </a>
                . The difficulty of design should be the problem you're solving, not the tool
                itself.
              </li>
              <li>
                The second was less intentional, though maybe just as valuable. With the habit of
                duplicating a frame to the right or below, it was easy to see how ideas progressed
                over time. I'd often start with the most obvious design ideas and get those on the
                screen. But then immediately I was option + dragging until I had a long meandering
                diagonal line from the top left to the bottom right of the infinite canvas.
                Ultimately, one of the frames would be the winner and would make it on to the next
                round, but the trail of frames gave that winning idea context and it made the
                process more transparent. Critically, it helped answer the questions: how did I get
                here and what else did I consider?
              </li>
            </ul>
            <div
              className="h-48 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground bg-muted/30"
              aria-hidden
            >
              [Illustration of figma infinite canvas with trail of frames]
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">The woes of high fidelity</h2>
            <p className="text-muted-foreground leading-relaxed">
              Figma is an incredible tool, but it has it's limits. Getting actual data into the
              design takes manual entry or plugins, interactivity and application states have to be
              wired up into prototypes, interactivity related to inputs is practically impossible,
              and things like data viz and charting need real data. For these problems, I found code
              to be a more efficient and more rewarding medium for me to operate in. There was a
              little more effort to get things set up, but once things were set up, then the magic
              happened. I could design and prototype things like comboboxes, stateful flows, and
              data viz. I could test design ideas with actual production data, quickly finding edge
              cases. Text inputs were real. Charts had actual data. I was interacting with something
              much closer to what could actually ship.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              However, as code prototypes became more and more of a standard part of my workflow
              over the years, it became clear that iteration was awkward. If you want to tweak an
              idea you're working on, what are your options?
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>Modify the code as is, but then you overwrite your previous idea.</li>
              <li>
                Copy and paste your code/file and use conditional rendering or swap some imports –
                totally doable, but a little slow.
              </li>
              <li>
                Make a new git branch, but now you're juggling multiple branches for a single stream
                of work.
              </li>
              <li>
                Preview branch deployments give you unique URLs associated with specific commits,
                but we've just swapped the branch juggling for URL juggling. Good luck keeping track
                of the difference between those obscure branch links. 🤹
              </li>
            </ul>
            <div
              className="h-48 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground bg-muted/30"
              aria-hidden
            >
              [Illustration of slack message juggling preview links, terminals showing lots of
              branches, code files showing branched logic]
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Code is incredible, but the speed to iterate is nowhere near the speed of option +
              dragging in Figma. Iterating in code takes you out of flow. And once the iterations
              are done, where's the paper trail? How do you tell people how you get there and what
              else you considered?
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Introducing UIFork</h2>
            <p className="text-lg font-medium text-foreground">
              Structured UI iteration for agents and humans.
            </p>
            <ul className="space-y-2 text-muted-foreground leading-relaxed">
              <li>Fork a component.</li>
              <li>Browse versions instantly.</li>
              <li>Deploy all your iterations to a single URL.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
