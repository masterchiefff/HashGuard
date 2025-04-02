"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { Activity, ExternalLink, File } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

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
  createdAt: string;
  expiryDate: string;
  active: boolean;
  transactionId?: string;
}

interface PolicyDetails {
  plan: string;
  protectionType: string;
  active: boolean;
}

interface Claim {
  _id: string;
  claimId: string;
  policy: string; // Policy ObjectId
  riderPhone: string; // Added phone number
  premium: number;
  effectiveDate: string;
  status: "Pending" | "Approved" | "Rejected" | "Processed";
  createdAt: string;
  details?: string;
  imageUrl?: string;
  transactionId?: string;
  paymentTransactionId?: string;
  policyDetails: PolicyDetails;
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

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const PHONE_REGEX = /^\+254\d{9}$/;
  const EXPLORER_URL =
    process.env.NODE_ENV === "production"
      ? "https://hashscan.io/mainnet/transaction/"
      : "https://hashscan.io/testnet/transaction/";

  const fetchPoliciesAndClaims = useCallback(
    async (phone: string): Promise<Policy[]> => {
      setIsLoading(true);
      const loadingToast = toast.loading("Fetching policies and claims...");
      const token = localStorage.getItem("token");

      try {
        const [policiesResponse, claimsResponse] = await Promise.all([
          axios.post<{ policies: Policy[] }>(
            `${API_BASE_URL}/policies`,
            { phone },
            { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, timeout: 10000 }
          ),
          axios.post<{ success: boolean; claims: Claim[]; total: number }>(
            `${API_BASE_URL}/get-claims`,
            { phone },
            { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, timeout: 10000 }
          ),
        ]);

        const fetchedPolicies = policiesResponse.data.policies || [];
        const fetchedClaims = claimsResponse.data.claims || [];

        console.log("Fetched Policies:", fetchedPolicies);
        console.log("Fetched Claims:", fetchedClaims);

        setPolicies(fetchedPolicies);
        setClaims(fetchedClaims);

        const claimedPolicyIds = new Set(fetchedClaims.map((claim) => claim.policy));
        const activePoliciesList = fetchedPolicies.filter(
          (p) => p.active && new Date(p.expiryDate) > new Date() && !claimedPolicyIds.has(p._id)
        );

        setActivePolicies(activePoliciesList);
        setSelectedPolicyId(activePoliciesList.length > 0 ? activePoliciesList[0]._id : null);

        toast.success("Data loaded", {
          description: `${activePoliciesList.length} active policies, ${fetchedClaims.length} claims`,
          id: loadingToast,
        });

        return activePoliciesList;
      } catch (error) {
        console.error("Failed to fetch policies or claims:", error);
        setPolicies([]);
        setActivePolicies([]);
        setClaims([]);
        setSelectedPolicyId(null);
        toast.error("Error loading data", {
          description: "Failed to fetch policies or claims",
          id: loadingToast,
        });
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) handleLogout();
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE_URL]
  );

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
    fetchPoliciesAndClaims(storedPhone);
  }, [router, fetchPoliciesAndClaims]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.phone || !PHONE_REGEX.test(user.phone)) {
      setError("Invalid phone number format. Use +254xxxxxxxxx");
      return;
    }

    if (activePolicies.length === 0) {
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
    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();
      formData.append("phone", user.phone);
      formData.append("policyId", selectedPolicyId);
      formData.append("details", claimDetails);
      formData.append("image", claimImage);

      const response = await axios.post<{ message: string; transactionId?: string; smartContractStatus?: string }>(
        `${API_BASE_URL}/claim`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data", "Authorization": `Bearer ${token}` },
          timeout: 15000,
        }
      );

      toast.success("Claim Processed", {
        description: `${response.data.message}. Smart Contract: ${response.data.smartContractStatus || "Pending"}`,
        id: loadingToast,
      });

      setClaimDetails("");
      setClaimImage(null);
      await fetchPoliciesAndClaims(user.phone);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      const status = axiosError.response?.status;
      let description = axiosError.response?.data?.error || "An unexpected error occurred";

      if (status === 400) description = axiosError.response?.data.error || "Invalid request";
      else if (status === 401) {
        description = "Unauthorized. Please log in again.";
        handleLogout();
      } else if (status === 429) description = "Too many requests. Please try again later.";
      else if (status === 500) description = "Server error. Please try again later.";

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
      <p className="text-gray-400 mb-6">Review all your claims linked to your policies.</p>

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Claim ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Policy
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Premium (HBAR)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#2D3748] divide-y divide-gray-600">
                  {claims.map((claim) => (
                    <tr key={claim._id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.claimId || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.riderPhone || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.policyDetails.plan} - {claim.policyDetails.protectionType}
                        {claim.policyDetails.active && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.premium ? claim.premium.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            claim.status === "Approved" || claim.status === "Processed"
                              ? "bg-green-100 text-green-800"
                              : claim.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {claim.details || "No details provided"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {claim.transactionId ? (
                          <Link
                            href={`${EXPLORER_URL}${claim.transactionId}`}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="h-4 w-4 inline mr-1" />
                            View Tx
                          </Link>
                        ) : claim.imageUrl ? (
                          <Link
                            href={`${API_BASE_URL}${claim.imageUrl}`}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="h-4 w-4 inline mr-1" />
                            View Evidence
                          </Link>
                        ) : (
                          "No evidence"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <Select value={selectedPolicyId || ""} onValueChange={(value) => setSelectedPolicyId(value)}>
                  <SelectTrigger className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm">
                    <SelectValue placeholder="Select a policy" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A202C] border border-gray-700 text-white">
                    {activePolicies.map((policy) => (
                      <SelectItem key={policy._id} value={policy._id}>
                        {policy.plan} {policy.protectionType === "rider" ? "Rider" : "Bike"} Protection
                        {" - "}Premium: {(policy.hbarAmount || 0).toFixed(2)} HBAR
                        {" - "}Effective: {new Date(policy.createdAt).toLocaleDateString()} -{" "}
                        {new Date(policy.expiryDate).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-400 text-sm">No active policies available for claiming.</p>
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
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
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