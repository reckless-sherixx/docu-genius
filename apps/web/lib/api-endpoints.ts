import Env from "./env";

export const BASE_URL = `${Env.BACKEND_URL}/api`;

export const REGISTER_URL = `${BASE_URL}/auth/register`;
export const LOGIN_URL = `${BASE_URL}/auth/login`;
export const CHECK_CREDENTIALS_URL = `${BASE_URL}/auth/check/credentials`;
export const VERIFY_EMAIL_URL = `${BASE_URL}/auth/verify-email`;
export const FORGET_PASSWORD_URL = `${BASE_URL}/auth/forget-password`;
export const RESET_PASSWORD_URL = `${BASE_URL}/auth/reset-password`;

export const ORGANIZATIONS_URL = `${BASE_URL}/v1/organization`;
export const ORGANIZATIONS_JOIN_URL = `${BASE_URL}/v1/organization/join`;