import type { Status } from "./status";

export interface Project {
  id?: string; // Ajout de l'id pour identifier le projet
  name: string;
  description?: string;
  github?: string;
  image?: string; // Sera retiré des endpoints principaux
  partners?: Array<{ username?: string; name?: string; githubUrl?: string }>;
  technologies?: string[];
  displayed?: boolean;
  demo?: string;
  status?: Status;
  screenshots?: string[]; // Sera retiré des endpoints principaux
  whatILearned?: string;
  longDescription?: string;
  problemsAndSolutions?: string;
  projectType?: "personal" | "school";
  order?: number;
  [key: string]: any;
}

// Type pour les données sans images (endpoints principaux)
export interface ProjectData extends Omit<Project, 'image' | 'screenshots'> {
  hasImage?: boolean;
  hasScreenshots?: boolean;
}

// Type pour les réponses d'images
export interface ProjectImages {
  id: string;
  image?: string;
  screenshots?: string[];
}
