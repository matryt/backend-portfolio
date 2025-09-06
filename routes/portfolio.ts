import { Elysia } from "elysia";
import { fetchProjects, getEducationItems, getJobs, fetchProjectImages, fetchProjectImagesBatch } from "../notion";
import { createCompressedResponse } from "../utils/compression";

// Endpoints pour les données du portfolio (frontend)
export const portfolioRoutes = new Elysia({ prefix: '' })

  .get("/projects", async ({ query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const projects = await fetchProjects(lang);
    return await createCompressedResponse(projects, request);
  })

  .get("/education", async ({ query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const education = await getEducationItems(lang);
    return await createCompressedResponse(education, request);
  })

  .get("/jobs", async ({ query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const jobs = await getJobs(lang);
    return await createCompressedResponse(jobs, request);
  })

  .get("/project-image/:name", async ({ params, query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const projectName = decodeURIComponent(params.name);
    const images = await fetchProjectImages(projectName, lang);
    return await createCompressedResponse(images, request);
  })

  .post("/project-images-batch", async ({ body, query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const { projectNames } = body as { projectNames: string[] };
    if (!Array.isArray(projectNames)) {
      return { error: "projectNames must be an array" };
    }
    const images = await fetchProjectImagesBatch(projectNames, lang);
    return await createCompressedResponse(images, request);
  });
