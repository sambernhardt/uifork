import { ForkIcon } from "./icons/ForkIcon";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import styles from "./UIFork.module.css";
import { motion } from "motion/react";

type TriggerContentProps = {
  hasSelection: boolean;
  selectedComponent: string;
  activeVersion: string;
  activeVersionLabel?: string;
  formatVersionLabel: (version: string) => string;
  showComponentName: boolean;
  isActiveVersionPrompting?: boolean;
};

const TriggerContent = ({
  hasSelection,
  selectedComponent,
  activeVersion,
  activeVersionLabel,
  formatVersionLabel,
  showComponentName,
  isActiveVersionPrompting = false,
}: TriggerContentProps) => {
  const displayVersion = activeVersion ? formatVersionLabel(activeVersion) : "-";

  if (!hasSelection) {
    return <ForkIcon className={styles.triggerIcon} />;
  }

  return (
    <>
      <ForkIcon className={styles.triggerIcon} />
      {showComponentName && (
        <motion.span
          layoutId="component-name"
          layout="position"
          className={styles.triggerLabel}
          transition={{
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          }}
        >
          {selectedComponent}
        </motion.span>
      )}
      <span
        className={`${styles.triggerVersion}${!showComponentName ? ` ${styles.triggerVersionPrimary}` : ""}`}
      >
        {displayVersion}
      </span>
      {isActiveVersionPrompting && (
        <span className={styles.triggerVersionLabel}> · Editing…</span>
      )}
      {!isActiveVersionPrompting && activeVersionLabel && (
        <span className={styles.triggerVersionLabel}> · {activeVersionLabel}</span>
      )}
    </>
  );
};

export default TriggerContent;
