import { useState, useCallback } from "react";
import { CopyIcon } from "./icons/CopyIcon";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import styles from "./UIFork.module.css";
import { isDevelopment } from "../utils/environment";

export function OfflineMessage() {
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = useCallback(async () => {
    const command = "npx uifork watch";
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Failed to copy command
    }
  }, []);

  if (!isDevelopment()) {
    return null;
  }

  return (
    <div className={styles.componentSelectorDropdownHint}>
      <span>
        Run{" "}
        <button
          onClick={handleCopyCommand}
          className={styles.offlineMessageCommandButton}
          title="Copy command"
          aria-label="Copy command to clipboard"
        >
          <code className={styles.componentSelectorDropdownHintCode}>
            npx uifork watch{" "}
            {copied ? (
              <CheckmarkIcon className={styles.offlineMessageCopyIcon} />
            ) : (
              <CopyIcon className={styles.offlineMessageCopyIcon} />
            )}
          </code>
        </button>{" "}
        to fork, create, and promote versions from here.
      </span>
    </div>
  );
}
