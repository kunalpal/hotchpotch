'use server';

// Mock exchange rate server action.
// Returns 1.0 for all pairs until a real FX API is wired in (Task 26).
export async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number> {
  void from;
  void to;
  return 1.0;
}
