import { useState, type KeyboardEvent } from "react";
import Logo from "../../assets/cloudShieldLogo.svg";
import type { LoginResponse } from "../../models/LoginResponse";
import AuthService from "../../services/AuthService";


export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useTwoFactor, setUseTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    setSuccess("");

    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setError("");

    if (useTwoFactor) {
      const trimmed = twoFactorCode.trim();
      if (!/^[0-9]{6}$/.test(trimmed)) {
        setIsLoading(false);
        setError("Enter a valid 6-digit 2FA code.");
        return;
      }
    }

    try {
      const payload: Record<string, string> = {
        email: sanitizedEmail,
        password,
      };

      if (useTwoFactor && twoFactorCode.trim()) {
        payload.otp = twoFactorCode.trim();
      }

      const data = await AuthService.login(
        sanitizedEmail,
        password,
        useTwoFactor ? twoFactorCode.trim() : null,
      );
      

      if (!data.access_token) {
        throw new Error(
          data?.error || "Login failed. Please check your credentials.",
        );
      }

      window.authStore?.saveAuth({
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        email: sanitizedEmail,
      });
      if (!window.authStore) {
        const expiresAt = data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined;
        localStorage.setItem(
          "cloudshield.auth",
          JSON.stringify({
            accessToken: data.access_token,
            tokenType: data.token_type || "Bearer",
            expiresAt,
            email: sanitizedEmail,
          }),
        );
      }
      window.dispatchEvent(new Event("auth-changed"));

      setSuccess("Signed in successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="w-full max-w-xl bg-[#111111] border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.75)] px-8 py-10 text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center">
          <img src={Logo} alt="CloudShield logo" className="w-14 h-14" />
        </div>

        <div className="w-full space-y-4">
          {error && (
            <div className="w-full rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="w-full rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              type="email"
              placeholder="johndoe@example.com"
              className="w-full rounded-lg border border-white/10 bg-[#161616] px-3 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-medium text-white/70 underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              type={showPassword ? "text" : "password"}
              placeholder="********"
              className="w-full rounded-lg border border-white/10 bg-[#161616] px-3 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/70">
              <button
                type="button"
                onClick={() => setUseTwoFactor((prev) => !prev)}
                className="underline"
              >
                {useTwoFactor ? "Disable 2FA" : "Secure login with 2FA"}
              </button>
              {useTwoFactor && (
                <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wide">
                  2FA enabled
                </span>
              )}
            </div>

            {useTwoFactor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  2FA code
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-lg border border-white/10 bg-[#161616] px-3 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                />
                <p className="text-xs text-white/50">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="mt-2 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </div>

          <div className="pt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-white underline"
            >
              Can't log in?
            </button>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 text-left text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Can't log in?</h2>
                <p className="mt-1 text-sm text-white/60">
                  Try these quick steps to recover access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-sm text-white/70 underline"
              >
                Close
              </button>
            </div>

            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/80">
              <li>Confirm you are using the correct email address.</li>
              <li>Ask your org admin to reset your password.</li>
              <li>Check that your account is marked active in CloudShield.</li>
              <li>If 2FA is enabled, enter the current 6-digit code.</li>
            </ol>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
              Still blocked? Contact support or your administrator for manual
              recovery.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
