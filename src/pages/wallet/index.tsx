"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Wallet, CreditCard, ArrowRight, ExternalLink, Info, Zap, Star, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    phone: string;
    name: string;
    wallet: string;
    riderId: string;
    safeRiderScore?: number;
  } | null>(null);
  const [walletData, setWalletData] = useState<{
    walletBalance: number;
    hptBalance: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [mpesaAmount, setMpesaAmount] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [hbarRate, setHbarRate] = useState<number>(0); // KSh to HBAR conversion rate
  const [riderTier, setRiderTier] = useState<string>("Bronze"); // Gamification tier

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const EXPLORER_URL: string = process.env.NODE_ENV === "production"
    ? "https://hashscan.io/mainnet/transaction/"
    : "https://hashscan.io/testnet/transaction/";
  const PHONE_REGEX = /^\+254\d{9}$/;

  // Function to parse Hedera SDK numbers (Hbar or TokenBalance objects)
  const parseHederaNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (value && typeof value === "object") {
      if ("low" in value) return value.low; // For Hbar or similar objects
      if ("toNumber" in value) return value.toNumber(); // For Hbar.toNumber()
      if ("valueOf" in value) return value.valueOf(); // For BigNumber-like objects
    }
    return 0; // Fallback to 0 if parsing fails
  };

  const fetchWalletData = useCallback(async (phone: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching wallet data...");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const [walletResponse, overviewResponse] = await Promise.all([
        axios.post(`${API_BASE_URL}/wallet-balance`, { phone }, {
          headers: { "Authorization": `Bearer ${token}` },
          timeout: 10000,
        }),
        axios.post(`${API_BASE_URL}/overview`, { phone }, {
          headers: { "Authorization": `Bearer ${token}` },
          timeout: 10000,
        }),
      ]);

      const walletBalance = parseHederaNumber(walletResponse.data.walletBalance);
      const hptBalance = parseHederaNumber(walletResponse.data.hptBalance);

      setUser({
        phone,
        name: localStorage.getItem("userName") || "User",
        wallet: localStorage.getItem("userWallet") || "",
        riderId: localStorage.getItem("riderId") || "N/A",
        safeRiderScore: overviewResponse.data.safeRiderScore || 50,
      });

      setWalletData({
        walletBalance,
        hptBalance,
      });

      // Fetch conversion rate (mocked here, replace with real API if available)
      const rateResponse = await axios.get("https://api.coinbase.com/v2/exchange-rates?currency=HBAR");
      const hbarToUsd = parseFloat(rateResponse.data.data.rates.USD);
      const usdToKsh = 129; // Static rate, update as needed
      setHbarRate(1 / (hbarToUsd * usdToKsh));

      // Calculate Rider Tier based on HPT balance and transactions
      const tier = hptBalance > 100 ? "Gold" : hptBalance > 50 ? "Silver" : "Bronze";
      setRiderTier(tier);

      toast.success("Wallet Data Loaded", { id: loadingToast });
    } catch (error: any) {
      toast.error("Failed to Load Wallet Data", {
        description: error.response?.data?.error || error.message,
        id: loadingToast,
      });
      if (error.response?.status === 401) handleLogout();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchTransactions = useCallback(async (phone: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/${phone}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      setTransactions(response.data);
    } catch (error: any) {
      toast.error("Failed to Load Transactions", {
        description: error.response?.data?.error || error.message,
      });
    }
  }, []);

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
    const phone = localStorage.getItem("userPhone") || "";

    if (!isRegistered || isRegistered !== "true" || !token || !PHONE_REGEX.test(phone)) {
      toast.error("Session Expired", { description: "Please log in to continue." });
      router.push("/login");
      return;
    }

    fetchWalletData(phone);
    fetchTransactions(phone);
  }, [router, fetchWalletData, fetchTransactions]);

  const handleMpesaDeposit = async () => {
    if (!mpesaAmount || parseFloat(mpesaAmount) <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid amount in KSh (min 10)." });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");

    try {
      const response = await axios.post(`${API_BASE_URL}/deposit/mpesa`, {
        phone: user?.phone,
        amountKsh: parseFloat(mpesaAmount),
      }, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        timeout: 15000,
      });

      toast.success("Payment Initiated", {
        description: `Check your phone (${user?.phone}) to complete the payment. Checkout ID: ${response.data.checkoutRequestId}`,
        id: loadingToast,
      });

      setMpesaAmount("");
      setIsMpesaModalOpen(false);
      setTimeout(() => fetchWalletData(user!.phone), 30000); // Refresh after 30s
    } catch (error: any) {
      toast.error("M-Pesa Deposit Failed", {
        description: error.response?.data?.error || error.message,
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async (walletType?: string) => {
    try {
      let accountId;
      if (walletType === "MetaMask" || (!walletType && window.ethereum)) {
        if (!window.ethereum) throw new Error("MetaMask not installed");
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        accountId = accounts[0];
      } else if (walletType === "HashPack" && window.hashconnect) {
        accountId = "0.0.987654"; // Mock, replace with real HashPack integration
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

  const handleWalletDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid HBAR amount (min 0.01)." });
      return;
    }

    if (!walletAddress) {
      toast.error("Invalid Wallet", { description: "Please connect a wallet or enter an address." });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Processing wallet deposit...");

    try {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await axios.post(`${API_BASE_URL}/credit-hbar`, {
        phone: user?.phone,
        amount: parseFloat(depositAmount),
        sourceWallet: walletAddress,
        idempotencyKey,
      }, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        timeout: 15000,
      });

      toast.success("Deposit Successful", {
        description: `${depositAmount} HBAR credited. Tx ID: ${response.data.transactionId}`,
        id: loadingToast,
      });

      fetchWalletData(user!.phone);
      fetchTransactions(user!.phone);
      setDepositAmount("");
      setWalletAddress("");
      setIsWalletConnected(false);
      setIsWalletModalOpen(false);
    } catch (error: any) {
      toast.error("Wallet Deposit Failed", {
        description: error.response?.data?.error || error.message,
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out");
    router.push("/login");
  };

  if (!user || !walletData) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout routeName="/wallet">
      <h2 className="text-2xl font-bold mb-2 text-white">Your Micro-Insurance Wallet</h2>
      <p className="text-gray-400 mb-6">
        Manage your HBAR and HPT tokens for Boda Shield micro-insurance. Powered by Hedera.
      </p>

      {/* Wallet Overview */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wallet className="h-5 w-5 mr-2 text-blue-500" />
            Wallet Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400">Wallet Address:</p>
              <p className="text-white flex items-center">
                <a
                  href={`${EXPLORER_URL.replace("transaction", "account")}${user.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300 flex items-center"
                >
                  {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </p>
            </div>
            <div>
              <p className="text-gray-400">HBAR Balance:</p>
              <p className="text-2xl font-bold text-white">
                {walletData.walletBalance.toFixed(2)} HBAR
                <span className="text-sm text-gray-400 ml-2">
                  (~{(walletData.walletBalance / hbarRate).toFixed(2)} KSh)
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-400">HPT Balance:</p>
              <p className="text-2xl font-bold text-white">
                {walletData.hptBalance} HPT
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
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsMpesaModalOpen(true)}
              disabled={isLoading}
            >
              Deposit via M-Pesa
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsWalletModalOpen(true)}
              disabled={isLoading}
            >
              Deposit from Wallet
            </Button>
            <Button
              variant="outline"
              className="text-white border-gray-600 hover:bg-gray-700"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rider Tier */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Rider Tier: {riderTier}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={walletData.hptBalance > 100 ? 100 : walletData.hptBalance > 50 ? 66 : 33} className="w-full" />
          <p className="text-gray-400 mt-2">
            {riderTier === "Gold" ? "Elite Rider: Max benefits unlocked!" :
             riderTier === "Silver" ? "Trusted Rider: Enhanced rewards!" :
             "New Rider: Earn more HPT to level up!"}
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Info className="h-5 w-5 mr-2 text-blue-500" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                  <TableHead className="text-gray-400">Tx ID</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.transactionId}>
                    <TableCell className="text-white">
                      {new Date(tx.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-white">{tx.type}</TableCell>
                    <TableCell className="text-white">{tx.amount} HBAR</TableCell>
                    <TableCell className="text-white">
                      <a
                        href={`${EXPLORER_URL}${tx.transactionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        {tx.transactionId.slice(0, 10)}...
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "SUCCESS" ? "default" : "secondary"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-300">No transactions found. Make a deposit to get started!</p>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Deposit Modal */}
      <Dialog open={isMpesaModalOpen} onOpenChange={setIsMpesaModalOpen}>
        <DialogContent className="bg-[#2D3748] text-white border-none">
          <DialogHeader>
            <DialogTitle>Deposit via M-Pesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={user.phone}
                disabled
                className="bg-[#1A202C] text-white border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="mpesaAmount">Amount (KSh)</Label>
              <Input
                id="mpesaAmount"
                type="number"
                value={mpesaAmount}
                onChange={(e) => setMpesaAmount(e.target.value)}
                placeholder="Enter amount in KSh"
                className="bg-[#1A202C] text-white border-gray-600"
                min="10"
                step="1"
              />
              <p className="text-gray-400 text-sm mt-1">
                ~{(parseFloat(mpesaAmount || "0") * hbarRate).toFixed(2)} HBAR (Rate: 1 HBAR = {hbarRate.toFixed(4)} KSh)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMpesaModalOpen(false)}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMpesaDeposit}
              disabled={isLoading || !mpesaAmount || parseFloat(mpesaAmount) < 10}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Processing..." : "Pay with M-Pesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Deposit Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="bg-[#2D3748] text-white border-none">
          <DialogHeader>
            <DialogTitle>Deposit from Wallet</DialogTitle>
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
                placeholder="Paste wallet address (e.g., 0x... or 0.0.xxxxxx)"
                className="bg-[#1A202C] text-white border-gray-600"
                disabled={isWalletConnected}
              />
              <p className="text-gray-400 text-sm mt-1">
                Supports account abstraction - no gas fees required!
              </p>
            </div>
            <div>
              <Label htmlFor="depositAmount">Amount (HBAR)</Label>
              <Input
                id="depositAmount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount in HBAR"
                className="bg-[#1A202C] text-white border-gray-600"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsWalletModalOpen(false);
                setWalletAddress("");
                setIsWalletConnected(false);
              }}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWalletDeposit}
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