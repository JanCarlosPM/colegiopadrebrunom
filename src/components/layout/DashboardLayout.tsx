import { Sidebar } from "./Sidebar";
import { PageHeader } from "@/components/common/PageHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <PageHeader title={title} subtitle={subtitle} />
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}