/**
 * Module pour la gestion des logs
 */
console.log("[Strava Auto Kudos] Logger module loading");

const Logger = {
    prefix: "[Strava Auto Kudos]",

    info(msg) {
        console.info(`${this.prefix} ${msg}`);
    },

    error(msg, error = null) {
        if (error) {
            console.error(`${this.prefix} ${msg}`, error);
        } else {
            console.error(`${this.prefix} ${msg}`);
        }
    },

    debug(msg, data = null) {
        if (data) {
            console.debug(`${this.prefix} ${msg}`, data);
        } else {
            console.debug(`${this.prefix} ${msg}`);
        }
    },

    warn(msg, data = null) {
        if (data) {
            console.warn(`${this.prefix} ${msg}`, data);
        } else {
            console.warn(`${this.prefix} ${msg}`);
        }
    },

    init() {
        console.log("[Strava Auto Kudos] Logger initialized successfully");
    }
};

// Ajoutez cette fonction au module Logger
if (typeof Logger !== 'undefined') {
    Logger.init();
} else {
    console.error("[Strava Auto Kudos] Logger module undefined!");
}

function debug(...args) {
    if (CONFIG.debugEnabled) {
        console.log("[Strava Auto Kudos] DEBUG:", ...args);
    }
}

// Exporter le module de logging
if (typeof module !== 'undefined') {
    module.exports = Logger;
}

// Exporting extended logger
if (typeof Logger !== 'undefined') {
    Logger.debug = debug;
}
