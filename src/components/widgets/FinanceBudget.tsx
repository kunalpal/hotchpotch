'use client';

import { useMemo, useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import type { TravelItineraryPayload } from '@/lib/widget-protocol';
import { fetchExchangeRate } from '@/lib/actions/fetch-exchange-rate';

interface Props {
  host: NativeWidgetHost;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];
const BASE_COST_PER_DAY = 200;

export function FinanceBudget({ host }: Props) {
  const { payload, sendAction } = useWidgetHost<TravelItineraryPayload>(host);
  // User edits keyed by line-item label; defaults to BASE_COST_PER_DAY
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
      return {
        label,
        amount: userAmounts.get(label) ?? String(BASE_COST_PER_DAY),
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
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: '#aaa',
          fontSize: '14px',
        }}
      >
        Waiting for itinerary to generate budget…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontWeight: 600 }}>Trip Budget</span>
        <select
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #d0d0d0',
            fontSize: '13px',
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
            <th
              style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}
            >
              Item
            </th>
            <th
              style={{ textAlign: 'right', padding: '6px 8px', color: '#555' }}
            >
              Cost ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.label} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 8px' }}>{item.label}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                <input
                  type="number"
                  defaultValue={(parseFloat(item.amount) * rate).toFixed(2)}
                  onBlur={(e) => handleAmountBlur(item.label, e.target.value)}
                  style={{
                    width: '80px',
                    textAlign: 'right',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '13px',
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              style={{
                padding: '8px',
                fontWeight: 600,
                borderTop: '2px solid #e0e0e0',
              }}
            >
              Total
            </td>
            <td
              style={{
                padding: '8px',
                textAlign: 'right',
                fontWeight: 600,
                borderTop: '2px solid #e0e0e0',
              }}
            >
              {currency} {total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
