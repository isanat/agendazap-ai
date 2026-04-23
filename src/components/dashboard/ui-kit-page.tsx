'use client'

import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import {
  AIInsightsWidget,
  AIInsightsMini,
} from '@/components/dashboard/ai-insights-widget'
import {
  GoalsProgressWidget,
  GoalsProgressMini,
} from '@/components/dashboard/goals-progress-widget'
import {
  StatsComparisonWidget,
  MiniComparison,
} from '@/components/dashboard/stats-comparison-widget'
import {
  ClientJourneyTimeline,
  ClientJourneyMini,
} from '@/components/dashboard/client-journey-timeline'
import {
  ServicePopularityWidget,
  ServicePopularityMini,
} from '@/components/dashboard/service-popularity-widget'
import {
  TeamPerformanceWidget,
  TeamPerformanceMini,
} from '@/components/dashboard/team-performance-widget'
import {
  NotificationPreferencesWidget,
  NotificationPreferencesMini,
} from '@/components/dashboard/notification-preferences-widget'
import {
  AppointmentConflictsWidget,
  AppointmentConflictsMini,
} from '@/components/dashboard/appointment-conflicts-widget'
import {
  RevenueForecastWidget,
  RevenueForecastMini,
} from '@/components/dashboard/revenue-forecast-widget'
import {
  WeeklyScheduleOverview,
  WeeklyScheduleMini,
} from '@/components/dashboard/weekly-schedule-overview'
import {
  ClientRetentionAnalytics,
  ClientRetentionMini,
} from '@/components/dashboard/client-retention-analytics'
import {
  QuickReportsGenerator,
  QuickReportsMini,
} from '@/components/dashboard/quick-reports-generator'
import {
  SmartSuggestionsWidget,
  SmartSuggestionsMini,
} from '@/components/dashboard/smart-suggestions-widget'
import {
  ClientBirthdayTracker,
  ClientBirthdayMini,
} from '@/components/dashboard/client-birthday-tracker'
import {
  MarketingCampaignWidget,
  MarketingCampaignMini,
} from '@/components/dashboard/marketing-campaign-widget'
import {
  AIServiceRecommendations,
  AIServiceRecommendationsMini,
} from '@/components/dashboard/ai-service-recommendations'
import {
  InventoryTrackerWidget,
  InventoryTrackerMini,
} from '@/components/dashboard/inventory-tracker-widget'
import {
  StaffScheduleWidget,
  StaffScheduleMini,
} from '@/components/dashboard/staff-schedule-widget'
import {
  FinancialHealthWidget,
  FinancialHealthMini,
} from '@/components/dashboard/financial-health-widget'
import {
  CustomerFeedbackWidget,
  CustomerFeedbackMini,
} from '@/components/dashboard/customer-feedback-widget'
import {
  LoyaltyProgramWidget,
  LoyaltyProgramMini,
} from '@/components/dashboard/loyalty-program-widget'
import {
  CompetitorAnalysisWidget,
  CompetitorAnalysisMini,
} from '@/components/dashboard/competitor-analysis-widget'
import {
  WaitlistManagementWidget,
  WaitlistManagementMini,
} from '@/components/dashboard/waitlist-management-widget'
import {
  PromotionalCodesWidget,
  PromotionalCodesMini,
} from '@/components/dashboard/promotional-codes-widget'
import {
  RevenueBreakdownWidget,
  RevenueBreakdownMini,
} from '@/components/dashboard/revenue-breakdown-widget'
import {
  SocialMediaWidget,
  SocialMediaMini,
} from '@/components/dashboard/social-media-widget'
import {
  AppointmentRemindersWidget,
  AppointmentRemindersMini,
} from '@/components/dashboard/appointment-reminders-widget'
import {
  PerformanceMetricsWidget,
  PerformanceMetricsMini,
} from '@/components/dashboard/performance-metrics-widget'
import {
  RealtimeMetricsWidget,
  RealtimeMetricsMini,
} from '@/components/dashboard/realtime-metrics-widget'
import {
  RealtimeActivityFeed,
  MiniActivityFeed,
} from '@/components/dashboard/realtime-activity-feed'
import {
  QuickStatusBanner,
  StatusBanner,
} from '@/components/dashboard/announcement-banner'

/** Wrapper that adds a "dados estáticos" badge to each widget */
function WidgetCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-0 shadow-sm overflow-hidden">
      {/* Badge */}
      <div className="absolute top-2 right-2 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/25">
          <Package className="h-2.5 w-2.5" />
          dados estáticos
        </span>
      </div>

      {/* Widget title strip */}
      <div className="px-4 pt-3 pb-0">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      </div>

      {/* Widget content */}
      <div className="p-2">{children}</div>
    </div>
  )
}

export function UiKitPage() {
  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">UI Kit</h1>
            <p className="text-sm text-muted-foreground">
              Widgets decorativos com dados estáticos — removidos do dashboard
              principal. Todos os dados exibidos são fictícios e servem apenas
              como referência visual.
            </p>
          </div>
        </div>
      </div>

      {/* ── Full-size widgets ─────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Widgets Completo
        </h2>

        {/* Row 1 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <WidgetCard title="AI Insights">
            <AIInsightsWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Goals Progress">
            <GoalsProgressWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Stats Comparison">
            <StatsComparisonWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 2 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <WidgetCard title="Client Journey Timeline">
            <ClientJourneyTimeline accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Service Popularity">
            <ServicePopularityWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Team Performance">
            <TeamPerformanceWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 3 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <WidgetCard title="Notification Preferences">
            <NotificationPreferencesWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Appointment Conflicts">
            <AppointmentConflictsWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Revenue Forecast">
            <RevenueForecastWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 4 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WidgetCard title="Weekly Schedule Overview">
            <WeeklyScheduleOverview accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Client Retention Analytics">
            <ClientRetentionAnalytics accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Quick Reports Generator">
            <QuickReportsGenerator accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 5 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <WidgetCard title="Smart Suggestions">
            <SmartSuggestionsWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Client Birthday Tracker">
            <ClientBirthdayTracker accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Marketing Campaign">
            <MarketingCampaignWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 6 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <WidgetCard title="AI Service Recommendations">
            <AIServiceRecommendations accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Inventory Tracker">
            <InventoryTrackerWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Staff Schedule">
            <StaffScheduleWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 7 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <WidgetCard title="Financial Health">
            <FinancialHealthWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Customer Feedback">
            <CustomerFeedbackWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Loyalty Program">
            <LoyaltyProgramWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 8 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <WidgetCard title="Competitor Analysis">
            <CompetitorAnalysisWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Waitlist Management">
            <WaitlistManagementWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Promotional Codes">
            <PromotionalCodesWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 9 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <WidgetCard title="Revenue Breakdown">
            <RevenueBreakdownWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Social Media">
            <SocialMediaWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Appointment Reminders">
            <AppointmentRemindersWidget accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 10 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <WidgetCard title="Performance Metrics">
            <PerformanceMetricsWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Realtime Metrics">
            <RealtimeMetricsWidget accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Realtime Activity Feed">
            <RealtimeActivityFeed accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Row 11 – Banners */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <WidgetCard title="Quick Status Banner">
            <QuickStatusBanner />
          </WidgetCard>
          <WidgetCard title="Status Banner">
            <StatusBanner />
          </WidgetCard>
          <div /> {/* empty cell to balance the row */}
        </motion.div>
      </div>

      {/* ── Mini / Compact variants ───────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Mini / Compactos
        </h2>

        {/* Mini Row 1 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <WidgetCard title="AI Insights Mini">
            <AIInsightsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Goals Progress Mini">
            <GoalsProgressMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Mini Comparison">
            <MiniComparison accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 2 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <WidgetCard title="Client Journey Mini">
            <ClientJourneyMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Service Popularity Mini">
            <ServicePopularityMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Team Performance Mini">
            <TeamPerformanceMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 3 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <WidgetCard title="Notification Preferences Mini">
            <NotificationPreferencesMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Appointment Conflicts Mini">
            <AppointmentConflictsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Revenue Forecast Mini">
            <RevenueForecastMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 4 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <WidgetCard title="Weekly Schedule Mini">
            <WeeklyScheduleMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Client Retention Mini">
            <ClientRetentionMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Quick Reports Mini">
            <QuickReportsMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 5 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <WidgetCard title="Smart Suggestions Mini">
            <SmartSuggestionsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Client Birthday Mini">
            <ClientBirthdayMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Marketing Campaign Mini">
            <MarketingCampaignMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 6 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <WidgetCard title="AI Service Recommendations Mini">
            <AIServiceRecommendationsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Inventory Tracker Mini">
            <InventoryTrackerMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Staff Schedule Mini">
            <StaffScheduleMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 7 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <WidgetCard title="Financial Health Mini">
            <FinancialHealthMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Customer Feedback Mini">
            <CustomerFeedbackMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Loyalty Program Mini">
            <LoyaltyProgramMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 8 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
        >
          <WidgetCard title="Competitor Analysis Mini">
            <CompetitorAnalysisMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Waitlist Management Mini">
            <WaitlistManagementMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Promotional Codes Mini">
            <PromotionalCodesMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 9 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <WidgetCard title="Revenue Breakdown Mini">
            <RevenueBreakdownMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Social Media Mini">
            <SocialMediaMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Appointment Reminders Mini">
            <AppointmentRemindersMini accountId={undefined} />
          </WidgetCard>
        </motion.div>

        {/* Mini Row 10 */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
        >
          <WidgetCard title="Performance Metrics Mini">
            <PerformanceMetricsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Realtime Metrics Mini">
            <RealtimeMetricsMini accountId={undefined} />
          </WidgetCard>
          <WidgetCard title="Mini Activity Feed">
            <MiniActivityFeed accountId={undefined} />
          </WidgetCard>
        </motion.div>
      </div>
    </motion.div>
  )
}
