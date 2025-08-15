export interface NotionRichText {
  type: 'text' | string;
  text: { content: string };
}

export interface NotionTitle {
  type: 'title' | string;
  text: { content: string };
}

export interface NotionUrl {
  url?: string;
}

export interface NotionFile {
  name?: string;
  file?: { url: string };
}

export interface NotionRelation {
  id: string;
}

export type NotionProperty =
  | { rich_text: NotionRichText[] }
  | { title: NotionTitle[] }
  | { url?: string }
  | { files?: NotionFile[] }
  | { relation?: NotionRelation[] }
  | { checkbox?: boolean }
  | { number?: number }
  | { date?: { start: string } }
  | Record<string, any>;

export interface NotionPageProperties {
  [key: string]: NotionProperty;
}

export interface NotionDatabaseResult {
  results: Array<{ properties: NotionPageProperties }>;
}

export function isRelationProperty(prop: NotionProperty): prop is { relation: NotionRelation[] } {
  return "relation" in prop;
}

export function isRichTextProperty(prop: NotionProperty): prop is { rich_text: NotionRichText[] } {
  return "rich_text" in prop;
}

export function isCheckboxProperty(prop: NotionProperty): prop is { checkbox: boolean } {
  return "checkbox" in prop;
}

export function isNumberProperty(prop: NotionProperty): prop is { number: number } {
  return "number" in prop;
}

export function isDateProperty(prop: NotionProperty): prop is { date: { start: string } } {
  return "date" in prop;
}

export function isTitleProperty(prop: NotionProperty): prop is { title: NotionTitle[] } {
  return "title" in prop;
}

export function extractRichText(prop: any): string {
  if (!prop) return "";
  const arr = prop.rich_text as Array<any> | undefined;
  if (!arr || arr.length === 0) return "";
  return arr[0].text?.content || "";
}

export function extractTitle(prop: any): string | undefined {
  if (!prop) return undefined;
  const arr = prop.title as Array<any> | undefined;
  if (!arr || arr.length === 0) return undefined;
  return arr[0].text?.content;
}

export function getTimestamp(date: string) {
  return Date.parse(date);
}
