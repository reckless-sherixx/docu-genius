import Env from "./env";

export const BASE_URL = `${Env.BACKEND_URL}/api`;

export const REGISTER_URL = `${BASE_URL}/auth/register`;
export const VERIFY_EMAIL_URL = `${BASE_URL}/auth/verify-email`;