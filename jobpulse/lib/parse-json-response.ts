/** Strip optional markdown code fences and parse JSON. */
export function parseJsonObject<T>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(s) as T;
}
