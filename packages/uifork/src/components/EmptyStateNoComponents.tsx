import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CopyIcon } from "./icons/CopyIcon";
import styles from "./UIFork.module.css";

type EmptyStateNoComponentsProps = {
  onCopyCommand: () => void;
  copied: boolean;
};

export function EmptyStateNoComponents({ onCopyCommand, copied }: EmptyStateNoComponentsProps) {
  return (
    <div className={styles.emptyStateContainer}>
      <h3 className={styles.emptyStateHeading}>Get started with uifork</h3>
      <p className={styles.emptyStateText}>
        Choose a component and run the command in your root directory
      </p>
      <button
        onClick={onCopyCommand}
        className={styles.emptyStateCommandContainer}
        title="Copy command"
        aria-label="Copy command to clipboard"
      >
        <code className={styles.emptyStateCommand}>npx uifork init &lt;path to file&gt;</code>
        {copied ? (
          <CheckmarkIcon className={styles.emptyStateCopyIcon} />
        ) : (
          <CopyIcon className={styles.emptyStateCopyIcon} />
        )}
      </button>
    </div>
  );
}
