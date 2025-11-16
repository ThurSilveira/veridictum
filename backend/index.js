require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

// Configurações da API
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const API_KEY = process.env.GEMINI_API_KEY; // Renomeado para GEMINI_API_KEY (mais específico)

// Verifica se a chave API está presente
if (!API_KEY) {
    console.error("ERRO: A variável de ambiente GEMINI_API_KEY não está configurada.");
    process.exit(1);
}

const app = express();
const PORT = 3000;

// Configurações de Middleware
app.use(cors()); // Permite requisições de outras origens (CORS)
app.use(express.json()); // Permite parsear o corpo das requisições JSON

// Rota Proxy para a API Gemini
app.post("/api/gemini", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ erro: "O campo 'prompt' é obrigatório no corpo da requisição." });
        }

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            // Adicionado a configuração de geração para melhor controle da resposta
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
        
        // Retorna a resposta completa da API Gemini para o frontend
        res.json(response.data);

    } catch (err) {
        // Log detalhado do erro no servidor
        const errorMessage = err.response?.data?.error?.message || err.message || "Erro desconhecido";
        const status = err.response?.status || 500;
        
        console.error(`Falha ao chamar a API Gemini (Status ${status}): ${errorMessage}`);
        
        // Retorna uma mensagem de erro mais útil para o frontend
        res.status(status).json({ erro: `Erro ao chamar a API Gemini: ${errorMessage}` });
    }
});

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT} 🚀`));