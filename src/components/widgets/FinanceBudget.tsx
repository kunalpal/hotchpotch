'use client';

import { useMemo, useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import type { TravelItineraryPayload } from '@/lib/widget-protocol';
import { fetchExchangeRate } from '@/lib/actions/fetch-exchange-rate';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  host: NativeWidgetHost;
}

// Extended payload type — output_processor enriches the itinerary with per-day
// cost hints (derived from destination data) before the widget receives it.
type BudgetPayload = TravelItineraryPayload & {
  costHints?: Record<string, number>;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];
const BASE_COST_PER_DAY = 200;

export function FinanceBudget({ host }: Props) {
  const { payload, sendAction } = useWidgetHost<BudgetPayload>(
    host,
    (envelope) => {
      if (envelope.type !== 'SKILL_INVOKE') return;
      const { skill_id, type, query } = envelope.payload as {
        skill_id: string;
        type: string;
        query: unknown;
      };
      if (type !== 'output_processor') return;

      // Derive per-day cost hints from the itinerary payload.
      // Mock: 200 USD/day for all destinations.
      const itinerary = query as TravelItineraryPayload | null;
      const costHints: Record<string, number> = {};
      if (itinerary?.days) {
        itinerary.days.forEach((day, i) => {
          costHints[`Day ${i + 1} — ${day.location}`] = BASE_COST_PER_DAY;
        });
      }

      host.receiveFromWidget({
        protocol: 'HOTCHPOTCH_WIDGET_V1' as const,
        message_id: crypto.randomUUID(),
        reply_to: null,
        type: 'SKILL_RESULT',
        timestamp: Date.now(),
        payload: {
          skill_id,
          type: 'output_processor',
          result: { ...itinerary, costHints },
        },
      });
    }
  );

  // User edits keyed by line-item label; defaults to costHints from output_processor
  const [userAmounts, setUserAmounts] = useState<Map<string, string>>(
    new Map()
  );
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(1.0);

  // Derive line items from payload + user overrides — no effect needed
  const lineItems = useMemo(() => {
    if (!payload?.days) return [];
    return payload.days.map((day, i) => {
      const label = `Day ${i + 1} — ${day.location}`;
      const defaultCost = payload.costHints?.[label] ?? BASE_COST_PER_DAY;
      return {
        label,
        amount: userAmounts.get(label) ?? String(defaultCost),
      };
    });
  }, [payload, userAmounts]);

  const handleCurrencyChange = async (next: string) => {
    const newRate = await fetchExchangeRate('USD', next);
    setRate(newRate);
    setCurrency(next);
    sendAction('CURRENCY_CHANGED', { currency: next });
  };

  const handleAmountBlur = (label: string, displayValue: string) => {
    // Convert from display currency back to USD for storage
    const usdAmount = String(parseFloat(displayValue) / rate || 0);
    setUserAmounts((prev) => new Map(prev).set(label, usdAmount));
    sendAction('LINE_EDITED', { item: label, amount: displayValue });
  };

  const total = lineItems.reduce(
    (sum, li) => sum + (parseFloat(li.amount) || 0) * rate,
    0
  );

  if (!payload) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Waiting for itinerary to generate budget…
      </div>
    );
  }

  return (
    <div className="p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Trip Budget</span>
        <Select
          value={currency}
          onValueChange={(v) => {
            void handleCurrencyChange(v);
          }}
        >
          <SelectTrigger className="h-8 w-24 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-border border-b-2">
            <th className="text-muted-foreground px-2 py-1.5 text-left text-xs font-medium">
              Item
            </th>
            <th className="text-muted-foreground px-2 py-1.5 text-right text-xs font-medium">
              Cost ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.label} className="border-border/50 border-b">
              <td className="px-2 py-1.5">{item.label}</td>
              <td className="px-2 py-1.5 text-right">
                <Input
                  type="number"
                  defaultValue={(parseFloat(item.amount) * rate).toFixed(2)}
                  onBlur={(e) => handleAmountBlur(item.label, e.target.value)}
                  className="h-7 w-20 text-right text-sm"
                  size="xs"
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="border-border border-t-2 px-2 py-2 font-semibold">
              Total
            </td>
            <td className="border-border border-t-2 px-2 py-2 text-right font-semibold">
              {currency} {total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
