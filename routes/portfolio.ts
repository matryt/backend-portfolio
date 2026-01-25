import { Elysia } from "elysia";
import { fetchProjects, getEducationItems, getJobs, fetchProjectImages, fetchProjectImagesBatch } from "../notion";
import { createCompressedResponse } from "../utils/compression";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

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
  })

  .post('/contact', async ({ body, set }) => {
    const { name, email, message } = body as { name: string; email: string; message: string };

    if (!name || !email || !message) {
      set.status = 400;
      return { message: 'Tous les champs sont requis.' };
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.ionos.fr",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_SENDER, // Expéditeur défini dans le .env
        pass: process.env.MAIL_PASSWORD, // Mot de passe défini dans le .env
      },
    });

    const mailOptions = {
      from: process.env.MAIL_SENDER,
      to: process.env.MAIL_RECIPIENT, // Destinataire défini dans le .env
      subject: `Portfolio - Nouveau message de ${name}`,
      text: `Nom: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      set.status = 200;
      return { message: 'Message envoyé avec succès.' };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      set.status = 500;
      return { message: 'Une erreur est survenue lors de l\'envoi du message.' };
    }
  });

export default portfolioRoutes;
