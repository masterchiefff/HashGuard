"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, CreditCard, LogOut, FileText, ArrowRight, File, Activity, ExternalLink, Zap, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import { HashConnect } from '@hashgraph/hashconnect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend } from "chart.js";
import { cva } from "class-variance-authority";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, ChartTooltip, Legend);

const hashConnect = new HashConnect(true);


const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        active: "bg-green-600 text-white",
        expired: "bg-gray-500 text-white",
        pending: "bg-yellow-600 text-white",
        approved: "bg-green-600 text-white",
        rejected: "bg-red-600 text-white",
        default: "bg-gray-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [hbarRate, setHbarRate] = useState(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const EXPLORER_URL = process.env.NODE_ENV === "production"
    ? "https://hashscan.io/mainnet/account/"
    : "https://hashscan.io/testnet/account/";

  useEffect(() => {
    const detectWallets = () => {
      const wallets = [];
      if (typeof window !== "undefined") {
        if (window.hashconnect) wallets.push("HashPack");
        if (window.blade) wallets.push("Blade");
        if (window.ethereum) wallets.push("MetaMask");
      }
      setAvailableWallets(wallets);
    };

    detectWallets();

    const isRegistered = localStorage.getItem("isRegistered");
    const token = localStorage.getItem("token");
    if (!isRegistered || isRegistered !== "true" || !token) {
      toast.error("Session Expired", { description: "Please log in to continue." });
      router.push("/login");
      return;
    }

    const phone = localStorage.getItem("userPhone") || "";
    if (phone) {
      fetchOverviewData(phone);
    } else {
      toast.error("Session Expired", { description: "No phone number found. Please log in again." });
      router.push("/login");
    }
  }, [router]);

  const fetchOverviewData = async (phone) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching system overview data...");
  
    try {
      const token = localStorage.getItem("token");
      const [systemResponse, userResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/system-overview`, {
          headers: { "Authorization": `Bearer ${token}` },
          timeout: 10000,
        }),
        axios.post(`${API_BASE_URL}/overview`, { phone }, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 10000,
        }),
      ]);
  
      const systemData = systemResponse.data;
      const userData = userResponse.data;
  
      setUser({
        phone,
        name: userData.fullName || "User",
        email: userData.email || "",
        wallet: userData.wallet || "",
        idNumber: userData.idNumber || "",
        riderId: userData.riderId || "N/A",
      });
  
      setOverviewData({
        totalPolicies: systemData.totalPolicies || 0,
        totalClaims: systemData.totalClaims || 0,
        totalPayouts: systemData.totalPayouts || 0,
        walletBalance: Number(userData.walletBalance) || 0,
        hptBalance: Number(userData.hptBalance) || 0,
        policies: systemData.policies || [],
        claims: systemData.claims || [],
        deposits: systemData.deposits || [],
        systemActivities: systemData.recentActivities || [],
      });
  
      const rateResponse = await axios.get("https://api.coinbase.com/v2/exchange-rates?currency=HBAR");
      const hbarToUsd = parseFloat(rateResponse.data.data.rates.USD);
      const usdToKsh = 129;
      setHbarRate(1 / (hbarToUsd * usdToKsh));
  
      toast.success("Overview Loaded", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to Load Overview", {  // Corrected syntax
        description: error.response?.data?.error || "Please try again later",
        id: loadingToast,
      });
      if (error.response?.status === 401) {
        localStorage.clear();
        router.push("/login");
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

  const handleConnectWallet = async (walletType) => {
    // ... (unchanged wallet connection logic)
  };

  const handleDeposit = async () => {
    // ... (unchanged deposit logic)
  };

  if (isLoading || !user || !overviewData) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const kshBalance = hbarRate > 0 ? (overviewData.walletBalance / hbarRate) : 0;

  // Chart Data
  const activityBarData = {
    labels: overviewData.systemActivities.slice(0, 5).map(a => a.type),
    datasets: [{
      label: "Amount (KSh)",
      data: overviewData.systemActivities.slice(0, 5).map(a => a.amount / hbarRate),
      backgroundColor: "rgba(54, 162, 235, 0.6)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 1,
    }],
  };

  const statsPieData = {
    labels: ["Policies", "Claims", "Payouts"],
    datasets: [{
      data: [overviewData.totalPolicies, overviewData.totalClaims, overviewData.totalPayouts],
      backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
    }],
  };

  return (
    <MainLayout routeName="/">
      <h2 className="text-2xl font-bold mb-2 text-white">Welcome, {user.name}!</h2>
      <p className="text-gray-400 mb-2">Rider ID: {user.riderId}</p>
      <p className="text-gray-400 mb-6">System-wide overview of HashGuard activities.</p>
  
      {/* Shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePayPremium}>
          <CreditCard className="h-4 w-4 mr-2" /> Pay Premium
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleClaim}>
          <File className="h-4 w-4 mr-2" /> File Claim
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsDepositModalOpen(true)}>
          <Wallet className="h-4 w-4 mr-2" /> Deposit
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>
  
      {/* Stats and Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
              System Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">Total Policies: <span className="text-white">{overviewData.totalPolicies}</span></p>
            <p className="text-gray-400">Total Claims: <span className="text-white">{overviewData.totalClaims}</span></p>
            <p className="text-gray-400">Total Payouts: <span className="text-white">{overviewData.totalPayouts} HBAR</span></p>
          </CardContent>
        </Card>
  
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
              Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={activityBarData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} height={150} />
          </CardContent>
        </Card>
  
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
              Stats Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={statsPieData} options={{ responsive: true }} height={150} />
          </CardContent>
        </Card>
      </div>
  
      {/* Wallet Balance */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="h-5 w-5 mr-2 text-blue-500" />
            Your Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">{kshBalance.toFixed(2)} KSh</p>
          <p className="text-sm text-gray-400 mt-1">({overviewData.walletBalance.toFixed(2)} HBAR)</p>
          <p className="text-2xl font-bold text-white mt-2">{overviewData.hptBalance.toFixed(0)} HPT</p>
          <p className="text-gray-400 text-sm mt-2">
            Hedera Wallet: <a href={`${EXPLORER_URL}${user.wallet}`} target="_blank" className="text-blue-400 underline">{user.wallet}</a>
          </p>
        </CardContent>
      </Card>
  
      {/* Policies Table */}

      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <FileText className="h-5 w-5 mr-2 text-blue-500" />
            All Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overviewData.policies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left rounded-lg">
                <thead className="bg-[#1A202C] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount (HBAR)</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {overviewData.policies.slice(0, 5).map((policy) => {
                    console.log("Policy:", policy._id, "Active:", policy.active); // Debug
                    return (
                      <tr key={policy._id} className="hover:bg-gray-700">
                        <td className="px-4 py-3 text-white">{policy.plan}</td>
                        <td className="px-4 py-3 text-white">{policy.protectionType}</td>
                        <td className="px-4 py-3 text-white">{policy.hbarAmount}</td>
                        <td className="px-4 py-3 text-white">{policy.riderPhone}</td>
                        <td className="px-4 py-3">
                          <Badge variant={policy.active ? "active" : "expired"}>
                            {policy.active ? "Active" : "Expired"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No policies found.</p>
          )}
        </CardContent>
      </Card>
  
      {/* Claims Table */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <File className="h-5 w-5 mr-2 text-blue-500" />
            All Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overviewData.claims.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left rounded-lg">
                <thead className="bg-[#1A202C] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Claim ID</th>
                    <th className="px-4 py-3">Policy</th>
                    <th className="px-4 py-3">Amount (HBAR)</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {overviewData.claims.slice(0, 5).map((claim) => (
                    <tr key={claim._id} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-white">{claim.claimId}</td>
                      <td className="px-4 py-3 text-white">{claim.policy}</td>
                      <td className="px-4 py-3 text-white">{claim.amount}</td>
                      <td className="px-4 py-3 text-white">{claim.riderPhone}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            claim.status === "Approved" ? "approved" :
                            claim.status === "Pending" ? "pending" :
                            claim.status === "Rejected" ? "rejected" : "default"
                          }
                        >
                          {claim.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No claims found.</p>
          )}
        </CardContent>
      </Card>
  
      {/* Deposits Table */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="h-5 w-5 mr-2 text-blue-500" />
            All Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overviewData.deposits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left rounded-lg">
                <thead className="bg-[#1A202C] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Amount (HBAR)</th>
                    <th className="px-4 py-3">Source Wallet</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {overviewData.deposits.slice(0, 5).map((deposit) => (
                    <tr key={deposit._id} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-white">{deposit.amount}</td>
                      <td className="px-4 py-3 text-white">{deposit.sourceWallet.slice(0, 6)}...{deposit.sourceWallet.slice(-4)}</td>
                      <td className="px-4 py-3 text-white">{deposit.phone}</td>
                      <td className="px-4 py-3 text-white">{new Date(deposit.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No deposits found.</p>
          )}
        </CardContent>
      </Card>
  
      {/* System Activities Table */}
      <Card className="bg-[#2D3748] border-none">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Recent System Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overviewData.systemActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left rounded-lg">
                <thead className="bg-[#1A202C] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount (KSh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {overviewData.systemActivities.slice(0, 5).map((activity, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-white">{activity.type}</td>
                      <td className="px-4 py-3 text-white">{activity.user}</td>
                      <td className="px-4 py-3 text-white">{activity.date}</td>
                      <td className="px-4 py-3 text-white">{(activity.amount / hbarRate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No activities recorded yet.</p>
          )}
        </CardContent>
      </Card>
  
      {/* Deposit Modal */}
      <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
        <DialogContent className="bg-[#2D3748] text-white border-none">
          <DialogHeader>
            <DialogTitle>Deposit HBAR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Connect Your Wallet</Label>
              {availableWallets.length > 0 ? (
                <div className="flex flex-col space-y-2">
                  {availableWallets.includes("HashPack") && (
                    <Button onClick={() => handleConnectWallet("HashPack")} disabled={isWalletConnected || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Connect HashPack
                    </Button>
                  )}
                  {availableWallets.includes("Blade") && (
                    <Button onClick={() => handleConnectWallet("Blade")} disabled={isWalletConnected || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Connect Blade
                    </Button>
                  )}
                  {availableWallets.includes("MetaMask") && (
                    <Button onClick={() => handleConnectWallet("MetaMask")} disabled={isWalletConnected || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Connect MetaMask
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={() => handleConnectWallet("MetaMask")} disabled={isWalletConnected || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  {isWalletConnected ? "Connected" : "Connect MetaMask"}
                </Button>
              )}
              <div className="text-center text-gray-400 my-2">or</div>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Paste Hedera wallet address (e.g., 0.0.xxxxxx)"
                className="bg-[#1A202C] text-white border-gray-600"
                disabled={isWalletConnected}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (HBAR)</Label>
              <Input
                id="amount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount in HBAR"
                className="bg-[#1A202C] text-white border-gray-600"
                min="0.01"
                step="0.01"
              />
              {depositAmount && hbarRate > 0 && (
                <p className="text-gray-400 text-sm mt-1">
                  ~{(parseFloat(depositAmount) / hbarRate).toFixed(2)} KSh (Rate: 1 HBAR = {hbarRate.toFixed(4)} KSh)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDepositModalOpen(false); setWalletAddress(""); setIsWalletConnected(false); }} className="text-white border-gray-600 hover:bg-gray-700">
              Cancel
            </Button>
            <Button onClick={handleDeposit} disabled={isLoading || !depositAmount || !walletAddress || parseFloat(depositAmount) < 0.01} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Processing..." : "Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}