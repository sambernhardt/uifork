import React from "react";
import { motion } from "motion/react";
import styles from "./UIFork.module.css";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";
import { GearIcon } from "./icons/GearIcon";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import type { ComponentInfo } from "../types";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";

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
  componentSelectorRef,
}: {
  mountedComponents: ComponentInfo[];
  selectedComponent: string;
  isOpen: boolean;
  position: { x: number; y: number };
  onSelect: (componentName: string) => void;
  componentSelectorRef: React.RefObject<HTMLDivElement>;
}) {
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
      <div className={styles.componentSelectorDropdownTitle}>Branched components</div>
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
    </div>
  );
}
