// ── Enums ────────────────────────────────────────────────────
export type PlanType      = 'free' | 'paid'
export type UserRole      = 'superadmin' | 'admin' | 'cashier'
export type CounterStatus = 'open' | 'closed' | 'break'
export type SessionStatus = 'active' | 'closed'
export type TicketStatus  = 'waiting' | 'called' | 'serving' | 'done' | 'skipped' | 'noshow'
export type EventType     = 'issued' | 'called' | 'skipped' | 'serving' | 'done' | 'noshow' | 'recalled'

// ── Entities ─────────────────────────────────────────────────
export interface Tenant {
  id:               string
  slug:             string
  business_name:    string
  logo_url:         string | null
  primary_color:    string
  secondary_color:  string
  accent_color:     string
  font_family:      string
  welcome_message:  string | null
  queue_prefix:     string
  plan:             PlanType
  is_active:        boolean
  timezone:         string
  created_at:       string
  updated_at:       string
}

export interface User {
  id:            string
  tenant_id:     string | null
  email:         string
  full_name:     string
  role:          UserRole
  is_active:     boolean
  last_login_at: string | null
  created_at:    string
  updated_at:    string
}

export interface Counter {
  id:               string
  tenant_id:        string
  assigned_user_id: string | null
  counter_number:   number
  label:            string | null
  status:           CounterStatus
  is_active:        boolean
  opened_at:        string | null
  closed_at:        string | null
  created_at:       string
  updated_at:       string
  // joined
  assigned_user?:   User
}

export interface QueueSession {
  id:                  string
  tenant_id:           string
  session_date:        string
  last_number_issued:  number
  status:              SessionStatus
  opened_at:           string
  closed_at:           string | null
  created_at:          string
  updated_at:          string
}

export interface QueueTicket {
  id:                 string
  session_id:         string
  tenant_id:          string
  served_by_counter:  string | null
  ticket_number:      number
  display_code:       string
  first_name:         string
  last_name:          string
  status:             TicketStatus
  customer_token:     string
  issued_at:          string
  called_at:          string | null
  served_at:          string | null
  completed_at:       string | null
  wait_seconds:       number | null
  serve_seconds:      number | null
  created_at:         string
  updated_at:         string
  // joined
  counter?:           Counter
}

export interface TicketEvent {
  id:            string
  ticket_id:     string
  actor_user_id: string | null
  event_type:    EventType
  metadata:      Record<string, unknown> | null
  occurred_at:   string
  created_at:    string
}

export interface DisplayScreen {
  id:           string
  tenant_id:    string
  access_token: string
  label:        string | null
  location:     string | null
  is_active:    boolean
  last_seen_at: string | null
  created_at:   string
  updated_at:   string
}

export interface QrCode {
  id:              string
  tenant_id:       string
  code_hash:       string
  label:           string | null
  destination_url: string
  scan_count:      number
  is_active:       boolean
  created_at:      string
  updated_at:      string
}

export interface AuditLog {
  id:          string
  tenant_id:   string | null
  user_id:     string | null
  action:      string
  entity_type: string | null
  entity_id:   string | null
  old_value:   Record<string, unknown> | null
  new_value:   Record<string, unknown> | null
  ip_address:  string | null
  occurred_at: string
  created_at:  string
  // joined
  user?:       User
}
