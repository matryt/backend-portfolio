import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { fetchProjects, getEducationItems, getJobs } from "./notion";

const app = new Elysia().use(cors());

app.get("/projects", async () => {
  try {
    console.log("Fetching projects...");
    const projects = await fetchProjects();
    console.log(`Fetched ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { error: "Failed to fetch projects" };
  }
});

app.get("/education", async () => {
  try {
    console.log("Fetching education...");
    const education = await getEducationItems();
    console.log(`Fetched ${education.length} education items`);
    return education;
  } catch (error) {
    console.error("Error fetching education:", error);
    return { error: "Failed to fetch education" };
  }
});

app.get("/jobs", async () => {
  try {
    console.log("Fetching jobs...");
    const jobs = await getJobs();
    console.log(`Fetched ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return { error: "Failed to fetch jobs" };
  }
});

app.listen({
  port: 21000,
  idleTimeout: 30, // Augmente le timeout à 30 secondes
});

console.log("🦊 Server running on http://localhost:21000");