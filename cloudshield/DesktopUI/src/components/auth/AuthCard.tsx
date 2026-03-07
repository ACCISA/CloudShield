import type { PropsWithChildren } from "react";
import Logo from "../../assets/cloudShieldLogo.svg";

export default function AuthCard({ children }: PropsWithChildren) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111111] px-8 py-10 text-white shadow-[0_24px_64px_rgba(0,0,0,0.75)]">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white">
          <img src={Logo} alt="CloudShield logo" className="h-14 w-14" />
        </div>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
