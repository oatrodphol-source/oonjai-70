// Shared Types for OonJai Application

export type Role = 'admin' | 'rescue' | 'victim';
export type CaseStatus = 'wait' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Case {
  id: number;
  reporter_id?: number;
  reporter_name: string;
  reporter_phone: string;
  incident_type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  location_text?: string;
  status: CaseStatus;
  severity_level: number;
  rescuer_id?: number;
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentReport extends Case {
  people_count: number;
  water_level: string;
  bedridden_count: number;
  elderly_count: number;
  image_url?: string;
}

export interface News {
  id: number;
  author_id: number;
  title: string;
  content: string;
  image_url?: string;
  published: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_cases: number;
  completed_cases: number;
  waiting_cases: number;
  in_progress_cases: number;
  severity_distribution: Record<number, number>;
}
