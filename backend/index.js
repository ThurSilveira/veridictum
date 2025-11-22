require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("ERRO: A variável de ambiente GEMINI_API_KEY não está configurada.");
    process.exit(1);
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/gemini", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ erro: "O campo 'prompt' é obrigatório no corpo da requisição." });
        }

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1, 
            },
        };

        const response = await axios.post(
            `${API_URL}?key=${API_KEY}`,
            payload,
            {
                headers: { "Content-Type": "application/json" }
            }
        );
        res.json(response.data);

    } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || "Erro desconhecido";
        const status = err.response?.status || 500;
        
        console.error(`Falha ao chamar a API Gemini (Status ${status}): ${errorMessage}`);
        res.status(status).json({ erro: `Erro ao chamar a API Gemini: ${errorMessage}` });
    }
});

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT} 🚀`));
