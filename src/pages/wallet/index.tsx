"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Wallet, FileText, File, LogOut, ExternalLink, Info, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Sidebar from "@/components/@shared-components/sidebar";
import MainLayout from "@/components/@layouts/main-layout";

export default function CryptoWalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    phone: string;
    name: string;
    email: string;
    wallet: string;
    idNumber: string;
    riderId: string;
  } | null>(null);
  const [walletData, setWalletData] = useState<{
    walletBalance: number | { low: number; high: number; unsigned?: boolean };
    hptBalance: number | { low: number; high: number; unsigned?: boolean };
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5300";

  // Helper function to parse Hedera number values
  const parseHederaNumber = (value: number | { low: number; high: number; unsigned?: boolean }): number => {
    if (typeof value === 'number') return value;
    if (value?.low !== undefined) return value.low;
    return 0;
  };

  useEffect(() => {
    const isRegistered = localStorage.getItem("isRegistered");
    if (!isRegistered || isRegistered !== "true") {
      toast.error("Session Expired", {
        description: "Please log in to continue.",
      });
      router.push("/login");
      return;
    }

    const phone = localStorage.getItem("userPhone") || "";
    if (phone) {
      fetchWalletData(phone);
    } else {
      toast.error("Session Expired", {
        description: "No phone number found. Please log in again.",
      });
      router.push("/login");
    }
  }, [router]);

  const fetchWalletData = async (phone: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Fetching wallet data...");

    try {
      const response = await axios.post(`${API_BASE_URL}/overview`, { phone }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const data = response.data;

      setUser({
        phone,
        name: data.fullName,
        email: localStorage.getItem("userEmail") || "",
        wallet: data.wallet || "",
        idNumber: localStorage.getItem("userId") || "",
        riderId: data.riderId,
      });

      setWalletData({
        walletBalance: data.walletBalance,
        hptBalance: data.hptBalance,
      });

      toast.success("Wallet Data Loaded", {
        description: "Your crypto wallet details are up to date.",
        id: loadingToast,
      });
    } catch (error: any) {
      let description = "Please try again later";
      if (error.code === "ERR_NAME_NOT_RESOLVED") {
        description = "Unable to connect to the server. Please check your internet connection or contact support.";
      } else if (error.response) {
        description = error.response.status === 400
          ? error.response.data.error
          : error.response.data?.error || error.message;
      } else if (error.request) {
        description = "No response from the server. Please check your network connection.";
      } else {
        description = error.message;
      }

      toast.error("Failed to Load Wallet Data", {
        description,
        id: loadingToast,
      });
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged Out", { description: "You have been logged out successfully" });
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
    <MainLayout routeName={""}>
        <h2 className="text-2xl font-bold mb-2 text-white">
          Your Crypto Wallet
        </h2>
        <p className="text-gray-400 mb-6">
          Learn how to manage your digital funds with Boda Shield.
        </p>

        {/* Wallet Overview Card */}
        <Card className="bg-[#2D3748] border-none mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Wallet className="h-5 w-5 mr-2 text-blue-500" />
              Wallet Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400">Hedera Wallet Address:</p>
                <p className="text-white flex items-center">
                  <a
                    href={`https://hashscan.io/testnet/account/${user.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300 flex items-center"
                  >
                    {user.wallet}
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </p>
              </div>
              <div>
                <p className="text-gray-400">HBAR Balance:</p>
                <p className="text-2xl font-bold text-white">
                  {parseHederaNumber(walletData.walletBalance).toFixed(2)} HBAR
                </p>
              </div>
              <div>
                <p className="text-gray-400">HPT Balance:</p>
                <p className="text-2xl font-bold text-white">
                  {parseHederaNumber(walletData.hptBalance)} HPT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What is a Crypto Wallet? */}
        <Card className="bg-[#2D3748] border-none mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Info className="h-5 w-5 mr-2 text-blue-500" />
              What is a Crypto Wallet?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              A crypto wallet is like a digital bank account that lets you store, send, and receive digital money (called cryptocurrencies). In Boda Shield, your wallet holds two types of digital money:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>
                <strong>HBAR</strong>: This is the main currency of the Hedera network, like digital cash. You can use HBAR to pay for things in our app, like small fees.
              </li>
              <li>
                <strong>HPT (Hashguard Premium Token)</strong>: This is a special token we created for Boda Shield. You need HPT to pay your insurance premiums and stay protected.
              </li>
            </ul>
            <p className="text-gray-300 mt-4">
              Your wallet address (shown above) is like your account number. You can share it with others to receive HBAR or HPT, but keep your account secure by not sharing your login details!
            </p>
          </CardContent>
        </Card>

        {/* How to Add Funds */}
        <Card className="bg-[#2D3748] border-none mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <ArrowRight className="h-5 w-5 mr-2 text-blue-500" />
              How to Add Funds to Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              To use Boda Shield, you'll need HBAR and HPT in your wallet. Here's how to get them:
            </p>

            <div className="space-y-6">
              {/* HBAR Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 1: Get HBAR</h3>
                <p className="text-gray-300 mb-2">
                  Since you're using the test version of our app, you can get free test HBAR from the Hedera Testnet Faucet. Follow these steps:
                </p>
                <ol className="list-decimal list-inside text-gray-300 space-y-2">
                  <li>
                    Visit the{" "}
                    <a
                      href="https://portal.hedera.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300"
                    >
                      Hedera Testnet Portal
                      <ExternalLink className="h-4 w-4 inline ml-1" />
                    </a>.
                  </li>
                  <li>Sign up or log in to get test HBAR.</li>
                  <li>
                    Copy your wallet address from the "Wallet Overview" above ({user.wallet}).
                  </li>
                  <li>Paste your wallet address into the faucet to receive free test HBAR.</li>
                </ol>
                <p className="text-gray-300 mt-2">
                  Once you have HBAR, it will appear in your wallet balance above.
                </p>
              </div>

              {/* HPT Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 2: Get HPT</h3>
                <p className="text-gray-300 mb-2">
                  HPT is a special token for Boda Shield. In the test version, we've already given you some HPT to start with. If you need more:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>
                    You can request more test HPT by contacting our support team (this is a placeholder for now).
                  </li>
                  <li>
                    In the real version, you'll be able to buy HPT using HBAR or other methods we'll provide.
                  </li>
                </ul>
                <p className="text-gray-300 mt-2">
                  Check your HPT balance above. You need at least 1500 HPT to pay a premium and activate your insurance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Use Your Tokens */}
        <Card className="bg-[#2D3748] border-none mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <ArrowRight className="h-5 w-5 mr-2 text-blue-500" />
              How to Use Your HBAR and HPT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Now that you have HBAR and HPT, here's how to use them in Boda Shield:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Paying Premiums</h3>
                <p className="text-gray-300">
                  To activate your insurance, you need to pay a premium using HPT. Here's how:
                </p>
                <ol className="list-decimal list-inside text-gray-300 space-y-2 mt-2">
                  <li>Go to the "Overview" page from the sidebar.</li>
                  <li>Under "Quick Actions," click the "Pay Premium" button.</li>
                  <li>
                    You'll need at least 1500 HPT to pay the premium. If you don't have enough, follow the steps above to get more HPT.
                  </li>
                  <li>
                    Once paid, your insurance will be active, and you'll be protected!
                  </li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Filing a Claim</h3>
                <p className="text-gray-300">
                  If you have an active policy, you can file a claim to receive a payout. Here's how:
                </p>
                <ol className="list-decimal list-inside text-gray-300 space-y-2 mt-2">
                  <li>Go to the "Overview" page from the sidebar.</li>
                  <li>Under "Quick Actions," click the "File a Claim" button.</li>
                  <li>
                    If your policy is active, the claim will be processed, and you'll receive a payout in HBAR to your wallet.
                  </li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What About HBAR?</h3>
                <p className="text-gray-300">
                  HBAR is used for small fees on the Hedera network when you pay premiums or file claims. You don't need to worry about this—it happens automatically! Just make sure you have a small amount of HBAR (like 0.1 HBAR) in your wallet to cover these fees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Help? */}
        <Card className="bg-[#2D3748] border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Info className="h-5 w-5 mr-2 text-blue-500" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              If you're having trouble with your wallet or need more HBAR/HPT, contact our support team at{" "}
              <a
                href="mailto:support@bodashield.com"
                className="text-blue-400 underline hover:text-blue-300"
              >
                support@bodashield.com
              </a>. We're here to help you get started!
            </p>
          </CardContent>
        </Card>
    </MainLayout>
  );
}