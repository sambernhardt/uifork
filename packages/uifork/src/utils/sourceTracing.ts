import { getFiberFromHostInstance, isInstrumentationActive } from "bippy";
import {
  getOwnerStack,
  isSourceFile,
  normalizeFileName,
  type StackFrame,
} from "bippy/source";

export interface SourceInfo {
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  componentName: string | null;
}

export interface ComponentStackFrame {
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  componentName: string | null;
}

/**
 * Get source file information from a DOM element using bippy
 */
export async function getSourceFromElement(
  element: Element
): Promise<SourceInfo> {
  if (!isInstrumentationActive()) {
    console.warn("[UIFork] Bippy instrumentation not active");
    return {
      filePath: null,
      lineNumber: null,
      columnNumber: null,
      componentName: null,
    };
  }

  const fiber = getFiberFromHostInstance(element);
  if (!fiber) {
    return {
      filePath: null,
      lineNumber: null,
      columnNumber: null,
      componentName: null,
    };
  }

  const stack = await getOwnerStack(fiber);
  if (!stack) {
    return {
      filePath: null,
      lineNumber: null,
      columnNumber: null,
      componentName: null,
    };
  }

  // Find first source file in the stack
  for (const frame of stack) {
    if (frame.fileName && isSourceFile(frame.fileName)) {
      return {
        filePath: normalizeFileName(frame.fileName),
        lineNumber: frame.lineNumber ?? null,
        columnNumber: frame.columnNumber ?? null,
        componentName: frame.functionName ?? null,
      };
    }
  }

  return {
    filePath: null,
    lineNumber: null,
    columnNumber: null,
    componentName: null,
  };
}

/**
 * Get the full component stack from a DOM element
 * Returns all source file frames in the stack
 */
export async function getComponentStack(
  element: Element
): Promise<ComponentStackFrame[]> {
  if (!isInstrumentationActive()) {
    return [];
  }

  const fiber = getFiberFromHostInstance(element);
  if (!fiber) {
    return [];
  }

  const stack = await getOwnerStack(fiber);
  if (!stack) {
    return [];
  }

  // Filter to only source files and convert to ComponentStackFrame
  const componentStack: ComponentStackFrame[] = [];
  for (const frame of stack) {
    if (frame.fileName && isSourceFile(frame.fileName)) {
      componentStack.push({
        filePath: normalizeFileName(frame.fileName),
        lineNumber: frame.lineNumber ?? null,
        columnNumber: frame.columnNumber ?? null,
        componentName: frame.functionName ?? null,
      });
    }
  }

  return componentStack;
}

/**
 * Get component stack with 1 frame above and 1 frame below the current component
 * The current component is the first source file in the stack
 */
export async function getComponentStackWithContext(
  element: Element
): Promise<{
  above: ComponentStackFrame | null;
  current: ComponentStackFrame | null;
  below: ComponentStackFrame | null;
}> {
  const stack = await getComponentStack(element);
  
  if (stack.length === 0) {
    return { above: null, current: null, below: null };
  }

  const current = stack[0];
  const above = stack.length > 1 ? stack[1] : null;
  const below = stack.length > 2 ? stack[2] : null;

  return { above, current, below };
}
