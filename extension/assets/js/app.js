console.log("[Strava Auto Kudos] App module loading");

/**
 * Module d'initialisation de l'application
 */
const App = {
    init: () => {
        Logger.info('Initialisation de l\'extension');
        console.log("[Strava Auto Kudos] App.init() called, URL:", window.location.href);
        
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
            
            // Pour le dashboard, activer les fonctionnalités de kudos automatiques
            const isDashboard = Utils.isDashboardPage();
            if (isDashboard) {
                Logger.info('Dashboard Strava détecté, activation des kudos automatiques');
                // Si l'extension est activée, démarrer la boucle de kudos
                if (CONFIG.state.isEnabled) {
                    KudosManager.loopKudos();
                }
                
                // Observer les changements dans le DOM pour détecter le chargement de nouvelles entrées
                App.setupMutationObserver();
            } else {
                Logger.info('Page Strava non-dashboard, seule l\'interface sera active');
            }
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation', error);
            console.error('[Strava Auto Kudos] App init error:', error);
        }
    },

    onDOMLoaded: () => {
        Logger.debug('DOM chargé, création des éléments UI');
        console.log("[Strava Auto Kudos] onDOMLoaded() called");
        
        try {
            // Réinitialiser explicitement le compteur de kudos pour cette session
            CONFIG.state.kudosCount = 0;
            console.log("[Strava Auto Kudos] Reset kudos count to 0 for current session");
            
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
            console.log("[Strava Auto Kudos] Creating bubble now");
            const bulle = UI.createBulle();
            console.log("[Strava Auto Kudos] Bubble creation result:", bulle ? "Success" : "Failed");
            Logger.debug('Après création de la bulle:', bulle ? 'Succès' : 'Échec');
            
            // Vérifier s'il y a une pause temporaire active
            UI.checkForActivePause();
            
            // Vérifier que l'élément compteur est correctement mis à jour
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            if (counter) {
                // S'assurer que le compteur affiche bien 0
                counter.textContent = "0";
                console.log("[Strava Auto Kudos] Counter initialization verified:", counter.textContent);
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
                    console.log(`[Strava Auto Kudos] High success rate (${(successRate*100).toFixed(1)}%), decreasing delays: ${CONFIG.kudosDelay.min}-${CONFIG.kudosDelay.max}ms`);
                } else if (successRate < 0.7) {
                    // Mauvais taux de succès, on ralentit
                    CONFIG.kudosDelay.min = Math.min(500, CONFIG.kudosDelay.min + 50);
                    CONFIG.kudosDelay.max = Math.min(1000, CONFIG.kudosDelay.max + 100);
                    console.log(`[Strava Auto Kudos] Low success rate (${(successRate*100).toFixed(1)}%), increasing delays: ${CONFIG.kudosDelay.min}-${CONFIG.kudosDelay.max}ms`);
                }
                
                // Réinitialiser les compteurs pour la prochaine période
                CONFIG.state.kudosAttempts = 0;
                CONFIG.state.kudosSuccesses = 0;
            }
        }, 30000);
    },
    
    setupMutationObserver: () => {
        Logger.debug('Configuration de l\'observateur de mutations');
        
        try {
            // Trouver le conteneur du flux, soit par le sélecteur défini, soit en cherchant un élément probable
            const targetNode = document.querySelector(CONFIG.selectors.feedContainer) || 
                               document.querySelector('.feed-ui') ||
                               document.querySelector('[data-testid="web-feed-entry"]')?.parentNode?.parentNode;
            
            if (!targetNode) {
                Logger.debug('Élément conteneur du flux non trouvé');
                // Réessayer plus tard
                setTimeout(App.setupMutationObserver, 1000);
                return;
            }
            
            Logger.debug('Élément conteneur du flux trouvé', targetNode);
            
            const observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        Logger.debug('Nouvelles entrées détectées dans le flux via MutationObserver');
                        KudosManager.loopKudos();
                        break;
                    }
                }
            });
            
            observer.observe(targetNode, { childList: true, subtree: true });
            Logger.debug('Observateur de mutations configuré');
        } catch (error) {
            Logger.error('Erreur lors de la configuration de l\'observateur de mutations', error);
        }
    }
};

// Ajoutez ces lignes dans la fonction init de App (si elle existe)
if (typeof App !== 'undefined') {
    // Sauvegardez la fonction init originale si elle existe
    const originalInit = App.init || function() {};
    
    // Remplacez-la par une version qui log
    App.init = function() {
        console.log("[Strava Auto Kudos] App initialization started");
        try {
            // Vérifiez les dépendances critiques avant l'initialisation
            if (typeof KudosManager === 'undefined') {
                throw new Error("KudosManager module is missing");
            }
            if (typeof Storage === 'undefined') {
                throw new Error("Storage module is missing");
            }
            
            // Appelez l'initialisation originale
            originalInit.apply(this, arguments);
            console.log("[Strava Auto Kudos] App initialization completed successfully");
        } catch (error) {
            console.error("[Strava Auto Kudos] App initialization failed:", error);
        }
    };
}

// Exporter le module d'application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
