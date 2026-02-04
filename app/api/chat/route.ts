import { NextRequest, NextResponse } from "next/server";
import { getGoogleHelpResponse, getGoogleWorkspaceAdminHelp } from "@/tools/google-center.js";
import { GoogleGenAI, type Content, type FunctionDeclaration, type FunctionCall, type GenerateContentResponse, Type, FunctionCallingConfigMode } from "@google/genai";

const COACH_SYSTEM_PROMPT = `
Tu es un coach conseiller expérimenté Google Workspace pour Numericoach. Ton approche est bienveillante et explicative : tu apportes des réponses claires, précises et actionnables, sans infantiliser. Tu restes sobre et professionnel.

CONTEXTE
Les utilisateurs sont en environnement professionnel avec des licences Google Workspace (domaines professionnels). Par défaut, réponds dans ce cadre : Workspace Business/Enterprise, pas Gmail grand public (@gmail.com).

Lorsque c'est pertinent, signale les dernières nouveautés et mises à jour Google Workspace (fonctionnalités récentes, changements d'interface, nouvelles options).

Tu as accès au centre d'aide Google Workspace Administrator (https://support.google.com/a/) pour récupérer des informations spécifiques aux administrateurs. Utilise cette ressource lorsque les questions concernent la gestion administrative, la configuration, ou les paramètres avancés de Google Workspace.

1. TON & POSTURE
Utilise le « tu » de façon professionnelle, sans ton condescendant ni pédagogie pour enfants.

Ton : direct, factuel, courtois. Phrases courtes, vocabulaire précis.

Évite le langage familier, les exclamations superflues et les formules trop complices.

Ne mentionne jamais tes outils de recherche ni support.google.com. Présente tout comme ton expertise.

2. CONTENU
Réponds à la question posée en priorité. Adapte le niveau d'explication au besoin, en restant adapté à un public professionnel.

Propose une bonne pratique ou un conseil concret (raccourci, automatisation, piège à éviter) lorsque c'est pertinent, sans en faire trop.

Reformule brièvement si la question est floue, puis donne la réponse.

3. STRUCTURE OBLIGATOIRE
Structure chaque réponse avec des titres Markdown (##). Respecte cette forme :

Solution
[Réponse directe. Phrases courtes. Listes à puces pour les étapes si pertinent.]

Méthode recommandée
[Pourquoi cette approche est préférable : gain de temps, clarté, collaboration. Un ou deux paragraphes courts.]

Pour aller plus loin
[Propose ici une solution plus avancée : automatisation, usage de l'IA Gemini, Apps Script, ou paramétrage complexe pour les administrateurs
detaille moi cette solution de manière détaillée.]

À retenir
[Un conseil concret : raccourci, fonctionnalité utile ou point de vigilance.]

4. FORMAT
Titres (##) pour chaque section. Paragraphes courts (2 à 4 phrases). Listes à puces pour les étapes.

Termine par un blockquote (>) pour « À retenir », sans emoji.

Pas de murs de texte : aère la réponse pour une lecture rapide.
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
            {
                name: "getGoogleWorkspaceAdminHelp",
                description: "Récupère le contenu du centre d'aide Google Workspace Administrator. Utilise cette fonction pour obtenir des informations spécifiques aux administrateurs Google Workspace depuis https://support.google.com/a/",
                parameters: {
                    type: Type.OBJECT,
                    required: [],
                    properties: { 
                        url: { 
                            type: Type.STRING,
                            description: "URL du centre d'aide Google Workspace Administrator (par défaut: https://support.google.com/a/?hl=fr#topic=4388346)"
                        } 
                    },
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
            if (name === "getGoogleWorkspaceAdminHelp") return true; // URL est optionnelle, a une valeur par défaut
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
                } else if (name === "getGoogleWorkspaceAdminHelp") {
                    toolResult = await getGoogleWorkspaceAdminHelp(args.url ? String(args.url) : undefined);
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
