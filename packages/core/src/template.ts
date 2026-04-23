import { isBarcodeObject, isTextObject, walkObjects } from './objects.js';
import { type LabelDocument } from './document.js';
import { type ValidationResult } from './types.js';

const PLACEHOLDER_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Substitute `{{placeholder}}` tokens in `template` with values from
 * `variables`. Case-insensitive lookup, whitespace around keys is trimmed.
 * Unknown placeholders are left as-is (rendered literally).
 */
export function applyTemplate(template: string, variables: Record<string, string>): string {
  const lowered: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    lowered[k.toLowerCase()] = v;
  }
  return template.replaceAll(PLACEHOLDER_RE, (match, keyRaw: string) => {
    const key = keyRaw.trim().toLowerCase();
    const value = lowered[key];
    return value ?? match;
  });
}

/**
 * Walk the document and return every `{{placeholder}}` key referenced
 * (across text content and barcode data), deduplicated and lowercased.
 */
export function extractPlaceholders(doc: LabelDocument): string[] {
  const found = new Set<string>();
  for (const o of walkObjects(doc.objects)) {
    if (isTextObject(o)) collectFromString(o.content, found);
    if (isBarcodeObject(o)) collectFromString(o.data, found);
  }
  return [...found].sort();
}

function collectFromString(input: string, out: Set<string>): void {
  for (const match of input.matchAll(PLACEHOLDER_RE)) {
    const key = match[1];
    if (key !== undefined) out.add(key.trim().toLowerCase());
  }
}

/**
 * Check a set of variables against the placeholders referenced by a document.
 * Reports missing (referenced but not supplied), unused (supplied but not
 * referenced), and any warnings.
 */
export function validateVariables(
  doc: LabelDocument,
  variables: Record<string, string>,
): ValidationResult {
  const referenced = new Set(extractPlaceholders(doc));
  const supplied = new Set(Object.keys(variables).map(k => k.toLowerCase()));

  const missing: string[] = [];
  for (const key of referenced) {
    if (!supplied.has(key)) missing.push(key);
  }
  const unused: string[] = [];
  for (const key of supplied) {
    if (!referenced.has(key)) unused.push(key);
  }

  const warnings: string[] = [];
  if (missing.length > 0) {
    warnings.push(
      `Missing variables will render as literal {{placeholder}} tokens: ${missing.join(', ')}`,
    );
  }

  return {
    valid: missing.length === 0,
    missing: missing.sort(),
    unused: unused.sort(),
    warnings,
  };
}

/**
 * Produce a new document with placeholders substituted. Deep-clones; does not
 * mutate the input. Only text content and barcode data are substituted.
 */
export function applyVariables(
  doc: LabelDocument,
  variables: Record<string, string>,
): LabelDocument {
  const cloned = structuredClone(doc);
  for (const o of walkObjects(cloned.objects)) {
    if (isTextObject(o)) o.content = applyTemplate(o.content, variables);
    if (isBarcodeObject(o)) o.data = applyTemplate(o.data, variables);
  }
  return cloned;
}
