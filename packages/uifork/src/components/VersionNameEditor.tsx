import { useRef, useEffect } from "react";
import styles from "./UIFork.module.css";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CancelIcon } from "./icons/CancelIcon";
import { RenameIcon } from "./icons/RenameIcon";
import { Tooltip } from "./Tooltip";

interface VersionNameEditorProps {
  version: string;
  value: string;
  onChange: (value: string) => void;
  formatVersionLabel: (version: string) => string;
  onConfirm: (version: string) => void;
  onCancel: () => void;
}

export function VersionNameEditor({
  version,
  value,
  onChange,
  formatVersionLabel,
  onConfirm,
  onCancel,
}: VersionNameEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formattedVersion = formatVersionLabel(version);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <div
      className={`${styles.versionItemEditing} ${styles.menuItem}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pencil icon to indicate editing */}
      <div className={styles.checkmarkContainer}>
        <RenameIcon className={styles.checkmarkIcon} />
      </div>
      <div className={styles.versionLabel}>
        <span className={styles.versionId}>{formattedVersion}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              onConfirm(version);
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className={styles.renameInput}
          placeholder="Add label"
        />
      </div>
      <div className={styles.actions} style={{ opacity: 1 }}>
        <Tooltip label="Confirm" placement="top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(version);
            }}
            className={styles.actionButton}
          >
            <CheckmarkIcon className={styles.actionIcon} />
          </button>
        </Tooltip>
        <Tooltip label="Cancel" placement="top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className={styles.actionButton}
          >
            <CancelIcon className={styles.actionIcon} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
