// src/app/claims/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { Shield, User, Wallet, FileText, LogOut, File, Activity } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";

// Define types for user and claim data
interface User {
  phone: string;
  name: string;
  email: string;
  wallet: string;
  idNumber: string;
}

interface Claim {
  policy: string;
  premium: number;
  effectiveDate: string;
  status: "Pending" | "Approved" | "Rejected";
}

export default function ClaimsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [phone, setPhone] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const PHONE_REGEX = /^\+254\d{9}$/; // Kenyan phone number format

  // Fetch claims with retry logic
  const fetchClaims = useCallback(async (phone: string, retries = 3) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching claims...");

    try {
      const response = await axios.get<{ claims: Claim[] }>(`${API_BASE_URL}/claims`, {
        params: { phone },
        timeout: 10000, // 10-second timeout
      });

      setClaims(response.data.claims || []);
      toast.success("Claims Loaded", {
        description: "Your claims history is up to date",
        id: loadingToast,
      });
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      if (retries > 0 && axiosError.response?.status === 503) {
        // Retry on service unavailable
        setTimeout(() => fetchClaims(phone, retries - 1), 2000);
        return;
      }

      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.message ||
        "Failed to fetch claims";
      toast.error("Failed to Load Claims", {
        description: errorMessage,
        id: loadingToast,
      });
      setError(errorMessage);
      setClaims([]); // Clear claims on error in production
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  // Load user data and fetch claims on mount
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
    setPhone(storedPhone);
    fetchClaims(storedPhone);
  }, [router, fetchClaims]);

  // Handle claim submission
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !PHONE_REGEX.test(phone)) {
      setError("Invalid phone number format. Use +254xxxxxxxxx");
      return;
    }

    setIsLoading(true);
    setError(null);
    const loadingToast = toast.loading("Processing claim...");

    try {
      const response = await axios.post<{ message: string }>(
        `${API_BASE_URL}/claim`,
        { phone },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000, // 15-second timeout
        }
      );

      toast.success("Claim Processed", {
        description: response.data.message || "Payout triggered successfully",
        id: loadingToast,
      });

      fetchClaims(phone); // Refresh claims after submission
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

      toast.error("Claim Failed", {
        description,
        id: loadingToast,
      });
      setError(description);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out", { description: "You have been logged out successfully" });
    router.push("/login");
  };

  if (!user) return null;

  return (
    <MainLayout routeName="/claims">
      <h2 className="text-2xl font-bold mb-4 text-white">Your Claims</h2>
      <p className="text-gray-400 mb-6">Review your claims history and submit new claims.</p>

      {/* Claims Table */}
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
                    key={index}
                    className={`hover:bg-gray-700 ${index % 2 === 1 ? "bg-[#3b4a6b]" : ""}`}
                  >
                    <td className="py-3 text-white">{claim.policy}</td>
                    <td className="py-3 text-white">{claim.premium.toFixed(2)}</td>
                    <td className="py-3 text-white">{claim.effectiveDate}</td>
                    <td
                      className={`py-3 font-bold ${
                        claim.status === "Pending"
                          ? "text-[#f5a623]"
                          : claim.status === "Approved"
                          ? "text-[#00c4b4]"
                          : "text-[#ff4d4f]"
                      }`}
                    >
                      • {claim.status}
                    </td>
                    <td className="py-3">
                      <Button
                        className="bg-transparent border border-[#00c4b4] text-[#00c4b4] hover:bg-[#00c4b4] hover:text-white text-xs"
                        onClick={() =>
                          toast.info("Claim Details", {
                            description: `Details for ${claim.policy} (Status: ${claim.status})`,
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
            <p className="text-gray-400">No claims found. Submit a new claim below.</p>
          )}
        </CardContent>
      </Card>

      {/* Submit New Claim Section */}
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
              <label htmlFor="phone" className="block text-sm text-gray-400 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +254712345678"
                className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500"
                required
                disabled={isLoading || !!user.phone} // Disable if loading or pre-filled
              />
            </div>
            {error && <p className="text-[#ff4d4f] text-sm mb-2">{error}</p>}
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Claim"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}