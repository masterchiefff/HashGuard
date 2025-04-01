"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, User, Lock, Phone, ArrowRight, Check, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"; 

  const handleSendOTP = async () => {
    // Validate phone number
    const phoneRegex = /^\d{9,10}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      toast.error("Invalid Phone Number", {
        description: "Please enter a valid Kenyan mobile number (e.g., 0712345678)",
      });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Sending OTP...");

    try {
      const formattedPhone = `+254${phoneNumber.replace(/^0/, "")}`;
      const response = await axios.post(`${API_BASE_URL}/register`, {
        phone: formattedPhone,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000, // 10 seconds timeout
      });

      toast.success("OTP Sent", {
        description: response.data.message || "A verification code has been sent to your WhatsApp",
        id: loadingToast,
      });

      setStep(2);
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
      toast.error("Failed to Send OTP", {
        description,
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (!otpString || otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      toast.error("Invalid OTP", {
        description: "Please enter the 6-digit code sent to your phone",
      });
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Verifying OTP...");

    try {
      const formattedPhone = `+254${phoneNumber.replace(/^0/, "")}`;
      const response = await axios.post(`${API_BASE_URL}/verify`, {
        phone: formattedPhone,
        otp: otpString,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      toast.success("OTP Verified", {
        description: response.data.message || "Phone number verified successfully",
        id: loadingToast,
      });

      setStep(3);
    } catch (error: any) {
      const description = error.response?.status === 400
        ? error.response.data.error
        : error.response?.data?.error || error.message || "Please check the code and try again";
      toast.error("Verification Failed", {
        description,
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    // Validate inputs
    if (!fullName || fullName.trim().length < 2) {
      toast.error("Name Required", { description: "Please enter a valid full name (at least 2 characters)" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error("Email Required", { description: "Please enter a valid email address" });
      return;
    }
    if (!idNumber || idNumber.trim().length < 6) {
      toast.error("ID Number Required", { description: "Please enter a valid national ID number (at least 6 characters)" });
      return;
    }

    setIsLoading(true);
    setStep(4);
    const loadingToast = toast.loading("Creating your wallet...");

    try {
      const formattedPhone = `+254${phoneNumber.replace(/^0/, "")}`;
      await registerUser(formattedPhone, loadingToast);
    } catch (error: any) {
      const description = error.response?.status === 400
        ? error.response.data.error
        : error.response?.data?.error || error.message || "Please try again later";
      toast.error("Registration Failed", {
        description,
        id: loadingToast,
      });
      setIsLoading(false);
      setStep(3);
    }
  };

  const registerUser = async (formattedPhone: string, loadingToast: string | number) => {
    const response = await axios.post(`${API_BASE_URL}/register-complete`, {
      phone: formattedPhone,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      idNumber: idNumber.trim(),
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000, // 30 seconds timeout for wallet creation
    });

    const walletId: string = response.data.wallet;
    const riderId: string = response.data.riderId;

    // Store user data in localStorage
    localStorage.setItem("userPhone", formattedPhone);
    localStorage.setItem("userName", fullName.trim());
    localStorage.setItem("userEmail", email.toLowerCase().trim());
    localStorage.setItem("userId", idNumber.trim());
    localStorage.setItem("userWallet", walletId);
    localStorage.setItem("riderId", riderId);
    localStorage.setItem("isRegistered", "true");

    toast.success("Registration Successful", {
      description: `Your Hedera wallet (${walletId}) has been created. Rider ID: ${riderId}`,
      id: loadingToast,
    });

    setIsLoading(false);
    router.push("/");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < Math.min(pastedData.length, 6 - index); i++) {
        newOtp[index + i] = pastedData[i];
      }
      setOtp(newOtp);

      const nextFocus = Math.min(index + pastedData.length, 5);
      otpRefs.current[nextFocus]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const getStepTitle = (): string => {
    switch (step) {
      case 1: return "Create Your Account";
      case 2: return "Verify Your Number";
      case 3: return "Complete Your Profile";
      case 4: return "Creating Your Wallet";
      default: return "Register";
    }
  };

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 mr-2 text-blue-500" />
          <h1 className="text-2xl font-bold">Boda Shield</h1>
        </div>

        {/* Registration Card */}
        <Card className="bg-[#2D3748] border-none">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/login")}
                className="mr-2 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-bold">{getStepTitle()}</h2>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone-number" className="text-gray-400">Mobile Number</Label>
                  <div className="flex">
                    <div className="bg-gray-700 border-none px-3 py-2 rounded-l-md flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-400">+254</span>
                    </div>
                    <Input
                      id="phone-number"
                      placeholder="712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="rounded-l-none bg-gray-700 border-none text-white placeholder-gray-500 focus:ring-blue-500"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-400">We'll send a verification code to this number</p>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-500 hover:underline">Login</Link>
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-gray-400">Verification Code</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {otp.map((digit, i) => (
                      <Input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onPaste={(e) => handleOtpPaste(e, i)}
                        onKeyDown={(e) => handleOtpKeyDown(e, i)}
                        ref={(el) => (otpRefs.current[i] = el)}
                        className="text-center text-lg bg-gray-700 border-none text-white placeholder-gray-500 focus:ring-blue-500 h-12 w-12"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Enter the 6-digit code sent to +254{phoneNumber}</p>
                  <p className="text-xs text-gray-400 mt-4">
                    Didn't receive the code?{" "}
                    <button className="text-blue-500 underline" onClick={handleSendOTP}>Resend</button>
                  </p>
                </div>
                <div className="flex space-x-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleVerifyOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name" className="text-gray-400">Full Name</Label>
                    <div className="flex">
                      <div className="bg-gray-700 border-none px-3 py-2 rounded-l-md flex items-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="full-name"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="rounded-l-none bg-gray-700 border-none text-white placeholder-gray-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-400">Email Address</Label>
                    <div className="flex">
                      <div className="bg-gray-700 border-none px-3 py-2 rounded-l-md flex items-center">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-l-none bg-gray-700 border-none text-white placeholder-gray-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id-number" className="text-gray-400">National ID Number</Label>
                    <div className="flex">
                      <div className="bg-gray-700 border-none px-3 py-2 rounded-l-md flex items-center">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="id-number"
                        placeholder="Enter your ID number"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                        className="rounded-l-none bg-gray-700 border-none text-white placeholder-gray-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleCompleteRegistration}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : <>Complete Registration <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-gray-400">Creating your Hedera wallet...</p>
                  <p className="text-xs text-gray-400">
                    This will only take a moment. We're setting up your secure blockchain wallet.
                  </p>
                </div>
                <div className="space-y-2 mt-8">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Check className="h-4 w-4 text-blue-500" />
                    <p className="text-sm">Generating secure keys</p>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Check className="h-4 w-4 text-blue-500" />
                    <p className="text-sm">Creating Hedera account</p>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <div className="h-4 w-4 animate-pulse">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mx-auto mt-1"></div>
                    </div>
                    <p className="text-sm">Linking to your phone number</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-center text-gray-400 mt-6">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}