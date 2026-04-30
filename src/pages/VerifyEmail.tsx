import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const { verifyEmail, resendVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    const storedEmail = typeof window !== "undefined" ? localStorage.getItem("pendingVerificationEmail") : "";
    setEmail(queryEmail || storedEmail || "");
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const result = await verifyEmail(email, otp);
    setLoading(false);

    if (result.error) {
      toast({ title: "Verification failed", description: result.error.message });
      return;
    }

    toast({ title: "Email verified", description: "Your account is now active." });
    navigate("/", { replace: true });
  };

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Enter your email to resend the verification code." });
      return;
    }

    setResendLoading(true);
    const result = await resendVerification(email);
    setResendLoading(false);

    if (result.error) {
      toast({ title: "Resend failed", description: result.error.message });
      return;
    }

    toast({ title: "OTP resent", description: "Check the console for the new verification code." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <h1 className="text-2xl font-semibold text-slate-900">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the verification code from the console to finish registration.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification code</span>
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500"
              maxLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-sky-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendLoading ? "Resending..." : "Resend OTP"}
          </button>
          <Link to="/login" className="text-sky-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
