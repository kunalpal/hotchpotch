'use client';

import type { UIMessage } from 'ai';
import type { ChangeEvent, FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/ui';
import type { MockTrigger } from '@/lib/mock/mock-responses';

const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_AI === 'true';

const MOCK_TRIGGER_OPTIONS: Array<{
  trigger: MockTrigger;
  label: string;
  message: string;
}> = [
  {
    trigger: 'travel-itinerary',
    label: 'Itinerary',
    message: 'plan a trip to Japan',
  },
  { trigger: 'travel-map', label: 'Map', message: 'show me a map of Japan' },
  { trigger: 'budget', label: 'Budget', message: 'show me a budget breakdown' },
  { trigger: 'notes', label: 'Notes', message: 'open my notes' },
  { trigger: 'default', label: 'Default', message: 'hello' },
];

interface ChatPaneProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  sendDirectMessage: (msg: string) => void;
  className?: string;
}

export function ChatPane({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  sendDirectMessage,
  className,
}: ChatPaneProps) {
  return (
    <div
      className={cn(
        'border-border flex h-full flex-col overflow-hidden border-r',
        className
      )}
    >
      <ul className="m-0 flex flex-1 list-none flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message: UIMessage) => (
          <li
            key={message.id}
            className={cn(
              'max-w-[80%] rounded-lg px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground self-end'
                : 'bg-muted text-foreground self-start'
            )}
          >
            {message.parts
              .filter((p) => p.type === 'text')
              .map((p, i) => (
                <span key={i}>{p.text}</span>
              ))}
          </li>
        ))}
        {isLoading && (
          <li className="text-muted-foreground self-start text-xs">
            thinking…
          </li>
        )}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="border-border bg-card shrink-0 border-t p-3"
      >
        <div className="mx-auto flex w-full max-w-4xl items-end gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything…"
            rows={1}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {IS_MOCK_MODE ? (
            <ButtonGroup>
              <Button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" disabled={isLoading} className="px-2">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {MOCK_TRIGGER_OPTIONS.map(({ trigger, label, message }) => (
                    <DropdownMenuItem
                      key={trigger}
                      onClick={() => sendDirectMessage(message)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            <Button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
