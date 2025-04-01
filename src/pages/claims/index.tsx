// src/app/claims/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { Shield, User, Wallet, FileText, LogOut, File, Activity, Upload } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  phone: string;
  name: string;
  email: string;
  wallet: string;
  idNumber: string;
}

interface Policy {
  _id: string;
  plan: string;
  protectionType: "rider" | "bike";
  hbarAmount?: number;
  premiumPaid?: number;
  createdAt: string;
  expiryDate: string;
  active: boolean;
}

interface Claim {
  policy: string;
  premium: number;
  effectiveDate: string;
  status: "Pending" | "Approved" | "Rejected";
  claimId: string;
  createdAt: string;
  details?: string;
  imageUrl?: string;
}

export default function ClaimsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicies, setActivePolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claimDetails, setClaimDetails] = useState<string>("");
  const [claimImage, setClaimImage] = useState<File | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5300";
  const PHONE_REGEX = /^\+254\d{9}$/;

  const fetchPolicies = useCallback(async (phone: string): Promise<Policy[]> => {
    try {
      const response = await axios.post<{ policies: Policy[] }>(
        `${API_BASE_URL}/policies`,
        { phone, page: 1, limit: 10 },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const fetchedPolicies = response.data.policies || [];
      console.log("Fetched Policies:", fetchedPolicies);
      setPolicies(fetchedPolicies);

      const activePoliciesList = fetchedPolicies.filter(
        (p) => p.active && new Date(p.expiryDate) > new Date()
      );
      console.log("Active Policies:", activePoliciesList);
      setActivePolicies(activePoliciesList);
      // Set the first active policy as default if available
      setSelectedPolicyId(activePoliciesList.length > 0 ? activePoliciesList[0]._id : null);
      return activePoliciesList;
    } catch (error) {
      console.error("Failed to fetch policies:", error);
      setPolicies([]);
      setActivePolicies([]);
      setSelectedPolicyId(null);
      return [];
    }
  }, [API_BASE_URL]);

  const fetchClaims = useCallback(async (phone: string, retries = 3) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching claims...");

    try {
      const response = await axios.post<{ claims: Claim[] }>(
        `${API_BASE_URL}/claims`,
        { phone },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const fetchedClaims = response.data.claims || [];
      console.log("Fetched Claims:", fetchedClaims);
      setClaims(fetchedClaims);

      if (fetchedClaims.length === 0) {
        toast.info("No claims found", {
          description: "Submit a claim if you have an active policy.",
          id: loadingToast,
        });
      } else {
        toast.success("Claims Loaded", {
          description: "Your claims history is up to date",
          id: loadingToast,
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      if (retries > 0 && axiosError.response?.status === 503) {
        setTimeout(() => fetchClaims(phone, retries - 1), 2000);
        return;
      }

      const errorMessage =
        axiosError.response?.data?.error || axiosError.message || "Failed to fetch claims";
      toast.error("Failed to Load Claims", { description: errorMessage, id: loadingToast });
      setError(errorMessage);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    const isRegistered = localStorage.getItem("isRegistered");
    if (!isRegistered || isRegistered !== "true") {
      router.push("/login");
      return;
    }

    const storedPhone = localStorage.getItem("userPhone") || "";
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    const wallet = localStorage.getItem("userWallet") || "";
    const idNumber = localStorage.getItem("userId") || "";

    if (!PHONE_REGEX.test(storedPhone)) {
      toast.error("Invalid Session", {
        description: "Phone number format is invalid. Please log in again.",
      });
      handleLogout();
      return;
    }

    setUser({ phone: storedPhone, name, email, wallet, idNumber });
    fetchPolicies(storedPhone);
    fetchClaims(storedPhone);
  }, [router, fetchPolicies, fetchClaims]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.phone || !PHONE_REGEX.test(user.phone)) {
      setError("Invalid phone number format. Use +254xxxxxxxxx");
      return;
    }

    // Fetch the latest active policies
    const currentActivePolicies = await fetchPolicies(user.phone);
    console.log("Active Policies on Submit:", currentActivePolicies);
    if (currentActivePolicies.length === 0) {
      setError("No active policies found. Please purchase a policy first.");
      return;
    }
    if (!selectedPolicyId) {
      setError("Please select a policy to submit a claim for.");
      return;
    }
    if (!claimDetails.trim()) {
      setError("Please provide claim details.");
      return;
    }
    if (!claimImage) {
      setError("Please upload an image for the claim.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const loadingToast = toast.loading("Processing claim...");

    try {
      const formData = new FormData();
      formData.append("phone", user.phone);
      formData.append("policyId", selectedPolicyId); // Send the selected policy ID
      formData.append("details", claimDetails);
      formData.append("image", claimImage);

      const response = await axios.post<{ message: string }>(
        `${API_BASE_URL}/claim`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 15000,
        }
      );

      toast.success("Claim Processed", {
        description: response.data.message || "Your claim has been submitted",
        id: loadingToast,
      });

      setClaimDetails("");
      setClaimImage(null);
      fetchClaims(user.phone);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const status = axiosError.response?.status;
      let description = "An unexpected error occurred";

      if (status === 400) {
        description = axiosError.response?.data.error || "Invalid request";
      } else if (status === 429) {
        description = "Too many requests. Please try again later.";
      } else if (status === 500) {
        description = "Server error. Please try again later.";
      } else {
        description = axiosError.message || "Network error";
      }

      toast.error("Claim Failed", { description, id: loadingToast });
      setError(description);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out", { description: "You have been logged out successfully" });
    router.push("/login");
  };

  if (!user) return null;

  return (
    <MainLayout routeName="/claims">
      <h2 className="text-2xl font-bold mb-4 text-white">Your Claims</h2>
      <p className="text-gray-400 mb-6">Review your claims history and submit new claims based on your policies.</p>

      <Card className="bg-[#2D3748] border-none mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Claims History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && claims.length === 0 ? (
            <p className="text-gray-400">Loading claims...</p>
          ) : claims.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600">
                  <th className="py-2">Policy</th>
                  <th className="py-2">Premium (HBAR)</th>
                  <th className="py-2">Effective Date</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, index) => (
                  <tr
                    key={claim.claimId || index}
                    className={`hover:bg-gray-700 ${index % 2 === 1 ? "bg-[#3b4a6b]" : ""}`}
                  >
                    <td className="py-3 text-white">{claim.policy || "Unknown"}</td>
                    <td className="py-3 text-white">{claim.premium ? claim.premium.toFixed(2) : "N/A"}</td>
                    <td className="py-3 text-white">
                      {claim.effectiveDate ? new Date(claim.effectiveDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td
                      className={`py-3 font-bold ${
                        claim.status === "Pending"
                          ? "text-[#f5a623]"
                          : claim.status === "Approved"
                          ? "text-[#00c4b4]"
                          : "text-[#ff4d4f]"
                      }`}
                    >
                      • {claim.status || "Unknown"}
                    </td>
                    <td className="py-3">
                      <Button
                        className="bg-transparent border border-[#00c4b4] text-[#00c4b4] hover:bg-[#00c4b4] hover:text-white text-xs"
                        onClick={() =>
                          toast.info("Claim Details", {
                            description: `Claim ID: ${claim.claimId || "N/A"}\nPolicy: ${claim.policy || "Unknown"}\nDetails: ${claim.details || "None"}\nImage: ${claim.imageUrl ? "Uploaded" : "None"}\nSubmitted: ${claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "N/A"}`,
                          })
                        }
                        disabled={isLoading}
                      >
                        Claim Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No claims found.</p>
              <p className="text-gray-400 mt-2">Have an active policy? Submit a claim below.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#2D3748] border-none">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <File className="h-5 w-5 mr-2 text-blue-500" />
            Submit a New Claim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitClaim}>
            <div className="mb-4">
              <Label htmlFor="phone" className="block text-sm text-gray-400 mb-1">
                Phone Number
              </Label>
              <Input
                type="text"
                id="phone"
                value={user.phone}
                disabled
                className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500"
              />
            </div>
            <div className="mb-4">
              <Label className="block text-sm text-gray-400 mb-1">Select Active Policy</Label>
              {activePolicies.length > 0 ? (
                <Select
                  value={selectedPolicyId || ""}
                  onValueChange={(value) => setSelectedPolicyId(value)}
                >
                  <SelectTrigger className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm">
                    <SelectValue placeholder="Select a policy" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A202C] border border-gray-700 text-white">
                    {activePolicies.map((policy) => (
                      <SelectItem key={policy._id} value={policy._id}>
                        {policy.plan} {policy.protectionType === "rider" ? "Rider" : "Bike"} Protection
                        {" - "}Premium: {(policy.hbarAmount || (policy.premiumPaid ? policy.premiumPaid / 12.9 : 0)).toFixed(2)} HBAR
                        {" - "}Effective: {new Date(policy.createdAt).toLocaleDateString()} -{" "}
                        {new Date(policy.expiryDate).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-400 text-sm">No active policies found.</p>
              )}
            </div>
            <div className="mb-4">
              <Label htmlFor="claimDetails" className="block text-sm text-gray-400 mb-1">
                Claim Details
              </Label>
              <Textarea
                id="claimDetails"
                value={claimDetails}
                onChange={(e) => setClaimDetails(e.target.value)}
                placeholder="Describe your claim (e.g., accident details, damage description)"
                className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="claimImage" className="block text-sm text-gray-400 mb-1">
                Upload Evidence (Image)
              </Label>
              <div className="flex items-center">
                <Input
                  type="file"
                  id="claimImage"
                  accept="image/*"
                  onChange={(e) => setClaimImage(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-blue-600 file:text-white"
                />
                {claimImage && <p className="text-gray-400 text-xs ml-2">{claimImage.name}</p>}
              </div>
            </div>
            {error && <p className="text-[#ff4d4f] text-sm mb-2">{error}</p>}
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading || activePolicies.length === 0}
            >
              {isLoading ? "Submitting..." : "Submit Claim"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}