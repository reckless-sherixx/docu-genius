class Env {
    static BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;
    static FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL as string;
}

export default Env;
