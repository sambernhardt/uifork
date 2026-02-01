import { useRef, useState, forwardRef, useImperativeHandle, useLayoutEffect } from "react";

interface AutoWidthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  /** Additional styles for the container */
  containerStyle?: React.CSSProperties;
  /** Additional class name for the container */
  containerClassName?: string;
}

/**
 * A text input that automatically grows/shrinks to fit its content.
 *
 * Inherits font styles from parent. Set min-width and max-width on the
 * container via containerStyle or containerClassName to control bounds.
 */
export const AutoWidthInput = forwardRef<HTMLInputElement, AutoWidthInputProps>(
  function AutoWidthInput(
    { containerStyle, containerClassName, className, value, placeholder, ...props },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<number | undefined>(undefined);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useLayoutEffect(() => {
      if (measureRef.current) {
        // Use the placeholder if value is empty, otherwise use value
        const textToMeasure = value?.toString() || placeholder || "";
        measureRef.current.textContent = textToMeasure || " ";
        const measuredWidth = measureRef.current.offsetWidth;
        // Add a small buffer for the cursor
        setWidth(measuredWidth + 2);
      }
    }, [value, placeholder]);

    return (
      <span
        className={containerClassName}
        style={{
          display: "inline-block",
          position: "relative",
          overflow: "hidden",
          ...containerStyle,
        }}
      >
        {/* Hidden span for measuring text width */}
        <span
          ref={measureRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            visibility: "hidden",
            whiteSpace: "pre",
            // Inherit all font properties
            font: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          className={className}
          style={{
            width: width !== undefined ? `${width}px` : undefined,
            maxWidth: "100%",
            // Inherit font from parent
            font: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            boxSizing: "border-box",
            minWidth: 0,
          }}
          {...props}
        />
      </span>
    );
  },
);
