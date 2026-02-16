import { Sidebar } from "./Sidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {(title || subtitle) && (
            <div className="page-header animate-fade-in">
              <div>
                {title && <h1 className="page-title">{title}</h1>}
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
              </div>
            </div>
          )}
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}