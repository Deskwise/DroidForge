/**
 * Structured logging event for observability and auditability
 */
export interface LogEvent {
  timestamp: string;
  event: string;
  sessionId?: string;
  userInput?: string;
  rawAIResponse?: string;
  extractedData?: Record<string, any>;
  mergedSession?: any;
  details?: Record<string, any>;
}

/**
 * Log an event to the observability system
 * @param event - Event object to log
 */
export function logEvent(event: LogEvent): void {
  // TODO: Implement actual logging to .factory/sessions/<sessionId>.jsonl
  // For now, this is a placeholder that can be injected with actual implementation
  console.debug('[LOG]', JSON.stringify(event));
}
