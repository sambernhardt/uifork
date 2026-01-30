import {
  getFiberFromHostInstance,
  isInstrumentationActive,
  traverseFiber,
} from "bippy";
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
  fiber?: any; // Store fiber reference for finding DOM elements
}

/**
 * Component names to filter out from the component stack display
 * These are typically provider components or wrapper components that don't add value
 */
export const COMPONENT_NAME_FILTERS = ["ThemeProvider"];

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
 * Traverse the Fiber tree return chain to find all component fibers
 * This helps find components that were passed as children (which don't appear in owner stack)
 */
function getFiberReturnChain(fiber: any): any[] {
  const chain: any[] = [];
  let current: any = fiber;

  // Start from the current fiber and traverse up the return chain
  while (current) {
    // Skip host elements (div, span, etc.)
    const isHostElement = current.type && typeof current.type === "string";

    // Add component fibers (function components, class components)
    if (!isHostElement && current.type) {
      chain.push(current);
    }

    // Move up the return chain
    current = current.return;

    // Stop if we hit null
    if (!current) {
      break;
    }
  }

  return chain;
}

/**
 * Get child component fibers one level down from the current fiber
 * This finds components that are rendered as children of the current component
 */
function getChildComponents(fiber: any): any[] {
  const childComponents: any[] = [];
  
  // Traverse the child chain to find component fibers
  let child: any = fiber.child;
  while (child) {
    // Skip host elements (div, span, etc.)
    const isHostElement = child.type && typeof child.type === "string";
    
    // Add component fibers (function components, class components)
    if (!isHostElement && child.type) {
      const componentName = child.type?.name || child.type?.displayName;
      // Only add if it's a named component (not anonymous)
      if (componentName) {
        childComponents.push(child);
      }
    }
    
    // Move to next sibling
    child = child.sibling;
    
    // Stop if we hit null
    if (!child) {
      break;
    }
  }
  
  return childComponents;
}

/**
 * Find DOM elements (host instances) associated with a fiber node
 * For component fibers, finds the first host instance that represents the component
 * We try to avoid selecting child component DOM elements when possible
 */
function findHostInstancesFromFiber(fiber: any, targetComponentName?: string | null): Element[] {
  const hostInstances: Element[] = [];
  
  if (!fiber) {
    return hostInstances;
  }
  
  // Check if this is a host fiber (div, span, etc.)
  const isHostElement = fiber.type && typeof fiber.type === "string";
  
  if (isHostElement) {
    // Get the DOM element from stateNode
    const domElement = fiber.stateNode;
    if (domElement && domElement instanceof Element) {
      // Skip our own UI elements
      if (!domElement.closest("[data-uifork]")) {
        hostInstances.push(domElement);
      }
    }
    return hostInstances;
  }
  
  // For component fibers, we need to find host instances but avoid child components
  // Strategy: Find the first host instance that, when selected, would show this component
  // in its stack (not a child component)
  
  function findComponentRootHost(fiberNode: any, depth: number = 0): Element | null {
    if (!fiberNode || depth > 10) {
      return null; // Prevent infinite recursion
    }
    
    // Check if this is a host fiber
    const isHost = fiberNode.type && typeof fiberNode.type === "string";
    
    if (isHost) {
      const domElement = fiberNode.stateNode;
      if (domElement && domElement instanceof Element) {
        // Skip our own UI elements
        if (!domElement.closest("[data-uifork]")) {
          // Verify this element would show our target component in its stack
          if (targetComponentName) {
            const elementFiber = getFiberFromHostInstance(domElement);
            if (elementFiber) {
              // Check if this element's component stack includes our target component
              // We'll verify this by checking the fiber chain
              let current: any = elementFiber;
              let foundTarget = false;
              while (current) {
                const componentName = current.type?.name || current.type?.displayName;
                if (componentName === targetComponentName) {
                  foundTarget = true;
                  break;
                }
                current = current.return;
              }
              
              // If we found the target component in the chain, this is a good element
              // But we want the element that shows target as CURRENT, not as parent
              // So we need to check if the first component in the stack is our target
              // Actually, let's just return the first host we find and verify later
              return domElement;
            }
          }
          return domElement;
        }
      }
    }
    
    // Check if this is a component fiber that matches our target
    // If so, we want to skip it and go deeper (it's a child component)
    const isComponent = !isHost && fiberNode.type;
    const componentName = isComponent 
      ? (fiberNode.type?.name || fiberNode.type?.displayName)
      : null;
    
    // If this is a child component (not our target), skip it and go to its children
    if (isComponent && componentName && componentName !== targetComponentName) {
      // This is a child component, traverse into it to find host instances
      if (fiberNode.child) {
        return findComponentRootHost(fiberNode.child, depth + 1);
      }
      return null;
    }
    
    // Traverse children to find host instances
    if (fiberNode.child) {
      const found = findComponentRootHost(fiberNode.child, depth + 1);
      if (found) {
        return found;
      }
    }
    
    // If no host found in children, check siblings
    if (fiberNode.sibling) {
      return findComponentRootHost(fiberNode.sibling, depth + 1);
    }
    
    return null;
  }
  
  const rootElement = findComponentRootHost(fiber);
  if (rootElement) {
    hostInstances.push(rootElement);
  }
  
  return hostInstances;
}

/**
 * Try to infer file path from component name
 * This is a fallback when source maps aren't available or point to the wrong location
 */
function inferFilePathFromComponentName(
  componentName: string | null,
  currentFilePath: string | null = null
): string | null {
  if (!componentName) return null;

  // If the current file path already matches the component name pattern, use it
  if (currentFilePath && currentFilePath.includes(`/${componentName}.`)) {
    return currentFilePath;
  }

  // Common patterns for component file locations
  // Try examples first since Example2 is in examples/
  const possiblePaths = [
    `/src/examples/${componentName}.tsx`,
    `/src/examples/${componentName}.ts`,
    `/src/components/${componentName}.tsx`,
    `/src/components/${componentName}.ts`,
    `/src/components/${componentName}/index.tsx`,
    `/src/${componentName}.tsx`,
    `/src/${componentName}.ts`,
  ];

  // Return the first likely path
  return possiblePaths[0] || null;
}

/**
 * Get source info from a Fiber node by checking various possible sources
 */
function getSourceFromFiber(fiber: any): ComponentStackFrame | null {
  if (!fiber || !fiber.type) {
    return null;
  }

  const componentType = fiber.type;
  const componentName = componentType.displayName || componentType.name || null;

  let filePath: string | null = null;
  let lineNumber: number | null = null;
  let columnNumber: number | null = null;

  // Try multiple sources for file information
  // 1. Check fiber._debugSource (React DevTools format)
  let debugSourcePath: string | null = null;
  if (fiber._debugSource) {
    const source = fiber._debugSource;
    if (source.fileName && isSourceFile(source.fileName)) {
      debugSourcePath = normalizeFileName(source.fileName);
      lineNumber = source.lineNumber ?? null;
      columnNumber = source.columnNumber ?? null;
    }
  }

  // 2. Check componentType.__source (Babel plugin format)
  if (!debugSourcePath && componentType.__source) {
    const source = componentType.__source;
    if (source.fileName && isSourceFile(source.fileName)) {
      debugSourcePath = normalizeFileName(source.fileName);
      lineNumber = source.lineNumber ?? null;
      columnNumber = source.columnNumber ?? null;
    }
  }

  // 3. Check if the component has a __file property (some build tools add this)
  if (!debugSourcePath && (componentType as any).__file) {
    const file = (componentType as any).__file;
    if (typeof file === "string" && isSourceFile(file)) {
      debugSourcePath = normalizeFileName(file);
    }
  }

  // 4. Determine the correct file path
  // For components passed as children, _debugSource often points to where they're used,
  // not where they're defined. If the file path doesn't match the component name,
  // try to infer the correct path.
  if (debugSourcePath && componentName) {
    // Check if the debugSource path matches the component name pattern
    // e.g., Example2 should be in Example2.tsx, not App.tsx
    const pathMatchesComponent =
      debugSourcePath.includes(`/${componentName}.`) ||
      debugSourcePath.includes(`/${componentName}/`);

    if (!pathMatchesComponent) {
      // The debugSource points to where the component is used, not where it's defined
      // Try to infer the correct file path
      const inferredPath = inferFilePathFromComponentName(
        componentName,
        debugSourcePath
      );
      if (inferredPath) {
        filePath = inferredPath;
        // Keep the line/column from debugSource as they might still be useful
      } else {
        // Fall back to debugSource path if we can't infer
        filePath = debugSourcePath;
      }
    } else {
      // Path matches component name, use it
      filePath = debugSourcePath;
    }
  } else if (debugSourcePath) {
    // No component name, just use debugSource path
    filePath = debugSourcePath;
  } else if (componentName) {
    // No debugSource, try to infer from component name
    const inferredPath = inferFilePathFromComponentName(componentName);
    if (inferredPath) {
      filePath = inferredPath;
    }
  }

  // Return if we have at least a component name (even without file path)
  // This allows us to show components that might be missing from owner stack
  if (componentName) {
    return {
      filePath: filePath && isSourceFile(filePath) ? filePath : null,
      lineNumber,
      columnNumber,
      componentName,
    };
  }

  return null;
}

/**
 * Get the full component stack from a DOM element
 * Returns all source file frames in the stack, including components passed as children
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

  // Get owner stack (components that directly created nodes)
  const ownerStack = await getOwnerStack(fiber);

  // Also traverse the Fiber return chain to find components passed as children
  const fiberChain = getFiberReturnChain(fiber);
  
  // Get child components one level down
  const childComponents = getChildComponents(fiber);

  // Build a map of components from owner stack for quick lookup
  const ownerStackMap = new Map<string, ComponentStackFrame>();
  if (ownerStack) {
    for (const frame of ownerStack) {
      if (frame.fileName && isSourceFile(frame.fileName)) {
        const normalizedPath = normalizeFileName(frame.fileName);
        const componentName = frame.functionName || "";
        const key = `${normalizedPath}:${componentName}`;

        ownerStackMap.set(key, {
          filePath: normalizedPath,
          lineNumber: frame.lineNumber ?? null,
          columnNumber: frame.columnNumber ?? null,
          componentName: componentName || null,
        });
      }
    }
  }

  // Build component stack from fiber chain, merging with owner stack data when available
  // This preserves the correct order (from leaf to root)
  const componentStack: ComponentStackFrame[] = [];
  const seenKeys = new Set<string>();

  // First, add all components from the return chain (parents/ancestors)
  for (const fiberNode of fiberChain) {
    const sourceInfo = getSourceFromFiber(fiberNode);
    const componentName =
      fiberNode.type?.name || fiberNode.type?.displayName || null;

    if (sourceInfo && sourceInfo.componentName) {
      // Create a key for deduplication
      const key =
        sourceInfo.filePath && isSourceFile(sourceInfo.filePath)
          ? `${sourceInfo.filePath}:${sourceInfo.componentName}`
          : `name:${sourceInfo.componentName}`;

      // Check if we've already added this component
      if (!seenKeys.has(key)) {
        seenKeys.add(key);

        // Prefer owner stack data if available (it has better source info)
        // Otherwise use fiber chain data
        const ownerStackFrame = sourceInfo.filePath
          ? Array.from(ownerStackMap.values()).find(
              (f) =>
                f.componentName === sourceInfo.componentName &&
                f.filePath === sourceInfo.filePath
            )
          : null;

        if (ownerStackFrame) {
          // Use owner stack frame (better source info) but add fiber reference
          componentStack.push({ ...ownerStackFrame, fiber: fiberNode });
        } else if (sourceInfo.filePath && isSourceFile(sourceInfo.filePath)) {
          // Use fiber chain frame if it has valid file path
          componentStack.push({ ...sourceInfo, fiber: fiberNode });
        } else {
          // Check if component is in owner stack by name only
          const inOwnerStackByName = Array.from(ownerStackMap.values()).some(
            (f) => f.componentName === sourceInfo.componentName
          );

          if (!inOwnerStackByName && sourceInfo.componentName) {
            // Component is missing from owner stack, add it from fiber chain
            componentStack.push({ ...sourceInfo, fiber: fiberNode });
          }
        }
      }
    }
  }
  
  // Then, add child components one level down (after the current component)
  // Insert them right after the first component (current)
  const childFrames: ComponentStackFrame[] = [];
  for (const childFiber of childComponents) {
    const sourceInfo = getSourceFromFiber(childFiber);
    if (sourceInfo && sourceInfo.componentName) {
      const key =
        sourceInfo.filePath && isSourceFile(sourceInfo.filePath)
          ? `${sourceInfo.filePath}:${sourceInfo.componentName}`
          : `name:${sourceInfo.componentName}`;

      // Check if we've already added this component
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        childFrames.push({ ...sourceInfo, fiber: childFiber });
      }
    }
  }
  
  // Insert child components after the current component (index 0)
  if (childFrames.length > 0 && componentStack.length > 0) {
    componentStack.splice(1, 0, ...childFrames);
  } else if (childFrames.length > 0) {
    // If no parent components, just add children
    componentStack.push(...childFrames);
  }

  // Filter out components that match the filter list
  const filteredStack = componentStack.filter(
    (frame) =>
      !frame.componentName ||
      !COMPONENT_NAME_FILTERS.includes(frame.componentName)
  );

  return filteredStack;
}

/**
 * Find DOM elements associated with a component stack frame
 * Returns a DOM element that, when selected, will show this component as current
 * Strategy: Find an element within the current selection context that belongs to the target component
 */
export async function findElementFromStackFrame(
  frame: ComponentStackFrame,
  currentSelectedElement?: Element | null
): Promise<Element | null> {
  if (!frame.fiber) {
    return null;
  }

  // First, try to find host instances from the fiber
  const hostInstances = findHostInstancesFromFiber(frame.fiber, frame.componentName);
  
  if (hostInstances.length === 0) {
    return null;
  }
  
  // If we have a current selected element, try to find an element within it
  // that belongs to our target component
  if (currentSelectedElement && hostInstances.length > 0) {
    // Check each host instance to see if it's within the current selection
    // and if selecting it would show our target component as current
    for (const element of hostInstances) {
      // Check if this element is within or contains the current selection
      if (
        currentSelectedElement.contains(element) ||
        element.contains(currentSelectedElement) ||
        element === currentSelectedElement
      ) {
        // Verify that selecting this element shows our target component as current
        const testFiber = getFiberFromHostInstance(element);
        if (testFiber) {
          // Get the component stack to verify
          const testStack = await getComponentStack(element);
          if (testStack.length > 0 && testStack[0].componentName === frame.componentName) {
            // This element will show our target component as current
            return element;
          }
        }
      }
    }
  }
  
  // Fallback: return the first host instance
  // But verify it will show our target component
  const element = hostInstances[0];
  const testStack = await getComponentStack(element);
  if (testStack.length > 0 && testStack[0].componentName === frame.componentName) {
    return element;
  }
  
  // If the first element doesn't work, try finding an element within the current selection
  // that belongs to the target component
  if (currentSelectedElement) {
    // Traverse DOM tree within current selection to find elements
    const walker = document.createTreeWalker(
      currentSelectedElement,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const el = node as Element;
          // Skip our own UI elements
          if (el.closest("[data-uifork]")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as Element;
      const testStack = await getComponentStack(el);
      if (testStack.length > 0 && testStack[0].componentName === frame.componentName) {
        return el;
      }
    }
  }
  
  // Last resort: return the first host instance even if it doesn't match
  return element;
}

/**
 * Get component stack with context frames
 * Returns all frames in the stack, with the first one marked as current
 */
export async function getComponentStackWithContext(element: Element): Promise<{
  above: ComponentStackFrame | null;
  current: ComponentStackFrame | null;
  below: ComponentStackFrame | null;
  all: ComponentStackFrame[];
}> {
  const stack = await getComponentStack(element);

  if (stack.length === 0) {
    return { above: null, current: null, below: null, all: [] };
  }

  const current = stack[0];
  const above = stack.length > 1 ? stack[1] : null;
  const below = stack.length > 2 ? stack[2] : null;

  return { above, current, below, all: stack };
}
