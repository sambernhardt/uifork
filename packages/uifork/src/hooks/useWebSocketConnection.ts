import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "failed";

export type WebSocketMessageType =
  | "duplicate_version"
  | "delete_version"
  | "new_version"
  | "rename_version"
  | "promote_version"
  | "init_component";

interface UseWebSocketConnectionOptions {
  port: number;
  selectedComponent: string;
  onFileChanged?: () => void;
  onComponentsUpdate?: (
    components: Array<{
      name: string;
      path: string;
      versions: string[];
    }>
  ) => void;
  onVersionAck?: (payload: {
    version: string;
    message?: string;
    newVersion?: string;
  }) => void;
  onPromoted?: (componentName: string) => void;
  onInitComponent?: (componentName: string) => void;
  onError?: (message: string) => void;
}

export function useWebSocketConnection({
  port,
  selectedComponent,
  onFileChanged,
  onComponentsUpdate,
  onVersionAck,
  onPromoted,
  onInitComponent,
  onError,
}: UseWebSocketConnectionOptions) {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Keep refs for callbacks to avoid reconnection on callback changes
  const selectedComponentRef = useRef(selectedComponent);
  const onFileChangedRef = useRef(onFileChanged);
  const onComponentsUpdateRef = useRef(onComponentsUpdate);
  const onVersionAckRef = useRef(onVersionAck);
  const onPromotedRef = useRef(onPromoted);
  const onInitComponentRef = useRef(onInitComponent);
  const onErrorRef = useRef(onError);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isConnectingRef = useRef(false);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);
  const hasEverConnectedRef = useRef(false);
  const retryCountRef = useRef(0);

  // Keep wsConnectionRef in sync with state
  useEffect(() => {
    wsConnectionRef.current = wsConnection;
  }, [wsConnection]);

  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  useEffect(() => {
    onFileChangedRef.current = onFileChanged;
    onComponentsUpdateRef.current = onComponentsUpdate;
    onVersionAckRef.current = onVersionAck;
    onPromotedRef.current = onPromoted;
    onInitComponentRef.current = onInitComponent;
    onErrorRef.current = onError;
  }, [
    onFileChanged,
    onComponentsUpdate,
    onVersionAck,
    onPromoted,
    onInitComponent,
    onError,
  ]);

  // WebSocket connection function
  const connectWebSocket = useCallback(() => {
    // Don't create a new connection if we're already connected or connecting
    if (
      wsConnectionRef.current?.readyState === WebSocket.OPEN ||
      isConnectingRef.current
    ) {
      return;
    }

    const wsUrl = `ws://localhost:${port}/ws`;
    isConnectingRef.current = true;

    // Only show "connecting" status on first attempt or if we've successfully connected before
    // This prevents animation flashes during retry loops
    if (retryCountRef.current === 0 || hasEverConnectedRef.current) {
      setConnectionStatus("connecting");
    }
    retryCountRef.current++;

    const ws = new WebSocket(wsUrl);
    let hasConnected = false;

    ws.onopen = () => {
      hasConnected = true;
      hasEverConnectedRef.current = true;
      retryCountRef.current = 0; // Reset retry count on successful connection
      isConnectingRef.current = false;
      setConnectionStatus("connected");
      setWsConnection(ws);
      wsConnectionRef.current = ws;
      onFileChangedRef.current?.();
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      isConnectingRef.current = false;
      // Only mark as failed if we never successfully connected
      if (!hasConnected) {
        setConnectionStatus("failed");
      } else {
        setConnectionStatus("disconnected");
      }
      setWsConnection(null);
      wsConnectionRef.current = null;

      // Schedule reconnection attempt after 3 seconds (only if we should reconnect)
      if (shouldReconnectRef.current) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (shouldReconnectRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      // WebSocket error
      isConnectingRef.current = false;
      // Mark as failed if we haven't connected yet
      if (!hasConnected) {
        setConnectionStatus("failed");
      } else {
        setConnectionStatus("disconnected");
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "components" && data.payload?.components) {
          onComponentsUpdateRef.current?.(data.payload.components);
        } else if (data.type === "file_changed") {
          onFileChangedRef.current?.();
        } else if (data.type === "ack") {
          const message = data.payload?.message || "";

          // Handle init_component ack (has component but no version)
          if (data.payload?.component && !data.payload?.version) {
            if (message.includes("initialized component")) {
              onInitComponentRef.current?.(data.payload.component);
            }
            return;
          }

          // Handle version-related acks (has version field)
          if (data.payload?.version) {
            const newVersion = data.payload.newVersion;

            if (message.includes("promoted")) {
              const promotedComponent =
                data.payload.component || selectedComponentRef.current;
              onPromotedRef.current?.(promotedComponent);
              return;
            }

            onVersionAckRef.current?.({
              version: data.payload.version,
              message,
              newVersion,
            });
          }
        } else if (data.type === "error") {
          onErrorRef.current?.(data.payload?.message || "Unknown error");
        }
      } catch (error) {
        // Error parsing WebSocket message
      }
    };
  }, [port]);

  // Initial connection and reconnection polling
  useEffect(() => {
    shouldReconnectRef.current = true;
    retryCountRef.current = 0; // Reset retry count when port changes

    // Close any existing connection before creating a new one
    if (wsConnectionRef.current?.readyState === WebSocket.OPEN) {
      wsConnectionRef.current.close();
    }
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectWebSocket();

    return () => {
      // Prevent reconnection attempts during cleanup
      shouldReconnectRef.current = false;

      // Cleanup: close connection and clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsConnectionRef.current?.readyState === WebSocket.OPEN) {
        wsConnectionRef.current.close();
      }
    };
  }, [port, connectWebSocket]);

  // Send WebSocket message helper
  const sendMessage = useCallback(
    (type: WebSocketMessageType, payload: Record<string, unknown>) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(
          JSON.stringify({
            type,
            payload: { ...payload, component: selectedComponentRef.current },
          })
        );
      } else {
        // WebSocket not connected, cannot send message
      }
    },
    [wsConnection]
  );

  return {
    connectionStatus,
    sendMessage,
  };
}
