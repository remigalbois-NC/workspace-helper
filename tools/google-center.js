export const getGoogleHelpResponse=async (q) => {
    console.log('==='.repeat(5), 'Searching on Google help center for', q, '==='.repeat(5));
    const urlGoogleCenter='https://support.google.com/search?q=';
    console.log('Fetching ', `${urlGoogleCenter}${encodeURI(q)}`);
    let reqGoogle=await fetch(`${urlGoogleCenter}${encodeURI(q)}`, {
        method: "GET",
        headers: {
            "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
        }
    });
    let response=await reqGoogle.text();
    const regex = /results=\[\[(.+)\]\]/gm;
    let responseRegex=regex.exec(response).join(',');
    return responseRegex;
}

export const openGoogleTopic=async (topicLink="a/answer/10032578?hl=fr&sjid=17870301969511962084-EU") => {
    console.log('==='.repeat(5), 'Opening topic on Google help center', topicLink, '==='.repeat(5));
    const urlGoogleCenter='https://support.google.com/';
    console.log(`${urlGoogleCenter}${topicLink}`);
    let reqGoogle=await fetch(`${urlGoogleCenter}${topicLink}`, {
        method: "GET",
        headers: {
            "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
        }
    });
    let response=await reqGoogle.text();
    const regex = /<section\b[^>]*class\s*=\s*["'][^"']*\barticle-container\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi;
    let resultRegex=regex.exec(response).join(',');
    return resultRegex;
}

export const getGoogleWorkspaceAdminHelp=async (url="https://support.google.com/a/?hl=fr#topic=4388346") => {
    console.log('==='.repeat(5), 'Fetching Google Workspace Administrator help center', url, '==='.repeat(5));
    try {
        let reqGoogle=await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
            }
        });
        let response=await reqGoogle.text();
        
        // Extraire le contenu principal de la page
        // Chercher les sections de contenu, articles, et liens pertinents
        let content = '';
        
        // Extraire les titres et descriptions des articles
        const articleRegex = /<article[^>]*>[\s\S]*?<\/article>/gi;
        const articles = response.match(articleRegex) || [];
        
        // Extraire les sections de contenu
        const sectionRegex = /<section[^>]*class\s*=\s*["'][^"']*\b(content|article|help|topic)[^"']*["'][^>]*>[\s\S]*?<\/section>/gi;
        const sections = response.match(sectionRegex) || [];
        
        // Extraire les liens et titres des ressources
        const linkRegex = /<a[^>]*href\s*=\s*["']([^"']*support\.google\.com\/a[^"']*)["'][^>]*>[\s\S]*?<\/a>/gi;
        const links = [];
        let match;
        while ((match = linkRegex.exec(response)) !== null) {
            const linkText = match[0].replace(/<[^>]*>/g, '').trim();
            if (linkText && linkText.length > 5) {
                links.push({ url: match[1], text: linkText });
            }
        }
        
        // Extraire le texte principal en nettoyant les balises HTML
        const textContent = response
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Construire le contenu récupéré
        if (articles.length > 0) {
            content += 'Articles trouvés:\n';
            articles.slice(0, 5).forEach((article, idx) => {
                const cleanArticle = article.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleanArticle.length > 50) {
                    content += `Article ${idx + 1}: ${cleanArticle.substring(0, 500)}...\n\n`;
                }
            });
        }
        
        if (links.length > 0) {
            content += '\nRessources disponibles:\n';
            links.slice(0, 10).forEach(link => {
                content += `- ${link.text}: ${link.url}\n`;
            });
        }
        
        // Ajouter un extrait du contenu textuel principal
        if (textContent.length > 200) {
            content += '\n\nContenu principal:\n';
            content += textContent.substring(0, 2000);
        }
        
        return content || 'Contenu du centre d\'aide Google Workspace Administrator récupéré.';
    } catch (error) {
        console.error('Erreur lors de la récupération du centre d\'aide:', error);
        return 'Erreur lors de la récupération du contenu du centre d\'aide Google Workspace Administrator.';
    }
}