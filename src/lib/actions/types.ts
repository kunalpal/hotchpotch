export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ErrorCode };

export function isActionSuccess<T>(
  result: ActionResult<T>
): result is { success: true; data: T } {
  return result.success === true;
}

export function isActionError<T>(
  result: ActionResult<T>
): result is { success: false; error: string; code?: ErrorCode } {
  return result.success === false;
}

export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (isActionSuccess(result)) {
    return result.data;
  }
  throw new Error(result.error);
}
