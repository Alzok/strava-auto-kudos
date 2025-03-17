/**
 * Module pour la gestion des logs
 */
console.log("[Strava Auto Kudos] Logger module loading");

const Logger = {
    prefix: '[Strava Auto Kudos]',
    
    info: (message) => {
        console.info(`${Logger.prefix} ${message}`);
    },
    
    error: (message, error) => {
        console.error(`${Logger.prefix} ${message}`, error);
    },
    
    debug: (message, data = null) => {
        console.debug(`${Logger.prefix} ${message}`, data || '');
    },
    
    // Ajout de la méthode warn manquante
    warn: (message, data = null) => {
        console.warn(`${Logger.prefix} ${message}`, data || '');
    }
};

// Ajoutez cette fonction au module Logger
if (typeof Logger !== 'undefined') {
    Logger.init = function() {
        console.log("[Strava Auto Kudos] Logger initialized successfully");
        
        // Test logging methods
        this.debug("Logger debug test");
        this.info("Logger info test");
        this.warn("Logger warn test");
        this.error("Logger error test");
    };
    
    // Appelez immédiatement la fonction d'initialisation
    Logger.init();
} else {
    console.error("[Strava Auto Kudos] Logger module undefined!");
}

// Exporter le module de logging
if (typeof module !== 'undefined') {
    module.exports = Logger;
}
