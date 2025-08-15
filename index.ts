import { Elysia } from "elysia";
import { fetchProjects, getEducationItems, getJobs } from "./notion";

const app = new Elysia();

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