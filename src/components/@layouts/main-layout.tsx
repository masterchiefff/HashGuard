"use client";

import Sidebar from "../@shared-components/sidebar";

export default function MainLayout({ children, routeName }: { children: React.ReactNode, routeName: string }) {

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar routeName={routeName} />

        {/* Main Content */}
        <div className="flex-1 p-6 ml-64 overflow-y-auto h-screen">
            {children}
        </div>
    </div>
  );
}