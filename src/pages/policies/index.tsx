"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Shield, User, Bike, Wallet, CreditCard, LogOut, FileText,
  ArrowRight, File, CheckCircle, RefreshCw, Plus, AlertCircle,
  Zap, Clock, Smartphone, ChevronDown, ChevronUp, ArrowUpRight, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/@layouts/main-layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PoliciesPage() {
  const router = useRouter();
  const policySectionRef = useRef<HTMLDivElement>(null);

  // User state
  const [user, setUser] = useState<{
    phone: string;
    name: string;
    email: string;
    wallet: string;
    idNumber: string;
    riderId: string;
    walletBalance: number;
    isFromLocalStorage?: boolean;
  } | null>(null);

  // Policy state
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<{
    rider: "Daily" | "Weekly" | "Monthly";
    bike: "Daily" | "Weekly" | "Monthly";
  }>({ rider: "Weekly", bike: "Weekly" });
  const [selectedProtectionTypes, setSelectedProtectionTypes] = useState<Set<"rider" | "bike">>(new Set(["rider"]));
  const [paymentStep, setPaymentStep] = useState<"select" | "pay" | "confirm">("select");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "hbar">("mpesa");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const policiesPerPage = 5;

  // Coverage state
  const [coverageDetails, setCoverageDetails] = useState({
    rider: { accidentalDeath: 0, medicalExpenses: 0, hospitalCash: 0, roadsideAssistance: false, personalLiability: 0, lostIncome: 0 },
    bike: { theft: 0, accidentalDamage: 0, thirdPartyLiability: 0, fireDamage: 0, naturalDisaster: 0 }
  });

  // Expanded plan options with tokenized rewards
  const planOptions = {
    rider: {
      Daily: {
        amount: 0.93, // HBAR
        hptReward: 10, // HashGuard Premium Tokens
        coverage: { 
          accidentalDeath: 200000, 
          medicalExpenses: 50000, 
          hospitalCash: 1000, 
          roadsideAssistance: true, 
          personalLiability: 50000, 
          lostIncome: 500 
        }
      },
      Weekly: {
        amount: 4.65,
        hptReward: 50,
        coverage: { 
          accidentalDeath: 500000, 
          medicalExpenses: 200000, 
          hospitalCash: 2000, 
          roadsideAssistance: true, 
          personalLiability: 150000, 
          lostIncome: 1000 
        }
      },
      Monthly: {
        amount: 16.28,
        hptReward: 200,
        coverage: { 
          accidentalDeath: 1000000, 
          medicalExpenses: 500000, 
          hospitalCash: 3000, 
          roadsideAssistance: true, 
          personalLiability: 300000, 
          lostIncome: 2000 
        }
      }
    },
    bike: {
      Daily: {
        amount: 0.62,
        hptReward: 5,
        coverage: { 
          theft: 0, 
          accidentalDamage: 0, 
          thirdPartyLiability: 100000, 
          fireDamage: 0, 
          naturalDisaster: 0 
        }
      },
      Weekly: {
        amount: 3.10,
        hptReward: 25,
        coverage: { 
          theft: 150000, 
          accidentalDamage: 50000, 
          thirdPartyLiability: 500000, 
          fireDamage: 50000, 
          naturalDisaster: 25000 
        }
      },
      Monthly: {
        amount: 10.85,
        hptReward: 100,
        coverage: { 
          theft: 300000, 
          accidentalDamage: 150000, 
          thirdPartyLiability: 1000000, 
          fireDamage: 100000, 
          naturalDisaster: 50000 
        }
      }
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Initialize user data
  useEffect(() => {
    const loadUserData = async () => {
      const isRegistered = localStorage.getItem("isRegistered");
      const token = localStorage.getItem("token");
      const phone = localStorage.getItem("userPhone") || "";
      if (!isRegistered || isRegistered !== "true" || !token || !phone) {
        toast.error("Session Expired", { description: "Please log in to continue." });
        router.push("/login");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const balanceResponse = await axios.post(`${API_BASE_URL}/wallet-balance`, { phone }, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 10000,
        });

        const walletBalance = typeof balanceResponse.data.walletBalance === 'object'
          ? parseFloat(balanceResponse.data.walletBalance.toString())
          : Number(balanceResponse.data.walletBalance);

        setUser({
          phone,
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
          wallet: localStorage.getItem("userWallet") || "",
          idNumber: localStorage.getItem("userId") || "",
          riderId: localStorage.getItem("riderId") || "",
          walletBalance: isNaN(walletBalance) ? 0 : walletBalance,
        });
        fetchPolicies(phone);
      } catch (error: any) {
        toast.error("Failed to fetch wallet balance", { description: error.response?.data?.error || "Using cached data." });
        setUser({
          phone,
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
          wallet: localStorage.getItem("userWallet") || "",
          idNumber: localStorage.getItem("userId") || "",
          riderId: localStorage.getItem("riderId") || "",
          walletBalance: 0,
          isFromLocalStorage: true,
        });
        fetchPolicies(phone);
      }
    };
    loadUserData();
  }, [router]);

  // Fetch policies
  const fetchPolicies = useCallback(async (phone: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE_URL}/policies`, { phone, page, limit: policiesPerPage }, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        timeout: 10000,
      });
      setPolicies(response.data.policies || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      if (!response.data.policies || response.data.policies.length === 0) {
        toast.info('No policies found. Get your first policy!');
      }
    } catch (error: any) {
      toast.error('Failed to load policies', { description: error.response?.data?.error || "Please try again." });
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // Handle protection type selection
  const handleProtectionTypeChange = (type: "rider" | "bike", checked: boolean) => {
    const newSet = new Set(selectedProtectionTypes);
    if (checked) newSet.add(type);
    else newSet.delete(type);
    setSelectedProtectionTypes(newSet);
    updateCoverageDetails(newSet);
  };

  // Handle plan change
  const handlePlanChange = (type: "rider" | "bike", value: "Daily" | "Weekly" | "Monthly") => {
    setSelectedPlans(prev => ({ ...prev, [type]: value }));
    updateCoverageDetails(selectedProtectionTypes);
  };

  // Update coverage details
  const updateCoverageDetails = (types: Set<"rider" | "bike">) => {
    const newCoverage = {
      rider: { accidentalDeath: 0, medicalExpenses: 0, hospitalCash: 0, roadsideAssistance: false, personalLiability: 0, lostIncome: 0 },
      bike: { theft: 0, accidentalDamage: 0, thirdPartyLiability: 0, fireDamage: 0, naturalDisaster: 0 }
    };
    if (types.has("rider") && selectedPlans.rider) {
      newCoverage.rider = planOptions.rider[selectedPlans.rider].coverage;
    }
    if (types.has("bike") && selectedPlans.bike) {
      newCoverage.bike = planOptions.bike[selectedPlans.bike].coverage;
    }
    setCoverageDetails(newCoverage);
  };

  // Calculate total amount and HPT rewards
  const calculateTotalAmount = () => {
    let totalHbar = 0;
    if (selectedProtectionTypes.has("rider") && selectedPlans.rider) {
      totalHbar += planOptions.rider[selectedPlans.rider].amount;
    }
    if (selectedProtectionTypes.has("bike") && selectedPlans.bike) {
      totalHbar += planOptions.bike[selectedPlans.bike].amount;
    }
    return totalHbar;
  };

  const calculateHPTReward = () => {
    let totalHPT = 0;
    if (selectedProtectionTypes.has("rider") && selectedPlans.rider) {
      totalHPT += planOptions.rider[selectedPlans.rider].hptReward;
    }
    if (selectedProtectionTypes.has("bike") && selectedPlans.bike) {
      totalHPT += planOptions.bike[selectedPlans.bike].hptReward;
    }
    return totalHPT;
  };

  // Payment and claim handling functions remain unchanged for brevity
  const handlePayPremium = async () => {
    if (!user?.phone || selectedProtectionTypes.size === 0) return;

    setIsLoading(true);
    const toastId = toast.loading('Initiating payment...');

    try {
      const token = localStorage.getItem("token");
      const policiesToPurchase = [];
      if (selectedProtectionTypes.has("rider") && selectedPlans.rider) {
        policiesToPurchase.push({
          plan: selectedPlans.rider,
          protectionType: "rider",
          amount: planOptions.rider[selectedPlans.rider].amount
        });
      }
      if (selectedProtectionTypes.has("bike") && selectedPlans.bike) {
        policiesToPurchase.push({
          plan: selectedPlans.bike,
          protectionType: "bike",
          amount: planOptions.bike[selectedPlans.bike].amount
        });
      }

      const totalAmount = calculateTotalAmount();

      if (paymentMethod === 'mpesa') {
        const response = await axios.post(`${API_BASE_URL}/paypremium`, {
          phone: user.phone,
          policies: policiesToPurchase,
          totalAmount: totalAmount * 12.9,
          paymentMethod: 'mpesa'
        }, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 15000,
        });

        if (!response.data.checkoutRequestId) throw new Error('Payment initiation failed');
        setPaymentStep('confirm');
        await pollPaymentStatus(response.data.checkoutRequestId, user.phone);
      } else {
        if (user.walletBalance < totalAmount) throw new Error('Insufficient HBAR balance');
        setPaymentStep('confirm');
        const response = await axios.post(`${API_BASE_URL}/paypremium`, {
          phone: user.phone,
          policies: policiesToPurchase,
          totalAmount,
          paymentMethod: 'hbar'
        }, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 15000,
        });

        if (response.data.success) {
          toast.success('Payment successful!', { id: toastId });
          setUser(prev => prev ? { ...prev, walletBalance: prev.walletBalance - totalAmount } : null);
          fetchPolicies(user.phone);
          setPaymentStep('select');
        } else {
          throw new Error(response.data.error || 'HBAR payment failed');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed', { id: toastId });
      setPaymentStep('pay');
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestId: string, phone: string) => {
    const toastId = toast.loading('Waiting for payment confirmation...');
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(`${API_BASE_URL}/payment-status`, { checkoutRequestId }, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          timeout: 5000,
        });

        if (response.data.status === 'completed') {
          clearInterval(interval);
          toast.success('Payment confirmed!', { id: toastId });
          fetchPolicies(phone);
          setPaymentStep('select');
        } else if (attempts >= 12) {
          clearInterval(interval);
          toast.info('Payment still pending. Check your phone', { id: toastId });
          setPaymentStep('pay');
        }
      } catch (error: any) {
        clearInterval(interval);
        toast.error('Payment verification failed', { description: error.response?.data?.error || "Please try again.", id: toastId });
        setPaymentStep('pay');
      }
    }, 5000);
  };

  const handleClaim = async () => {
    if (!user?.phone) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/claim`, { phone: user.phone }, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        timeout: 10000,
      });
      toast.success("Claim submitted successfully");
      fetchPolicies(user.phone);
    } catch (error: any) {
      toast.error("Claim failed", { description: error.response?.data?.error || "Please try again" });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToPolicySection = () => {
    setPaymentStep("select");
    setTimeout(() => policySectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout routeName="/policies">
      <h2 className="text-2xl font-bold mb-4">Your HashGuard Insurance</h2>

      {/* Active Policy Status */}
      <div className={`p-3 rounded-lg mb-6 ${policies.some(p => p.active) 
        ? "bg-green-900/20 border border-green-800" 
        : "bg-red-900/20 border border-red-800"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Current Status</p>
            <p className={`font-medium ${policies.some(p => p.active) ? "text-green-400" : "text-red-400"}`}>
              {policies.some(p => p.active) ? "ACTIVE COVERAGE" : "NO ACTIVE POLICY"}
            </p>
          </div>
          {policies.some(p => p.active) && (
            <p className="text-sm text-gray-400">
              Expires: {new Date(policies.find(p => p.active)?.expiryDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Coverage and Billing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-[#2D3748] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Coverage</h3>
            <Button variant="outline" size="sm" onClick={scrollToPolicySection}>
              {policies.some(p => p.active) ? "Modify" : "Get Covered"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                <h4 className="font-medium">Rider Protection</h4>
              </div>
              <ul className="space-y-3">
                <li className="flex justify-between"><span className="text-gray-400">Accidental Death:</span><span className="font-medium">{coverageDetails.rider.accidentalDeath.toLocaleString()} KSh</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Medical Expenses:</span><span className="font-medium">{coverageDetails.rider.medicalExpenses.toLocaleString()} KSh</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Daily Hospital:</span><span className="font-medium">{coverageDetails.rider.hospitalCash.toLocaleString()} KSh/day</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Roadside Assistance:</span><span className="font-medium">{coverageDetails.rider.roadsideAssistance ? "Included" : "Not covered"}</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Personal Liability:</span><span className="font-medium">{coverageDetails.rider.personalLiability.toLocaleString()} KSh</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Lost Income:</span><span className="font-medium">{coverageDetails.rider.lostIncome.toLocaleString()} KSh/day</span></li>
              </ul>
            </div>
            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Bike className="h-5 w-5 mr-2 text-blue-500" />
                <h4 className="font-medium">Bike Protection</h4>
              </div>
              <ul className="space-y-3">
                <li className="flex justify-between"><span className="text-gray-400">Theft:</span><span className="font-medium">{coverageDetails.bike.theft > 0 ? `${coverageDetails.bike.theft.toLocaleString()} KSh` : "Not covered"}</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Accident Damage:</span><span className="font-medium">{coverageDetails.bike.accidentalDamage > 0 ? `${coverageDetails.bike.accidentalDamage.toLocaleString()} KSh` : "Not covered"}</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Third-Party:</span><span className="font-medium">{coverageDetails.bike.thirdPartyLiability.toLocaleString()} KSh</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Fire Damage:</span><span className="font-medium">{coverageDetails.bike.fireDamage > 0 ? `${coverageDetails.bike.fireDamage.toLocaleString()} KSh` : "Not covered"}</span></li>
                <li className="flex justify-between"><span className="text-gray-400">Natural Disaster:</span><span className="font-medium">{coverageDetails.bike.naturalDisaster > 0 ? `${coverageDetails.bike.naturalDisaster.toLocaleString()} KSh` : "Not covered"}</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-[#2D3748] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Selected Plans</p>
              <p className="font-medium">
                {selectedProtectionTypes.size === 0 
                  ? "None" 
                  : Array.from(selectedProtectionTypes)
                      .filter(type => selectedPlans[type])
                      .map(type => `${type === "rider" ? "Rider" : "Bike"} • ${selectedPlans[type]} • ${(planOptions[type][selectedPlans[type]].amount * 12.9).toFixed(0)} KSh`)
                      .join(", ")}
              </p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Next Payment</p>
              <p className="text-2xl font-bold my-1">{(calculateTotalAmount() * 12.9).toFixed(0)} KSh</p>
              <p className="text-gray-400 text-sm">{selectedProtectionTypes.size} Plan{selectedProtectionTypes.size !== 1 ? "s" : ""} Renewal</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-xl font-bold my-1">{user.walletBalance.toFixed(2)} HBAR</p>
              <p className="text-xs text-gray-400">≈ {(user.walletBalance * 12.9).toFixed(2)} KSh</p>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={scrollToPolicySection}>
              {policies.some(p => p.active) ? "Modify Plans" : "Get Covered"}
            </Button>
            {policies.some(p => p.active) && (
              <Button variant="outline" className="w-full text-green-500 border-green-500 hover:bg-green-900/20" onClick={handleClaim} disabled={isLoading}>
                <AlertCircle className="h-4 w-4 mr-2" />
                File Claim
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Policy Purchase Flow */}
      <div ref={policySectionRef} className="mb-6">
        {paymentStep === "select" && (
          <Card className="bg-[#2D3748] border-none">
            <CardHeader>
              <CardTitle className="text-white">Choose Your Coverage Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-white">Select Coverage Types</Label>
                  <div className="flex space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rider"
                        checked={selectedProtectionTypes.has("rider")}
                        onCheckedChange={(checked) => handleProtectionTypeChange("rider", checked as boolean)}
                      />
                      <Label htmlFor="rider" className="text-white flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Rider Protection
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-4 w-4 ml-1 text-gray-400" /></TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-white">Covers you against accidents, medical costs, and income loss.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bike"
                        checked={selectedProtectionTypes.has("bike")}
                        onCheckedChange={(checked) => handleProtectionTypeChange("bike", checked as boolean)}
                      />
                      <Label htmlFor="bike" className="text-white flex items-center">
                        <Bike className="h-4 w-4 mr-2" />
                        Bike Protection
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-4 w-4 ml-1 text-gray-400" /></TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-white">Covers your bike against theft, damage, and liability.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Rider Plan Selection */}
                {selectedProtectionTypes.has("rider") && (
                  <div className="border border-gray-600 rounded-lg p-4">
                    <Label className="text-white">Rider Plan Duration</Label>
                    <Select value={selectedPlans.rider} onValueChange={(value) => handlePlanChange("rider", value as "Daily" | "Weekly" | "Monthly")}>
                      <SelectTrigger className="bg-gray-700 border-none mt-1"><SelectValue placeholder="Select rider plan" /></SelectTrigger>
                      <SelectContent className="bg-gray-700 border-none">
                        {Object.entries(planOptions.rider).map(([plan, { amount }]) => (
                          <SelectItem key={plan} value={plan}>
                            <div className="flex justify-between w-full">
                              <span className="text-white">{plan}</span>
                              <span className="text-gray-400">{(amount * 12.9).toFixed(0)} KSh ({amount} HBAR)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-4">
                      <h4 className="text-white font-medium mb-2">Plan Details: {selectedPlans.rider}</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex justify-between"><span>Accidental Death:</span><span>{planOptions.rider[selectedPlans.rider].coverage.accidentalDeath.toLocaleString()} KSh</span></li>
                        <li className="flex justify-between"><span>Medical Expenses:</span><span>{planOptions.rider[selectedPlans.rider].coverage.medicalExpenses.toLocaleString()} KSh</span></li>
                        <li className="flex justify-between"><span>Hospital Cash:</span><span>{planOptions.rider[selectedPlans.rider].coverage.hospitalCash.toLocaleString()} KSh/day</span></li>
                        <li className="flex justify-between"><span>Roadside Assistance:</span><span>{planOptions.rider[selectedPlans.rider].coverage.roadsideAssistance ? "Yes" : "No"}</span></li>
                        <li className="flex justify-between"><span>Personal Liability:</span><span>{planOptions.rider[selectedPlans.rider].coverage.personalLiability.toLocaleString()} KSh</span></li>
                        <li className="flex justify-between"><span>Lost Income:</span><span>{planOptions.rider[selectedPlans.rider].coverage.lostIncome.toLocaleString()} KSh/day</span></li>
                        <li className="flex justify-between text-green-400"><span>HPT Reward:</span><span>{planOptions.rider[selectedPlans.rider].hptReward} Tokens</span></li>
                        <li className="flex justify-between text-blue-400"><span>Daily Cost:</span><span>{((planOptions.rider[selectedPlans.rider].amount * 12.9) / (selectedPlans.rider === "Daily" ? 1 : selectedPlans.rider === "Weekly" ? 7 : 30)).toFixed(2)} KSh</span></li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Bike Plan Selection */}
                {selectedProtectionTypes.has("bike") && (
                  <div className="border border-gray-600 rounded-lg p-4">
                    <Label className="text-white">Bike Plan Duration</Label>
                    <Select value={selectedPlans.bike} onValueChange={(value) => handlePlanChange("bike", value as "Daily" | "Weekly" | "Monthly")}>
                      <SelectTrigger className="bg-gray-700 border-none mt-1"><SelectValue placeholder="Select bike plan" /></SelectTrigger>
                      <SelectContent className="bg-gray-700 border-none">
                        {Object.entries(planOptions.bike).map(([plan, { amount }]) => (
                          <SelectItem key={plan} value={plan}>
                            <div className="flex justify-between w-full">
                              <span className="text-white">{plan}</span>
                              <span className="text-gray-400">{(amount * 12.9).toFixed(0)} KSh ({amount} HBAR)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-4">
                      <h4 className="text-white font-medium mb-2">Plan Details: {selectedPlans.bike}</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex justify-between"><span>Theft:</span><span>{planOptions.bike[selectedPlans.bike].coverage.theft > 0 ? `${planOptions.bike[selectedPlans.bike].coverage.theft.toLocaleString()} KSh` : "Not covered"}</span></li>
                        <li className="flex justify-between"><span>Accidental Damage:</span><span>{planOptions.bike[selectedPlans.bike].coverage.accidentalDamage > 0 ? `${planOptions.bike[selectedPlans.bike].coverage.accidentalDamage.toLocaleString()} KSh` : "Not covered"}</span></li>
                        <li className="flex justify-between"><span>Third-Party Liability:</span><span>{planOptions.bike[selectedPlans.bike].coverage.thirdPartyLiability.toLocaleString()} KSh</span></li>
                        <li className="flex justify-between"><span>Fire Damage:</span><span>{planOptions.bike[selectedPlans.bike].coverage.fireDamage > 0 ? `${planOptions.bike[selectedPlans.bike].coverage.fireDamage.toLocaleString()} KSh` : "Not covered"}</span></li>
                        <li className="flex justify-between"><span>Natural Disaster:</span><span>{planOptions.bike[selectedPlans.bike].coverage.naturalDisaster > 0 ? `${planOptions.bike[selectedPlans.bike].coverage.naturalDisaster.toLocaleString()} KSh` : "Not covered"}</span></li>
                        <li className="flex justify-between text-green-400"><span>HPT Reward:</span><span>{planOptions.bike[selectedPlans.bike].hptReward} Tokens</span></li>
                        <li className="flex justify-between text-blue-400"><span>Daily Cost:</span><span>{((planOptions.bike[selectedPlans.bike].amount * 12.9) / (selectedPlans.bike === "Daily" ? 1 : selectedPlans.bike === "Weekly" ? 7 : 30)).toFixed(2)} KSh</span></li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Tokenized Insurance Benefits */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-white">Why HashGuard Insurance?</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span><strong>Instant Activation:</strong> Coverage starts as soon as payment is confirmed.</span>
                    </li>
                    <li className="flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span><strong>Tokenized Rewards:</strong> Earn {calculateHPTReward()} HPT for discounts or upgrades.</span>
                    </li>
                    <li className="flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span><strong>Blockchain Security:</strong> Policies recorded on Hedera for transparency and instant payouts.</span>
                    </li>
                    <li className="flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span><strong>Flexible Plans:</strong> Choose what fits your budget and needs.</span>
                    </li>
                  </ul>
                  <p className="text-gray-400 text-xs mt-2">
                    HPT (HashGuard Premium Tokens) can be redeemed for premium discounts or additional coverage. Earn more with longer plans!
                  </p>
                </div>

                {/* Total Summary */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-white">Your Selection Summary</h4>
                  <div className="flex justify-between text-white">
                    <span>Total Cost:</span>
                    <span>{calculateTotalAmount().toFixed(2)} HBAR ({(calculateTotalAmount() * 12.9).toFixed(0)} KSh)</span>
                  </div>
                  <div className="flex justify-between text-green-400 mt-1">
                    <span>Total HPT Reward:</span>
                    <span>{calculateHPTReward()} Tokens</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setPaymentStep("pay")}
                  disabled={selectedProtectionTypes.size === 0 || isLoading}
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment and Confirm Sections Remain Unchanged */}
        {paymentStep === "pay" && (
          <Card className="bg-[#2D3748] border-none">
            <CardHeader>
              <CardTitle className="text-white">Complete Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Payment Method</Label>
                  <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "mpesa" | "hbar")} className="mt-1">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                      <TabsTrigger value="mpesa" className="data-[state=active]:bg-gray-600">
                        <img src="/mpesa-logo.png" alt="M-Pesa" className="h-5 mr-2" /> M-Pesa
                      </TabsTrigger>
                      <TabsTrigger value="hbar" className="data-[state=active]:bg-gray-600">
                        <img src="/hbar-logo.png" alt="HBAR" className="h-5 mr-2" /> HBAR Wallet
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {paymentMethod === "mpesa" ? (
                  <div>
                    <Label className="text-white">Phone Number</Label>
                    <Input value={user.phone} disabled className="bg-gray-700 border-none mt-1 text-white" />
                    <p className="text-gray-400 text-xs mt-1">Payment request will be sent to this number via STK Push</p>
                  </div>
                ) : (
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2"><span className="text-gray-400">Wallet Balance:</span><span className="font-medium text-white">{user.walletBalance.toFixed(2)} HBAR</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Required:</span><span className="font-medium text-white">{calculateTotalAmount().toFixed(2)} HBAR</span></div>
                    {user.walletBalance < calculateTotalAmount() && <p className="text-red-400 text-xs mt-2">Insufficient HBAR balance. Please top up or use M-Pesa.</p>}
                  </div>
                )}
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex justify-between"><span className="text-gray-400">Total Amount:</span><span className="font-medium text-white">{(calculateTotalAmount() * 12.9).toFixed(0)} KSh</span></div>
                  {selectedProtectionTypes.has("rider") && (
                    <>
                      <div className="flex justify-between mt-1"><span className="text-gray-400">Rider Plan:</span><span className="font-medium text-white">{selectedPlans.rider}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-gray-400">Rider Amount:</span><span className="font-medium text-white">{(planOptions.rider[selectedPlans.rider].amount * 12.9).toFixed(0)} KSh</span></div>
                    </>
                  )}
                  {selectedProtectionTypes.has("bike") && (
                    <>
                      <div className="flex justify-between mt-1"><span className="text-gray-400">Bike Plan:</span><span className="font-medium text-white">{selectedPlans.bike}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-gray-400">Bike Amount:</span><span className="font-medium text-white">{(planOptions.bike[selectedPlans.bike].amount * 12.9).toFixed(0)} KSh</span></div>
                    </>
                  )}
                  {paymentMethod === "hbar" && <div className="flex justify-between mt-1"><span className="text-gray-400">Total HBAR:</span><span className="font-medium text-white">{calculateTotalAmount().toFixed(2)} HBAR</span></div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-white border-0" onClick={() => setPaymentStep("select")} disabled={isLoading}>Back</Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handlePayPremium} disabled={isLoading || (paymentMethod === "hbar" && user.walletBalance < calculateTotalAmount())}>{isLoading ? "Processing..." : "Pay Now"}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStep === "confirm" && (
          <Card className="bg-[#2D3748] border-none">
            <CardHeader><CardTitle className="text-white">Payment Processing</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
                <p className="text-gray-400">{paymentMethod === "mpesa" ? "Waiting for payment confirmation..." : "Processing HBAR transaction..."}</p>
                <p className="text-gray-400 text-sm">{paymentMethod === "mpesa" ? "Please check your phone and approve the M-Pesa payment request" : "Your HBAR wallet transaction is being processed on the Hedera network"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Policy History Table */}
      <Card className="bg-[#2D3748] border-none mt-6">
        <CardHeader><CardTitle className="text-white">Policy History</CardTitle></CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 font-bold">No policy history found</p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={scrollToPolicySection} disabled={isLoading}>Get Your First Policy</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-300">
                    <th className="pb-3 pl-2 font-medium">Coverage</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 pr-2 font-medium">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                      <td className="py-4 pl-2 text-gray-100">{policy.protectionType === "rider" ? "Rider Protection" : "Bike Protection"}</td>
                      <td className="py-4"><div className="font-medium text-gray-100">{policy.plan}</div><div className="text-sm text-gray-400">{policy.plan === "Daily" ? "1 day" : policy.plan === "Weekly" ? "7 days" : "30 days"}</div></td>
                      <td className="py-4 text-gray-100">{policy.hbarAmount ? `${policy.hbarAmount.toFixed(2)} HBAR` : `${policy.premiumPaid} KSh`}</td>
                      <td className="py-4"><div className="text-gray-100">{new Date(policy.createdAt).toLocaleDateString()}</div><div className="text-xs text-gray-400">to {new Date(policy.expiryDate).toLocaleDateString()}</div></td>
                      <td className="py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${policy.active ? "bg-green-900/30 text-green-400" : new Date(policy.expiryDate) > new Date() ? "bg-yellow-900/30 text-yellow-400" : "bg-gray-700 text-gray-300"}`}>{policy.active ? "Active" : new Date(policy.expiryDate) > new Date() ? "Pending" : "Expired"}</span></td>
                      <td className="py-4 pr-2"><a href={`https://hashscan.io/${process.env.NODE_ENV === "production" ? "mainnet" : "testnet"}/transaction/${policy.transactionId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline">{policy.transactionId.slice(0, 6)}...{policy.transactionId.slice(-4)}<ArrowUpRight className="h-3 w-3 ml-1" /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-700" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>Previous</Button>
                  <span className="text-sm text-gray-300">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-700" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages || isLoading}>Next</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}