export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-4 flex-1 min-h-0 h-full animate-pulse">
      {/* Left column skeleton */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="h-[92px] rounded-xl bg-gray-100" />
        <div className="h-[88px] rounded-xl bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="h-[120px] rounded-xl bg-gray-100" />
      </div>

      {/* Right column skeleton */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="h-[180px] rounded-xl bg-gray-100" />
        <div className="flex-1 rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}
