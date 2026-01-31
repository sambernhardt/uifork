import { BranchIcon } from "./icons/BranchIcon";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import styles from "./UIFork.module.css";
import { motion } from "motion/react";
import { ConnectionStatus } from "../hooks/useWebSocketConnection";
import { ActiveView } from "./types";

type TriggerContentProps = {
  activeView: ActiveView;
  connectionStatus: ConnectionStatus;
  selectedComponent: string;
  activeVersion: string;
  formatVersionLabel: (version: string) => string;
};

const TriggerContent = ({
  activeView,
  connectionStatus,
  selectedComponent,
  activeVersion,
  formatVersionLabel,
}: TriggerContentProps) => {
  return (
    <>
      {activeView === "closed-trigger-icon" ? (
        // Icon-only state: error, connecting, or no components
        <>
          {connectionStatus === "disconnected" || connectionStatus === "failed" ? (
            <div className={styles.triggerIconContainer}>
              <BranchIcon className={styles.triggerIcon} />
              <div className={styles.connectionErrorDot} title="Disconnected from watch server" />
            </div>
          ) : (
            <>
              {connectionStatus === "connecting" && (
                <div
                  className={`${styles.statusIndicator} ${styles.statusIndicatorConnecting}`}
                  title="Connecting..."
                />
              )}
              <BranchIcon className={styles.triggerIcon} />
            </>
          )}
        </>
      ) : (
        // Icon+label state: connected with components
        <>
          <BranchIcon className={styles.triggerIcon} />
          <motion.span
            layoutId="component-name"
            layout="position"
            className={styles.triggerLabel}
            transition={{
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            }}
          >
            {selectedComponent || "No component"}
          </motion.span>
          <span className={styles.triggerVersion}>
            {activeVersion ? formatVersionLabel(activeVersion) : "-"}
          </span>
        </>
      )}
    </>
  );
};

export default TriggerContent;
