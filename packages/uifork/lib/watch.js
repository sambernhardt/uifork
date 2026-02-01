const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const { exec } = require("child_process");
const { VersionPromoter } = require("./promote");

/**
 * ComponentManager - Manages a single component's versions
 */
class ComponentManager {
  constructor(versionsFilePath, options = {}) {
    this.versionsFile = versionsFilePath;
    this.watchDir = path.dirname(versionsFilePath);
    this.componentName = this.extractComponentName(versionsFilePath);
    this.currentVersionFiles = new Set();
    this.currentVersionKeys = new Set();
    this.pendingDescriptionTransfers = new Map();
    this.previousVersionsData = {};
    this.recentlyHandledKeyChange = false;
    this.lazy = options.lazy || false;
  }

  extractComponentName(versionsFilePath) {
    const basename = path.basename(versionsFilePath, ".versions.ts");
    const ext = path.extname(basename);
    if (ext) {
      return basename.slice(0, -ext.length);
    }
    return basename;
  }

  getVersionFiles() {
    const files = fs.readdirSync(this.watchDir);
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)\\.(tsx?|jsx?)$`);
    const matchedFiles = files
      .filter((file) => {
        const match = file.match(versionPattern);
        return match && fs.statSync(path.join(this.watchDir, file)).isFile();
      })
      .sort((a, b) => {
        const aMatch = a.match(versionPattern);
        const bMatch = b.match(versionPattern);
        const aVersion = this.parseVersionString(aMatch[1]);
        const bVersion = this.parseVersionString(bMatch[1]);
        if (aVersion.major !== bVersion.major) {
          return aVersion.major - bVersion.major;
        }
        return aVersion.minor - bVersion.minor;
      });

    if (matchedFiles.length === 0) {
      console.log(`[${this.componentName}] No version files found in ${this.watchDir}`);
      console.log(`[${this.componentName}] Looking for pattern: ${versionPattern}`);
      console.log(
        `[${this.componentName}] Files in directory: ${
          files.filter((f) => f.includes(this.componentName)).join(", ") ||
          "(none with component name)"
        }`,
      );
    }

    return matchedFiles;
  }

  getVersionKeys() {
    const versionFiles = this.getVersionFiles();
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    return versionFiles
      .map((file) => {
        const match = file.match(versionPattern);
        return match ? `v${match[1]}` : null;
      })
      .filter(Boolean);
  }

  parseVersionString(versionStr) {
    const parts = versionStr.split("_");
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1] || "0"),
    };
  }

  versionToId(versionStr) {
    return `v${versionStr.replace(/_/g, ".")}`;
  }

  versionToImportSuffix(versionStr) {
    return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`;
  }

  generateImportName(fileName) {
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    const match = fileName.match(versionPattern);
    if (!match) return null;
    const versionStr = match[1];
    return `${this.componentName}${this.versionToImportSuffix(versionStr)}`;
  }

  generateVersionKey(fileName) {
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    const match = fileName.match(versionPattern);
    if (!match) return null;
    return `v${match[1]}`;
  }

  versionKeyToFileVersion(versionKey) {
    return versionKey.replace(/^v/, "");
  }

  fileVersionToVersionKey(fileVersion) {
    return `v${fileVersion}`;
  }

  detectFileExtension(versionKey) {
    const fileVersion = this.versionKeyToFileVersion(versionKey);
    const extensions = [".tsx", ".ts", ".jsx", ".js"];
    for (const ext of extensions) {
      const filePath = path.join(this.watchDir, `${this.componentName}.v${fileVersion}${ext}`);
      if (fs.existsSync(filePath)) {
        return ext;
      }
    }
    return ".tsx";
  }

  getVersionFilePath(versionKey) {
    const fileVersion = this.versionKeyToFileVersion(versionKey);
    const extension = this.detectFileExtension(versionKey);
    return path.join(this.watchDir, `${this.componentName}.v${fileVersion}${extension}`);
  }

  getNextVersionNumber() {
    const versionFiles = this.getVersionFiles();
    if (versionFiles.length === 0) {
      return { major: 1, minor: 0 };
    }

    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    let maxMajor = 0;
    let maxMinor = 0;

    versionFiles.forEach((file) => {
      const match = file.match(versionPattern);
      if (match) {
        const version = this.parseVersionString(match[1]);
        if (version.major > maxMajor) {
          maxMajor = version.major;
          maxMinor = version.minor;
        } else if (version.major === maxMajor && version.minor > maxMinor) {
          maxMinor = version.minor;
        }
      }
    });

    return { major: maxMajor + 1, minor: 0 };
  }

  getMostCommonExtension() {
    const versionFiles = this.getVersionFiles();
    if (versionFiles.length === 0) {
      return ".tsx";
    }

    const extensions = {};
    versionFiles.forEach((file) => {
      const ext = path.extname(file);
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    return Object.keys(extensions).reduce((a, b) => (extensions[a] > extensions[b] ? a : b));
  }

  versionNumberToKey(versionNumber) {
    if (versionNumber.minor === 0) {
      return `v${versionNumber.major}`;
    }
    return `v${versionNumber.major}_${versionNumber.minor}`;
  }

  validateVersionKey(versionKey) {
    return /^v\d+(_\d+)?$/.test(versionKey);
  }

  parseVersionsFile() {
    try {
      const content = fs.readFileSync(this.versionsFile, "utf8");
      const versionsMatch = content.match(/export const VERSIONS = \{([\s\S]*)\}/);
      if (!versionsMatch) return { keys: new Set(), versions: {} };

      const versionsContent = versionsMatch[1];
      const versionBlocks = this.extractVersionBlocks(versionsContent);

      const keys = new Set(Object.keys(versionBlocks));
      return { keys, versions: versionBlocks };
    } catch {
      return { keys: new Set(), versions: {} };
    }
  }

  extractVersionBlocks(versionsContent) {
    const versions = {};
    const lines = versionsContent.split("\n");
    let currentKey = null;
    let currentBlock = [];
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      const keyMatch = trimmed.match(/^["']?(v[^"':s]*)["']?\s*:\s*\{/);
      if (keyMatch) {
        if (currentKey && currentBlock.length > 0) {
          versions[currentKey] = this.parseVersionBlock(currentBlock.join("\n"));
        }
        currentKey = keyMatch[1];
        currentBlock = [line];
        braceDepth = 1;
        continue;
      }

      if (currentKey) {
        currentBlock.push(line);
        for (const char of trimmed) {
          if (char === "{") braceDepth++;
          if (char === "}") braceDepth--;
        }
        if (braceDepth === 0) {
          versions[currentKey] = this.parseVersionBlock(currentBlock.join("\n"));
          currentKey = null;
          currentBlock = [];
        }
      }
    }

    if (currentKey && currentBlock.length > 0) {
      versions[currentKey] = this.parseVersionBlock(currentBlock.join("\n"));
    }

    return versions;
  }

  parseVersionBlock(blockContent) {
    const version = {};
    const renderMatch = blockContent.match(/render:\s*([^,\n}]+)/);
    if (renderMatch) {
      version.render = renderMatch[1].trim();
    }
    const labelMatch = blockContent.match(/label:\s*["']([^"']*)["']/);
    if (labelMatch) {
      version.label = labelMatch[1];
    }
    const descriptionMatch = blockContent.match(/description:\s*["']([^"']*)["']/);
    if (descriptionMatch) {
      version.description = descriptionMatch[1];
    }
    return version;
  }

  generateVersionsFile() {
    const versionFiles = this.getVersionFiles();

    this.currentVersionFiles = new Set(versionFiles);
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    this.currentVersionKeys = new Set(
      versionFiles
        .map((file) => {
          const match = file.match(versionPattern);
          return match ? `v${match[1]}` : null;
        })
        .filter(Boolean),
    );

    if (versionFiles.length === 0) {
      console.log(`[${this.componentName}] No version files found`);
      return;
    }

    const existingVersions = this.parseVersionsFile().versions;

    const versions = versionFiles
      .map((file) => {
        const key = this.generateVersionKey(file);

        let existingVersion = existingVersions[key] || {};

        if (this.pendingDescriptionTransfers.has(key)) {
          const sourceKey = this.pendingDescriptionTransfers.get(key);
          const sourceVersion =
            this.previousVersionsData[sourceKey] || existingVersions[sourceKey] || {};
          existingVersion = {
            ...existingVersion,
            description: sourceVersion.description,
            label: sourceVersion.label,
          };
          this.pendingDescriptionTransfers.delete(key);
          console.log(`  Transferred description from ${sourceKey} to ${key}`);
        }

        const label = existingVersion.label || "";
        const description = existingVersion.description;

        const renderValue = this.lazy
          ? this.generateImportName(file)
          : this.generateImportName(file);

        let versionBlock = `  "${key}": {
    render: ${renderValue},
    label: "${label}",`;

        if (description) {
          versionBlock += `
    description: "${description}",`;
        }

        versionBlock += `
  }`;

        return versionBlock;
      })
      .join(",\n");

    // Generate imports - lazy mode uses React.lazy(), non-lazy uses regular imports
    let imports = "";
    if (this.lazy) {
      const lazyImports = versionFiles
        .map((file) => {
          const importName = this.generateImportName(file);
          const filePath = `./${file.replace(/\.(tsx?|jsx?)$/, "")}`;
          return `const ${importName} = lazy(() => import("${filePath}"));`;
        })
        .join("\n");
      imports = `import { lazy } from 'react';\n\n// Lazy load components\n${lazyImports}`;
    } else {
      imports = versionFiles
        .map((file) => {
          const importName = this.generateImportName(file);
          const filePath = `./${file.replace(/\.(tsx?|jsx?)$/, "")}`;
          return `import ${importName} from "${filePath}"`;
        })
        .join("\n");
    }

    const content = `/**
 * THIS FILE IS GENERATED by uifork.
 * Manual edits to labels/descriptions are preserved, but structure changes may be overwritten.
 * To stop versioning this component, run: npx uifork promote ${this.componentName} <version-id>
 */
${imports ? imports + "\n" : ""}export const VERSIONS = {
${versions},
}
`;

    fs.writeFileSync(this.versionsFile, content, "utf8");
    console.log(
      `[${this.componentName}] Generated versions file with ${versionFiles.length} versions`,
    );
  }

  updatePreviousVersionsData() {
    const parsed = this.parseVersionsFile();
    this.previousVersionsData = { ...parsed.versions };
  }

  handleFileRename() {
    if (this.recentlyHandledKeyChange) {
      return false;
    }

    const currentFiles = this.getVersionFiles();
    const currentSet = new Set(currentFiles);
    const previousSet = this.currentVersionFiles;

    const added = currentFiles.filter((file) => !previousSet.has(file));
    const removed = Array.from(previousSet).filter((file) => !currentSet.has(file));

    if (added.length > 0 || removed.length > 0) {
      console.log(`[${this.componentName}] File rename detected:`);
      if (removed.length > 0) console.log(`  Removed: ${removed.join(", ")}`);
      if (added.length > 0) console.log(`  Added: ${added.join(", ")}`);

      if (removed.length === 1 && added.length === 1) {
        const oldFile = removed[0];
        const newFile = added[0];
        const oldMatch = oldFile.match(new RegExp(`^${this.componentName}\\.v([\\d_]+)`));
        const newMatch = newFile.match(new RegExp(`^${this.componentName}\\.v([\\d_]+)`));
        if (oldMatch && newMatch) {
          const oldKey = `v${oldMatch[1]}`;
          const newKey = `v${newMatch[1]}`;
          this.pendingDescriptionTransfers.set(newKey, oldKey);
          console.log(`  Marking description transfer: ${oldKey} → ${newKey}`);
        }
      }

      this.generateVersionsFile();
      this.updatePreviousVersionsData();
      return true;
    }
    return false;
  }

  handleVersionsKeyChange() {
    const parsed = this.parseVersionsFile();
    const currentKeys = parsed.keys;
    const previousKeys = this.currentVersionKeys;

    const added = Array.from(currentKeys).filter((key) => !previousKeys.has(key));
    const removed = Array.from(previousKeys).filter((key) => !currentKeys.has(key));

    if (added.length > 0 || removed.length > 0) {
      console.log(`[${this.componentName}] VERSIONS key change detected:`);
      if (removed.length > 0) console.log(`  Removed keys: ${removed.join(", ")}`);
      if (added.length > 0) console.log(`  Added keys: ${added.join(", ")}`);

      if (removed.length === 1 && added.length === 1) {
        const oldKey = removed[0];
        const newKey = added[0];

        const oldVersion = oldKey.replace(/^v/, "");
        const newVersion = newKey.replace(/^v/, "");
        const oldFileName = `${this.componentName}.v${oldVersion}.tsx`;
        const newFileName = `${this.componentName}.v${newVersion}.tsx`;

        const oldFilePath = path.join(this.watchDir, oldFileName);
        const newFilePath = path.join(this.watchDir, newFileName);

        if (fs.existsSync(oldFilePath)) {
          console.log(`Renaming file: ${oldFileName} → ${newFileName}`);

          fs.renameSync(oldFilePath, newFilePath);

          this.currentVersionKeys = currentKeys;
          this.updatePreviousVersionsData();

          this.recentlyHandledKeyChange = true;
          setTimeout(() => {
            this.recentlyHandledKeyChange = false;
          }, 500);

          return true;
        }
      }

      this.currentVersionKeys = currentKeys;
      this.updatePreviousVersionsData();
      return true;
    }
    return false;
  }
}

/**
 * VersionSync - Main class that manages multiple components
 */
class VersionSync {
  constructor(watchPath, options = {}) {
    this.watchPath = watchPath ? path.resolve(watchPath) : process.cwd();
    this.components = new Map(); // Map<componentName, ComponentManager>
    this.wsClients = new Set();
    this.server = null;
    this.wss = null;
    this.lazy = options.lazy || false;

    // Discover all components
    this.discoverComponents();

    if (this.components.size === 0) {
      console.log("No versioned components found in the project.");
      console.log("Run 'npx uifork init <component-path>' to create one.");
    } else {
      console.log(`\nFound ${this.components.size} versioned component(s):`);
      for (const [name, manager] of this.components) {
        console.log(`  - ${name} (${manager.getVersionKeys().length} versions)`);
      }
    }

    // Initialize all components
    for (const manager of this.components.values()) {
      manager.generateVersionsFile();
      manager.updatePreviousVersionsData();
    }

    this.startServer();
    this.startWatching();
  }

  discoverComponents() {
    console.log(`Searching for versioned components in: ${this.watchPath}`);
    const versionsFiles = this.findAllVersionsFiles(this.watchPath);

    for (const versionsFile of versionsFiles) {
      const manager = new ComponentManager(versionsFile, { lazy: this.lazy });
      this.components.set(manager.componentName, manager);
    }
  }

  findAllVersionsFiles(dir, depth = 0) {
    const results = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile() && entry.name.endsWith(".versions.ts")) {
          console.log(`  Found versions file: ${fullPath}`);
          results.push(fullPath);
        } else if (entry.isDirectory()) {
          // Skip node_modules, .git, and other hidden directories
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            results.push(...this.findAllVersionsFiles(fullPath, depth + 1));
          }
        }
      }
    } catch (error) {
      console.warn(`  Warning: Could not read directory ${dir}: ${error.message}`);
    }

    return results;
  }

  getComponent(componentName) {
    return this.components.get(componentName);
  }

  getComponentsInfo() {
    const componentsInfo = [];
    for (const [name, manager] of this.components) {
      componentsInfo.push({
        name,
        path: manager.versionsFile,
        versions: manager.getVersionKeys(),
      });
    }
    return componentsInfo;
  }

  startServer() {
    const app = express();
    const port = process.env.PORT || 3001;

    app.use(cors());
    app.use(express.json());

    // GET /components - List all discovered components
    app.get("/components", (req, res) => {
      const componentsInfo = this.getComponentsInfo();
      console.log(`[Server] GET /components - returning ${componentsInfo.length} components:`);
      componentsInfo.forEach((c) => {
        console.log(
          `  - ${c.name}: ${c.versions.length} versions (${c.versions.join(", ") || "none"})`,
        );
      });
      res.json({
        components: componentsInfo,
      });
    });

    // POST /open-in-editor - Open version file in editor
    app.post("/open-in-editor", (req, res) => {
      const { version, component, editor: editorPreference } = req.body;

      try {
        if (!component) {
          return res.status(400).json({
            error: "Missing component parameter",
          });
        }

        const manager = this.getComponent(component);
        if (!manager) {
          return res.status(404).json({
            error: `Component not found: ${component}`,
          });
        }

        if (!version) {
          return res.status(400).json({
            error: "Missing version parameter",
          });
        }

        if (!manager.validateVersionKey(version)) {
          return res.status(400).json({
            error: `Invalid version format: ${version}`,
          });
        }

        const filePath = manager.getVersionFilePath(version);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            error: `Version file not found: ${version}`,
          });
        }

        // Map editor preference to CLI command
        // "vscode" -> "code", "cursor" -> "cursor"
        let editorCommand;
        if (editorPreference === "vscode") {
          editorCommand = "code";
        } else if (editorPreference === "cursor") {
          editorCommand = "cursor";
        } else {
          // Fallback to environment variable or default
          editorCommand = process.env.EDITOR || "cursor";
        }

        exec(`${editorCommand} "${filePath}"`, (error) => {
          if (error) {
            console.error(`[Server] Error opening file: ${error.message}`);
            exec(`open "${filePath}"`, (openError) => {
              if (openError) {
                console.error(`[Server] Error opening with system default: ${openError.message}`);
                return res.status(500).json({
                  error: "Failed to open file in editor",
                });
              }
              res.json({ success: true, filePath });
            });
          } else {
            console.log(`[Server] Opened ${filePath} in editor`);
            res.json({ success: true, filePath });
          }
        });
      } catch (error) {
        console.error(`[Server] Open in editor error: ${error.message}`);
        res.status(500).json({
          error: error.message,
        });
      }
    });

    this.server = http.createServer(app);
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on("connection", (ws) => {
      this.wsClients.add(ws);
      console.log(`[WebSocket] Client connected (${this.wsClients.size} total)`);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: { message: "Connected to uifork watch server" },
        }),
      );

      // Send components data immediately on connection
      this.sendComponents(ws);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              payload: { message: "Invalid message format" },
            }),
          );
        }
      });

      ws.on("close", () => {
        this.wsClients.delete(ws);
        console.log(`[WebSocket] Client disconnected (${this.wsClients.size} total)`);
      });

      ws.on("error", (error) => {
        console.error("[WebSocket] Error:", error);
        this.wsClients.delete(ws);
      });
    });

    this.server.listen(port, () => {
      console.log(`\n[Server] Express server running on http://localhost:${port}`);
      console.log(`[Server] WebSocket server running on ws://localhost:${port}/ws`);
    });
  }

  handleWebSocketMessage(ws, data) {
    const { type, payload } = data;
    const componentName = payload?.component;

    // Validate component for operations that need it
    if (["duplicate_version", "delete_version", "new_version", "rename_version", "rename_label"].includes(type)) {
      if (!componentName) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Missing component parameter" },
          }),
        );
        return;
      }

      const manager = this.getComponent(componentName);
      if (!manager) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: `Component not found: ${componentName}` },
          }),
        );
        return;
      }
    }

    switch (type) {
      case "duplicate_version":
        this.handleDuplicateVersion(ws, payload);
        break;
      case "delete_version":
        this.handleDeleteVersion(ws, payload);
        break;
      case "new_version":
        this.handleNewVersion(ws, payload);
        break;
      case "rename_version":
        this.handleRenameVersion(ws, payload);
        break;
      case "rename_label":
        this.handleRenameLabel(ws, payload);
        break;
      case "promote_version":
        this.handlePromoteVersion(ws, payload);
        break;
      default:
        console.warn(`[WebSocket] Unknown message type: ${type}`);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: `Unknown message type: ${type}` },
          }),
        );
    }
  }

  handleDuplicateVersion(ws, payload) {
    const { version, newVersion, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (!manager.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      const sourceFilePath = manager.getVersionFilePath(version);
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source version file not found: ${version}`);
      }

      let targetVersion;
      if (newVersion) {
        if (!manager.validateVersionKey(newVersion)) {
          throw new Error(`Invalid target version format: ${newVersion}`);
        }
        targetVersion = newVersion;
      } else {
        const nextVersionNum = manager.getNextVersionNumber();
        targetVersion = manager.versionNumberToKey(nextVersionNum);
      }

      const targetFilePath = manager.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Target version already exists: ${targetVersion}`);
      }

      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");
      const extension = path.extname(sourceFilePath);
      const fileVersion = manager.versionKeyToFileVersion(targetVersion);
      const finalTargetPath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${fileVersion}${extension}`,
      );

      fs.writeFileSync(finalTargetPath, sourceContent, "utf8");

      console.log(`[WebSocket] Duplicate version: ${version} → ${targetVersion}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);
      console.log(`  Source: ${path.basename(sourceFilePath)}`);
      console.log(`  Target: ${path.basename(finalTargetPath)}`);

      manager.generateVersionsFile();
      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully duplicated ${version} → ${targetVersion}`,
            version: targetVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Duplicate version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleDeleteVersion(ws, payload) {
    const { version, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (!manager.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      const filePath = manager.getVersionFilePath(version);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Version file not found: ${version}`);
      }

      const versionFiles = manager.getVersionFiles();
      if (versionFiles.length === 1) {
        throw new Error(
          "Cannot delete the last remaining version. At least one version must exist.",
        );
      }

      fs.unlinkSync(filePath);

      console.log(`[WebSocket] Delete version: ${version}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);
      console.log(`  Deleted: ${path.basename(filePath)}`);

      manager.generateVersionsFile();
      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully deleted version ${version}`,
            version: version,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Delete version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleNewVersion(ws, payload) {
    const { version, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      let targetVersion;
      if (version) {
        if (!manager.validateVersionKey(version)) {
          throw new Error(`Invalid version format: ${version}`);
        }
        targetVersion = version;
      } else {
        const nextVersionNum = manager.getNextVersionNumber();
        targetVersion = manager.versionNumberToKey(nextVersionNum);
      }

      const targetFilePath = manager.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Version already exists: ${targetVersion}`);
      }

      const extension = manager.getMostCommonExtension();
      const fileVersion = manager.versionKeyToFileVersion(targetVersion);
      const finalFilePath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${fileVersion}${extension}`,
      );

      const displayVersion = targetVersion.replace(/^v/, "").replace(/_/g, ".").toUpperCase();

      const importSuffix = manager.versionToImportSuffix(fileVersion);
      const componentName = `${manager.componentName}${importSuffix}`;

      let templateContent;
      if (extension === ".tsx" || extension === ".jsx") {
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return (
    <div>
      ${displayVersion}
    </div>
  );
}
`;
      } else {
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return React.createElement('div', null, '${displayVersion}');
}
`;
      }

      fs.writeFileSync(finalFilePath, templateContent, "utf8");

      console.log(`[WebSocket] New version: ${targetVersion}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);
      console.log(`  Created: ${path.basename(finalFilePath)}`);
      console.log(`  Display: ${displayVersion}`);

      manager.generateVersionsFile();
      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully created new version ${targetVersion}`,
            version: targetVersion,
            displayVersion: displayVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] New version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleRenameVersion(ws, payload) {
    const { version, newVersion, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      if (!version || !newVersion) {
        throw new Error("Missing version or newVersion parameter");
      }

      if (!manager.validateVersionKey(version)) {
        throw new Error(`Invalid source version format: ${version}`);
      }

      if (!manager.validateVersionKey(newVersion)) {
        throw new Error(`Invalid target version format: ${newVersion}`);
      }

      if (version === newVersion) {
        throw new Error("Source and target versions are the same");
      }

      const fileVersion = manager.versionKeyToFileVersion(version);
      const extensions = [".tsx", ".ts", ".jsx", ".js"];
      let sourceFilePath = null;

      for (const ext of extensions) {
        const candidatePath = path.join(
          manager.watchDir,
          `${manager.componentName}.v${fileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          sourceFilePath = candidatePath;
          break;
        }
      }

      if (!sourceFilePath) {
        throw new Error(
          `Source version file not found: ${version}. Checked: ${extensions
            .map((ext) => `${manager.componentName}.v${fileVersion}${ext}`)
            .join(", ")}`,
        );
      }

      const targetFileVersion = manager.versionKeyToFileVersion(newVersion);
      let targetFilePath = null;
      for (const ext of extensions) {
        const candidatePath = path.join(
          manager.watchDir,
          `${manager.componentName}.v${targetFileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          targetFilePath = candidatePath;
          break;
        }
      }

      if (targetFilePath) {
        throw new Error(`Target version already exists: ${newVersion}`);
      }

      const extension = path.extname(sourceFilePath);
      const finalTargetPath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${targetFileVersion}${extension}`,
      );

      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

      const importSuffix = manager.versionToImportSuffix(fileVersion);
      const newImportSuffix = manager.versionToImportSuffix(targetFileVersion);
      const oldComponentName = `${manager.componentName}${importSuffix}`;
      const newComponentName = `${manager.componentName}${newImportSuffix}`;

      let updatedContent = sourceContent.replace(
        new RegExp(oldComponentName, "g"),
        newComponentName,
      );

      fs.writeFileSync(finalTargetPath, updatedContent, "utf8");
      fs.unlinkSync(sourceFilePath);

      console.log(`[WebSocket] Rename version: ${version} → ${newVersion}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);
      console.log(`  Source: ${path.basename(sourceFilePath)}`);
      console.log(`  Target: ${path.basename(finalTargetPath)}`);

      manager.generateVersionsFile();
      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully renamed ${version} → ${newVersion}`,
            version: version,
            newVersion: newVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Rename version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleRenameLabel(ws, payload) {
    const { version, newLabel, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (typeof newLabel !== "string") {
        throw new Error("Missing or invalid newLabel parameter");
      }

      if (!manager.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      // Read the current versions file
      const content = fs.readFileSync(manager.versionsFile, "utf8");

      // Find and update the label for this version
      // Match the version block and update its label
      const versionPattern = new RegExp(
        `(["']?${version}["']?\\s*:\\s*\\{[^}]*label:\\s*["'])([^"']*)(['"])`,
        "s"
      );

      if (!versionPattern.test(content)) {
        throw new Error(`Version ${version} not found in versions file`);
      }

      const updatedContent = content.replace(versionPattern, `$1${newLabel}$3`);

      fs.writeFileSync(manager.versionsFile, updatedContent, "utf8");

      console.log(`[WebSocket] Rename label: ${version} → "${newLabel}"`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);

      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully renamed label for ${version}`,
            version: version,
            newLabel: newLabel,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Rename label error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handlePromoteVersion(ws, payload) {
    const { version, component } = payload;
    const manager = this.getComponent(component);
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (!manager.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      // Use the versions file path as the component path for VersionPromoter
      const componentPath = manager.versionsFile;

      // Create and run the promoter
      const promoter = new VersionPromoter(componentPath, version);
      promoter.promote();

      console.log(`[WebSocket] Promote version: ${version}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${manager.componentName}`);

      // Remove the component from our tracking since it's no longer versioned
      this.components.delete(manager.componentName);

      // Broadcast to all clients that files changed
      this.broadcastFileChange(manager.componentName);

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully promoted version ${version}. Component is no longer versioned.`,
            version: version,
            component: manager.componentName,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Promote version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  sendComponents(ws) {
    const componentsInfo = this.getComponentsInfo();
    const message = JSON.stringify({
      type: "components",
      payload: {
        components: componentsInfo,
      },
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }

  broadcastFileChange(componentName) {
    const componentsInfo = this.getComponentsInfo();
    const fileChangedMessage = JSON.stringify({
      type: "file_changed",
      payload: {
        message: "Versions file updated",
        component: componentName,
      },
    });

    const componentsMessage = JSON.stringify({
      type: "components",
      payload: {
        components: componentsInfo,
      },
    });

    this.wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(fileChangedMessage);
        client.send(componentsMessage);
      }
    });
  }

  shutdownServer() {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wsClients.forEach((client) => {
          client.close();
        });
        this.wsClients.clear();

        this.wss.close(() => {
          console.log("[Server] WebSocket server closed");
        });
      }

      if (this.server) {
        this.server.close(() => {
          console.log("[Server] Express server closed");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  startWatching() {
    console.log("\nWatching for file changes...");

    const watcher = chokidar.watch(this.watchPath, {
      ignored: [/node_modules/, /^\./],
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on("add", (filePath) => this.handleFileChange("add", filePath))
      .on("change", (filePath) => this.handleFileChange("change", filePath))
      .on("unlink", (filePath) => this.handleFileChange("unlink", filePath));

    const shutdown = async () => {
      console.log("\nStopping file watcher and server...");
      watcher.close();
      await this.shutdownServer();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  handleFileChange(eventType, filePath) {
    const filename = path.basename(filePath);

    // Check if this is a new versions file (component was added)
    if (eventType === "add" && filename.endsWith(".versions.ts")) {
      const manager = new ComponentManager(filePath, { lazy: this.lazy });
      if (!this.components.has(manager.componentName)) {
        this.components.set(manager.componentName, manager);
        manager.generateVersionsFile();
        manager.updatePreviousVersionsData();
        console.log(`[Watch] New component discovered: ${manager.componentName}`);
        this.broadcastFileChange(manager.componentName);
      }
      return;
    }

    // Check if this is a removed versions file (component was removed)
    if (eventType === "unlink" && filename.endsWith(".versions.ts")) {
      for (const [name, manager] of this.components) {
        if (manager.versionsFile === filePath) {
          this.components.delete(name);
          console.log(`[Watch] Component removed: ${name}`);
          this.broadcastFileChange(name);
          break;
        }
      }
      return;
    }

    // Find which component this file belongs to
    for (const [name, manager] of this.components) {
      const versionPattern = new RegExp(`^${manager.componentName}\\.v([\\d_]+)\\.(tsx?|jsx?)$`);
      const isVersionFile = versionPattern.test(filename);
      const isVersionsFile = filename === `${manager.componentName}.versions.ts`;

      // Check if file is in the same directory as the versions file
      const fileDir = path.dirname(filePath);
      if (fileDir !== manager.watchDir) {
        continue;
      }

      if (isVersionFile) {
        console.log(`[${name}] Detected change: ${eventType} ${filename}`);

        setTimeout(() => {
          if (!manager.handleFileRename()) {
            manager.generateVersionsFile();
          }
          this.broadcastFileChange(name);
        }, 100);
        return;
      } else if (isVersionsFile && eventType === "change") {
        console.log(`[${name}] Detected change: ${eventType} ${filename}`);
        setTimeout(() => {
          manager.handleVersionsKeyChange();
          this.broadcastFileChange(name);
        }, 100);
        return;
      }
    }
  }
}

module.exports = { VersionSync, ComponentManager };
