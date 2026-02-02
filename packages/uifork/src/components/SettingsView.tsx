import styles from "./UIFork.module.css";
import { ChevronRightIcon } from "./icons/ChevronRightIcon";

interface SettingsViewProps {
  onBack: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setPosition: (position: "top-left" | "top-right" | "bottom-left" | "bottom-right") => void;
  codeEditor: "vscode" | "cursor";
  setCodeEditor: (editor: "vscode" | "cursor") => void;
  // enableElementAwarePositioning: boolean;
  // setEnableElementAwarePositioning: (enabled: boolean) => void;
}

export function SettingsView({
  onBack,
  theme,
  setTheme,
  position,
  setPosition,
  codeEditor,
  setCodeEditor,
  // enableElementAwarePositioning,
  // setEnableElementAwarePositioning,
}: SettingsViewProps) {
  return (
    <div className={styles.settingsView}>
      <button
        onClick={onBack}
        className={styles.settingsBackButton}
        style={{ width: "auto", alignSelf: "flex-start" }}
      >
        <ChevronRightIcon className={styles.settingsBackIcon} />
        <span>Back</span>
      </button>
      <div className={styles.settingsContent}>
        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
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
                e.target.value as "top-left" | "top-right" | "bottom-left" | "bottom-right",
              )
            }
            className={styles.settingsSelect}
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </div>

        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>Code editor</label>
          <select
            value={codeEditor}
            onChange={(e) => setCodeEditor(e.target.value as "vscode" | "cursor")}
            className={styles.settingsSelect}
          >
            <option value="vscode">VSCode</option>
            <option value="cursor">Cursor</option>
          </select>
        </div>
        {/* <hr
          style={{
            width: "100%",
            border: "none",
            borderTop: "1px solid var(--uifork-border-color)",
            margin: "4px 0",
          }}
        />
        <div className={`${styles.settingsGroup} ${styles.settingsCheckboxGroup}`}>
          <label className={styles.settingsCheckboxLabel}>
            <input
              type="checkbox"
              checked={enableElementAwarePositioning}
              onChange={(e) => setEnableElementAwarePositioning(e.target.checked)}
              className={styles.settingsCheckboxInput}
            />
            <div
              className={`${styles.settingsCheckboxVisual} ${
                enableElementAwarePositioning ? styles.settingsCheckboxVisualChecked : ""
              }`}
            >
              {enableElementAwarePositioning && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <div className={styles.settingsCheckboxContent}>
              <span className={`${styles.settingsLabel} ${styles.settingsCheckboxLabelText}`}>
                Dev tool-aware positioning
              </span>
              <p className={`${styles.settingsText} ${styles.settingsCheckboxDescription}`}>
                Will position itself next to other floating dev tools
              </p>
            </div>
          </label>
        </div> */}
      </div>
    </div>
  );
}
