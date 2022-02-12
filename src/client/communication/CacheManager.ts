export class CacheManager {
    
    fetchTemplateFromCache(databaseId: number, callback: (templateStatements: string) => void) {
        let that = this;
        if(!this.cacheAvailable()) callback(null);
        this.getCache((cache) => {
            cache.match(that.databaseIdToCacheIdentifier(databaseId)).then(
                (value)=>{
                    value.text().then((text) => callback(text));
                })
                .catch(() => callback(null));
        })        
    }

    saveTemplateToCache(databaseId: number, templatesql: string) {
        if(!this.cacheAvailable()) return;
        let that = this;
        this.getCache((cache) => {
            cache.put(that.databaseIdToCacheIdentifier(databaseId), new Response(templatesql));
        })        
    }

    cacheAvailable(): boolean {
        return 'caches' in self;
    }

    getCache(callback: (cache: Cache) => void) {
        caches.open('my-cache').then(callback);
    }

    databaseIdToCacheIdentifier(databaseId: number): string {
        return "/onlineIdeCache" + databaseId;
    }

}