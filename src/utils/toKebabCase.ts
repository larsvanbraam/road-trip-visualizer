/**
 * Convert a string to a lowercase, dash separated file name
 */
export function toKebabCase(value: string): string {
  return (
    value
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .match(/[A-Za-z\d]+/g)
      ?.join('-')
      .toLowerCase() ?? ''
  );
}
