// console.log("[Strava Auto Kudos] App module loading");

/**
 * Module d'initialisation de l'application
 */
const App = {
    init: () => {
        Logger.info('Initialisation de l\'extension');
        // console.log("[Strava Auto Kudos] App.init() called, URL:", window.location.href);
        
        try {
            // Vérifier si nous sommes sur une page du dashboard de Strava
            const isStravaPage = window.location.href.includes("strava.com");
            Logger.info(`URL actuelle: ${window.location.href}, Est-ce une page Strava: ${isStravaPage}`);
            
            if (!isStravaPage) {
                Logger.info('Pas sur Strava, extension non initialisée');
                return;
            }
            
            // Considérer toutes les pages de Strava comme valides pour afficher au moins l'UI
            Logger.info('Page Strava détectée, création de l\'interface');
            const now = Date.now();
            
            // Charger l'état enregistré (activé/désactivé) ou l'activer par défaut
            CONFIG.state.isEnabled = Storage.load(CONFIG.storage.enabled, true); // Activé par défaut
            Logger.info(`État de l'extension chargé: ${CONFIG.state.isEnabled ? 'actif' : 'inactif'}`);
            
            // Appeler directement onDOMLoaded pour créer l'interface
            App.onDOMLoaded();
            
            // Toujours lancer la boucle si l'extension est activée, quelle que soit la page
            if (CONFIG.state.isEnabled) {
                 Logger.info('Activation des kudos automatiques (page Strava détectée)');
                 KudosManager.loopKudos();
            }
                
            // Toujours observer les changements dans le DOM sur n'importe quelle page Strava
            Logger.info('Activation de l\'observateur DOM');
            App.setupMutationObserver();
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation', error);
            console.error('[Strava Auto Kudos] App init error:', error);
        }
    },

    onDOMLoaded: () => {
        Logger.debug('DOM chargé, création des éléments UI');
        // console.log("[Strava Auto Kudos] onDOMLoaded() called");
        
        try {
            // Réinitialiser explicitement le compteur de kudos pour cette session
            CONFIG.state.kudosCount = 0;
            // console.log("[Strava Auto Kudos] Reset kudos count to 0 for current session");
            
            // Réinitialiser les compteurs de session
            CONFIG.state.kudosAttempts = 0;
            CONFIG.state.kudosSuccesses = 0;
            
            // Initialiser le système d'auto-optimisation des délais
            App.initDelayOptimization();
            
            // Charger l'état de la session si disponible
            if (typeof UI.loadSessionState === 'function') {
                UI.loadSessionState();
            }
            
            // Créer la bulle d'assistant avec des logs supplémentaires
            Logger.debug('Avant création de la bulle');
            // console.log("[Strava Auto Kudos] Creating bubble now");
            const bulle = UI.createBulle();
            // console.log("[Strava Auto Kudos] Bubble creation result:", bulle ? "Success" : "Failed");
            Logger.debug('Après création de la bulle:', bulle ? 'Succès' : 'Échec');
            
            // Vérifier s'il y a une pause temporaire active
            UI.checkForActivePause();
            
            // Vérifier que l'élément compteur est correctement mis à jour
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            if (counter) {
                // S'assurer que le compteur affiche bien 0
                counter.textContent = "0";
                // console.log("[Strava Auto Kudos] Counter initialization verified:", counter.textContent);
            }
            
            // Force l'activation de l'extension au premier lancement si aucune préférence n'est définie
            if (Storage.load('strava_auto_kudos_first_run', true)) {
                CONFIG.state.isEnabled = true;
                Storage.save(CONFIG.storage.enabled, true);
                Storage.save('strava_auto_kudos_first_run', false);
                Logger.info('Premier lancement détecté, extension activée par défaut');
                UI.updateBulleStatus(true);
            }
            
            // Ajouter l'écouteur d'événement de défilement pour détecter le chargement de nouvelles entrées
            window.addEventListener('scroll', KudosManager.handleScroll);
            
            Logger.info('Extension initialisée avec succès');
        } catch (error) {
            Logger.error('Erreur lors du chargement du DOM', error);
            console.error('[Strava Auto Kudos] DOM loading error:', error);
        }
    },

    /** 
     * Initialise le système d'auto-optimisation des délais
     */
    initDelayOptimization: () => {
        // Définir les délais initiaux
        CONFIG.state.originalDelays = {  
            min: CONFIG.kudosDelay.min,
            max: CONFIG.kudosDelay.max
        };
        
        // Vérifier le taux de succès toutes les 30 secondes et ajuster les délais
        CONFIG.state.delayOptimizationInterval = setInterval(() => {
            if (CONFIG.state.kudosAttempts > 10) {
                const successRate = CONFIG.state.kudosSuccesses / CONFIG.state.kudosAttempts;
                
                if (successRate > 0.95) {
                    // Excellent taux de succès, on peut accélérer
                    CONFIG.kudosDelay.min = Math.max(50, CONFIG.kudosDelay.min - 20);
                    CONFIG.kudosDelay.max = Math.max(200, CONFIG.kudosDelay.max - 50);
                    // console.log(`[Strava Auto Kudos] High success rate (${(successRate*100).toFixed(1)}%), decreasing delays: ${CONFIG.kudosDelay.min}-${CONFIG.kudosDelay.max}ms`);
                } else if (successRate < 0.7) {
                    // Mauvais taux de succès, on ralentit
                    CONFIG.kudosDelay.min = Math.min(500, CONFIG.kudosDelay.min + 50);
                    CONFIG.kudosDelay.max = Math.min(1000, CONFIG.kudosDelay.max + 100);
                    // console.log(`[Strava Auto Kudos] Low success rate (${(successRate*100).toFixed(1)}%), increasing delays: ${CONFIG.kudosDelay.min}-${CONFIG.kudosDelay.max}ms`);
                }
                
                // Réinitialiser les compteurs pour la prochaine évaluation
                CONFIG.state.kudosAttempts = 0;
                CONFIG.state.kudosSuccesses = 0;
            }
        }, 30000);
    },
    
    setupMutationObserver: () => {
        const targetNode = document.body; // Observer tout le body pour plus de robustesse
        if (!targetNode) {
            Logger.error('Impossible de trouver le nœud cible pour MutationObserver');
            return;
        }

        const config = { childList: true, subtree: true };

        const callback = (mutationsList, observer) => {
            let kudosFound = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Vérifier si des boutons kudos ont été ajoutés
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('button[data-testid="kudos_button"]') || node.querySelector('button[data-testid="kudos_button"]')) {
                                kudosFound = true;
                            }
                        }
                    });
                }
            }
            // Si de nouveaux boutons kudos sont détectés, relancer la boucle
            if (kudosFound && CONFIG.state.isEnabled && !CONFIG.state.isProcessing) {
                Logger.debug('Nouveaux éléments détectés par MutationObserver, relance de loopKudos');
                // Utiliser un léger délai pour laisser le DOM se stabiliser
                setTimeout(() => KudosManager.loopKudos(), 500);
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        Logger.info('MutationObserver configuré pour détecter les nouvelles entrées');
    }
};

// Surcharge de la fonction App.init pour ajouter des logs et des vérifications
if (typeof App !== 'undefined' && App.init) {
    const originalInit = App.init;
    // Remplacez-la par une version qui log
    App.init = function() {
        // console.log("[Strava Auto Kudos] App initialization started");
        try {
            // Vérifiez les dépendances critiques avant l'initialisation
            if (typeof CONFIG === 'undefined' || typeof Logger === 'undefined' || typeof Storage === 'undefined' || typeof Utils === 'undefined' || typeof UI === 'undefined' || typeof KudosManager === 'undefined') {
                console.error("[Strava Auto Kudos] Critical module missing! Cannot initialize.");
                return;
            }
            // Appelez l'initialisation originale
            originalInit.apply(this, arguments);
            // console.log("[Strava Auto Kudos] App initialization completed successfully");
        } catch (error) {
            console.error("[Strava Auto Kudos] App initialization failed:", error);
            // Ajoutez ici une gestion d'erreur plus robuste si nécessaire
        }
    };
} else {
    console.error("[Strava Auto Kudos] App object or App.init is not defined!");
}

// Fonction principale d'initialisation
document.addEventListener('DOMContentLoaded', () => {
    // console.log("[Strava Auto Kudos] DOMContentLoaded, initializing App...");
    try {
        App.init();
    } catch(e) {
        console.error("[Strava Auto Kudos] Error during App.init on DOMContentLoaded:", e);
    }
});

// Fallback avec window.onload
window.onload = () => {
    // console.log("[Strava Auto Kudos] window.onload, fallback initializing App...");
    try {
        // Vérifier si App.init existe avant de l'appeler
        if (typeof App !== 'undefined' && typeof App.init === 'function') {
             // Vérifier si l'initialisation a déjà eu lieu (par exemple, en vérifiant si la bulle existe)
             if (!document.getElementById('strava-auto-kudos-container')) { 
                App.init();
             }
        } else {
            console.error("[Strava Auto Kudos] App.init not available during window.onload");
        }
    } catch(e) {
        console.error("[Strava Auto Kudos] Error during App.init on window.onload:", e);
    }
};

// Vérification finale après un délai
setTimeout(() => {
    // console.log("[Strava Auto Kudos] Timeout check for initialization...");
    // Vérifiez si l'initialisation a déjà eu lieu (par exemple, en vérifiant si la bulle existe)
    if (!document.getElementById('strava-auto-kudos-container')) {
        // console.log("[Strava Auto Kudos] Initializing App via timeout fallback...");
        try {
             if (typeof App !== 'undefined' && typeof App.init === 'function') {
                App.init();
             } else {
                 console.error("[Strava Auto Kudos] App.init not available during timeout check");
             }
        } catch(e) {
            console.error("[Strava Auto Kudos] Error during App.init on timeout:", e);
        }
    } else {
        // console.log("[Strava Auto Kudos] App already initialized.");
    }
}, 2500);

// Exporter le module d'application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}