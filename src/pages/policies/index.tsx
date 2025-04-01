"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Shield, User, Bike, Wallet, CreditCard, LogOut, FileText,
  ArrowRight, File, CheckCircle, RefreshCw, Plus, AlertCircle,
  Zap, Clock, Smartphone, ChevronDown, ChevronUp, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/@layouts/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

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
  }>({ rider: "Weekly", bike: "Weekly" }); // Default both to "Weekly"
  const [selectedProtectionTypes, setSelectedProtectionTypes] = useState<Set<"rider" | "bike">>(new Set(["rider"]));
  const [paymentStep, setPaymentStep] = useState<"select" | "pay" | "confirm">("select");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "hbar">("mpesa");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const policiesPerPage = 5;

  // Coverage state
  const [coverageDetails, setCoverageDetails] = useState({
    rider: { accidentalDeath: 0, medicalExpenses: 0, hospitalCash: 0 },
    bike: { theft: 0, accidentalDamage: 0, thirdPartyLiability: 0 }
  });

  // Plan options
  const planOptions = {
    rider: {
      Daily: {
        amount: 0.93,
        coverage: { accidentalDeath: 200000, medicalExpenses: 50000, hospitalCash: 1000 }
      },
      Weekly: {
        amount: 4.65,
        coverage: { accidentalDeath: 500000, medicalExpenses: 200000, hospitalCash: 2000 }
      },
      Monthly: {
        amount: 16.28,
        coverage: { accidentalDeath: 1000000, medicalExpenses: 500000, hospitalCash: 3000 }
      }
    },
    bike: {
      Daily: {
        amount: 0.62,
        coverage: { theft: 0, accidentalDamage: 0, thirdPartyLiability: 100000 }
      },
      Weekly: {
        amount: 3.10,
        coverage: { theft: 150000, accidentalDamage: 50000, thirdPartyLiability: 500000 }
      },
      Monthly: {
        amount: 10.85,
        coverage: { theft: 300000, accidentalDamage: 150000, thirdPartyLiability: 1000000 }
      }
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5300";

  // Initialize user data
  useEffect(() => {
    const loadUserData = async () => {
      const phone = localStorage.getItem("userPhone") || "";
      if (phone) {
        try {
          const balanceResponse = await axios.post(`${API_BASE_URL}/wallet-balance`, { phone });
          setUser({
            phone,
            name: localStorage.getItem("userName") || "",
            email: localStorage.getItem("userEmail") || "",
            wallet: localStorage.getItem("userWallet") || "",
            idNumber: localStorage.getItem("userId") || "",
            riderId: localStorage.getItem("riderId") || "",
            walletBalance: balanceResponse.data.walletBalance || 0
          });
          fetchPolicies(phone);
        } catch (error) {
          console.error("Failed to fetch wallet balance:", error);
          setUser({
            phone,
            name: localStorage.getItem("userName") || "",
            email: localStorage.getItem("userEmail") || "",
            wallet: localStorage.getItem("userWallet") || "",
            idNumber: localStorage.getItem("userId") || "",
            riderId: localStorage.getItem("riderId") || "",
            walletBalance: 0
          });
          fetchPolicies(phone);
        }
      } else {
        router.push("/login");
      }
    };
    loadUserData();
  }, [router]);

  // Fetch policies
  const fetchPolicies = useCallback(async (phone: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/policies`, {
        phone,
        page,
        limit: policiesPerPage
      });
      setPolicies(response.data.policies);
      setTotalPages(response.data.pagination.totalPages);
      if (response.data.policies.length === 0) {
        toast.info('No policies found. Get your first policy!');
      }
    } catch (error) {
      toast.error('Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // Handle protection type selection
  const handleProtectionTypeChange = (type: "rider" | "bike", checked: boolean) => {
    const newSet = new Set(selectedProtectionTypes);
    if (checked) {
      newSet.add(type);
    } else {
      newSet.delete(type);
    }
    setSelectedProtectionTypes(newSet);
    updateCoverageDetails(newSet);
  };

  // Handle plan change
  const handlePlanChange = (type: "rider" | "bike", value: "Daily" | "Weekly" | "Monthly") => {
    setSelectedPlans(prev => ({ ...prev, [type]: value }));
    updateCoverageDetails(selectedProtectionTypes);
  };

  // Update coverage details based on selected plans
  const updateCoverageDetails = (types: Set<"rider" | "bike">) => {
    const newCoverage = {
      rider: { accidentalDeath: 0, medicalExpenses: 0, hospitalCash: 0 },
      bike: { theft: 0, accidentalDamage: 0, thirdPartyLiability: 0 }
    };
    if (types.has("rider") && selectedPlans.rider) {
      newCoverage.rider = planOptions.rider[selectedPlans.rider].coverage;
    }
    if (types.has("bike") && selectedPlans.bike) {
      newCoverage.bike = planOptions.bike[selectedPlans.bike].coverage;
    }
    setCoverageDetails(newCoverage);
  };

  // Calculate total amount
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

  const handlePayPremium = async () => {
    if (!user?.phone || selectedProtectionTypes.size === 0) return;
  
    setIsLoading(true);
    const toastId = toast.loading('Initiating payment...');
  
    try {
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
        // M-Pesa payment flow remains the same
        const response = await axios.post(`${API_BASE_URL}/paypremium`, {
          phone: user.phone,
          policies: policiesToPurchase,
          totalAmount: totalAmount * 12.9, // Convert to KSh
          paymentMethod: 'mpesa'
        });
  
        if (!response.data.checkoutRequestId) {
          throw new Error('Payment initiation failed - no checkout ID received');
        }
  
        await pollPaymentStatus(response.data.checkoutRequestId);
      } else {
        // HBAR wallet payment flow
        setPaymentStep('confirm');
        
        // First verify the user has sufficient balance
        if (user.walletBalance < totalAmount) {
          throw new Error('Insufficient HBAR balance');
        }
  
        // Make the payment request in HBAR
        const response = await axios.post(`${API_BASE_URL}/paypremium`, {
          phone: user.phone,
          policies: policiesToPurchase,
          totalAmount: totalAmount, // Send HBAR amount
          paymentMethod: 'hbar'
        });
  
        if (response.data.success) {
          toast.success('Payment successful!', { id: toastId });
          
          // Update local wallet balance
          const newBalance = user.walletBalance - totalAmount;
          setUser(prev => ({ 
            ...prev!, 
            walletBalance: newBalance 
          }));
          
          // Refresh policies and reset UI
          fetchPolicies(user.phone);
          setPaymentStep('select');
        } else {
          throw new Error(response.data.error || 'HBAR payment failed');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Payment failed', { id: toastId });
      setPaymentStep('pay');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll payment status
  const pollPaymentStatus = async (checkoutRequestId: string) => {
    const toastId = toast.loading('Waiting for payment confirmation...');
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.post(`${API_BASE_URL}/payment-status`, { checkoutRequestId });
        if (response.data.status === 'completed') {
          clearInterval(interval);
          toast.success('Payment confirmed!', { id: toastId });
          fetchPolicies(user!.phone);
        } else if (attempts >= 12) {
          clearInterval(interval);
          toast.info('Payment still pending. Check your phone', { id: toastId });
        }
      } catch (error) {
        clearInterval(interval);
        toast.error('Payment verification failed', { id: toastId });
      }
    }, 5000);
  };

  // Handle claim
  const handleClaim = async () => {
    if (!user?.phone) return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/claim`, { phone: user.phone });
      toast.success("Claim submitted successfully");
      fetchPolicies(user.phone);
    } catch (error: any) {
      toast.error("Claim failed: " + (error.response?.data?.error || "Please try again"));
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to policy section
  const scrollToPolicySection = () => {
    setPaymentStep("select");
    setTimeout(() => {
      policySectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (!user) {
    return <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <MainLayout routeName="/policies">
      <h2 className="text-2xl font-bold mb-4">Your Boda Insurance</h2>

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
              Expires: {policies.find(p => p.active)?.expiryDate}
            </p>
          )}
        </div>
      </div>

      {/* Coverage and Billing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Coverage Details */}
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
                <li className="flex justify-between">
                  <span className="text-gray-400">Accidental Death:</span>
                  <span className="font-medium">
                    {coverageDetails.rider.accidentalDeath.toLocaleString()} KSh
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Medical Expenses:</span>
                  <span className="font-medium">
                    {coverageDetails.rider.medicalExpenses.toLocaleString()} KSh
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Daily Hospital:</span>
                  <span className="font-medium">
                    {coverageDetails.rider.hospitalCash.toLocaleString()} KSh/day
                  </span>
                </li>
              </ul>
            </div>

            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Bike className="h-5 w-5 mr-2 text-blue-500" />
                <h4 className="font-medium">Bike Protection</h4>
              </div>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span className="text-gray-400">Theft:</span>
                  <span className="font-medium">
                    {coverageDetails.bike.theft > 0 ? `${coverageDetails.bike.theft.toLocaleString()} KSh` : "Not covered"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Accident Damage:</span>
                  <span className="font-medium">
                    {coverageDetails.bike.accidentalDamage > 0 ? `${coverageDetails.bike.accidentalDamage.toLocaleString()} KSh` : "Not covered"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Third-Party:</span>
                  <span className="font-medium">
                    {coverageDetails.bike.thirdPartyLiability.toLocaleString()} KSh
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-[#2D3748] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Selected Plans</p>
              <p className="font-medium">
                {selectedProtectionTypes.size === 0 
                  ? "None" 
                  : Array.from(selectedProtectionTypes)
                      .filter(type => selectedPlans[type]) // Ensure the plan exists
                      .map(type => 
                        `${type === "rider" ? "Rider" : "Bike"} • ${selectedPlans[type]} • ${(planOptions[type][selectedPlans[type]].amount * 12.9).toFixed(0)} KSh`
                      )
                      .join(", ")
                }
              </p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Next Payment</p>
              <p className="text-2xl font-bold my-1">
                {(calculateTotalAmount() * 12.9).toFixed(0)} KSh
              </p>
              <p className="text-gray-400 text-sm">
                {selectedProtectionTypes.size} Plan{selectedProtectionTypes.size !== 1 ? "s" : ""} Renewal
              </p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-xl font-bold my-1">
                {user.walletBalance.toFixed(2)} HBAR
              </p>
              <p className="text-xs text-gray-400">
                ≈ {(user.walletBalance * 12.9).toFixed(2)} KSh
              </p>
            </div>

            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={scrollToPolicySection}
            >
              {policies.some(p => p.active) ? "Modify Plans" : "Get Covered"}
            </Button>

            {policies.some(p => p.active) && (
              <Button 
                variant="outline"
                className="w-full text-green-500 border-green-500 hover:bg-green-900/20"
                onClick={handleClaim}
              >
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
                {/* Protection Type Selection */}
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
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Plan Selection */}
                {selectedProtectionTypes.has("rider") && (
                  <div>
                    <Label className="text-white">Rider Plan Duration</Label>
                    <Select 
                      value={selectedPlans.rider} 
                      onValueChange={(value) => handlePlanChange("rider", value as "Daily" | "Weekly" | "Monthly")}
                    >
                      <SelectTrigger className="bg-gray-700 border-none mt-1">
                        <SelectValue placeholder="Select rider plan" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-none">
                        <SelectItem value="Daily">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Daily</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.rider.Daily.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Weekly">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Weekly</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.rider.Weekly.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Monthly">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Monthly</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.rider.Monthly.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedProtectionTypes.has("bike") && (
                  <div>
                    <Label className="text-white">Bike Plan Duration</Label>
                    <Select 
                      value={selectedPlans.bike} 
                      onValueChange={(value) => handlePlanChange("bike", value as "Daily" | "Weekly" | "Monthly")}
                    >
                      <SelectTrigger className="bg-gray-700 border-none mt-1">
                        <SelectValue placeholder="Select bike plan" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-none">
                        <SelectItem value="Daily">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Daily</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.bike.Daily.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Weekly">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Weekly</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.bike.Weekly.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Monthly">
                          <div className="flex justify-between w-full">
                            <span className="text-white">Monthly</span>
                            <span className="text-gray-400 text-white">
                              {(planOptions.bike.Monthly.amount * 12.9).toFixed(0)} KSh
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border border-gray-600 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-white">Plan Benefits</h4>
                  <ul className="space-y-2 text-sm">
                    {selectedProtectionTypes.has("rider") && (
                      <li className="flex items-center text-white">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {selectedPlans.rider} rider accident coverage
                      </li>
                    )}
                    {selectedProtectionTypes.has("bike") && (
                      <li className="flex items-center text-white">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {selectedPlans.bike} bike protection
                      </li>
                    )}
                    <li className="flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Instant activation
                    </li>
                  </ul>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setPaymentStep("pay")}
                  disabled={selectedProtectionTypes.size === 0}
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStep === "pay" && (
          <Card className="bg-[#2D3748] border-none">
            <CardHeader>
              <CardTitle className="text-white">Complete Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Payment Method</Label>
                  <Tabs 
                    value={paymentMethod} 
                    onValueChange={(value) => setPaymentMethod(value as "mpesa" | "hbar")}
                    className="mt-1"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                      <TabsTrigger value="mpesa" className="data-[state=active]:bg-gray-600">
                        <img src="/mpesa-logo.png" alt="M-Pesa" className="h-5 mr-2" />
                        M-Pesa
                      </TabsTrigger>
                      <TabsTrigger value="hbar" className="data-[state=active]:bg-gray-600">
                        <img src="/hbar-logo.png" alt="HBAR" className="h-5 mr-2" />
                        HBAR Wallet
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {paymentMethod === "mpesa" ? (
                  <div>
                    <Label className="text-white">Phone Number</Label>
                    <Input 
                      value={user.phone} 
                      disabled 
                      className="bg-gray-700 border-none mt-1 text-white"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Payment request will be sent to this number via STK Push
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Wallet Balance:</span>
                      <span className="font-medium text-white">
                        {user.walletBalance.toFixed(2)} HBAR
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Required:</span>
                      <span className="font-medium text-white">
                        {calculateTotalAmount().toFixed(2)} HBAR
                      </span>
                    </div>
                    {user.walletBalance < calculateTotalAmount() && (
                      <p className="text-red-400 text-xs mt-2">
                        Insufficient HBAR balance. Please top up or use M-Pesa.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Amount:</span>
                    <span className="font-medium text-white">
                      {(calculateTotalAmount() * 12.9).toFixed(0)} KSh
                    </span>
                  </div>
                  {selectedProtectionTypes.has("rider") && (
                    <>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-400">Rider Plan:</span>
                        <span className="font-medium text-white">{selectedPlans.rider}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-400">Rider Amount:</span>
                        <span className="font-medium text-white">
                          {(planOptions.rider[selectedPlans.rider].amount * 12.9).toFixed(0)} KSh
                        </span>
                      </div>
                    </>
                  )}
                  {selectedProtectionTypes.has("bike") && (
                    <>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-400">Bike Plan:</span>
                        <span className="font-medium text-white">{selectedPlans.bike}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-400">Bike Amount:</span>
                        <span className="font-medium text-white">
                          {(planOptions.bike[selectedPlans.bike].amount * 12.9).toFixed(0)} KSh
                        </span>
                      </div>
                    </>
                  )}
                  {paymentMethod === "hbar" && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-400">Total HBAR:</span>
                      <span className="font-medium text-white">
                        {calculateTotalAmount().toFixed(2)} HBAR
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-white border-0"
                    onClick={() => setPaymentStep("select")}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handlePayPremium}
                    disabled={isLoading || 
                      (paymentMethod === "hbar" && user.walletBalance < calculateTotalAmount())}
                  >
                    {isLoading ? "Processing..." : "Pay Now"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentStep === "confirm" && (
          <Card className="bg-[#2D3748] border-none">
            <CardHeader>
              <CardTitle className="text-white">Payment Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
                <p className="text-gray-400 text-white">
                  {paymentMethod === "mpesa" 
                    ? "Waiting for payment confirmation..." 
                    : "Processing HBAR transaction..."}
                </p>
                <p className="text-gray-400 text-sm text-white">
                  {paymentMethod === "mpesa" 
                    ? "Please check your phone and approve the M-Pesa payment request" 
                    : "Your HBAR wallet transaction is being processed on the Hedera network"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Policy History Table */}
      <Card className="bg-[#2D3748] border-none mt-6">
        <CardHeader>
          <CardTitle className="text-white">Policy History</CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 font-bold">No policy history found</p>
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={scrollToPolicySection}
              >
                Get Your First Policy
              </Button>
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
                      <td className="py-4 pl-2 text-gray-100">
                        {policy.protectionType === "rider" ? "Rider Protection" : "Bike Protection"}
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-gray-100">{policy.plan}</div>
                        <div className="text-sm text-gray-400">
                          {policy.plan === "Daily" ? "1 day" : policy.plan === "Weekly" ? "7 days" : "30 days"}
                        </div>
                      </td>
                      <td className="py-4 text-gray-100">
                        {policy.hbarAmount ? `${policy.hbarAmount} HBAR` : `${policy.premiumPaid} KSh`}
                      </td>
                      <td className="py-4">
                        <div className="text-gray-100">
                          {new Date(policy.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          to {new Date(policy.expiryDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          policy.active
                            ? "bg-green-900/30 text-green-400"
                            : new Date(policy.expiryDate) > new Date()
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-gray-700 text-gray-300"
                        }`}>
                          {policy.active
                            ? "Active"
                            : new Date(policy.expiryDate) > new Date()
                              ? "Pending"
                              : "Expired"}
                        </span>
                      </td>
                      <td className="py-4 pr-2">
                        <a
                          href={`https://hashscan.io/testnet/transaction/${policy.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {policy.transactionId.slice(0, 6)}...{policy.transactionId.slice(-4)}
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}