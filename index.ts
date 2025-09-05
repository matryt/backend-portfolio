import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { fetchProjects, getEducationItems, getJobs } from "./notion";
import { resetCacheByType } from "./sqliteCache";
import { t } from "elysia";

const app = new Elysia().use(cors());

app.get("/projects", async (context) => {
  try {
    console.log("Fetching projects...");
    const lang = context.query.lang || 'fr';
    const projects = await fetchProjects(lang as 'fr' | 'en');
    console.log(`Fetched ${projects.length} projects for language: ${lang}`);
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { error: "Failed to fetch projects" };
  }
});

app.get("/education", async (context) => {
  try {
    console.log("Fetching education...");
    const lang = context.query.lang || 'fr';
    const education = await getEducationItems(lang as 'fr' | 'en');
    console.log(`Fetched ${education.length} education items for language: ${lang}`);
    return education;
  } catch (error) {
    console.error("Error fetching education:", error);
    return { error: "Failed to fetch education" };
  }
});

app.get("/jobs", async (context) => {
  try {
    console.log("Fetching jobs...");
    const lang = context.query.lang || 'fr';
    const jobs = await getJobs(lang as 'fr' | 'en');
    console.log(`Fetched ${jobs.length} jobs for language: ${lang}`);
    return jobs;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return { error: "Failed to fetch jobs" };
  }
});

app.post("/cache/clear",
  ({ body }) => {
    resetCacheByType(body.type as "projects" | "education" | "jobs" | "all", body.lang);
    return { success: true, cleared: body.type, lang: body.lang ?? "all" };
  },
  {
    body: t.Object({
      type: t.Enum({ projects: "projects", education: "education", jobs: "jobs", all: "all" }),
      lang: t.Optional(t.String())
    })
  }
);

app.listen({
  port: 21000,
  idleTimeout: 30, // Augmente le timeout à 30 secondes
});

console.log("🦊 Server running on http://localhost:21000");