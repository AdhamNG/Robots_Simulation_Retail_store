/**
 * Parse a fetch Response as JSON without throwing on empty or non-JSON bodies.
 * @param {Response} res
 * @param {{ allowEmpty?: boolean }} [options]  If true, empty body returns null (e.g. some REST writes).
 */
export async function readJsonResponse(res, options = {}) {
  const { allowEmpty = false } = options;
  const text = await res.text();
  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    if (allowEmpty) return null;
    throw new Error(
      `Empty response from server (${res.status} ${res.statusText || 'Error'}). Check deploy /api/multiset proxy and MultiSet API availability.`,
    );
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(
      `Expected JSON but got (${res.status}): ${trimmed.slice(0, 160)}${trimmed.length > 160 ? '…' : ''}`,
    );
  }
}
