import { Skeleton } from "@/components/ui/Misc";

export default function Loading() {
  return (
    <div className="flex-1" aria-busy="true" aria-live="polite">
      <div className="h-14 border-b border-rule" />
      <div className="page max-w-content pt-12">
        <span className="sr-only">Loading</span>
        <Skeleton className="w-40" />
        <Skeleton className="mt-8 w-2/3" lines={2} />
        <Skeleton className="mt-16" lines={8} />
      </div>
    </div>
  );
}
