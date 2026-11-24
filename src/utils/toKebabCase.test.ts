import { describe, expect, it } from 'vite-plus/test';
import { toKebabCase } from './toKebabCase';

describe('toKebabCase', () => {
  it('builds the screenshot file name from a day description', () => {
    expect(toKebabCase('day-1-Amsterdam, Netherlands-Brussels, Belgium.png')).toBe(
      'day-1-amsterdam-netherlands-brussels-belgium-png',
    );
  });

  it('splits camelCase words', () => {
    expect(toKebabCase('fooBarBaz')).toBe('foo-bar-baz');
  });

  it('removes accents instead of splitting words', () => {
    expect(toKebabCase('Zürich, Kraków')).toBe('zurich-krakow');
  });

  it('returns an empty string when nothing is usable', () => {
    expect(toKebabCase('!!! ???')).toBe('');
  });
});
