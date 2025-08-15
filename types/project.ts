export interface Project {
  name: string;
  description?: string;
  github?: string;
  image?: string;
  partners?: Array<{ username?: string; name?: string; githubUrl?: string }>;
  technologies?: string[];
  displayed?: boolean;
  [key: string]: any;
}
