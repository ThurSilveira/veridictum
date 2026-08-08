require("dotenv").config({ quiet: true });

const axios = require("axios");
const cors = require("cors");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");

const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEFAULT_ALLOWED_ORIGINS = [
    "https://thursilveira.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
];
const MAX_PROMPT_LENGTH = 6000;

function getAllowedOrigins(value = process.env.CORS_ORIGINS) {
    if (!value) {
        return DEFAULT_ALLOWED_ORIGINS;
    }

    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function createApp({
    apiKey = process.env.GEMINI_API_KEY,
    apiClient = axios,
    allowedOrigins = getAllowedOrigins(),
} = {}) {
    if (!apiKey) {
        throw new Error("A variável de ambiente GEMINI_API_KEY não está configurada.");
    }

    const app = express();
    const allowedOriginSet = new Set(allowedOrigins);

    app.set("trust proxy", 1);
    app.disable("x-powered-by");
    app.use(helmet());
    app.use(
        cors({
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type"],
            origin(origin, callback) {
                if (!origin || allowedOriginSet.has(origin)) {
                    return callback(null, true);
                }

                return callback(new Error("Origem não permitida pelo CORS."));
            },
        }),
    );
    app.use(express.json({ limit: "16kb", strict: true }));

    app.get("/", (_req, res) => {
        res.json({
            service: "veridictum-api",
            status: "ok",
            health: "/health",
        });
    });

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    const apiLimiter = rateLimit({
        windowMs: 60 * 1000,
        limit: 20,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { erro: "Muitas requisições. Tente novamente em instantes." },
    });

    app.post("/api/gemini", apiLimiter, async (req, res) => {
        const prompt = req.body?.prompt;

        if (typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({
                erro: "O campo 'prompt' deve ser um texto não vazio.",
            });
        }

        if (prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(413).json({
                erro: `O prompt deve ter no máximo ${MAX_PROMPT_LENGTH} caracteres.`,
            });
        }

        try {
            const response = await apiClient.post(
                API_URL,
                {
                    contents: [{ parts: [{ text: prompt.trim() }] }],
                    generationConfig: { temperature: 0.1 },
                },
                {
                    params: { key: apiKey },
                    headers: { "Content-Type": "application/json" },
                    timeout: 30_000,
                    maxContentLength: 1_000_000,
                },
            );

            return res.json(response.data);
        } catch (error) {
            const upstreamStatus = error.response?.status;
            const internalMessage =
                error.response?.data?.error?.message || error.message || "Erro desconhecido";

            console.error(
                `Falha ao chamar a API Gemini (Status ${upstreamStatus || 500}): ${internalMessage}`,
            );

            if (upstreamStatus === 429) {
                return res.status(503).json({
                    erro: "O serviço de tradução está temporariamente sobrecarregado.",
                });
            }

            return res.status(502).json({
                erro: "Não foi possível concluir a tradução no momento.",
            });
        }
    });

    app.use((_req, res) => {
        res.status(404).json({ erro: "Rota não encontrada." });
    });

    app.use((error, _req, res, _next) => {
        if (error instanceof SyntaxError || error.type === "entity.too.large") {
            const status = error.type === "entity.too.large" ? 413 : 400;
            return res.status(status).json({ erro: "Corpo JSON inválido ou muito grande." });
        }

        if (error.message === "Origem não permitida pelo CORS.") {
            return res.status(403).json({ erro: "Origem não permitida." });
        }

        console.error(`Erro interno: ${error.message}`);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    });

    return app;
}

function startServer() {
    const port = Number.parseInt(process.env.PORT, 10) || 3000;
    const app = createApp();

    return app.listen(port, () => {
        console.log(`Backend rodando na porta ${port} 🚀`);
    });
}

if (require.main === module) {
    try {
        const server = startServer();
        let shuttingDown = false;

        const shutdown = (signal) => {
            if (shuttingDown) {
                return;
            }

            shuttingDown = true;
            console.log(`${signal} recebido; encerrando o servidor.`);
            server.close((error) => {
                if (error) {
                    console.error(`Falha ao encerrar o servidor: ${error.message}`);
                    process.exit(1);
                }
                process.exit(0);
            });

            setTimeout(() => process.exit(1), 10_000).unref();
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (error) {
        console.error(`ERRO: ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    API_URL,
    MAX_PROMPT_LENGTH,
    createApp,
    getAllowedOrigins,
    startServer,
};
