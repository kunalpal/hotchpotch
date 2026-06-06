import { BUILT_IN_CATALOGUE, selectWidgets } from '@/lib/widget-catalogue';
import { env } from '@/lib/env';
import { detectTrigger, mockWidgetIds } from '@/lib/mock/mock-responses';

void env;

const RequestSchema = {
  parse(body: unknown): { message: string } {
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).message !== 'string'
    ) {
      throw new Error('message must be a string');
    }
    return body as { message: string };
  },
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  let parsed: { message: string };
  try {
    parsed = RequestSchema.parse(body);
  } catch {
    return new Response('message must be a string', { status: 400 });
  }

  // When running with a mock AI, detect trigger from the message and return matching widgets
  if (process.env.MOCK_AI === 'true') {
    return Response.json({
      widget_ids: mockWidgetIds(detectTrigger(parsed.message)),
    });
  }

  const widgetIds = await selectWidgets(parsed.message, BUILT_IN_CATALOGUE);
  return Response.json({ widget_ids: widgetIds });
}
