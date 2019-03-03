/* global adapterConfig, systemLang */

function showDocumentation() {

    async function getDocuments() {
        let langs = [];
        
        if(!adapterConfig.doc_langs || adapterConfig.doc_langs.length === 0){
            langs.push(systemLang);
            if(systemLang !== "en"){
                langs.push("en");
            }
        }

    }

    getDocuments();
}
