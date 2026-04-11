/** AI CLI integration for UIFork prompt-based editing. */
const { spawn } = require("child_process");

const INSTALL_HINTS = {
  "claude-code": "Install Claude Code: brew install --cask claude-code (or see https://docs.claude.com)",
  cursor: "Install Cursor CLI: curl https://cursor.com/install -fsSL | bash",
};

/**
 * Spawn an AI CLI to edit a file based on a prompt.
 * Returns a promise that resolves with { success, error? }.
 */
function spawnAICLI({ aiTool, filePath, prompt, cwd }) {
  return new Promise((resolve) => {
    let command;
    let args;

    switch (aiTool) {
      case "claude-code":
        command = "claude";
        args = [
          "-p",
          `You are editing a file in a codebase. The target file is: ${filePath}\n\nThe user's request: ${prompt}\n\nBefore making any edits, read the target file and explore any related files you need to understand the context (imports, types, sibling components, etc.). Then make the requested edit.`,
          "--allowedTools",
          "Read,Edit,Grep,Glob,LS",
          // "--append-system-prompt",
          // "Before editing, always read the target file first. If the edit involves types, imports, or references to other files, use Grep and Glob to find and read those related files so you have full context. Be thorough but efficient.",
          "--model",
          "haiku", // Consider switching to "sonnet" for better context-gathering behavior
        ];
        break;

      case "cursor":
        command = "cursor";
        args = [
          "agent",
          "chat",
          `Edit ${filePath}: ${prompt}`,
          "--print",
          "--trust",
          "--model",
          "composer-1.5",
        ];
        break;

      default:
        resolve({ success: false, error: `Unknown AI editing tool: ${aiTool}` });
        return;
    }

    const fullArgsStr = args.join(" ");
    const chatArg = args[2];
    const copyPasteArgs = [...args.slice(0, 2), `"${chatArg.replace(/"/g, '\\"')}"`, ...args.slice(3)].join(" ");
    console.log(`[AI CLI] Spawning ${command} ${fullArgsStr}`);
    console.log(`[AI CLI] Working directory: ${cwd}`);
    console.log(`[AI CLI] Copy-paste to run manually:\n  cd ${cwd}\n  ${command} ${copyPasteArgs}\n`);

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    // Stream stdout to watch server log so user sees AI progress in real time
    child.stdout.on("data", (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on("data", (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        const hint = INSTALL_HINTS[aiTool] || "";
        resolve({
          success: false,
          error: `${command} not found on PATH. ${hint}`,
        });
      } else {
        resolve({ success: false, error: err.message });
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[AI CLI] ${command} completed successfully`);
        resolve({ success: true });
      } else {
        console.error(`[AI CLI] ${command} exited with code ${code}`);
        if (stdout.trim()) {
          console.error(`[AI CLI] ---- stdout ----`);
          console.error(stdout);
          console.error(`[AI CLI] ---- end stdout ----`);
        }
        if (stderr.trim()) {
          console.error(`[AI CLI] ---- stderr ----`);
          console.error(stderr);
          console.error(`[AI CLI] ---- end stderr ----`);
        }
        if (!stdout.trim() && !stderr.trim()) {
          console.error(`[AI CLI] No output captured (stdout and stderr both empty)`);
        }
        const errPreview = stderr || stdout || "(no output)";
        resolve({
          success: false,
          error: `${command} exited with code ${code}: ${errPreview.slice(0, 500)}`,
        });
      }
    });
  });
}

module.exports = { spawnAICLI };
