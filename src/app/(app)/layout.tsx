import { Sidebar } from "@/components/shell/Sidebar";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { getUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</div>
      <BottomTabs />
    </div>
  );
}
