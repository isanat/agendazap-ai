export interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  isActive: boolean
}

export interface Professional {
  id: string
  name: string
  phone?: string
  email?: string
  avatar?: string
  color: string
  isActive: boolean
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  totalAppointments: number
  noShowCount: number
  noShowScore: number
  lastVisit?: Date
  notes?: string
}

export interface Appointment {
  id: string
  clientId: string
  client: Client
  serviceId: string
  service: Service
  professionalId: string
  professional: Professional
  datetime: Date
  endTime: Date
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
  notes?: string
}

export interface DashboardStats {
  todayAppointments: number
  weekAppointments: number
  monthRevenue: number
  noShowRate: number
  lostRevenue: number
  occupancyRate: number
}

export interface TimeSlot {
  time: string
  available: boolean
  appointment?: Appointment
}

export interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  appointments: Appointment[]
}
