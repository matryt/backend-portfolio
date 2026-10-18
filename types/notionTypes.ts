import type { Status as StatusType } from "./status";
import { Status } from "./status";

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

export interface NotionStatusSelect {
  name: string;
  color: string;
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
  | { status?: NotionStatusSelect }
  | { select?: NotionStatusSelect }
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

export function isStatusProperty(prop: NotionProperty): prop is { status: NotionStatusSelect } {
  return "status" in prop;
}

export function isSelectProperty(prop: NotionProperty): prop is { select: NotionStatusSelect } {
  return "select" in prop;
}

export function extractRichText(prop: any): string {
  if (!prop) return "";
  const arr = prop.rich_text as Array<any> | undefined;
  if (!arr || arr.length === 0) return "";

  return arr
    .map((item) => {
      const content = item.text?.content || item.plain_text || "";
      if (!content) return "";

      const annotations = item.annotations;
      const linkUrl = item.text?.link?.url || item.href;

      const hasAnnotations =
        Boolean(annotations?.code) ||
        Boolean(annotations?.bold) ||
        Boolean(annotations?.italic) ||
        Boolean(annotations?.strikethrough) ||
        Boolean(linkUrl);

      if (!hasAnnotations) {
        return content;
      }

      // Traiter ligne par ligne pour préserver les sauts de ligne et les préfixes de blocs (listes, titres)
      return content
        .split("\n")
        .map((line) => {
          if (!line) return "";

          // Préserver les préfixes de listes ou de titres si l'utilisateur a tout sélectionné
          const blockPrefixMatch = line.match(/^(\s*(?:[-*]\s+|\d+\.\s+|#{2,4}\s+))/);
          const blockPrefix = blockPrefixMatch ? blockPrefixMatch[0] : "";
          const afterBlock = line.slice(blockPrefix.length);

          const leadingSpace = afterBlock.match(/^\s*/)?.[0] || "";
          const trailingSpace = afterBlock.match(/\s*$/)?.[0] || "";
          let trimmed = afterBlock.trim();

          if (!trimmed) {
            return line;
          }

          if (annotations?.code) {
            trimmed = `\`${trimmed}\``;
          }
          if (annotations?.bold && annotations?.italic) {
            trimmed = `***${trimmed}***`;
          } else if (annotations?.bold) {
            trimmed = `**${trimmed}**`;
          } else if (annotations?.italic) {
            trimmed = `*${trimmed}*`;
          }
          if (annotations?.strikethrough) {
            trimmed = `~~${trimmed}~~`;
          }
          if (linkUrl) {
            trimmed = `[${trimmed}](${linkUrl})`;
          }

          return `${blockPrefix}${leadingSpace}${trimmed}${trailingSpace}`;
        })
        .join("\n");
    })
    .join("");
}

export function extractTitle(prop: any): string | undefined {
  if (!prop) return undefined;
  const arr = prop.title as Array<any> | undefined;
  if (!arr || arr.length === 0) return undefined;
  return arr.map((item) => item.text?.content || item.plain_text || "").join("");
}

export function getTimestamp(date: string) {
  return Date.parse(date);
}

export function getStatus(status: string): StatusType {
  switch (status) {
    case "En cours":
      return Status.inProgress;
    case "Terminé":
      return Status.completed;
    case "En pause":
      return Status.paused;
    case "Abandonné":
      return Status.cancelled;
    case "Partiellement fonctionnel":
      return Status.waiting_maj;
    default:
      throw new Error(`Unknown status: ${status}`);
  }
}

export function getProjectType(typ: string) {
  return typ === "Personnel" ? "personal" : "school";
}

/**
 * Analyse une propriété de lien qui peut être :
 * - Une URL Notion standard
 * - Un texte enrichi contenant une URL
 * - Un texte enrichi contenant un lien Markdown [texte](url)
 * - Un texte enrichi contenant une mention/restriction (ex: "Dépôt privé (projet client / convention associative)")
 * - Ou complété par une colonne dédiée de note/statut
 */
export function parseLinkAndNote(
  urlOrTextProp: any,
  dedicatedNoteProp?: any
): { url: string; note?: string } {
  let url = "";
  let note: string | undefined = undefined;

  if (urlOrTextProp) {
    if ("url" in urlOrTextProp && urlOrTextProp.url) {
      url = String(urlOrTextProp.url).trim();
    } else if (isRichTextProperty(urlOrTextProp)) {
      const rawText = extractRichText(urlOrTextProp).trim();
      if (rawText) {
        // Lien Markdown [texte](url) suivi d'une note optionnelle
        const mdMatch = rawText.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(?:\s*(.*))?$/);
        if (mdMatch) {
          url = mdMatch[2].trim();
          const extra = mdMatch[3]?.trim();
          if (extra) {
            note = extra.replace(/^\((.*)\)$/, "$1").trim();
          }
        } else {
          // URL suivie d'une note optionnelle
          const urlMatch = rawText.match(/^(https?:\/\/[^\s]+)(?:\s+(.*))?$/);
          if (urlMatch) {
            url = urlMatch[1].trim();
            const extra = urlMatch[2]?.trim();
            if (extra) {
              note = extra.replace(/^\((.*)\)$/, "$1").trim();
            }
          } else {
            // Texte brut informatif (ex: "Dépôt privé (projet client / convention associative)")
            note = rawText;
          }
        }
      }
    }
  }

  // Colonne dédiée (prioritaire si renseignée)
  if (dedicatedNoteProp && isRichTextProperty(dedicatedNoteProp)) {
    const dedicatedNote = extractRichText(dedicatedNoteProp).trim();
    if (dedicatedNote) {
      note = dedicatedNote;
    }
  }

  return { url, note: note || undefined };
}
