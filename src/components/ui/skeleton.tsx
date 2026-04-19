import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

// Shimmer skeleton with animated gradient effect
function ShimmerSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="shimmer-skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted",
        className
      )}
      {...props}
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ width: '100%' }}
      />
    </div>
  )
}

// Card skeleton with shimmer effect
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-3", className)}>
      <ShimmerSkeleton className="h-4 w-3/4" />
      <ShimmerSkeleton className="h-4 w-1/2" />
      <ShimmerSkeleton className="h-8 w-full" />
    </div>
  )
}

// Stats card skeleton
function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-4 w-24" />
        <ShimmerSkeleton className="h-10 w-10 rounded-full" />
      </div>
      <ShimmerSkeleton className="h-8 w-20" />
      <ShimmerSkeleton className="h-3 w-32" />
    </div>
  )
}

// Table row skeleton
function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerSkeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-1/4" : i === columns - 1 ? "w-16" : "flex-1"
          )} 
        />
      ))}
    </div>
  )
}

// Dashboard stats grid skeleton
function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <ShimmerSkeleton className="h-3 w-20" />
              <ShimmerSkeleton className="h-7 w-16" />
            </div>
            <ShimmerSkeleton className="h-11 w-11 rounded-xl" />
          </div>
          <ShimmerSkeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

// Dashboard chart skeleton
function DashboardChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <ShimmerSkeleton className="h-5 w-40" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <ShimmerSkeleton className="h-3 w-16" />
              <ShimmerSkeleton className="h-3 w-8" />
            </div>
            <ShimmerSkeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Activity list skeleton
function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <ShimmerSkeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1">
            <ShimmerSkeleton className="h-4 w-32" />
            <ShimmerSkeleton className="h-3 w-20" />
          </div>
          <ShimmerSkeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Growth card skeleton
function GrowthCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-3 w-28" />
          <ShimmerSkeleton className="h-8 w-20" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
        <ShimmerSkeleton className="h-14 w-14 rounded-xl" />
      </div>
      <div className="mt-4 space-y-1">
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-16" />
          <ShimmerSkeleton className="h-3 w-8" />
        </div>
        <ShimmerSkeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  )
}

// System health skeleton
function SystemHealthSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <ShimmerSkeleton className="h-5 w-32" />
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <ShimmerSkeleton className="h-4 w-12" />
          <ShimmerSkeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-2.5 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <ShimmerSkeleton className="h-3 w-3 rounded-sm" />
                <ShimmerSkeleton className="h-2 w-10" />
              </div>
              <ShimmerSkeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Full dashboard skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ShimmerSkeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <ShimmerSkeleton className="h-7 w-48" />
            <ShimmerSkeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-9 w-24 rounded-md" />
          <ShimmerSkeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      
      {/* Stats skeleton */}
      <DashboardStatsSkeleton />
      
      {/* Charts row skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardChartSkeleton />
        <DashboardChartSkeleton />
        <SystemHealthSkeleton />
      </div>
      
      {/* Activity row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <ShimmerSkeleton className="h-5 w-40" />
          </div>
          <ActivityListSkeleton />
        </div>
        <div className="space-y-4">
          <GrowthCardSkeleton />
          <GrowthCardSkeleton />
        </div>
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  ShimmerSkeleton, 
  CardSkeleton, 
  StatsCardSkeleton, 
  TableRowSkeleton,
  DashboardStatsSkeleton,
  DashboardChartSkeleton,
  ActivityListSkeleton,
  GrowthCardSkeleton,
  SystemHealthSkeleton,
  DashboardSkeleton
}
