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
