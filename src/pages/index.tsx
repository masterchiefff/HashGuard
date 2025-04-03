"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, CreditCard, LogOut, FileText, File, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import Link from "next/link";

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [hbarRate, setHbarRate] = useState(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const EXPLORER_URL =
    process.env.NODE_ENV === "production"
      ? "https://hashscan.io/mainnet/account/"
      : "https://hashscan.io/testnet/account/";
  const PHONE_REGEX = /^\+254\d{9}$/;

  useEffect(() => {
    const isRegistered = localStorage.getItem("isRegistered");
    const token = localStorage.getItem("token");
    console.log("localStorage - isRegistered:", isRegistered, "token:", token); // Debug localStorage

    if (!isRegistered || isRegistered !== "true" || !token) {
      toast.error("Session Expired", { description: "Please log in to continue." });
      router.push("/login");
      return;
    }

    const phone = localStorage.getItem("userPhone") || "";
    if (!PHONE_REGEX.test(phone)) {
      toast.error("Session Expired", { description: "Invalid phone number format. Please log in again." });
      router.push("/login");
      return;
    }

    setUser({
      phone,
      name: localStorage.getItem("userName") || "User",
      email: localStorage.getItem("userEmail") || "",
      wallet: localStorage.getItem("userWallet") || "",
      idNumber: localStorage.getItem("userId") || "",
    });

    fetchOverviewData(phone);
  }, [router]);

  const fetchOverviewData = async (phone) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching your overview data...");

    try {
      const token = localStorage.getItem("token");
      console.log("Token sent in request:", token);

      const [overviewResponse, rateResponse] = await Promise.all([
        axios.post(
          `${API_BASE_URL}/overview`,
          { phone },
          {
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            timeout: 10000,
          }
        ),
        axios.get("https://api.coinbase.com/v2/exchange-rates?currency=HBAR"),
      ]);

      const userData = overviewResponse.data;
      console.log("Raw /overview response:", userData);

      const hbarToUsd = parseFloat(rateResponse.data.data.rates.USD) || 0.07;
      const usdToKsh = 129;
      const rate = hbarToUsd * usdToKsh;
      setHbarRate(rate);
      console.log("HBAR to KSh rate:", rate);

      const walletBalance = Number(userData.walletBalance) || 0;
      console.log("Wallet Balance (HBAR):", walletBalance);

      setOverviewData({
        walletBalance,
        hptBalance: Number(userData.hptBalance) || 0,
        activities: userData.activities || [],
      });

      console.log("Updated overviewData:", {
        walletBalance,
        hptBalance: userData.hptBalance,
        activities: userData.activities,
      });

      toast.success("Overview Loaded", { id: loadingToast });
    } catch (error) {
      console.error("Error fetching overview data:", error);
      if (error.response?.status === 401) {
        toast.error("Session Expired", { description: "Your session has expired. Please log in again." });
        localStorage.clear();
        router.push("/login");
      } else {
        toast.error("Failed to Load Overview", {
          description: error.response?.data?.error || "Please try again later",
          id: loadingToast,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPremium = () => router.push("/policies");
  const handleClaim = () => router.push("/claims");
  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out");
    router.push("/login");
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid HBAR amount." });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Processing deposit...");
    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/deposit`,
        {
          phone: user.phone,
          amount: parseFloat(depositAmount),
          sourceWallet: user.wallet,
        },
        {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 10000,
        }
      );

      toast.success("Deposit Successful", {
        description: response.data.message || "Funds added to your wallet.",
        id: loadingToast,
      });

      setDepositAmount("");
      setIsDepositModalOpen(false);
      await fetchOverviewData(user.phone);
    } catch (error) {
      toast.error("Deposit Failed", {
        description: error.response?.data?.error || "Please try again later",
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !user || !overviewData) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const kshBalance = hbarRate > 0 ? overviewData.walletBalance * hbarRate : 0;
  console.log("Calculated KSh Balance:", kshBalance);

  return (
    <MainLayout routeName="/">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Shield className="h-6 w-6 mr-2 text-blue-500" />
            Welcome, {user.name}!
          </h2>
          <p className="text-gray-400 mt-1">Your personal dashboard</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all"
            onClick={handlePayPremium}
          >
            <CreditCard className="h-5 w-5 mr-2" /> Pay Premium
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all"
            onClick={handleClaim}
          >
            <File className="h-5 w-5 mr-2" /> File Claim
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" /> Logout
          </Button>
        </div>

        {/* Wallet Balance with Deposit */}
        <Card className="bg-gradient-to-br from-[#2D3748] to-[#1A202C] border-none mb-8 shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-lg">
              <Wallet className="h-5 w-5 mr-2 text-blue-500" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-3xl font-bold text-white">{kshBalance.toFixed(2)} KSh</p>
                <p className="text-sm text-gray-400 mt-1">
                  {overviewData.walletBalance.toFixed(2)} HBAR
                  {" • "}
                  <Link href={`${EXPLORER_URL}${user.wallet}`} target="_blank" className="text-blue-400 hover:underline">
                    {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                  </Link>
                </p>
                <p className="text-xl font-bold text-white mt-2">{overviewData.hptBalance.toFixed(0)} HPT</p>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transform hover:scale-105 transition-all"
                onClick={() => setIsDepositModalOpen(true)}
                disabled={isLoading}
              >
                <Wallet className="h-5 w-5 mr-2" /> Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="bg-[#2D3748] border-none shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-lg">
              <Activity className="h-5 w-5 mr-2 text-blue-500" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewData.activities && overviewData.activities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#1A202C] text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-sm">Type</th>
                      <th className="px-6 py-3 text-sm">Description</th>
                      <th className="px-6 py-3 text-sm">Amount (KSh)</th>
                      <th className="px-6 py-3 text-sm">Status</th>
                      <th className="px-6 py-3 text-sm">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {overviewData.activities.slice(0, 10).map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 text-white">{activity.type}</td>
                        <td className="px-6 py-4 text-white">{activity.description || "N/A"}</td>
                        <td className="px-6 py-4 text-white">{(activity.amount * hbarRate).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <Badge
                            className={`${
                              activity.status === "Active" || activity.status === "Approved" || activity.status === "Processed" || activity.status === "Completed"
                                ? "bg-green-600"
                                : activity.status === "Expired" || activity.status === "Rejected"
                                ? "bg-red-600"
                                : "bg-yellow-600"
                            } text-white`}
                          >
                            {activity.status || "Unknown"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-white">{new Date(activity.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No activities found yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Deposit Modal */}
        <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
          <DialogContent className="bg-[#2D3748] text-white border-none rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Deposit HBAR</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-gray-400">Amount (HBAR)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount in HBAR"
                  className="bg-[#1A202C] text-white border-gray-600 rounded-lg"
                  min="0.01"
                  step="0.01"
                />
                {depositAmount && hbarRate > 0 && (
                  <p className="text-gray-400 text-sm mt-1">
                    ~{(parseFloat(depositAmount) * hbarRate).toFixed(2)} KSh (1 HBAR = {hbarRate.toFixed(2)} KSh)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDepositModalOpen(false)}
                className="text-white border-gray-600 hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={isLoading || !depositAmount || parseFloat(depositAmount) < 0.01}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {isLoading ? "Processing..." : "Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}