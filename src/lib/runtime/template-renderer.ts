export function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{data\.([^}]+)\}/g, (_, key: string) => {
    if (!(key in data)) {
      throw new Error(
        `Template slot "{data.${key}}" not found in sanitised data`
      );
    }
    return data[key];
  });
}
