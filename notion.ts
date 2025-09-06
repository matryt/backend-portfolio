import dotenv from "dotenv";
import { getCache, setCache } from "./sqliteCache";
import type { NotionDatabaseResult, NotionPageProperties } from "./types/notionTypes";
import type { PersonDetails } from "./types/person";
import type { Project, ProjectData, ProjectImages } from "./types/project";
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

// Helper pour convertir le code langue en filtre Notion
function getLanguageFilter(lang: 'fr' | 'en') {
  return lang === 'fr' ? 'French' : 'English';
}

async function fetchFromDatabase(name: keyof typeof DATABASES, lang?: 'fr' | 'en'): Promise<NotionPageProperties[]> {
  const databaseId = DATABASES[name];

  // Construire le body de la requête avec filtre optionnel
  const requestBody: any = {};
  if (lang) {
    requestBody.filter = {
      property: "Language",
      select: {
        equals: getLanguageFilter(lang)
      }
    };
  }

  // Timeout compatible Node.js avec timeout plus long
  try {
    const startTime = Date.now();
    
    const res = await Promise.race([
      fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify(requestBody),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetching ${name} from Notion (after 20s)`)), 20000)) // Augmenté à 20s
    ]);

    const duration = Date.now() - startTime;

    if (!(res instanceof Response)) throw res;
    if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);

    const data = (await res.json()) as NotionDatabaseResult;
    return data.results.map((r) => r.properties);
  } catch (error) {
    throw error;
  }
}

async function fetchFromPage(pageId: string): Promise<NotionPageProperties> {
  try {
    const res = await Promise.race([
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetching page ${pageId} from Notion`)), 10000))
    ]);

    if (!(res instanceof Response)) throw res;
    if (!res.ok) throw new Error(`Failed to fetch page ${pageId}: ${res.status}`);
    const data = (await res.json()) as { properties: NotionPageProperties };
    return data.properties;
  } catch (error) {
    throw error;
  }
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


export async function fetchProjects(lang: 'fr' | 'en' = 'fr'): Promise<ProjectData[]> {
  const cacheKey = `projects_${lang}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return cached.sort((a: ProjectData, b: ProjectData) => (a.order ?? 0) - (b.order ?? 0)) as ProjectData[];
  }
  
  const projectsDetails = await fetchFromDatabase("projects", lang);
  const out: ProjectData[] = [];

  for (const raw of projectsDetails) {
    const projectName = raw.Nom && isTitleProperty(raw.Nom) ? extractTitle(raw.Nom) || "" : "";
    const project: ProjectData = {
      id: projectName, // Utiliser le nom comme ID
      partners: raw["Réalisé avec"] && isRelationProperty(raw["Réalisé avec"])
        ? await Promise.all(raw["Réalisé avec"].relation.map((r) => getPersonDetails(r.id)))
        : [],
      description: raw.Description && isRichTextProperty(raw.Description)
        ? extractRichText(raw.Description)
        : "",
      github: raw.Github && "url" in raw.Github ? raw.Github.url || "" : "",
      hasImage: raw.Illustration && "files" in raw.Illustration && raw.Illustration.files.length > 0,
      displayed: raw["Affiché"] && isCheckboxProperty(raw["Affiché"])
        ? raw["Affiché"].checkbox
        : false,
      technologies: raw["Technologies"] && isRelationProperty(raw["Technologies"])
        ? await Promise.all(raw["Technologies"].relation.map((t) => getTechnologyDetails(t.id)))
        : [],
      name: projectName,
      demo: raw["Démonstration"] && "url" in raw["Démonstration"] ? raw["Démonstration"].url || "" : "",
      status: raw.Statut && isStatusProperty(raw.Statut)
        ? getStatus(raw.Statut.status.name || "")
        : Status.paused,
      hasScreenshots: raw["Captures d'écran"] && "files" in raw["Captures d'écran"] && raw["Captures d'écran"].files.length > 0,
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
        : "personal",
      order: raw.Ordre && isNumberProperty(raw.Ordre)
        ? raw.Ordre.number
        : undefined,
    };

    out.push(project);
  }

  setCache(cacheKey, out);
  return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Cache temporaire en mémoire pour les images (URLs avec expiration)
const imageCache = new Map<string, { data: ProjectImages, timestamp: number }>();
const IMAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes en millisecondes

// Nouvelle fonction pour récupérer les images d'un projet en temps réel
export async function fetchProjectImages(projectName: string, lang: 'fr' | 'en' = 'fr'): Promise<ProjectImages | null> {
  try {
    // Vérifier le cache temporaire d'images
    const cacheKey = `images_${projectName}_${lang}`;
    const cached = imageCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < IMAGE_CACHE_DURATION) {
      return cached.data;
    }
    const projectsDetails = await fetchFromDatabase("projects", lang);
    
    const projectData = projectsDetails.find((raw) => {
      const name = raw.Nom && isTitleProperty(raw.Nom) ? extractTitle(raw.Nom) : "";
      return name === projectName;
    });

    if (!projectData) return null;

    const image = projectData.Illustration && "files" in projectData.Illustration
      ? projectData.Illustration.files[0]?.file?.url || ""
      : "";
    
    const screenshots = projectData["Captures d'écran"] && "files" in projectData["Captures d'écran"]
      ? projectData["Captures d'écran"].files.map((f: any) => f.file?.url).filter(Boolean)
      : [];

    const result = {
      id: projectName,
      image,
      screenshots,
    };

    // Sauvegarder dans le cache temporaire
    imageCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    return null;
  }
}

// Fonction pour récupérer les images de plusieurs projets en batch
export async function fetchProjectImagesBatch(projectNames: string[], lang: 'fr' | 'en' = 'fr'): Promise<ProjectImages[]> {
  try {
    // Vérifier quels projets sont déjà en cache
    const results: ProjectImages[] = [];
    const projectsToFetch: string[] = [];
    
    for (const projectName of projectNames) {
      const cacheKey = `images_${projectName}_${lang}`;
      const cached = imageCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < IMAGE_CACHE_DURATION) {
        results.push(cached.data);
      } else {
        projectsToFetch.push(projectName);
      }
    }
    
    // Fetch seulement les projets non cachés
    if (projectsToFetch.length > 0) {
      const projectsDetails = await fetchFromDatabase("projects", lang);
      
      for (const projectName of projectsToFetch) {
        const projectData = projectsDetails.find((raw) => {
          const name = raw.Nom && isTitleProperty(raw.Nom) ? extractTitle(raw.Nom) : "";
          return name === projectName;
        });

        if (projectData) {
          const image = projectData.Illustration && "files" in projectData.Illustration
            ? projectData.Illustration.files[0]?.file?.url || ""
            : "";
          
          const screenshots = projectData["Captures d'écran"] && "files" in projectData["Captures d'écran"]
            ? projectData["Captures d'écran"].files.map((f: any) => f.file?.url).filter(Boolean)
            : [];

          const result = {
            id: projectName,
            image,
            screenshots,
          };
          
          // Sauvegarder dans le cache temporaire
          const cacheKey = `images_${projectName}_${lang}`;
          imageCache.set(cacheKey, { data: result, timestamp: Date.now() });
          
          results.push(result);
        }
      }
    }

    return results;
  } catch (error) {
    return [];
  }
}

export async function getEducationItems(lang: 'fr' | 'en' = 'fr'): Promise<EducationItem[]> {
  const cacheKey = `education_${lang}`;
    const cached = getCache(cacheKey);
  if (cached) return (cached as EducationItem[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const educationDetails = await fetchFromDatabase("education", lang);
  const out: EducationItem[] = [];

  for (const item of educationDetails) {
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

    setCache(cacheKey, out);
  return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getJobs(lang: 'fr' | 'en' = 'fr'): Promise<JobItem[]> {
  const cacheKey = `jobs_${lang}`;
  const cached = getCache(cacheKey);
  if (cached) return (cached as JobItem[]).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const jobs = await fetchFromDatabase("jobs", lang);
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
      companyUrl: job.Site && "url" in job.Site ? job.Site.url || "" : "",
    };

    out.push(obj);
  }

    setCache(cacheKey, out);
  return out.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}


