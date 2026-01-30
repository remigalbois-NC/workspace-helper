import DomParser from 'dom-parser'; 

/**
 * Recherche des résultats sur le centre d'aide Google
 */
export const getGoogleHelpResponse = async (q) => {
    try {
        console.log('==='.repeat(3), '🔍 Recherche Google Help:', q, '==='.repeat(3));
        const urlGoogleCenter = 'https://support.google.com/search?q=';
        
        const reqGoogle = await fetch(`${urlGoogleCenter}${encodeURI(q)}`, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const response = await reqGoogle.text();
        // Regex pour extraire les données brutes des résultats Google
        const regex = /results=\[\[(.+)\]\]/gm;
        const match = regex.exec(response);

        if (!match || !match[0]) {
            console.log("⚠️ Aucun résultat trouvé sur Google.");
            return "Aucun article trouvé pour cette recherche.";
        }
        
        return match[0].substring(0, 2000); // On limite la taille pour Gemini
    } catch (error) {
        console.error("❌ Erreur Scraping Search:", error.message);
        return "Erreur lors de la récupération des données de recherche.";
    }
}

/**
 * Extrait le contenu textuel d'un article spécifique
 */
export const openGoogleTopic = async (topicLink) => {
    try {
        const urlGoogleCenter = 'https://support.google.com/';
        const reqGoogle = await fetch(`${urlGoogleCenter}${topicLink}`, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const response = await reqGoogle.text();
        const regex = /<section\b[^>]*class\s*=\s*["'][^"']*\barticle-container\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi;
        const match = regex.exec(response);
        if (!match) return "Contenu inaccessible.";
        return match[0].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error("❌ Erreur lecture article:", error.message);
        return "Erreur de lecture de l'article.";
    }
}
