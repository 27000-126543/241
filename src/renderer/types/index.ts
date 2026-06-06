export interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
  security_level: number;
  status: string;
}

export interface Event {
  id: number;
  name: string;
  venue_id: number;
  venue_name?: string;
  participant_count: number;
  estimated_duration: number;
  required_equipment: string;
  security_level: number;
  status: string;
}

export interface Referee {
  id: number;
  name: string;
  qualification: string;
  expertise: string;
  phone: string;
  status: string;
}

export interface Schedule {
  id: number;
  event_id: number;
  event_name?: string;
  venue_id: number;
  venue_name?: string;
  referee_id: number;
  referee_name?: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface Task {
  id: number;
  schedule_id: number;
  start_time?: string;
  end_time?: string;
  event_name?: string;
  venue_name?: string;
  assignee_type: string;
  assignee_id: number;
  assignee_name: string;
  task_type: string;
  description: string;
  status: string;
  created_at: string;
}

export interface TaskAdjustment {
  id: number;
  task_id: number;
  task_description?: string;
  assignee_name?: string;
  applicant_id: number;
  reason: string;
  proposed_changes: string;
  status: string;
  reviewed_by?: number;
  review_note?: string;
  created_at: string;
}

export interface MatchStatus {
  id: number;
  schedule_id: number;
  start_time?: string;
  event_name?: string;
  venue_name?: string;
  status: string;
  actual_start?: string;
  actual_end?: string;
  notes?: string;
  updated_at: string;
}

export interface MatchResult {
  id: number;
  schedule_id: number;
  athlete_name: string;
  score: string;
  rank: number;
  fouls: number;
  notes?: string;
}

export interface EmergencyIncident {
  id: number;
  schedule_id: number;
  event_name?: string;
  venue_name?: string;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  notified_medical: boolean;
  notified_security: boolean;
  created_at: string;
}

export interface SecurityZone {
  id: number;
  name: string;
  venue_id: number;
  venue_name?: string;
  capacity_threshold: number;
  coordinates: string;
  current_people?: number;
  personnel_count?: number;
  utilization?: number;
}

export interface SecurityPersonnel {
  id: number;
  name: string;
  rank: string;
  phone: string;
  current_zone_id?: number;
  zone_name?: string;
  status: string;
}

export interface PatrolSchedule {
  id: number;
  zone_id: number;
  zone_name?: string;
  personnel_id: number;
  personnel_name?: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface CrowdData {
  id: number;
  zone_id: number;
  zone_name?: string;
  capacity_threshold?: number;
  timestamp: string;
  people_count: number;
  anomaly_detected: boolean;
}

export interface Alarm {
  id: number;
  zone_id: number;
  zone_name?: string;
  alarm_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  venue_id: number;
  venue_name?: string;
  usage_hours: number;
  last_maintenance?: string;
  status: string;
}

export interface MaintenanceWorkOrder {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  venue_name?: string;
  description: string;
  priority: string;
  assigned_team?: string;
  status: string;
  parts_used?: string;
  created_at: string;
}

export interface SparePart {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  min_stock: number;
}

export interface StatisticsOverview {
  totalParticipants: number;
  totalRevenue: number;
  equipmentFailureRate: number;
  avgSatisfaction: number;
  eventsByVenue: { venue: string; count: number }[];
  eventsByType: { event_name: string; count: number }[];
}
