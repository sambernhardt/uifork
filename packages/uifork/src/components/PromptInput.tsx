import React, { useRef, useEffect, useState, useCallback } from "react";
import styles from "./PromptInput.module.css";
import { ArrowUpIcon } from "./icons/ArrowUpIcon";

interface PromptInputProps {
  version: string | null;
  onSubmit: (version: string, prompt: string, forkFirst: boolean) => void;
  onClose: () => void;
}

export function PromptInput({ version, onSubmit, onClose }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [forkFirst, setForkFirst] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [prompt, autoResize]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    if (!version) {
      alert("Select a component and version first");
      return;
    }

    onSubmit(version, prompt.trim(), forkFirst);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className={styles.promptContainer}>
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for changes"
          className={styles.textarea}
          rows={1}
        />
      </div>
      <div className={styles.footer}>
        <label
          className={`${styles.forkCheckbox} ${!prompt.trim() ? styles.forkCheckboxDisabled : ""}`}
          inert={!prompt.trim() ? true : undefined}
        >
          <input
            type="checkbox"
            checked={forkFirst}
            onChange={(e) => setForkFirst(e.target.checked)}
            disabled={!prompt.trim()}
            className={styles.forkCheckboxInput}
          />
          <span className={styles.forkCheckboxLabel}>Fork version</span>
        </label>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim()}
          className={styles.submitButton}
          aria-label="Submit prompt"
        >
          <ArrowUpIcon className={styles.submitButtonIcon} />
        </button>
      </div>
    </div>
  );
}
