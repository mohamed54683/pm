"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userId", result.user.id);
        localStorage.setItem("userName", result.user.name);
        localStorage.setItem("userRole", result.user.role);
        
        // Fetch user's assigned restaurants from database
        const restaurantsResponse = await fetch(`/api/qms/user-restaurants?userId=${result.user.id}`);
        const restaurantsResult = await restaurantsResponse.json();
        
        if (restaurantsResult.success) {
          localStorage.setItem("userRestaurants", JSON.stringify(restaurantsResult.data));
        }
        
        document.cookie = `isAuthenticated=true; path=/; max-age=${isChecked ? 30 * 24 * 60 * 60 : 24 * 60 * 60}`;
        
        router.push("/");
      } else {
        setError(result.message || "Invalid email or password. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="mb-2 font-bold text-gray-900 text-title-md dark:text-white sm:text-title-lg">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your GHIDAS admin dashboard
            </p>
          </div>

          <div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 mb-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    placeholder="it@ghidas.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-gray-300 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pr-12 rounded-xl border-gray-300 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-500"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-current w-5 h-5" />
                      ) : (
                        <EyeCloseIcon className="fill-current w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} disabled={isLoading} />
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                </div>
                
                <div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl font-semibold text-base shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>
              </div>
            </form>
            {/* <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p>Email: <span className="font-mono text-brand-600 dark:text-brand-400">it@ghidas.com</span></p>
                <p>Password: <span className="font-mono text-brand-600 dark:text-brand-400">sdb@123654</span></p>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
