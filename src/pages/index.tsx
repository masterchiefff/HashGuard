"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, CreditCard, LogOut, FileText, ArrowRight, File, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";

interface User {
  phone: string;
  name: string;
  email: string;
  wallet: string;
  idNumber: string;
  riderId: string;
  isFromLocalStorage?: boolean;
}

interface Policy {
  _id: string;
  protectionType: "rider" | "bike";
  active: boolean;
  expiryDate: string;
  createdAt: string;
  hbarAmount?: number;
  premiumPaid?: number;
}

interface Claim {
  _id: string;
  createdAt: string;
  premium?: number;
  status: string;
}

interface OverviewData {
  riderId: string;
  fullName: string;
  policyActive: boolean;
  nextPaymentDue: string;
  nextBill: number;
  walletBalance: number;
  hptBalance: number;
  recentActivities: { type: string; date: string; amount: number; status?: string }[];
}

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5300";

  const defaultOverviewData: OverviewData = {
    riderId: "N/A",
    fullName: "User",
    policyActive: false,
    nextPaymentDue: "N/A",
    nextBill: 0,
    walletBalance: 0,
    hptBalance: 0,
    recentActivities: [],
  };

  useEffect(() => {
    const isRegistered = localStorage.getItem("isRegistered");
    if (!isRegistered || isRegistered !== "true") {
      toast.error("Session Expired", {
        description: "Please log in to continue.",
      });
      router.push("/login");
      return;
    }

    const phone = localStorage.getItem("userPhone") || "";
    if (phone) {
      fetchOverviewData(phone);
    } else {
      toast.error("Session Expired", {
        description: "No phone number found. Please log in again.",
      });
      router.push("/login");
    }
  }, [router]);

  const fetchOverviewData = async (phone: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching overview data...");

    try {
      // Fetch wallet balance
      const walletResponse = await axios.post<{ walletBalance: number }>(
        `${API_BASE_URL}/wallet-balance`,
        { phone },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      // Fetch policies
      const policiesResponse = await axios.post<{ policies: Policy[] }>(
        `${API_BASE_URL}/policies`,
        { phone, page: 1, limit: 100 },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      // Fetch claims
      const claimsResponse = await axios.post<{ claims: Claim[] }>(
        `${API_BASE_URL}/claims`,
        { phone },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const policies = policiesResponse.data.policies || [];
      const claims = claimsResponse.data.claims || [];

      // Determine insurance status
      const activePolicies = policies.filter(
        (policy) => policy.active && new Date(policy.expiryDate) > new Date()
      );
      const policyActive = activePolicies.length > 0;
      const nextPaymentDue = policyActive
        ? activePolicies
            .map((policy) => new Date(policy.expiryDate))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0]
            .toLocaleDateString()
        : "N/A";
      const nextBill = policyActive
        ? activePolicies.reduce((sum: number, policy: Policy) => {
            return sum + (policy.hbarAmount ? policy.hbarAmount * 12.9 : policy.premiumPaid || 0);
          }, 0)
        : 0;

      // Combine policies and claims into recent activities
      const recentActivities = [
        ...policies.map((policy) => ({
          type: `Policy Created (${policy.protectionType === "rider" ? "Rider" : "Bike"})`,
          date: new Date(policy.createdAt).toLocaleString(),
          amount: policy.hbarAmount ? policy.hbarAmount * 12.9 : policy.premiumPaid || 0,
          status: policy.active && new Date(policy.expiryDate) > new Date() ? "Active" : "Expired",
        })),
        ...claims.map((claim) => ({
          type: "Claim Filed",
          date: new Date(claim.createdAt).toLocaleString(),
          amount: claim.premium || 0,
          status: claim.status || "Pending",
        })),
      ].sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const fullName = localStorage.getItem("userName") || "User";
      const riderId = localStorage.getItem("riderId") || "N/A";

      setUser({
        phone,
        name: fullName,
        email: localStorage.getItem("userEmail") || "",
        wallet: localStorage.getItem("userWallet") || "",
        idNumber: localStorage.getItem("userId") || "",
        riderId,
      });

      setOverviewData({
        riderId,
        fullName,
        policyActive,
        nextPaymentDue,
        nextBill,
        walletBalance: walletResponse.data.walletBalance || 0,
        hptBalance: 0, // Adjust if HPT balance is available from API
        recentActivities,
      });

      toast.success("Overview Loaded", {
        description: "Your account overview is up to date",
        id: loadingToast,
      });
    } catch (error: any) {
      let description = "Please try again later";
      if (error.code === "ERR_NAME_NOT_RESOLVED") {
        description = "Unable to connect to the server. Please check your internet connection or contact support.";
      } else if (error.response) {
        description = error.response.status === 400
          ? error.response.data.error
          : error.response.data?.error || error.message;
      } else if (error.request) {
        description = "No response from the server. Please check your network connection.";
      } else {
        description = error.message;
      }

      const phone = localStorage.getItem("userPhone") || "";
      const name = localStorage.getItem("userName") || "";
      const email = localStorage.getItem("userEmail") || "";
      const wallet = localStorage.getItem("userWallet") || "";
      const idNumber = localStorage.getItem("userId") || "";
      const riderId = localStorage.getItem("riderId") || "";

      if (phone && name && riderId) {
        setUser({
          phone,
          name,
          email,
          wallet,
          idNumber,
          riderId,
          isFromLocalStorage: true,
        });

        setOverviewData({
          ...defaultOverviewData,
          riderId,
          fullName: name,
        });

        toast.warning("Using Cached Data", {
          description: "Failed to fetch latest data from the server. Displaying cached data instead.",
          id: loadingToast,
        });
      } else {
        toast.error("Failed to Load Overview", {
          description,
          id: loadingToast,
        });
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPremium = () => {
    router.push("/policies");
  };

  const handleClaim = () => {
    router.push("/claims");
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out", { description: "You have been logged out successfully" });
    router.push("/login");
  };

  if (!user || !overviewData) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const displayData = overviewData || defaultOverviewData;

  return (
    <MainLayout routeName="/">
      <h2 className="text-2xl font-bold mb-2 text-white">
        Welcome, {displayData.fullName}!
      </h2>
      <p className="text-gray-400 mb-2">Rider ID: {displayData.riderId}</p>
      <p className="text-gray-400 mb-6">
        Here's an overview of your Boda Shield account.
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Insurance Status Card */}
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Insurance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Policy Active:</span>
              <span className={displayData.policyActive ? "text-green-500" : "text-red-500"}>
                {displayData.policyActive ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Next Payment Due:</span>
              <span className="text-white">{displayData.nextPaymentDue}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-400">Next Bill:</span>
              <span className="text-white">{displayData.nextBill.toFixed(2)} KSh</span>
            </div>
            {!displayData.policyActive && (
              <p className="text-gray-400 text-sm mt-2">
                No active policy. Pay a premium to activate your insurance.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Wallet Balance Card */}
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Wallet className="h-5 w-5 mr-2 text-blue-500" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {displayData.walletBalance.toFixed(2)} HBAR
            </p>
            <p className="text-2xl font-bold text-white mt-2">
              {displayData.hptBalance} HPT
            </p>
            <p className="text-gray-400 text-sm mt-2 flex items-center">
              Hedera Wallet:{" "}
              <a
                href={`https://hashscan.io/testnet/account/${user.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300 flex items-center ml-1"
              >
                {user.wallet}
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </p>
            {displayData.walletBalance < 0.1 && (
              <p className="text-gray-400 text-sm mt-2">
                Your HBAR balance is low. Add funds to pay premiums.
              </p>
            )}
            {displayData.hptBalance < 1500 && (
              <p className="text-gray-400 text-sm mt-2">
                Your HPT balance is low. Acquire HPT to pay premiums.
              </p>
            )}
            {(displayData.walletBalance < 0.1 || displayData.hptBalance < 1500) && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                onClick={() => window.open("https://portal.hedera.com", "_blank")}
              >
                Deposit Funds
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <ArrowRight className="h-5 w-5 mr-2 text-blue-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handlePayPremium}
              disabled={isLoading}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Premium
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleClaim}
              disabled={isLoading || !displayData.policyActive}
            >
              <File className="h-4 w-4 mr-2" />
              File a Claim
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities Card */}
      <Card className="bg-[#2D3748] border-none">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayData.recentActivities.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600">
                  <th className="py-2">Activity</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayData.recentActivities.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="py-3 text-white">{activity.type}</td>
                    <td className="py-3 text-white">{activity.date}</td>
                    <td className="py-3 text-white">{activity.amount.toFixed(2)} KSh</td>
                    <td className="py-3 text-white">{activity.status || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400">
              No recent activities. Start by paying a premium or filing a claim.
            </p>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}