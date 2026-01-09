import { useState } from "react";
import Logo from "../../assets/cloudShieldLogo.svg";
import SearchIcon from "../../assets/icons8-search.svg";
import RDPOpenVPNCard from "../RDPOpvenVPN/RDPOpenVPNCard";
export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Source - https://stackoverflow.com/a
  // Posted by Etienne Martin, modified by community. See post 'Timeline' for change history
  // Retrieved 2025-12-28, License - CC BY-SA 4.0
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async function handleLogin() {
    if (!email || !password) {
      return;
    }

    try {
      const response = await fetch("http://172.23.0.2:5050/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Login error:", data.error);
        throw new Error(
          data.error || "Login failed. Please check your credentials."
        );
      }

      console.log("Login successful:", data);
    } catch (err) {
    } finally {
    }
  }

  return (
    <>
      <div className="h-[90%] w-1/3 bg-card-background flex items-center  rounded-lg shadow-lg flex-col">
        <img src={Logo} alt="cloudShieldLogo" className="w-24 h-24 m-30" />
        {!isSearching ? (
          <>
            <div className="flex flex-col items-start w-full px-8 ">
              <label className="font-semibold text-text">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                placeholder="johndoe@example.com"
                className="p-2 w-full rounded border bg-card-background text-white placeholder:text-faint-grey border-faint-grey"
              />
            </div>
            <div className="flex flex-col items-start w-full px-8 mt-4">
              <div className="justify-between items-center flex w-full">
                <label className="font-semibold text-text">Password</label>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-text underline"
                >
                  Hide
                </button>
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="********"
                className="p-2 w-full rounded border bg-card-background text-white placeholder:text-faint-grey border-faint-grey"
              />
              <button
                onClick={handleLogin}
                className="bg-white text-black py-2 mt-20 w-full px-4 rounded-2xl "
              >
                Login
              </button>
            </div>

            <button className="text-text mt-20 underline">Can't login?</button>
            <button
              onClick={async () => {
                setIsSearching(true);
                await delay(5000);
                setIsSearching(false);
              }}
              className="text-text mt-20 underline"
            >
              Search Demo
            </button>
          </>
        ) : (
          <div className="mt-20">
            <img
              src={SearchIcon}
              alt="Searching..."
              className="w-12 h-12 animate-ping"
            />
            <p className="text-text">Searching...</p>
          </div>
        )}
        //TODO: Remove later
        <RDPOpenVPNCard />
      </div>
    </>
  );
}
