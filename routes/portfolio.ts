import { Elysia } from "elysia";
import { fetchProjects, getEducationItems, getJobs, fetchProjectImages, fetchProjectImagesBatch } from "../notion";
import { createCompressedResponse } from "../utils/compression";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config({ quiet: true });

// Rate limiter en mémoire pour la route /contact avec anonymisation de l'IP (RGPD)
const contactRateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_MESSAGES_PER_WINDOW = 3;

// Sel généré aléatoirement au démarrage ou lu depuis l'environnement
const IP_SALT = process.env.RATE_LIMIT_SALT || crypto.randomBytes(16).toString('hex');

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + IP_SALT).digest('hex');
}

function isContactRateLimited(rawIp: string): boolean {
  const ipKey = hashIp(rawIp);
  const now = Date.now();
  const timestamps = contactRateLimits.get(ipKey) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    contactRateLimits.set(ipKey, validTimestamps);
    return true;
  }
  validTimestamps.push(now);
  contactRateLimits.set(ipKey, validTimestamps);
  return false;
}

// Purge régulière des clés expirées pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of contactRateLimits.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      contactRateLimits.delete(key);
    } else {
      contactRateLimits.set(key, valid);
    }
  }
}, 60 * 60 * 1000).unref();

// Endpoints pour les données du portfolio (frontend)
export const portfolioRoutes = new Elysia({ prefix: '' })

  .get("/projects", async ({ query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const projects = await fetchProjects(lang);
    return await createCompressedResponse(projects, request);
  })

  .get("/project/:nameOrSlug", async ({ params, query, request }) => {
    const lang = query.lang as 'fr' | 'en' || 'fr';
    const target = decodeURIComponent(params.nameOrSlug).toLowerCase();
    const projects = await fetchProjects(lang);
    const project = projects.find(
      (p) => p.slug === target || p.name.toLowerCase() === target || p.id?.toLowerCase() === target
    );
    return await createCompressedResponse(project || null, request);
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

  .post('/contact', async ({ body, request, set }) => {
    const { name, email, message, honeypot } = (body || {}) as {
      name?: string;
      email?: string;
      message?: string;
      honeypot?: string;
    };

    // 1. Protection honeypot : si ce champ invisible est rempli, c'est un bot
    if (honeypot && honeypot.trim().length > 0) {
      set.status = 200;
      return { message: 'Message envoyé avec succès.' };
    }

    // 2. Rate limiting par IP (max 3 messages par tranche de 10 minutes)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";

    if (isContactRateLimited(clientIp)) {
      set.status = 429;
      return { message: 'Trop de requêtes. Veuillez patienter quelques minutes avant de renvoyer un message.' };
    }

    // 3. Validation de présence
    if (!name || !email || !message) {
      set.status = 400;
      return { message: 'Tous les champs sont requis.' };
    }

    // Nettoyage des retours à la ligne pour prévenir le Header Injection
    const cleanName = name.trim().replace(/[\r\n]+/g, " ");
    const cleanEmail = email.trim().replace(/[\r\n]+/g, "");
    const cleanMessage = message.trim();

    // 4. Validation des formats et longueurs
    if (cleanName.length < 2 || cleanName.length > 100) {
      set.status = 400;
      return { message: 'Le nom doit contenir entre 2 et 100 caractères.' };
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (cleanEmail.length > 150 || !EMAIL_REGEX.test(cleanEmail)) {
      set.status = 400;
      return { message: 'Veuillez saisir une adresse email valide.' };
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
      set.status = 400;
      return { message: 'Le message doit contenir entre 10 et 5000 caractères.' };
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.ionos.fr",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_SENDER,
      to: process.env.MAIL_RECIPIENT,
      replyTo: cleanEmail,
      subject: `Portfolio - Nouveau message de ${cleanName}`,
      text: `Nom: ${cleanName}\nEmail: ${cleanEmail}\n\nMessage:\n${cleanMessage}`,
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
