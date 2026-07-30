export default function DashboardLoading() {
  return (
    <div className="mx-auto grid min-h-full w-full max-w-[1500px] grid-cols-1 gap-4 animate-pulse xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
      {/* Left column skeleton */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="h-[92px] rounded-xl bg-card" />
        <div className="h-[88px] rounded-xl bg-card" />
        <div className="h-32 rounded-xl bg-card" />
        <div className="h-[120px] rounded-xl bg-card" />
      </div>

      {/* Right column skeleton */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="h-[180px] rounded-xl bg-card" />
        <div className="flex-1 rounded-xl bg-card" />
      </div>
    </div>
  )
}
