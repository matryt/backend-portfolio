import type { Status } from "./status";

export interface Project {
  name: string;
  description?: string;
  github?: string;
  image?: string;
  partners?: Array<{ username?: string; name?: string; githubUrl?: string }>;
  technologies?: string[];
  displayed?: boolean;
  demo?: string;
  status?: Status;
  screenshots?: string[];
  whatILearned?: string;
  longDescription?: string;
  problemsAndSolutions?: string;
  projectType?: "personal" | "school";
  [key: string]: any;
}
