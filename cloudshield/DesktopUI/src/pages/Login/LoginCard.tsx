import { useState } from "react";
import Logo from "../../assets/cloudShieldLogo.svg";
export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    // 1. Basic Client-side validation
    if (!email || !password) {
      return;
    }

    try {
      // 2. Call the Flask API
      const response = await fetch("http://127.0.0.1:5050/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 or 500 errors from auth.py
        throw new Error(
          data.error || "Login failed. Please check your credentials."
        );
      }

      // 3. On Success: Pass data (access_token, etc) up to App.jsx
      console.log("Login successful:", data);
    } catch (err) {
    } finally {
    }
  }

  return (
    <>
      <div className="h-[90%] w-1/3 bg-card-background flex items-center justify-center rounded-lg shadow-lg flex-col">
        <img src={Logo} alt="CloudShield Logo" className="w-24 h-24" />
        <div className="flex flex-col items-start w-full px-8 mt-4">
          <label className="font-semibold text-text">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            placeholder="johndoe@example.com"
            className="p-2 w-full rounded border bg-card-background text-faint-grey border-faint-grey"
          />
        </div>
        <div className="flex flex-col items-start w-full px-8 mt-4">
          <div className="justify-between items-center flex w-full">
            <label className="font-semibold text-text">Password</label>
            <button className="text-sm text-text underline">Hide</button>
          </div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="********"
            className="p-2 w-full rounded border bg-card-background text-faint-grey border-faint-grey"
          />
        </div>
        <button
          onClick={handleLogin}
          className="bg-white text-black py-2 px-4 rounded-2xl w-3/4"
        >
          Login
        </button>
        <button className="text-text underline">Can't login?</button>
      </div>
    </>
  );
}
