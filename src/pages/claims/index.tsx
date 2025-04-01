// src/app/claims/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, FileText, LogOut, File, Activity } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MainLayout from "@/components/@layouts/main-layout";

export default function ClaimsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    phone: string;
    name: string;
    email: string;
    wallet: string;
    idNumber: string;
  } | null>(null);
  const [claims, setClaims] = useState<
    { policy: string; premium: number; effectiveDate: string; status: string }[]
  >([]);
  const [phone, setPhone] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    // Load user data from localStorage
    const isRegistered = localStorage.getItem("isRegistered");
    if (!isRegistered || isRegistered !== "true") {
      router.push("/login");
      return;
    }

    const phone = localStorage.getItem("userPhone") || "";
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    const wallet = localStorage.getItem("userWallet") || "";
    const idNumber = localStorage.getItem("userId") || "";

    setUser({ phone, name, email, wallet, idNumber });
    setPhone(phone);

    // Fetch claims data
    fetchClaims(phone);
  }, [router]);

  const fetchClaims = async (phone: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching claims...");

    try {
      const response = await axios.get(`${API_BASE_URL}/claims`, {
        params: { phone },
      });

      // Ensure the response data is an array
      const claimsData = Array.isArray(response.data) ? response.data : [];
      setClaims(claimsData);

      toast.success("Claims Loaded", {
        description: "Your claims history is up to date",
        id: loadingToast,
      });
    } catch (error: any) {
      // Mock data if the API call fails (remove in production)
      const mockClaims = [
        {
          policy: "Karisa's Apple Juju",
          premium: 786.99,
          effectiveDate: "Feb 28, 2023",
          status: "Pending",
        },
        {
          policy: "Mentz Coffee & Eatery",
          premium: 887.12,
          effectiveDate: "Feb 18, 2023",
          status: "Approved",
        },
        {
          policy: "Ashar Funny",
          premium: 678.99,
          effectiveDate: "Feb 17, 2023",
          status: "Rejected",
        },
        {
          policy: "Jack O",
          premium: 467.99,
          effectiveDate: "Jan 30, 2023",
          status: "Pending",
        },
      ];
      setClaims(mockClaims);

      toast.error("Failed to Load Claims", {
        description: error.response?.data?.error || error.message || "Using mock data",
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setIsLoading(true);
    const loadingToast = toast.loading("Processing claim...");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/claim`,
        { phone },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast.success("Claim Processed", {
        description: response.data.message || "Payout triggered successfully",
        id: loadingToast,
      });

      // Refresh claims after submission
      fetchClaims(phone);
    } catch (error: any) {
      const description =
        error.response?.status === 400
          ? error.response.data.error
          : error.response?.data?.error || error.message || "Claim failed";
      toast.error("Claim Failed", {
        description,
        id: loadingToast,
      });
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
            {claims.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-600">
                    <th className="py-2">Policy</th>
                    <th className="py-2">Premium</th>
                    <th className="py-2">Effective Date</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-gray-700 ${
                        index === 1 ? "bg-[#3b4a6b]" : ""
                      }`}
                    >
                      <td className="py-3 text-white">{claim.policy}</td>
                      <td className="py-3 text-white">
                        ${claim.premium.toFixed(2)}
                      </td>
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
                        >
                          Claim Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">
                No claims found. Submit a new claim below.
              </p>
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
                <label
                  htmlFor="phone"
                  className="block text-sm text-gray-400 mb-1"
                >
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full p-2 bg-[#1A202C] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500"
                  required
                  disabled
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