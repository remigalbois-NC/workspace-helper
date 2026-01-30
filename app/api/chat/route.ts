import { NextRequest, NextResponse } from "next/server";
import { getGoogleHelpResponse } from "../../../Chatbot-template/Chatbot/tools/google-center.js";
import { GoogleGenAI, type Content, type FunctionDeclaration, type FunctionCall, type GenerateContentResponse, Type, FunctionCallingConfigMode } from "@google/genai";

const COACH_SYSTEM_PROMPT = `
Tu es l'Expert Coach de Numericoach. Ton rôle est d'accompagner l'utilisateur pour qu'il devienne un maître de Google Workspace. Tu n'es pas juste un support technique, tu es un mentor stratégique.

1. POSTURE & TON

Utilise exclusivement le "Tu".

Ton ton est expert, dynamique, bienveillant et légèrement complice.

Discrétion absolue : Ne mentionne jamais tes outils de recherche, de navigation ou le site support.google.com. L'utilisateur doit avoir l'impression que toute cette science vient de ton expertise innée.

2. MÉTHODOLOGIE DE RÉPONSE

Ne te contente pas de répondre à la question posée. Analyse l'intention derrière la demande.

Le Pivot "Best Practice" : Avant ou pendant tes explications, interpelle l'utilisateur pour challenger ses habitudes. Utilise des formules comme : "Tu sais que c'est encore plus efficace de faire comme ça ?" ou "Sais-tu que tu peux aussi automatiser cette partie ? Voici la meilleure pratique...".

3. STRUCTURE OBLIGATOIRE

La Solution : Réponse directe, claire et structurée à la problématique.

La Méthode Pro : Explique pourquoi cette méthode est supérieure aux autres (gain de temps, collaboration, sécurité).

Le Conseil de ton Coach : Termine systématiquement par un bloc de citation Markdown formaté exactement comme ceci :

💡 Le conseil de ton coach : [Ici, ton astuce de pro, un raccourci clavier méconnu ou une fonctionnalité cachée qui change la donne].
`;

// Fonction de scraping d'article avec limitation de taille
export const openGoogleTopic = async (topicLink: string) => {
    try {
        console.log("📖 [SCRAPER] Ouverture de l'article:", topicLink);
        const urlGoogleCenter = 'https://support.google.com/';
        const reqGoogle = await fetch(`${urlGoogleCenter}${topicLink}`, {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const response = await reqGoogle.text();
        const regex = /<section\b[^>]*class\s*=\s*["'][^"']*\barticle-container\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi;
        const match = regex.exec(response);

        if (!match) return "Contenu inaccessible.";

        const cleanedContent = match[0].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        return cleanedContent.substring(0, 3000);
    } catch (e) {
        console.error("❌ [SCRAPER ERROR]:", e);
        return "Erreur de lecture.";
    }
};

const TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
    {
        functionDeclarations: [
            {
                name: "searchGoogleHelp",
                description: "Recherche sur le support Google.",
                parameters: {
                    type: Type.OBJECT,
                    required: ["query"],
                    properties: { query: { type: Type.STRING } },
                },
            },
            {
                name: "openGoogleTopic",
                description: "Ouvre un article spécifique du support Google.",
                parameters: {
                    type: Type.OBJECT,
                    required: ["topicLink"],
                    properties: { topicLink: { type: Type.STRING } },
                },
            },
        ],
    },
];

const DEFAULT_CONFIG = {
    systemInstruction: COACH_SYSTEM_PROMPT,
    tools: TOOLS,
    toolConfig: {
        functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
        },
    },
    temperature: 0.7,
    maxOutputTokens: 2048,
} as const;

/** Génère du contenu en streaming avec historique + systemInstruction. Gère les appels d'outils de façon récursive. */
async function* streamGenerate(
    ai: InstanceType<typeof GoogleGenAI>,
    contents: Content[],
    config: typeof DEFAULT_CONFIG
): AsyncGenerator<string> {
    try {
        console.log("📤 [GEMINI] generateContentStream avec historique + systemInstruction...");

        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: config.systemInstruction,
                tools: config.tools,
                toolConfig: config.toolConfig,
                temperature: config.temperature,
                maxOutputTokens: config.maxOutputTokens,
            },
        });

        /** Récupère tous les appels de fonction du chunk (getter + parts brutes pour le streaming). */
        const getFunctionCallsFromChunk = (chunk: GenerateContentResponse): FunctionCall[] => {
            const fromGetter = chunk.functionCalls ?? [];
            if (fromGetter.length > 0) return fromGetter;
            const parts = chunk.candidates?.[0]?.content?.parts ?? [];
            return parts
                .filter((p): p is typeof p & { functionCall: FunctionCall } => !!p.functionCall)
                .map((p) => p.functionCall);
        };

        /** Vérifie que les args sont complets pour exécuter l'outil (évite les appels partiels en streaming). */
        const isCompleteFunctionCall = (name: string, args: Record<string, unknown>) => {
            if (name === "searchGoogleHelp") return "query" in args && args.query != null && String(args.query).trim() !== "";
            if (name === "openGoogleTopic") return "topicLink" in args && args.topicLink != null && String(args.topicLink).trim() !== "";
            return false;
        };

        for await (const chunk of stream) {
            if (chunk.text) {
                yield chunk.text;
            }

            const functionCalls = getFunctionCallsFromChunk(chunk);
            for (const fc of functionCalls) {
                const name = fc.name ?? "";
                const args = (fc.args ?? {}) as Record<string, unknown>;
                if (!isCompleteFunctionCall(name, args)) continue;

                console.log(`🛠️ [TOOL CALL]: ${name}`, args);

                let toolResult: string;
                if (name === "searchGoogleHelp") {
                    toolResult = await getGoogleHelpResponse(String(args.query ?? ""));
                } else if (name === "openGoogleTopic") {
                    toolResult = await openGoogleTopic(String(args.topicLink ?? ""));
                } else {
                    toolResult = "Outil inconnu.";
                }

                console.log(`✅ [TOOL RESULT]: Données récupérées`);

                const modelTurn: Content = {
                    role: "model",
                    parts: [{ functionCall: { name, args } }],
                };
                const userTurn: Content = {
                    role: "user",
                    parts: [{ functionResponse: { name, response: { content: toolResult || "Aucun résultat trouvé." } } }],
                };

                yield* streamGenerate(ai, [...contents, modelTurn, userTurn], config);
            }
        }
    } catch (error: unknown) {
        console.error("❌ [STREAM ERROR]:", error);
        throw error;
    }
}

function buildContents(history: { role: string; content: string }[], message: string): Content[] {
    const mapped = (history ?? []).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
    })) as Content[];
    return [...mapped, { role: "user", parts: [{ text: message }] }];
}

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const contents = buildContents(Array.isArray(history) ? history : [], message);

        const encoder = new TextEncoder();

        /** Envoie un événement SSE (format doc: flux d’instances GenerateContentResponse). */
        const sendSSE = (controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) => {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
        };

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const gen = streamGenerate(ai, contents, DEFAULT_CONFIG);
                    for await (const text of gen) {
                        if (text) sendSSE(controller, "chunk", { text });
                    }
                    sendSSE(controller, "done", {});
                    controller.close();
                } catch (error) {
                    console.error("❌ [STREAM ERROR]:", error);
                    const message = error instanceof Error ? error.message : "Erreur de génération";
                    try {
                        sendSSE(controller, "error", { message });
                    } catch {
                        // controller peut être déjà fermé
                    }
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error: unknown) {
        console.error("💥 [POST ERROR]:", error);
        const message = error instanceof Error ? error.message : "Erreur serveur";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
