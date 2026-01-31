import React from "react";
import { motion } from "motion/react";
import styles from "./UIFork.module.css";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";
import { GearIcon } from "./icons/GearIcon";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { InfoIcon } from "./icons/InfoIcon";
import type { ComponentInfo } from "../types";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import { useClickOutside } from "../hooks/useClickOutside";

interface ComponentSelectorProps {
  selectedComponent: string;
  onToggle: () => void;
  onSettingsClick: (e: React.MouseEvent) => void;
}

export function ComponentSelector({
  selectedComponent,
  onToggle,
  onSettingsClick,
}: ComponentSelectorProps) {
  return (
    <div className={styles.componentSelectorRow}>
      <button
        data-component-selector
        onClick={onToggle}
        className={`${styles.componentSelector} ${styles.menuItem}`}
      >
        <motion.span
          layoutId="component-name"
          layout="position"
          className={styles.componentSelectorLabel}
          transition={{
            layout: {
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            },
          }}
        >
          {selectedComponent || "Select component"}
        </motion.span>
        <ChevronDownIcon className={styles.componentSelectorIcon} />
      </button>
      <button
        onClick={onSettingsClick}
        className={styles.componentSelectorSettings}
        title="Settings"
        aria-label="Open settings"
      >
        <GearIcon className={styles.componentSelectorSettingsIcon} />
      </button>
    </div>
  );
}

export function ComponentSelectorDropdown({
  mountedComponents,
  selectedComponent,
  isOpen,
  position,
  onSelect,
  onClose,
  componentSelectorRef,
}: {
  mountedComponents: ComponentInfo[];
  selectedComponent: string;
  isOpen: boolean;
  position: { x: number; y: number };
  onSelect: (componentName: string) => void;
  onClose: () => void;
  componentSelectorRef: React.RefObject<HTMLDivElement>;
}) {
  // Close dropdown when clicking outside
  useClickOutside({
    isActive: isOpen,
    refs: [componentSelectorRef],
    onClickOutside: onClose,
    // Don't close when clicking the trigger button (it handles its own toggle)
    additionalCheck: (target) => {
      const element = target as Element;
      return !!element.closest?.("[data-component-selector]");
    },
  });

  if (!isOpen) return null;

  return (
    <div
      ref={componentSelectorRef}
      className={styles.componentSelectorDropdown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        visibility: "hidden",
      }}
    >
      <div className={styles.componentSelectorDropdownTitle}>Forked components</div>
      {mountedComponents.length === 0 ? (
        <div className={styles.emptyState}>No mounted components found</div>
      ) : (
        mountedComponents.map((component) => (
          <button
            key={component.name}
            onClick={() => onSelect(component.name)}
            className={`${styles.componentSelectorItem} ${styles.menuItem} ${
              component.name === selectedComponent ? styles.componentSelectorItemSelected : ""
            }`}
          >
            <div className={styles.componentSelectorItemCheckmarkContainer}>
              {component.name === selectedComponent && (
                <CheckmarkIcon className={styles.componentSelectorItemCheckmark} />
              )}
            </div>
            <span className={styles.componentSelectorItemName}>{component.name}</span>
            <span className={styles.componentSelectorItemCount}>{component.versions.length}</span>
          </button>
        ))
      )}
      <div className={styles.componentSelectorDropdownHint}>
        <InfoIcon className={styles.componentSelectorDropdownHintIcon} />
        <span>
          Use <code className={styles.componentSelectorDropdownHintCode}>npx uifork init</code> to
          iterate on more components
        </span>
      </div>
    </div>
  );
}
