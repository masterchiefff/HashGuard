"use client";
import { useRouter } from "next/navigation";
import { Shield, User, Wallet, FileText, File, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Sidebar({ routeName }: { routeName: string }) {
    const router = useRouter();
    const { pathname } = router; 

    const handleLogout = () => {
        toast.success("Logged out successfully");
        localStorage.clear();
        router.push("/login");
    };

    // Helper function to determine if a menu item is active (exact match)
    const isActive = (path: string) => pathname === path;

    return (
        <div className="w-64 bg-[#1A202C] border-r border-gray-700 p-4 flex flex-col fixed h-screen">
            {/* Logo/Title */}
            <div className="flex items-center mb-8">
                <Shield className="h-8 w-8 mr-2 text-blue-500" />
                <h1 className="text-xl font-bold text-white">Boda Shield</h1>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1 overflow-y-auto">
                {/* Overview */}
                <Button
                    onClick={() => router.push("/")}
                    className={`w-full flex items-center p-2 rounded !justify-start ${
                        isActive("/") ? "bg-blue-600 text-blue-800" : "text-gray-300 hover:bg-gray-600"
                    }`}
                    variant="ghost"
                >
                    <User
                        className={`h-5 w-5 mr-2 ${
                            isActive("/") ? "text-blue-800" : "text-gray-400"
                        }`}
                    />
                    <span>Overview</span>
                </Button>

                {/* Policies */}
                <Button
                    onClick={() => router.push("/policies")}
                    className={`w-full flex items-center p-2 rounded !justify-start ${
                        isActive("/policies") ? "bg-blue-600 text-blue-800" : "text-gray-300 hover:bg-gray-600"
                    }`}
                    variant="ghost"
                >
                    <FileText
                        className={`h-5 w-5 mr-2 ${
                            isActive("/policies") ? "text-blue-800" : "text-gray-400"
                        }`}
                    />
                    <span>Policies</span>
                </Button>

                {/* Claims */}
                <Button
                    onClick={() => router.push("/claims")}
                    className={`w-full flex items-center p-2 rounded !justify-start ${
                        isActive("/claims") ? "bg-blue-600 text-blue-800" : "text-gray-300 hover:bg-gray-600"
                    }`}
                    variant="ghost"
                >
                    <File
                        className={`h-5 w-5 mr-2 ${
                            isActive("/claims") ? "text-blue-800" : "text-gray-400"
                        }`}
                    />
                    <span>Claims</span>
                </Button>

                {/* Crypto Wallet */}
                <Button
                    onClick={() => router.push("/crypto-wallet")}
                    className={`w-full flex items-center p-2 rounded !justify-start ${
                        isActive("/crypto-wallet") ? "bg-blue-600 text-blue-800" : "text-gray-300 hover:bg-gray-600"
                    }`}
                    variant="ghost"
                >
                    <Wallet
                        className={`h-5 w-5 mr-2 ${
                            isActive("/wallet") ? "text-blue-800" : "text-gray-400"
                        }`}
                    />
                    <span>Wallet</span>
                </Button>

                {/* Logout */}
                <Button
                    onClick={handleLogout}
                    className="w-full flex items-center p-2 text-gray-300 hover:bg-gray-600 rounded !justify-start"
                    variant="ghost"
                >
                    <LogOut className="h-5 w-5 mr-2 text-gray-400" />
                    <span>Logout</span>
                </Button>
            </nav>
        </div>
    );
}