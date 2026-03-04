export interface Lead {
  id?: string;
  name: string;
  email: string;
  service_interest: string;
  message: string;
  priority?: boolean;
  created_at?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  created_at: string;
}

export interface AgentLog {
  id: string;
  agent: string;
  message: string;
  created_at: string;
}
