import dotenv from "dotenv";
import type { NotionDatabaseResult, NotionPageProperties } from "./types/notionTypes";
import type { PersonDetails } from "./types/person";
import type { Project } from "./types/project";
import type { EducationItem, JobItem } from "./types/dataTypes";
import {
  isRelationProperty,
  isRichTextProperty,
  isCheckboxProperty,
  isNumberProperty,
  isDateProperty,
  isTitleProperty,
  extractRichText,
  extractTitle,
  getTimestamp,
  isStatusProperty,
  getStatus,
  isSelectProperty,
  getProjectType,
} from "./types/notionTypes";
import { Status } from "./types/status";

dotenv.config({ quiet: true });

const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) throw new Error("NOTION_TOKEN is required in environment");

const DATABASES = {
  projects: process.env.NOTION_DB_PROJECTS || "",
  education: process.env.NOTION_DB_EDUCATION || "",
  jobs: process.env.NOTION_DB_JOBS || "",
} as const;

async function fetchFromDatabase(name: keyof typeof DATABASES): Promise<NotionPageProperties[]> {
  const databaseId = DATABASES[name];

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);

  const data = (await res.json()) as NotionDatabaseResult;
  return data.results.map((r) => r.properties);
}

async function fetchFromPage(pageId: string): Promise<NotionPageProperties> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch page ${pageId}: ${res.status}`);
  const data = (await res.json()) as { properties: NotionPageProperties };
  return data.properties;
}

async function getPersonDetails(personId: string): Promise<PersonDetails> {
  const props = await fetchFromPage(personId);
  const username = extractRichText(props["Nom d'utilisateur"]);
  const name = extractTitle(props.Nom) ?? "";
  const githubUrl = (props.Github && (props.Github as any).url) || "";
  return { username, name, githubUrl };
}

async function getTechnologyDetails(technologyId: string): Promise<string> {
  const props = await fetchFromPage(technologyId);
  return extractTitle(props.Nom) ?? "";
}


export async function fetchProjects(): Promise<Project[]> {
  const projectsDetails = await fetchFromDatabase("projects");
  const out: Project[] = [];

  for (const raw of projectsDetails) {
    const project: Project = {
      partners: raw["Réalisé avec"] && isRelationProperty(raw["Réalisé avec"])
        ? await Promise.all(raw["Réalisé avec"].relation.map((r) => getPersonDetails(r.id)))
        : [],
      description: raw.Description && isRichTextProperty(raw.Description)
        ? extractRichText(raw.Description)
        : "",
      github: raw.Github && "url" in raw.Github ? raw.Github.url || "" : "",
      image: raw.Illustration && "files" in raw.Illustration
        ? raw.Illustration.files[0]?.file?.url || ""
        : "",
      displayed: raw["Affiché"] && isCheckboxProperty(raw["Affiché"])
        ? raw["Affiché"].checkbox
        : false,
      technologies: raw["Technologies"] && isRelationProperty(raw["Technologies"])
        ? await Promise.all(raw["Technologies"].relation.map((t) => getTechnologyDetails(t.id)))
        : [],
      name: raw.Nom && isTitleProperty(raw.Nom)
        ? extractTitle(raw.Nom) || ""
        : "",
        demo: raw["Démonstration"] && "url" in raw["Démonstration"] ? raw["Démonstration"].url || "" : "",
        status: raw.Statut && isStatusProperty(raw.Statut)
          ? getStatus(raw.Statut.status.name || "")
          : Status.paused,
        screenshots: raw["Captures d'écran"] && "files" in raw["Captures d'écran"]
          ? raw["Captures d'écran"].files.map((f: any) => f.file?.url).filter(Boolean)
          : [],
        whatILearned: raw["Ce que j'ai appris"] && isRichTextProperty(raw["Ce que j'ai appris"])
          ? extractRichText(raw["Ce que j'ai appris"])
          : "",
        longDescription: raw["Description détaillée"] && isRichTextProperty(raw["Description détaillée"])
          ? extractRichText(raw["Description détaillée"])
          : "",
        problemsAndSolutions: raw["Problèmes et solutions"] && isRichTextProperty(raw["Problèmes et solutions"])
          ? extractRichText(raw["Problèmes et solutions"])
          : "",
        projectType: raw["Type de projet"] && isSelectProperty(raw["Type de projet"])
          ? getProjectType(raw["Type de projet"].select.name || "")
          : "personal"
    };

    out.push(project);
  }

  return out;
}

export async function getEducationItems(): Promise<EducationItem[]> {
  const items = await fetchFromDatabase("education");
  const out: EducationItem[] = [];

  for (const item of items) {
    const obj: EducationItem = {
      start: item["Début"] && isNumberProperty(item["Début"])
        ? item["Début"].number
        : undefined,
      end: item.Fin && isNumberProperty(item.Fin)
        ? item.Fin.number
        : undefined,
      description: item.Description && isRichTextProperty(item.Description)
        ? extractRichText(item.Description)
        : "",
      order: item.Ordre && isNumberProperty(item.Ordre)
        ? item.Ordre.number
        : undefined,
      school: item.Etablissement && isTitleProperty(item.Etablissement)
        ? extractTitle(item.Etablissement) || ""
        : "",
    };

    out.push(obj);
  }

  return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getJobs(): Promise<JobItem[]> {
  const jobs = await fetchFromDatabase("jobs");
  const out: JobItem[] = [];

  for (const job of jobs) {
    const obj: JobItem = {
      start: job["Début"] && isDateProperty(job["Début"]) && job["Début"].date
        ? getTimestamp(job["Début"].date.start)
        : undefined,
      end: job.Fin && isDateProperty(job.Fin) && job.Fin.date
        ? getTimestamp(job.Fin.date.start)
        : undefined,
      description: job.Description && isRichTextProperty(job.Description)
        ? extractRichText(job.Description)
        : "",
      order: job.Ordre && isNumberProperty(job.Ordre)
        ? job.Ordre.number
        : undefined,
      company: job["Entreprise"] && isTitleProperty(job["Entreprise"])
        ? extractTitle(job["Entreprise"]) || ""
        : "",
      title: job["Intitulé"] && isRichTextProperty(job["Intitulé"])
        ? extractRichText(job["Intitulé"]) || ""
        : "",
    };

    out.push(obj);
  }

  return out.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}


