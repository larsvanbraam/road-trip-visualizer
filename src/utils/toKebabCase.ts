/**
 * Convert a string to a lowercase, dash separated file name
 */
export function toKebabCase(value: string): string {
  return (
    value
      // Turn "Zürich" into "Zurich" instead of splitting the word at the accent
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .match(/[A-Za-z\d]+/g)
      ?.join('-')
      .toLowerCase() ?? ''
  );
}
