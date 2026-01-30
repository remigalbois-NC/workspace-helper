import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import readline from 'readline';
import { getGoogleHelpResponse, openGoogleTopic } from "./tools/google-center.js";
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
const model = 'gemini-2.5-flash';

const tools = [
    {
        functionDeclarations: [
            {
                name: 'searchGoogleHelp',
                description: 'Recherche des informations sur le centre d\'assistance Google. Utilisez cet outil EN PREMIER lorsque l\'utilisateur pose une question sur Google (Google Workspace, Gmail, Google Drive, etc.). Cet outil effectue une recherche sur support.google.com et retourne une liste de résultats pertinents. Après avoir obtenu les résultats, utilisez openGoogleTopic pour explorer un résultat spécifique.',
                parameters: {
                    type: "OBJECT",
                    required: ["query"],
                    properties: {
                        query: {
                            type: "STRING",
                            description: "La requête de recherche à effectuer sur le centre d'assistance Google (ex: 'comment partager un fichier Google Drive', 'configurer Gmail', etc.)",
                        },
                    },
                },
            },
            {
                name: 'openGoogleTopic',
                description: 'Ouvre et récupère le contenu d\'un article spécifique du centre d\'assistance Google. Utilisez cet outil EN SECOND après avoir effectué une recherche avec searchGoogleHelp. Cet outil permet d\'explorer en détail un résultat de recherche spécifique pour obtenir les informations complètes sur un sujet.',
                parameters: {
                    type: "OBJECT",
                    required: ["topicLink"],
                    properties: {
                        topicLink: {
                            type: "STRING",
                            description: "Le lien vers l'article du centre d'assistance Google (ex: 'a/answer/10032578?hl=fr'). Ce lien est généralement obtenu à partir des résultats de searchGoogleHelp.",
                        },
                    },
                },
            },
        ],
    }
];

const generationConfig = {
    maxOutputTokens: 65535,
    temperature: 1,
    topP: 1,
    thinkingConfig: {
        thinkingBudget: -1,
    },
    tools: tools,
};

const chat = await ai.chats.create({
    model: model,
    config: generationConfig
});

// Créer l'interface readline pour lire l'input utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function askQuestion() {
    rl.question('\n💬 Vous: ', async (userInput) => {
        // Si l'utilisateur tape 'exit', 'quit' ou 'q', on quitte
        if (userInput.toLowerCase().trim() === 'exit' ||
            userInput.toLowerCase().trim() === 'quit' ||
            userInput.toLowerCase().trim() === 'q') {
            console.log('\n👋 Au revoir !');
            rl.close();
            process.exit(0);
            return;
        }

        // Si le message est vide, on redemande
        if (!userInput.trim()) {
            askQuestion();
            return;
        }

        // Afficher un indicateur de chargement
        process.stdout.write('🤖 IA: ');

        // Envoyer le message et afficher la réponse
        const response = await sendMessage([{ text: userInput }]);

        if (response) {
            console.log(response);
        }

        // Redemander une nouvelle question
        askQuestion();
    });
}

// Fonction principale pour démarrer le chat
function startChat() {
    console.log('🚀 Chat démarré ! Tapez votre message (ou "exit"/"quit"/"q" pour quitter)\n');
    askQuestion();
}

// Démarrer le chat
startChat();