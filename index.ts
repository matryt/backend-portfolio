import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { fetchProjects, getEducationItems, getJobs } from "./notion";

const app = new Elysia().use(cors());

app.get("/projects", async () => {
  return await fetchProjects();
});

app.get("/education", async () => {
  return await getEducationItems();
});

app.get("/jobs", async () => {
  return await getJobs();
});

app.listen(21000);