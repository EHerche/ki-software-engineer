import { describe, expect, it } from 'vitest';
import { requiredBookText } from './book-form.model';

describe('Unit: required book text', () => {
  it.each(['', ' ', '\t\n', '\u00a0'])('rejects blank text %j', value => {
    expect(requiredBookText(value)).toEqual({ kind: 'required' });
  });

  it.each(['A', '  Title  ', 'Über Bücher', '0'])('accepts meaningful text %j without modifying it', value => {
    expect(requiredBookText(value)).toBeNull();
  });
});
