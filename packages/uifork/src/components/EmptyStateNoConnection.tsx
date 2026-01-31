import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CopyIcon } from "./icons/CopyIcon";
import styles from "./UIFork.module.css";

type EmptyStateNoConnectionProps = {
  onCopyCommand: () => void;
  copied: boolean;
};

export function EmptyStateNoConnection({ onCopyCommand, copied }: EmptyStateNoConnectionProps) {
  return (
    <div className={styles.emptyStateContainer}>
      <h3 className={styles.emptyStateHeading}>Start the uifork server</h3>
      <p className={styles.emptyStateText}>Run the watch command in your project root to connect</p>
      <button
        onClick={onCopyCommand}
        className={styles.emptyStateCommandContainer}
        title="Copy command"
        aria-label="Copy command to clipboard"
      >
        <code className={styles.emptyStateCommand}>npx uifork watch</code>
        {copied ? (
          <CheckmarkIcon className={styles.emptyStateCopyIcon} />
        ) : (
          <CopyIcon className={styles.emptyStateCopyIcon} />
        )}
      </button>
    </div>
  );
}
