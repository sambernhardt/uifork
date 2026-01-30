import React from "react";
import styles from "./UIFork.module.css";
import { ChevronRightIcon } from "./icons/ChevronRightIcon";

interface SettingsViewProps {
  onBack: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setPosition: (
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  ) => void;
  codeEditor: "vscode" | "cursor";
  setCodeEditor: (editor: "vscode" | "cursor") => void;
}

export function SettingsView({
  onBack,
  theme,
  setTheme,
  position,
  setPosition,
  codeEditor,
  setCodeEditor,
}: SettingsViewProps) {
  return (
    <div className={styles.settingsView}>
      <button onClick={onBack} className={styles.settingsBackButton}>
        <ChevronRightIcon className={styles.settingsBackIcon} />
        <span>Back</span>
      </button>
      <div className={styles.settingsContent}>
        <h3 className={styles.settingsTitle}>Settings</h3>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Theme</label>
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as "light" | "dark" | "system")
            }
            className={styles.settingsSelect}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Position</label>
          <select
            value={position}
            onChange={(e) =>
              setPosition(
                e.target.value as
                  | "top-left"
                  | "top-right"
                  | "bottom-left"
                  | "bottom-right",
              )
            }
            className={styles.settingsSelect}
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Code Editor</label>
          <select
            value={codeEditor}
            onChange={(e) =>
              setCodeEditor(e.target.value as "vscode" | "cursor")
            }
            className={styles.settingsSelect}
          >
            <option value="vscode">VSCode</option>
            <option value="cursor">Cursor</option>
          </select>
        </div>
      </div>
    </div>
  );
}
