import type { ToolInvocation } from '../types.js';
import type { ChoiceSegment, InputSegment, PromptScript, PromptSegment, SaySegment, SummarySegment, ToolSegment } from './types.js';

export type PromptEvent =
  | { type: 'say'; segment: SaySegment }
  | { type: 'summary'; segment: SummarySegment }
  | { type: 'input'; segment: InputSegment }
  | { type: 'choice'; segment: ChoiceSegment }
  | { type: 'complete' };

export type InputValue = string;
export type ChoiceValue = string;

export interface ToolInvoker {
  <TInput, TOutput>(invocation: ToolInvocation<TInput>): Promise<TOutput>;
}

interface AwaitingState {
  kind: 'input' | 'choice';
  id: string;
  segment: InputSegment | ChoiceSegment;
}

export class PromptRunner {
  private index = 0;
  private awaiting: AwaitingState | null = null;
  private readonly inputValues = new Map<string, InputValue>();
  private readonly choiceValues = new Map<string, ChoiceValue>();
  private readonly toolResults = new Map<string, unknown>();
  private readonly segments: PromptSegment[];
  private closed = false;

  constructor(private readonly script: PromptScript, private readonly invokeTool: ToolInvoker) {
    this.segments = script.segments;
  }

  async next(): Promise<PromptEvent> {
    if (this.closed) {
      return { type: 'complete' };
    }
    if (this.awaiting) {
      // Caller must supply the expected input before continuing.
      const { segment, kind } = this.awaiting;
      return { type: kind, segment } as PromptEvent;
    }

    while (this.index < this.segments.length) {
      const segment = this.segments[this.index];
      this.index += 1;

      switch (segment.kind) {
      case 'say': {
        const resolvedSegment: SaySegment = {
          ...segment,
          text: this.resolveText(segment.text)
        };
        return { type: 'say', segment: resolvedSegment };
      }
      case 'summary':
        return { type: 'summary', segment };
      case 'input':
        this.awaiting = { kind: 'input', id: segment.id, segment };
        return { type: 'input', segment };
      case 'choice':
        this.awaiting = { kind: 'choice', id: segment.id, segment };
        return { type: 'choice', segment };
      case 'tool':
        await this.executeTool(segment);
        break;
      default:
        throw new Error(`Unsupported segment kind: ${(segment as PromptSegment).kind}`);
      }
    }

    this.closed = true;
    return { type: 'complete' };
  }

  submitInput(id: string, value: InputValue): void {
    this.ensureAwaiting('input', id);
    this.inputValues.set(id, value);
    this.awaiting = null;
  }

  submitChoice(id: string, value: ChoiceValue): void {
    this.ensureAwaiting('choice', id);
    this.choiceValues.set(id, value);
    this.awaiting = null;
  }

  private ensureAwaiting(kind: AwaitingState['kind'], id: string): void {
    if (!this.awaiting || this.awaiting.kind !== kind || this.awaiting.id !== id) {
      throw new Error(`PromptRunner is not awaiting ${kind} for '${id}'.`);
    }
  }

  private async executeTool(segment: ToolSegment): Promise<void> {
    const input = this.resolveValue(segment.input) as Record<string, unknown>;
    const invocation: ToolInvocation<Record<string, unknown>> = {
      name: segment.name,
      input
    };
    const result = await this.invokeTool(invocation);
    // Store by tool name (latest wins) and by sequential alias for disambiguation.
    this.toolResults.set(segment.name, result);
    this.toolResults.set(`${segment.name}#${this.index}`, result);
  }

  private resolveValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(v));
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    const obj = value as Record<string, unknown>;

    if ('fromInput' in obj) {
      const key = obj.fromInput as string;
      return this.inputValues.get(key);
    }
    if ('fromChoice' in obj) {
      const key = obj.fromChoice as string;
      return this.choiceValues.get(key);
    }
    if ('fromTool' in obj) {
      const key = obj.fromTool as string;
      const result = this.toolResults.get(key);
      if ('path' in obj && typeof obj.path === 'string') {
        const segments = obj.path.split('.').filter(Boolean);
        let current: unknown = result;
        for (const segment of segments) {
          if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[segment];
          } else {
            current = undefined;
            break;
          }
        }
        return current;
      }
      return result;
    }
    if ('literal' in obj) {
      return obj.literal;
    }
    if ('concat' in obj && Array.isArray(obj.concat)) {
      const parts = obj.concat.map(item => this.resolveValue(item));
      return parts.map(part => (part == null ? '' : String(part))).join('');
    }

    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      resolved[k] = this.resolveValue(v);
    }
    return resolved;
  }

  private resolveText(value: unknown): string {
    const resolved = this.resolveValue(value);
    if (typeof resolved === 'string') {
      return resolved;
    }
    if (resolved == null) {
      return '';
    }
    return String(resolved);
  }
}
