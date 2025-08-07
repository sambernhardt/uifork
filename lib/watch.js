const fs = require("fs")
const path = require("path")
const chokidar = require("chokidar")

class VersionSync {
  constructor(watchPath) {
    // If given a component name, search for it recursively
    if (!watchPath.includes('/') && !fs.existsSync(watchPath)) {
      this.watchDir = this.findComponentDirectory(watchPath)
    } else {
      this.watchDir = path.resolve(watchPath)
    }
    
    if (!this.watchDir || !fs.existsSync(this.watchDir)) {
      console.error(`Directory not found: ${watchPath}`)
      if (!watchPath.includes('/')) {
        console.error(`Searched recursively for component "${watchPath}" but no directory with versions.ts was found.`)
      }
      process.exit(1)
    }

    this.versionsFile = path.join(this.watchDir, "versions.ts")
    this.currentVersionFiles = new Set()
    this.currentVersionKeys = new Set()

    console.log(`Watching directory: ${this.watchDir}`)
    this.generateVersionsFile()
    this.startWatching()
  }

  findComponentDirectory(componentName) {
    const searchDirectories = [
      process.cwd(),
      path.join(process.cwd(), 'frontend'),
      path.join(process.cwd(), 'src'),
      path.join(process.cwd(), 'frontend/src'),
    ]

    for (const searchDir of searchDirectories) {
      if (fs.existsSync(searchDir)) {
        const found = this.recursiveSearch(searchDir, componentName)
        if (found) return found
      }
    }

    return null
  }

  recursiveSearch(dir, componentName) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name)
          
          // Check if this directory has the component name and versions.ts
          if (entry.name === componentName) {
            const versionsFile = path.join(fullPath, 'versions.ts')
            if (fs.existsSync(versionsFile)) {
              return fullPath
            }
          }
          
          // Recursively search subdirectories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const found = this.recursiveSearch(fullPath, componentName)
            if (found) return found
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return null
  }

  getVersionFiles() {
    const files = fs.readdirSync(this.watchDir)
    const versionFiles = files
      .filter((file) => {
        const match = file.match(/^v([\d_]+)\.(tsx?|jsx?)$/)
        return match && fs.statSync(path.join(this.watchDir, file)).isFile()
      })
      .sort((a, b) => {
        const aVersion = this.parseVersionString(a.match(/^v([\d_]+)/)[1])
        const bVersion = this.parseVersionString(b.match(/^v([\d_]+)/)[1])

        // Compare major version first, then minor
        if (aVersion.major !== bVersion.major) {
          return aVersion.major - bVersion.major
        }
        return aVersion.minor - bVersion.minor
      })

    return versionFiles
  }

  parseVersionString(versionStr) {
    // Convert v1_2 to {major: 1, minor: 2}
    const parts = versionStr.split("_")
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1] || "0"),
    }
  }

  versionToId(versionStr) {
    // Convert v1_2 to v1.2
    return `v${versionStr.replace(/_/g, ".")}`
  }

  versionToImportSuffix(versionStr) {
    // Convert v1_2 to V1_2 for import names
    return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`
  }

  generateImportName(fileName) {
    const match = fileName.match(/^v([\d_]+)/)
    if (!match) return null

    const folderName = path.basename(this.watchDir)
    const versionStr = match[1]

    return `${folderName}${this.versionToImportSuffix(versionStr)}`
  }

  generateVersionKey(fileName, index) {
    const match = fileName.match(/^v([\d_]+)/)
    if (!match) return null

    return `v${match[1]}`
  }

  generateVersionsFile() {
    const versionFiles = this.getVersionFiles()

    // Update our tracking sets
    this.currentVersionFiles = new Set(versionFiles)
    this.currentVersionKeys = new Set(
      versionFiles
        .map((file) => {
          const match = file.match(/^v([\d_]+)/)
          return match ? `v${match[1]}` : null
        })
        .filter(Boolean)
    )

    if (versionFiles.length === 0) {
      console.log(
        "No version files found matching pattern v{number}[_{number}].(ts|tsx|js|jsx)"
      )
      return
    }

    // Generate imports
    const imports = versionFiles
      .map((file) => {
        const importName = this.generateImportName(file)
        const filePath = `./${file.replace(/\.(tsx?|jsx?)$/, "")}`
        return `import ${importName} from "${filePath}"`
      })
      .join("\n")

    // Generate VERSIONS object
    const versions = versionFiles
      .map((file, index) => {
        const importName = this.generateImportName(file)
        const key = this.generateVersionKey(file, index)
        const versionStr = key.substring(1) // Remove 'v' prefix
        const label = this.versionToId(`v${versionStr}`)
          .substring(1)
          .toUpperCase() // Remove extra 'v'

        return `  "${key}": {
    render: ${importName},
    label: "${label}",
  }`
      })
      .join(",\n")

    const content = `${imports}

export const VERSIONS = {
${versions},
}
`

    fs.writeFileSync(this.versionsFile, content, "utf8")
    console.log(
      `Generated ${this.versionsFile} with ${versionFiles.length} versions`
    )
  }

  parseVersionsFile() {
    try {
      const content = fs.readFileSync(this.versionsFile, "utf8")
      const versionsMatch = content.match(
        /export const VERSIONS = \{([\s\S]*)\}/
      )
      if (!versionsMatch) return new Set()

      const versionsContent = versionsMatch[1]
      const lines = versionsContent.split("\n")

      const keys = lines
        .map((line) => {
          const match = line.match(/^\s*"?(v[^":s]*)"?:/)
          return match ? match[1] : null
        })
        .filter(Boolean)

      return new Set(keys)
    } catch (error) {
      return new Set()
    }
  }

  handleFileRename() {
    const currentFiles = this.getVersionFiles()
    const currentSet = new Set(currentFiles)
    const previousSet = this.currentVersionFiles

    // Find files that were added or removed
    const added = currentFiles.filter((file) => !previousSet.has(file))
    const removed = Array.from(previousSet).filter(
      (file) => !currentSet.has(file)
    )

    if (added.length > 0 || removed.length > 0) {
      console.log("File rename detected:")
      if (removed.length > 0) console.log(`  Removed: ${removed.join(", ")}`)
      if (added.length > 0) console.log(`  Added: ${added.join(", ")}`)

      this.generateVersionsFile()
      return true
    }
    return false
  }

  handleVersionsKeyChange() {
    const currentKeys = this.parseVersionsFile()
    const previousKeys = this.currentVersionKeys

    // Find keys that were added or removed
    const added = Array.from(currentKeys).filter(
      (key) => !previousKeys.has(key)
    )
    const removed = Array.from(previousKeys).filter(
      (key) => !currentKeys.has(key)
    )

    if (added.length > 0 || removed.length > 0) {
      console.log("VERSIONS key change detected:")
      if (removed.length > 0)
        console.log(`  Removed keys: ${removed.join(", ")}`)
      if (added.length > 0) console.log(`  Added keys: ${added.join(", ")}`)

      // Handle 1:1 renames (one removed, one added)
      if (removed.length === 1 && added.length === 1) {
        const oldKey = removed[0]
        const newKey = added[0]

        const oldFileName = `${oldKey}.tsx`
        const newFileName = `${newKey}.tsx`

        const oldFilePath = path.join(this.watchDir, oldFileName)
        const newFilePath = path.join(this.watchDir, newFileName)

        if (fs.existsSync(oldFilePath)) {
          console.log(`Renaming file: ${oldFileName} → ${newFileName}`)
          fs.renameSync(oldFilePath, newFilePath)

          // Regenerate versions.ts with updated imports
          this.generateVersionsFile()
          return true
        }
      }

      // Update tracking
      this.currentVersionKeys = currentKeys
      return true
    }
    return false
  }

  startWatching() {
    console.log("Watching for file changes...")

    const watcher = chokidar.watch(this.watchDir, {
      ignored: /^\./, 
      persistent: true,
      ignoreInitial: true
    })

    watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("\nStopping file watcher...")
      watcher.close()
      process.exit(0)
    })

    process.on("SIGTERM", () => {
      console.log("\nStopping file watcher...")
      watcher.close()
      process.exit(0)
    })
  }

  handleFileChange(eventType, filePath) {
    const filename = path.basename(filePath)
    const isVersionFile = /^v[\d_]+\.(tsx?|jsx?)$/.test(filename)
    const isVersionsFile = filename === "versions.ts"

    if (isVersionFile) {
      console.log(`Detected change: ${eventType} ${filename}`)

      // Small delay to ensure file operations are complete
      setTimeout(() => {
        // Check if this is a rename operation
        if (!this.handleFileRename()) {
          // If not a rename, just regenerate
          this.generateVersionsFile()
        }
      }, 100)
    } else if (isVersionsFile && eventType === "change") {
      // Handle changes to versions.ts file
      console.log(`Detected change: ${eventType} ${filename}`)
      setTimeout(() => {
        this.handleVersionsKeyChange()
      }, 100)
    }
  }
}

module.exports = { VersionSync }