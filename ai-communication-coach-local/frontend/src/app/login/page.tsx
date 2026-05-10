"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const router = useRouter();

  // Password validation helper
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("One lowercase letter");
    if (!/\d/.test(pwd)) errors.push("One number");
    return errors;
  };

  // Email validation helper
  const validateEmail = (emailStr: string): string[] => {
    const errors: string[] = [];
    if (!emailStr.includes("@")) errors.push("Valid email required");
    if (emailStr.length < 5 || emailStr.length > 255) errors.push("Valid email required");
    return errors;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setValidationErrors([]);
    
    try {
      if (isRegistering) {
        // Validate on client side first
        const emailErrors = validateEmail(email);
        const passwordErrors = validatePassword(password);
        const allErrors = [...emailErrors, ...passwordErrors];
        
        if (allErrors.length > 0) {
          setValidationErrors(allErrors);
          setErrorMsg("Please fix the validation errors below");
          setLoading(false);
          return;
        }

        const res = await fetch(API_ENDPOINTS.signup, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, full_name: fullName, password })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Registration failed");
        }
        
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        router.push("/dashboard");
      } else {
        const res = await fetch(API_ENDPOINTS.login, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error("Invalid email or password");
        
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const passwordErrors = isRegistering ? validatePassword(password) : [];
  const emailErrors = isRegistering ? validateEmail(email) : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="glass-panel p-10 w-full max-w-md z-10 animate-fade-in text-center shadow-2xl border border-slate-700 flex flex-col max-h-[90vh] overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="text-gray-400 mb-8">{isRegistering ? "Start your communication journey." : "Sign in to access your AI Coach."}</p>
        
        {errorMsg && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded border border-red-500/30">{errorMsg}</p>}
        
        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          {isRegistering && (
            <div>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required={isRegistering}
              />
            </div>
          )}
          
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            {isRegistering && emailErrors.length > 0 && (
              <p className="text-yellow-400 text-xs mt-0.5">⚠️ {emailErrors[0]}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {isRegistering && passwordErrors.length > 0 && (
              <p className="text-yellow-400 text-xs mt-0.5">⚠️ {passwordErrors[0]}</p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading || (isRegistering && (passwordErrors.length > 0 || emailErrors.length > 0))}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] mt-4"
          >
            {loading ? "Processing..." : isRegistering ? "Sign Up" : "Login"}
          </button>
        </form>
        
        <p className="mt-6 text-gray-500 text-sm">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setValidationErrors([]); setErrorMsg(""); }} className="text-blue-400 hover:text-blue-300 ml-2 underline">
            {isRegistering ? "Login here" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
