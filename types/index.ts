// Shared Types for OonJai Application

export type Role = 'admin' | 'rescue' | 'victim';
export type CaseStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

export interface User {
  id: number;
  username?: string;
  name: string;
  email?: string;
  phone?: string;
  agency?: string;
  address?: string;
  province?: string;
  skills_equipment?: string;
  id_card_number?: string;
  role: Role | string;
  status: 'active' | 'inactive' | 'suspended' | string;
  is_online?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Volunteer {
  id: number;
  username: string;
  name: string;
  phone: string;
  agency?: string;
  address?: string;
  province?: string;
  skills_equipment?: string;
  id_card_number?: string;
  role: string;
  status: string;
  is_online?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Case {
  id: number | string;
  case_number?: string;
  name?: string;
  phone?: string;
  type?: string;
  severity?: number;
  people_count?: number;
  water_level?: string;
  bedridden_count?: number;
  elderly_count?: number;
  latitude?: number;
  longitude?: number;
  details?: string;
  status: CaseStatus;
  image_url?: string;
  volunteer_id?: number | string;
  assigned_volunteer_name?: string;
  assigned_volunteer_unit?: string;
  assigned_volunteer_phone?: string;
  destination?: string;
  rescuer_id?: number | string;
  rescuer_name?: string;
  rescuer_phone?: string;
  admin_note?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
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
