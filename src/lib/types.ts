export interface Lead {
  id: string;
  name: string;
  email: string;
  service_interest: string | null;
  message: string | null;
  priority: boolean | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string | null;
  slug: string;
  excerpt: string | null;
  status: 'draft' | 'published';
  author_id: string | null;
  featured_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentLog {
  id: string;
  agent: string;
  message: string;
  created_at: string;
}
