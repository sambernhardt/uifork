import React, { useRef, useEffect } from "react";
import styles from "./UIFork.module.css";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CancelIcon } from "./icons/CancelIcon";

interface VersionNameEditorProps {
  version: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: (version: string) => void;
  onCancel: () => void;
}

export function VersionNameEditor({
  version,
  value,
  onChange,
  onConfirm,
  onCancel,
}: VersionNameEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <div className={styles.versionItemEditing} onClick={(e) => e.stopPropagation()}>
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
        placeholder="e.g., v1, v2, v1_2"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfirm(version);
        }}
        className={styles.confirmButton}
        title="Confirm rename"
      >
        <CheckmarkIcon className={styles.confirmIcon} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className={styles.confirmButton}
        title="Cancel rename"
      >
        <CancelIcon className={styles.cancelIcon} />
      </button>
    </div>
  );
}
