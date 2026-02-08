import { LoginResponse, mapLoginResponse } from "../models/LoginResponse";
import APIService from "../utils/APIService";
class AuthService{
    private static instance: AuthService | null = null;

    private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(email: string, password: string, useTwoFactor: string | null): Promise<LoginResponse> {
    const response = await APIService.post("auth/login",{
      email: email.trim().toLowerCase(),
      password,
      ...(useTwoFactor ? { otp: useTwoFactor.trim() } : {}),
    }, { skipAuth: true });

    let data: LoginResponse = {};
    try {
      const raw = (await response.json()) as unknown;
      data = mapLoginResponse(raw);
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data?.error || "Login failed. Please check your credentials.");
    }

    return data;
  }
}

export default AuthService.getInstance();