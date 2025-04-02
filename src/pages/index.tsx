"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, CreditCard, LogOut, FileText, ArrowRight, File, Activity, ExternalLink, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import { HashConnect } from '@hashgraph/hashconnect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const hashConnect = new HashConnect(true);

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    phone: string;
    name: string;
    email: string;
    wallet: string;
    idNumber: string;
    riderId: string;
    isFromLocalStorage?: boolean;
  } | null>(null);
  const [overviewData, setOverviewData] = useState<{
    riderId: string;
    fullName: string;
    email: string;
    idNumber: string;
    wallet: string;
    policyActive: boolean;
    nextPaymentDue: string;
    nextBill: number;
    walletBalance: number;
    hptBalance: number;
    recentActivities: { type: string; date: string; amount: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [hbarRate, setHbarRate] = useState<number>(0); // KSh per HBAR

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const EXPLORER_URL: string = process.env.NODE_ENV === "production"
    ? "https://hashscan.io/mainnet/account/"
    : "https://hashscan.io/testnet/account/";

  const defaultOverviewData = {
    riderId: "N/A",
    fullName: "User",
    email: "",
    idNumber: "",
    wallet: "",
    policyActive: false,
    nextPaymentDue: "N/A",
    nextBill: 0,
    walletBalance: 0,
    hptBalance: 0,
    recentActivities: [],
  };

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

  const fetchOverviewData = async (phone: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching overview data...");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE_URL}/overview`, { phone }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        timeout: 10000,
      });

      const data = response.data;

      const walletBalance = data.walletBalance !== undefined && data.walletBalance !== null
        ? (typeof data.walletBalance === 'object' 
            ? parseFloat(data.walletBalance.toString()) 
            : Number(data.walletBalance))
        : 0;
      const hptBalance = data.hptBalance !== undefined && data.hptBalance !== null
        ? (typeof data.hptBalance === 'object' 
            ? parseFloat(data.hptBalance.toString()) 
            : Number(data.hptBalance))
        : 0;

      setUser({
        phone,
        name: data.fullName || "User",
        email: data.email || "",
        wallet: data.wallet || "",
        idNumber: data.idNumber || "",
        riderId: data.riderId || "N/A",
      });

      setOverviewData({
        riderId: data.riderId || "N/A",
        fullName: data.fullName || "User",
        email: data.email || "",
        idNumber: data.idNumber || "",
        wallet: data.wallet || "",
        policyActive: data.policyActive || false,
        nextPaymentDue: data.nextPaymentDue || "N/A",
        nextBill: data.nextBill || 0,
        walletBalance: isNaN(walletBalance) ? 0 : walletBalance,
        hptBalance: isNaN(hptBalance) ? 0 : hptBalance,
        recentActivities: data.recentActivities || [],
      });

      const rateResponse = await axios.get("https://api.coinbase.com/v2/exchange-rates?currency=HBAR");
      const hbarToUsd = parseFloat(rateResponse.data.data.rates.USD);
      const usdToKsh = 129;
      setHbarRate(1 / (hbarToUsd * usdToKsh));

      toast.success("Overview Loaded", {
        description: "Your account overview is up to date",
        id: loadingToast,
      });
    } catch (error: any) {
      let description = "Please try again later";
      if (error.response?.status === 401) {
        description = "Unauthorized. Please log in again.";
        localStorage.clear();
        router.push("/login");
      } else if (error.response) {
        description = error.response.data.error || "Failed to fetch data";
      } else if (error.request) {
        description = "No response from server. Check your network.";
      }

      const phone = localStorage.getItem("userPhone") || "";
      const name = localStorage.getItem("userName") || "User";
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
          email,
          idNumber,
          wallet,
        });
        toast.warning("Using Cached Data", {
          description: "Failed to fetch latest data. Showing cached info.",
          id: loadingToast,
        });
      } else {
        toast.error("Failed to Load Overview", { description, id: loadingToast });
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

  const handleConnectWallet = async (walletType?: string) => {
    try {
      let accountId;
      if (walletType === "MetaMask" || (!walletType && window.ethereum)) {
        if (!window.ethereum) throw new Error("MetaMask not installed");
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        accountId = accounts[0];
      } else if (walletType === "HashPack" && window.hashconnect) {
        const initData = await hashConnect.init({
          name: "HashGuard",
          description: "Insurance for riders",
          icon: "URL_TO_ICON", // Replace with actual icon URL
        });
        const state = await hashConnect.connect();
        accountId = state.pairingData?.accountIds[0];
        if (!accountId) throw new Error("No account found in HashPack pairing");
      } else if (walletType === "Blade" && window.blade) {
        accountId = "0.0.987655"; // Mock, replace with real Blade integration
      } else {
        throw new Error("No supported wallet detected");
      }

      setWalletAddress(accountId);
      setIsWalletConnected(true);
      toast.success("Wallet Connected", { description: `Connected to ${accountId}` });
    } catch (error) {
      toast.error("Wallet Connection Failed", {
        description: error.message || "Please install a supported wallet or paste an address.",
      });
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid HBAR amount (min 0.01)." });
      return;
    }

    if (!walletAddress) {
      toast.error("Invalid Wallet", { description: "Please connect a wallet or enter a valid Hedera address." });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Processing deposit...");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE_URL}/credit-hbar`, {
        phone: user?.phone,
        amount: parseFloat(depositAmount),
        sourceWallet: walletAddress,
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        timeout: 10000,
      });

      toast.success("Deposit Successful", {
        description: `${depositAmount} HBAR credited. TxID: ${response.data.transactionId}`,
        id: loadingToast,
      });

      if (user?.phone) await fetchOverviewData(user.phone);
      setDepositAmount("");
      setWalletAddress("");
      setIsWalletConnected(false);
      setIsDepositModalOpen(false);
    } catch (error: any) {
      toast.error("Deposit Failed", {
        description: error.response?.data?.error || error.message || "An error occurred.",
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !overviewData) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const displayData = overviewData || defaultOverviewData;
  const kshBalance = hbarRate > 0 ? (displayData.walletBalance / hbarRate) : 0;

  return (
    <MainLayout routeName="/">
      <h2 className="text-2xl font-bold mb-2 text-white">
        Welcome, {displayData.fullName}!
      </h2>
      <p className="text-gray-400 mb-2">Rider ID: {displayData.riderId}</p>
      <p className="text-gray-400 mb-6">
        Here's an overview of your HashGuard account.
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
                No active policy. Pay a premium to get insured.
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
              {kshBalance.toFixed(2)} KSh
            </p>
            <p className="text-sm text-gray-400 mt-1">
              ({displayData.walletBalance.toFixed(2)} HBAR)
            </p>
            <p className="text-2xl font-bold text-white mt-2">
              {displayData.hptBalance.toFixed(0)} HPT
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Zap className="h-4 w-4 inline ml-2 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use HPT for premium discounts and voting!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
            <p className="text-gray-400 text-sm mt-2 flex items-center">
              Hedera Wallet:{" "}
              <a
                href={`${EXPLORER_URL}${displayData.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300 flex items-center ml-1"
              >
                {displayData.wallet.slice(0, 6)}...{displayData.wallet.slice(-4)}
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </p>
            {(kshBalance < 1500 || displayData.hptBalance < 1500) && (
              <>
                {kshBalance < 1500 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Low KSh balance. Add funds to continue.
                  </p>
                )}
                {displayData.hptBalance < 1500 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Low HPT balance. Acquire more to pay premiums.
                  </p>
                )}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                  onClick={() => setIsDepositModalOpen(true)}
                  disabled={isLoading}
                >
                  Deposit Funds
                </Button>
              </>
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
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
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
                </tr>
              </thead>
              <tbody>
                {displayData.recentActivities.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="py-3 text-white">{activity.type}</td>
                    <td className="py-3 text-white">{activity.date}</td>
                    <td className="py-3 text-white">{activity.amount.toFixed(2)} KSh</td>
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
                    <Button
                      onClick={() => handleConnectWallet("HashPack")}
                      disabled={isWalletConnected || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Connect HashPack
                    </Button>
                  )}
                  {availableWallets.includes("Blade") && (
                    <Button
                      onClick={() => handleConnectWallet("Blade")}
                      disabled={isWalletConnected || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Connect Blade
                    </Button>
                  )}
                  {availableWallets.includes("MetaMask") && (
                    <Button
                      onClick={() => handleConnectWallet("MetaMask")}
                      disabled={isWalletConnected || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Connect MetaMask
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handleConnectWallet("MetaMask")}
                  disabled={isWalletConnected || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
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
              <p className="text-gray-400 text-sm mt-1">
                Supports account abstraction - no gas fees required!
              </p>
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
            <Button
              variant="outline"
              onClick={() => {
                setIsDepositModalOpen(false);
                setWalletAddress("");
                setIsWalletConnected(false);
              }}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={isLoading || !depositAmount || !walletAddress || parseFloat(depositAmount) < 0.01}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Processing..." : "Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}