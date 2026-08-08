const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, describe, it } = require("node:test");

const { MAX_PROMPT_LENGTH, createApp } = require("../index");

describe("Veridictum API", () => {
    let baseUrl;
    let server;
    let receivedRequest;

    before(async () => {
        const apiClient = {
            async post(url, body, options) {
                receivedRequest = { url, body, options };
                return {
                    data: {
                        candidates: [{ content: { parts: [{ text: "FORMULA: P -> Q" }] } }],
                    },
                };
            },
        };
        const app = createApp({ apiKey: "test-key", apiClient });

        server = http.createServer(app);
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    });

    it("responde ao health check sem expor tecnologia", async () => {
        const response = await fetch(`${baseUrl}/health`);

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: "ok" });
        assert.equal(response.headers.get("x-powered-by"), null);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    });

    it("aceita a origem do GitHub Pages", async () => {
        const response = await fetch(`${baseUrl}/api/gemini`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Origin: "https://thursilveira.github.io",
            },
            body: JSON.stringify({ prompt: "Se P, então Q" }),
        });

        assert.equal(response.status, 200);
        assert.equal(
            response.headers.get("access-control-allow-origin"),
            "https://thursilveira.github.io",
        );
        assert.equal(receivedRequest.body.contents[0].parts[0].text, "Se P, então Q");
        assert.equal(receivedRequest.options.params.key, "test-key");
        assert.equal(receivedRequest.options.timeout, 30_000);
    });

    it("recusa origens não autorizadas", async () => {
        const response = await fetch(`${baseUrl}/api/gemini`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Origin: "https://example.com",
            },
            body: JSON.stringify({ prompt: "teste" }),
        });

        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { erro: "Origem não permitida." });
    });

    it("valida prompts vazios ou grandes demais", async () => {
        const emptyResponse = await fetch(`${baseUrl}/api/gemini`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: " " }),
        });
        const largeResponse = await fetch(`${baseUrl}/api/gemini`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "a".repeat(MAX_PROMPT_LENGTH + 1) }),
        });

        assert.equal(emptyResponse.status, 400);
        assert.equal(largeResponse.status, 413);
    });

    it("retorna JSON para rotas inexistentes", async () => {
        const response = await fetch(`${baseUrl}/inexistente`);

        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { erro: "Rota não encontrada." });
    });

    it("limita abuso da rota do Gemini", async () => {
        let lastResponse;

        for (let requestNumber = 0; requestNumber < 18; requestNumber += 1) {
            lastResponse = await fetch(`${baseUrl}/api/gemini`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: "teste de limite" }),
            });
        }

        assert.equal(lastResponse.status, 429);
        assert.deepEqual(await lastResponse.json(), {
            erro: "Muitas requisições. Tente novamente em instantes.",
        });
    });
});
