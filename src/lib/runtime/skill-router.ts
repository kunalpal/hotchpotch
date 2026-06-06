import { v4 as uuidv4 } from 'uuid';
import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetHost } from '@/lib/runtime/widget-host';

const SKILL_TIMEOUT_MS = 3000;

interface PendingSkill {
  resolve: (result: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Routes user messages through widget-registered skills before and after
 * model inference.
 *
 * Phase 3 implementation covers:
 *   - context_injector: widgets append context lines to the system prompt
 *   - intent_interceptor: widgets handle an intent fully, skipping model call
 *   - output_processor: widgets enrich render_widget payloads post-model
 */
export class SkillRouter {
  private pending = new Map<string, PendingSkill>();

  constructor(private readonly hosts: Map<string, WidgetHost>) {}

  /**
   * Fires all registered context_injector skills whose triggers match the
   * user message. Returns context strings to prepend to the system prompt.
   */
  async runContextInjectors(userMessage: string): Promise<string[]> {
    const results: string[] = [];
    const promises: Promise<void>[] = [];

    for (const host of this.hosts.values()) {
      if (host.status !== 'ready') continue;

      for (const skill of host.manifest.skills) {
        if (skill.type !== 'context_injector') continue;
        const triggers = skill.triggers?.intents ?? [];
        if (!this.messageMatchesTriggers(userMessage, triggers)) continue;

        const skillId = `${host.panelId}__context_injector`;
        promises.push(
          this.invokeSkill(host, skillId, 'context_injector', userMessage).then(
            (result) => {
              if (typeof result === 'string' && result.length > 0) {
                results.push(result);
              }
            }
          )
        );
      }
    }

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Checks if any intent_interceptor skill handles the user message fully.
   * Returns the intercept result (canned response + widget payload) or null.
   */
  async runInterceptors(userMessage: string): Promise<{
    panelId: string;
    response: string;
    widgetPayload: unknown;
  } | null> {
    for (const host of this.hosts.values()) {
      if (host.status !== 'ready') continue;

      for (const skill of host.manifest.skills) {
        if (skill.type !== 'intent_interceptor') continue;
        const triggers = skill.triggers?.intents ?? [];
        if (!this.messageMatchesTriggers(userMessage, triggers)) continue;

        const skillId = `${host.panelId}__intent_interceptor`;
        const result = await this.invokeSkill(
          host,
          skillId,
          'intent_interceptor',
          userMessage
        ).catch(() => null);

        if (result && typeof result === 'object' && result !== null) {
          const r = result as { response?: string; payload?: unknown };
          return {
            panelId: host.panelId,
            response: r.response ?? 'On it.',
            widgetPayload: r.payload ?? null,
          };
        }
      }
    }
    return null;
  }

  /**
   * Runs the output_processor skill for a given panel before its payload is
   * delivered to the widget sandbox. Returns the enriched payload.
   */
  async runOutputProcessor(
    panelId: string,
    payload: unknown
  ): Promise<unknown> {
    const host = this.hosts.get(panelId);
    if (!host || host.status !== 'ready') return payload;

    const processorSkill = host.manifest.skills.find(
      (s) => s.type === 'output_processor'
    );
    if (!processorSkill) return payload;

    const skillId = `${panelId}__output_processor`;
    const result = await this.invokeSkill(
      host,
      skillId,
      'output_processor',
      payload
    ).catch(() => null);

    return result ?? payload;
  }

  /** Called by RuntimeManager when a SKILL_RESULT envelope arrives */
  handleSkillResult(envelope: InboundEnvelope): void {
    if (envelope.type !== 'SKILL_RESULT') return;
    const { skill_id, result } = envelope.payload;
    const pending = this.pending.get(skill_id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(skill_id);
    pending.resolve(result);
  }

  private invokeSkill(
    host: WidgetHost,
    skillId: string,
    type: string,
    query: unknown
  ): Promise<unknown> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(skillId);
        resolve(null);
      }, SKILL_TIMEOUT_MS);

      this.pending.set(skillId, { resolve, timer });

      host.send({
        protocol: PROTOCOL_VERSION,
        message_id: uuidv4(),
        reply_to: null,
        type: 'SKILL_INVOKE',
        timestamp: Date.now(),
        payload: {
          skill_id: skillId,
          type,
          query,
          context: {},
          timeout_ms: SKILL_TIMEOUT_MS,
        },
      });
    });
  }

  private messageMatchesTriggers(message: string, triggers: string[]): boolean {
    if (triggers.length === 0) return false;
    const lower = message.toLowerCase();
    return triggers.some((t) => lower.includes(t.toLowerCase()));
  }
}
