"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router"; // Use next/router for Pages Router
import axios from "axios";
import { Shield, Phone, ArrowRight, Check, ArrowLeft, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [otpReceived, setOtpReceived] = useState<string>("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleSendOTP = async () => {
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
      const response = await axios.post(`${API_BASE_URL}/login-otp`, {
        phone: formattedPhone,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      // Store the OTP to display in the title
      if (response.data.otp) {
        setOtpReceived(response.data.otp);
      }

      // Updated: Always expect OTP in response and mention WhatsApp
      toast.success("OTP Sent", {
        description: `Your OTP is: ${response.data.otp}. Check WhatsApp or enter it below to verify.`,
        id: loadingToast,
        duration: 10000, // Show for 10 seconds
      });
      setStep(2);

      // Kept original conditional block (though now redundant) to preserve functionality
      if (response.data.otp) {
        // OTP returned in response (now always true)
        toast.success("OTP Generated", {
          description: `Your OTP is: ${response.data.otp}. Enter it below to verify.`,
          id: loadingToast,
          duration: 10000, // Show for 10 seconds
        });
        setStep(2);
      } else {
        // OTP sent via WhatsApp (won't trigger but kept for original behavior)
        toast.success("OTP Sent", {
          description: response.data.message || "Check your WhatsApp for the verification code",
          id: loadingToast,
        });
        setStep(2);
      }
    } catch (error: any) {
      let description = "Please try again later";
      if (error.response && error.response.status === 400 && error.response.data.error === "Phone not registered. Please register first.") {
        toast.info("New User Detected", {
          description: "You need to register first. Let's get started!",
          id: loadingToast,
        });
        router.push("/signup");
        return;
      }
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
        description: "Please enter the 6-digit code",
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

      const userStatusResponse = await axios.post(`${API_BASE_URL}/user-status`, {
        phone: formattedPhone,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const userData = userStatusResponse.data;

      if (userData.active !== undefined) {
        localStorage.setItem("isRegistered", "true");
        localStorage.setItem("userPhone", formattedPhone);
        localStorage.setItem("userWallet", userData.wallet || "");
        localStorage.setItem("userName", userData.fullName || "");
        localStorage.setItem("userEmail", userData.email || "");
        localStorage.setItem("userId", userData.idNumber || "");
        localStorage.setItem("riderId", userData.riderId || "");

        toast.success("Login Successful", {
          description: "Welcome back to HashGuard!",
          id: loadingToast,
        });

        router.push("/");
      } else {
        localStorage.setItem("phoneVerified", "true");
        localStorage.setItem("userPhone", formattedPhone);
        toast.info("Complete Registration", {
          description: "It looks like you haven't completed registration. Let's get you set up!",
          id: loadingToast,
        });
        router.push("/signup");
      }
    } catch (error: any) {
      let description = "Please try again later";
      if (error.response) {
        if (error.response.status === 400 && error.response.data.error === "Rider not registered") {
          const formattedPhone = `+254${phoneNumber.replace(/^0/, "")}`;
          localStorage.setItem("phoneVerified", "true");
          localStorage.setItem("userPhone", formattedPhone);
          toast.info("New User Detected", {
            description: "You need to complete registration first. Let's get started!",
            id: loadingToast,
          });
          router.push("/signup");
          return;
        }
        description = error.response.status === 400
          ? error.response.data.error
          : error.response.data?.error || error.message;
      } else if (error.request) {
        description = "No response from the server. Please check your network connection.";
      } else {
        description = error.message;
      }
      toast.error("Verification Failed", {
        description,
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
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
      case 1: return "Login to Your Account";
      case 2: return "Verify Your Number";
      default: return "Login";
    }
  };

  // Pre-fill OTP fields if OTP is received in development mode
  useEffect(() => {
    if (otpReceived && step === 2) {
      const otpDigits = otpReceived.split('');
      if (otpDigits.length === 6) {
        const newOtp = [...otp];
        otpDigits.forEach((digit, index) => {
          newOtp[index] = digit;
        });
        setOtp(newOtp);
      }
    }
  }, [otpReceived, step]);

  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hidden OTP Title that becomes visible when OTP is received */}
        {otpReceived && (
          <div className="mb-4 p-4 bg-green-600 rounded-md text-center">
            <h3 className="font-bold">Your OTP: {otpReceived}</h3>
            <p className="text-sm">Enter this code below to verify your number</p>
          </div>
        )}

        {/* Branding Header */}
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 mr-2 text-blue-500" />
          <h1 className="text-2xl font-bold">HashGuard</h1>
        </div>

        {/* Login Card */}
        <Card className="bg-[#2D3748] border-none">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep(step - 1)}
                  className="mr-2 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h2 className="text-2xl text-gray-400 font-bold">{getStepTitle()}</h2>
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
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue-500 hover:underline">Register</Link>
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
                  <p className="text-xs text-gray-400">Enter the 6-digit code for +254{phoneNumber}</p>
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
                    {isLoading ? "Verifying..." : <>Login <LogIn className="ml-2 h-4 w-4" /></>}
                  </Button>
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

        <p className="text-xs text-center text-gray-400 mt-6">You will receive the <span className="text-blue-500 font-bold text-green-500">OTP via Sonner/alert</span> if you did not receive it via WhatsApp</p>
      </div>
    </div>
  );
}