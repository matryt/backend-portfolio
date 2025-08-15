export interface EducationItem {
  start?: number;
  end?: number;
  description: string;
  order?: number;
  school: string;
  [key: string]: any;
}

export interface JobItem {
  start?: number;
  end?: number;
  description: string;
  order?: number;
  company: string;
  [key: string]: any;
}
