import { createApp } from "./app";

const PORT = process.env.PORT || 4000;


async function startServer() {
    try {
        const app = createApp();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();