/**
 * Module principal de l'extension
 * @module App
 */
console.log("[Strava Auto Kudos] App module loading");

// Définir global pour le contexte du navigateur
if (typeof window !== 'undefined' && typeof global === 'undefined') {
    window.global = window;
}

// Vérifier si App est déjà défini
if (typeof window.App === 'undefined') {
    // Utiliser les modules globaux
    const Logger = window.Logger;
    const Utils = window.Utils;
    const Storage = window.Storage;
    const DOMManager = window.DOMManager;
    const NetworkManager = window.NetworkManager;
    const StateManager = window.StateManager;
    const KudosManager = window.KudosManager;
    const UI = window.UI;
    const Templates = window.Templates;

    window.App = {
        /**
         * Indique si l'application est initialisée
         * @type {boolean}
         */
        isInitialized: false,

        /**
         * Identifiants des timers
         * @type {Object}
         */
        timers: {
            mutationObserverRetry: null,
            delayOptimization: null
        },

        /**
         * Références aux observateurs
         * @type {Object}
         */
        observers: {
            state: null,
            mutation: null
        },

        /**
         * Gestionnaire d'événements
         * @type {Object}
         */
        eventListeners: {},

        /**
         * Émet un événement
         * @param {string} event - Nom de l'événement
         * @param {Object} data - Données associées à l'événement
         */
        emit(event, data) {
            if (this.eventListeners[event]) {
                this.eventListeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        StateManager.handleError(error, `callback de l'événement ${event}`);
                    }
                });
            }
        },

        /**
         * Ajoute un écouteur d'événement
         * @param {string} event - Nom de l'événement
         * @param {Function} callback - Fonction de callback
         */
        on(event, callback) {
            if (!this.eventListeners[event]) {
                this.eventListeners[event] = [];
            }
            this.eventListeners[event].push(callback);
        },

        /**
         * Supprime un écouteur d'événement
         * @param {string} event - Nom de l'événement
         * @param {Function} callback - Fonction de callback à supprimer
         */
        off(event, callback) {
            if (this.eventListeners[event]) {
                this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
            }
        },

        /**
         * Vérifie l'état de l'application
         * @returns {Object} État de l'application
         */
        getState() {
            return {
                isInitialized: this.isInitialized,
                hasObservers: {
                    state: !!this.observers.state,
                    mutation: !!this.observers.mutation
                },
                hasTimers: {
                    mutationObserverRetry: !!this.timers.mutationObserverRetry,
                    delayOptimization: !!this.timers.delayOptimization
                }
            };
        },

        /**
         * Vérifie les prérequis nécessaires au fonctionnement de l'extension
         * @returns {boolean} True si tous les prérequis sont satisfaits
         */
        verifyPrerequisites() {
            try {
                console.log("[Strava Auto Kudos] Vérification des prérequis...");
                
                // Vérifier la présence des modules requis
                const requiredModules = {
                    'CONFIG': window.CONFIG,
                    'Logger': window.Logger,
                    'Storage': window.Storage,
                    'DOMManager': window.DOMManager,
                    'StateManager': window.StateManager,
                    'UI': window.UI,
                    'KudosManager': window.KudosManager,
                    'Templates': window.Templates
                };

                // Vérifier chaque module
                for (const [name, module] of Object.entries(requiredModules)) {
                    if (!module) {
                        console.error(`[Strava Auto Kudos] Module ${name} non trouvé`);
                        throw new Error(`Module ${name} non trouvé`);
                    }
                    console.log(`[Strava Auto Kudos] Module ${name} trouvé`);
                }

                console.log("[Strava Auto Kudos] Tous les prérequis sont satisfaits");
                return true;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la vérification des prérequis:", error);
                throw error;
            }
        },

        /**
         * Initialise l'extension
         */
        init() {
            console.log("[Strava Auto Kudos] Début de l'initialisation de l'extension");
            
            try {
                // Vérifier les prérequis
                if (!this.verifyPrerequisites()) {
                    throw new Error("Prérequis non satisfaits");
                }

                // S'assurer que Storage est initialisé et disponible
                if (!window.Storage || !window.Storage.isAvailable()) {
                    throw new Error("Le stockage local n'est pas disponible");
                }

                // Initialiser le gestionnaire d'état en premier
                window.StateManager.init();

                // Initialiser l'interface utilisateur
                window.UI.init();

                // Initialiser le gestionnaire de kudos
                window.KudosManager.init();

                console.log("[Strava Auto Kudos] Initialisation terminée avec succès");
                return true;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de l'initialisation:", error);
                throw error;
            }
        },

        /**
         * Vérifie les dépendances critiques
         * @throws {Error} Si une dépendance est manquante
         */
        async checkDependencies() {
            const dependencies = [
                { name: 'KudosManager', critical: true, description: 'Gestionnaire de kudos' },
                { name: 'Storage', critical: true, description: 'Gestionnaire de stockage' },
                { name: 'StateManager', critical: true, description: 'Gestionnaire d\'état' },
                { name: 'DOMManager', critical: true, description: 'Gestionnaire DOM' },
                { name: 'NetworkManager', critical: true, description: 'Gestionnaire réseau' },
                { name: 'UI', critical: true, description: 'Interface utilisateur' },
                { name: 'Logger', critical: true, description: 'Système de logging' },
                { name: 'Utils', critical: true, description: 'Utilitaires' }
            ];

            Logger.debug('Vérification des dépendances...');
            
            const missingDeps = dependencies.filter(dep => {
                const isMissing = typeof window[dep.name] === 'undefined';
                if (isMissing) {
                    Logger.error(`Dépendance manquante: ${dep.name} (${dep.description})`);
                } else {
                    Logger.debug(`Dépendance trouvée: ${dep.name} (${dep.description})`);
                }
                return isMissing;
            });
            
            if (missingDeps.length > 0) {
                const missingNames = missingDeps.map(dep => `${dep.name} (${dep.description})`).join(', ');
                throw new Error(`Modules critiques manquants: ${missingNames}`);
            }
            
            Logger.info('Toutes les dépendances sont présentes');
        },

        /**
         * Vérifie si nous sommes sur une page Strava
         * @returns {boolean} true si nous sommes sur Strava
         */
        isStravaPage() {
            return window.location.href.includes("strava.com");
        },

        /**
         * Initialise les composants de l'application
         * @throws {Error} Si l'initialisation d'un composant échoue
         */
        async initializeComponents() {
            const components = [
                { 
                    name: 'StateManager', 
                    init: () => StateManager.init(),
                    description: 'Gestionnaire d\'état'
                },
                { 
                    name: 'UI', 
                    init: () => this.createUI(),
                    description: 'Interface utilisateur'
                },
                { 
                    name: 'DelayOptimization', 
                    init: () => this.initDelayOptimization(),
                    description: 'Optimisation des délais'
                },
                { 
                    name: 'ActivePause', 
                    init: () => UI.checkForActivePause(),
                    description: 'Gestion des pauses'
                },
                { 
                    name: 'FirstRun', 
                    init: () => this.handleFirstRun(),
                    description: 'Premier lancement'
                }
            ];
            
            Logger.info('Initialisation des composants...');
            
            for (const component of components) {
                try {
                    Logger.debug(`Initialisation de ${component.name} (${component.description})...`);
                    await component.init();
                    Logger.debug(`${component.name} initialisé avec succès`);
                } catch (error) {
                    Logger.error(`Échec de l'initialisation de ${component.name}`, error);
                    throw new Error(`Échec de l'initialisation de ${component.name}: ${error.message}`);
                }
            }
            
            Logger.info('Tous les composants ont été initialisés avec succès');
        },

        /**
         * Crée l'interface utilisateur
         */
        async createUI() {
            try {
                console.log("[Strava Auto Kudos] Début de la création de l'interface utilisateur");
                // Attendre que le DOM soit prêt
                if (document.readyState !== 'complete') {
                    console.log("[Strava Auto Kudos] DOM non prêt, attente du chargement...");
                    await new Promise(resolve => window.addEventListener('load', resolve));
                }
                console.log("[Strava Auto Kudos] DOM prêt");

                // Créer la bulle
                console.log("[Strava Auto Kudos] Création de la bulle...");
                const bulle = await UI.createBubble();
                if (!bulle) {
                    console.error("[Strava Auto Kudos] Échec de la création de la bulle");
                    throw new Error('Échec de la création de la bulle');
                }
                console.log("[Strava Auto Kudos] Bulle créée avec succès");
                
                // Initialiser le compteur
                console.log("[Strava Auto Kudos] Initialisation du compteur...");
                const counter = DOMManager.getKudosCounter();
                if (counter) {
                    counter.textContent = StateManager.getKudosCount().toString();
                    console.log("[Strava Auto Kudos] Compteur initialisé");
                }

                // Mettre à jour l'état du bouton
                console.log("[Strava Auto Kudos] Mise à jour de l'état du bouton...");
                UI.updateBubbleStatus(StateManager.isEnabled());
                
                console.log("[Strava Auto Kudos] Interface utilisateur créée avec succès");
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la création de l'interface:", error);
                StateManager.handleError(error, 'création de l\'interface');
                throw error;
            }
        },

        /**
         * Configure les observateurs
         */
        setupObservers() {
            try {
                // Observer le scroll pour le chargement de nouvelles entrées
                window.addEventListener('scroll', KudosManager.handleScroll);
                
                // Configurer l'observateur de mutations pour le flux
                this.setupMutationObserver();

                // Observer les changements d'état
                this.setupStateObserver();
            } catch (error) {
                StateManager.handleError(error, 'configuration des observateurs');
            }
        },

        /**
         * Configure l'observateur d'état
         */
        setupStateObserver() {
            try {
                // Nettoyer l'observateur existant si présent
                if (this.observers.state) {
                    this.observers.state.disconnect();
                }

                // Observer les changements d'état pour mettre à jour l'UI
                this.observers.state = new MutationObserver(() => {
                    if (StateManager.isEnabled() && !StateManager.isPaused()) {
                        UI.updateBubbleStatus(true);
                    } else {
                        UI.updateBubbleStatus(false);
                    }
                });

                this.observers.state.observe(StateManager.state, {
                    attributes: true,
                    childList: true,
                    subtree: true
                });
            } catch (error) {
                StateManager.handleError(error, 'configuration de l\'observateur d\'état');
            }
        },

        /**
         * Gère le premier lancement de l'extension
         */
        async handleFirstRun() {
            try {
                if (Storage.load('strava_auto_kudos_first_run', true)) {
                    await StateManager.setEnabled(true);
                    await Storage.save('strava_auto_kudos_first_run', false);
                    Logger.info('Premier lancement détecté, extension activée par défaut');
                }
            } catch (error) {
                StateManager.handleError(error, 'gestion du premier lancement');
            }
        },

        /**
         * Initialise le système d'auto-optimisation des délais
         */
        initDelayOptimization() {
            try {
                if (this.timers.delayOptimization) {
                    clearInterval(this.timers.delayOptimization);
                }
                
                // Constantes pour l'optimisation
                const OPTIMIZATION = {
                    INTERVAL: 30000, // Intervalle de vérification (30s)
                    MIN_ATTEMPTS: 10, // Nombre minimum de tentatives pour l'optimisation
                    CLEANUP_THRESHOLD: 0.8, // Seuil de nettoyage (80%)
                    BATCH_SIZE: 50 // Taille du lot pour le nettoyage
                };
                
                this.timers.delayOptimization = setInterval(() => {
                    // Vérifier si on a assez de tentatives pour optimiser
                    if (StateManager.state.kudosAttempts > OPTIMIZATION.MIN_ATTEMPTS) {
                        // Calculer le taux de succès
                        const successRate = StateManager.state.kudosSuccesses / StateManager.state.kudosAttempts;
                        
                        // Optimiser les délais
                        StateManager.updateDelays(successRate);
                        
                        // Vérifier si le nettoyage est nécessaire
                        const entriesSize = StateManager.state.processedEntries.size;
                        const maxEntries = StateManager.state.maxProcessedEntries;
                        
                        if (entriesSize > maxEntries * OPTIMIZATION.CLEANUP_THRESHOLD) {
                            Logger.info(`Nettoyage des entrées traitées: ${entriesSize}/${maxEntries}`);
                            
                            // Nettoyer par lots pour éviter les blocages
                            const entriesToRemove = Math.floor(entriesSize * 0.2); // 20% des entrées
                            StateManager.cleanupProcessedEntries(entriesToRemove);
                            
                            Logger.info(`Nettoyage effectué: ${entriesToRemove} entrées supprimées`);
                        }
                    }
                }, OPTIMIZATION.INTERVAL);
                
                Logger.info('Système d\'optimisation des délais initialisé');
            } catch (error) {
                StateManager.handleError(error, 'initialisation de l\'optimisation des délais');
            }
        },
        
        /**
         * Configure l'observateur de mutations pour le flux
         * @param {number} retryCount - Nombre de tentatives de configuration
         */
        setupMutationObserver(retryCount = 0) {
            Logger.debug('Configuration de l\'observateur de mutations');
            
            try {
                const maxRetries = 5;
                const baseDelay = 1000;
                
                if (retryCount >= maxRetries) {
                    Logger.error('Échec de la configuration de l\'observateur après plusieurs tentatives');
                    return;
                }
                
                const targetNode = DOMManager.getFeedContainer();
                
                if (!targetNode) {
                    Logger.debug('Élément conteneur du flux non trouvé');
                    // Réessayer plus tard avec un délai exponentiel
                    if (this.timers.mutationObserverRetry) {
                        clearTimeout(this.timers.mutationObserverRetry);
                    }
                    const delay = baseDelay * Math.pow(2, retryCount);
                    this.timers.mutationObserverRetry = setTimeout(
                        () => this.setupMutationObserver(retryCount + 1),
                        delay
                    );
                    return;
                }
                
                Logger.debug('Élément conteneur du flux trouvé', targetNode);
                
                // Nettoyer l'observateur existant si présent
                if (this.observers.mutation) {
                    this.observers.mutation.disconnect();
                }
                
                // Utiliser un debounce pour éviter les appels trop fréquents
                let debounceTimeout;
                this.observers.mutation = new MutationObserver((mutationsList) => {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        for (const mutation of mutationsList) {
                            // Gérer les changements dans les entrées
                            if (mutation.type === 'childList') {
                                const addedNodes = Array.from(mutation.addedNodes)
                                    .filter(node => node.nodeType === 1 && node.matches(DOMManager.selectors.feedEntry));
                                const removedNodes = Array.from(mutation.removedNodes)
                                    .filter(node => node.nodeType === 1 && node.matches(DOMManager.selectors.feedEntry));

                                if (addedNodes.length > 0) {
                                    // Mettre à jour le cache pour les nouvelles entrées
                                    addedNodes.forEach(entry => {
                                        const entryId = EntryProcessor.generateEntryId(entry);
                                        if (!StateManager.hasProcessed(entryId)) {
                                            DOMManager.elementCache.set(entryId, {
                                                element: entry,
                                                timestamp: Date.now()
                                            });
                                        }
                                    });

                                    // Démarrer le traitement si l'extension est active
                                    if (StateManager.isEnabled() && !StateManager.isPaused()) {
                                        KudosManager.startProcessing();
                                    }
                                }

                                if (removedNodes.length > 0) {
                                    // Nettoyer le cache pour les entrées supprimées
                                    removedNodes.forEach(entry => {
                                        const entryId = EntryProcessor.generateEntryId(entry);
                                        DOMManager.elementCache.delete(entryId);
                                    });
                                }
                            }

                            // Gérer les changements dans les boutons kudos
                            if (mutation.type === 'attributes' && mutation.target.matches(DOMManager.selectors.kudosButton)) {
                                const entry = mutation.target.closest(DOMManager.selectors.feedEntry);
                                if (entry) {
                                    const entryId = EntryProcessor.generateEntryId(entry);
                                    const cachedEntry = DOMManager.elementCache.get(entryId);
                                    if (cachedEntry) {
                                        cachedEntry.element = entry;
                                        cachedEntry.timestamp = Date.now();
                                    }
                                }
                            }
                        }
                    }, 500); // Délai de debounce de 500ms
                });
                
                this.observers.mutation.observe(targetNode, { 
                    childList: true, 
                    subtree: true,
                    attributes: true // Activer l'observation des attributs pour le cache
                });
                
                Logger.debug('Observateur de mutations configuré');
            } catch (error) {
                StateManager.handleError(error, 'configuration de l\'observateur de mutations');
            }
        },

        /**
         * Nettoie les observateurs
         */
        cleanupObservers() {
            // Nettoyer l'observateur d'état
            if (this.observers.state) {
                this.observers.state.disconnect();
                this.observers.state = null;
            }
            
            // Nettoyer l'observateur de mutations
            if (this.observers.mutation) {
                this.observers.mutation.disconnect();
                this.observers.mutation = null;
            }
            
            // Nettoyer les timeouts
            this.cleanup();
        },

        /**
         * Nettoie les ressources de l'application
         */
        cleanup() {
            if (this.timers.mutationObserverRetry) {
                clearTimeout(this.timers.mutationObserverRetry);
            }
            if (this.timers.delayOptimization) {
                clearInterval(this.timers.delayOptimization);
            }
            this.timers = {
                mutationObserverRetry: null,
                delayOptimization: null
            };
            this.eventListeners = {};
        },

        /**
         * Réinitialise l'application
         */
        async reset() {
            Logger.info('Réinitialisation de l\'application');
            try {
                // Nettoyer les ressources existantes
                this.cleanupObservers();
                
                // Réinitialiser l'état
                this.isInitialized = false;
                
                // Réinitialiser les observateurs
                this.observers = {
                    state: null,
                    mutation: null
                };
                
                // Réinitialiser les timers
                this.timers = {
                    mutationObserverRetry: null,
                    delayOptimization: null
                };
                
                // Réinitialiser l'application
                await this.init();
                
                Logger.info('Application réinitialisée avec succès');
                this.emit('reset', this.getState());
            } catch (error) {
                StateManager.handleError(error, 'réinitialisation');
                throw error;
            }
        },

        /**
         * Réinitialise un composant spécifique
         * @param {string} component - Le nom du composant à réinitialiser
         */
        resetComponent(component) {
            console.log("[Strava Auto Kudos] Réinitialisation du composant:", component);
            
            switch (component) {
                case 'observers':
                    // Réinitialiser l'observateur de mutations principal
                    if (this.observers.mutation) {
                        this.observers.mutation.disconnect();
                        this.observers.mutation = null;
                    }
                    // Reconfigurer l'observateur
                    this.setupMutationObserver();
                    console.log("[Strava Auto Kudos] Observateur de mutations réinitialisé");
                    break;
                    
                case 'state':
                    // Réinitialiser l'état
                    StateManager.reset();
                    break;
                    
                case 'ui':
                    // Réinitialiser l'interface
                    UI.updateUI();
                    break;
                
                case 'processing':
                    // Réinitialiser le traitement
                    if (window.KudosManager && typeof window.KudosManager.resume === 'function') {
                        window.KudosManager.resume();
                    }
                    console.log("[Strava Auto Kudos] Traitement réinitialisé");
                    break;
                    
                case 'all':
                    // Réinitialiser tous les composants
                    this.resetComponent('observers');
                    this.resetComponent('state');
                    this.resetComponent('ui');
                    this.resetComponent('processing');
                    console.log("[Strava Auto Kudos] Tous les composants réinitialisés");
                    break;
                    
                default:
                    console.warn("[Strava Auto Kudos] Composant inconnu:", component);
            }
        },

        /**
         * Reprend le traitement après une pause ou une erreur
         * Cette méthode coordonne toutes les actions nécessaires
         * @returns {boolean} True si la reprise a réussi
         */
        resumeProcessing() {
            console.log("[Strava Auto Kudos] Reprise globale du traitement");
            
            try {
                // 1. Vérifier que l'extension est activée
                if (!StateManager.isEnabled()) {
                    console.log("[Strava Auto Kudos] L'extension est désactivée, pas de reprise");
                    return false;
                }
                
                // 2. Réinitialiser l'état de pause
                if (StateManager.isPaused()) {
                    console.log("[Strava Auto Kudos] Annulation de la pause");
                    if (typeof StateManager.resume === 'function') {
                        StateManager.resume();
                    } else {
                        // Fallback si resume n'existe pas
                        StateManager.state.pauseUntil = null;
                        StateManager.saveStateImmediate();
                    }
                }
                
                // 3. Réinitialiser le compteur d'erreurs
                StateManager.resetErrorCount();
                
                // 4. Reprendre le traitement via KudosManager
                if (KudosManager && typeof KudosManager.resume === 'function') {
                    console.log("[Strava Auto Kudos] Reprise du traitement via KudosManager");
                    KudosManager.resume();
                }
                
                // 5. Réinitialiser les observateurs DOM
                this.resetComponent('observers');
                
                // 6. Mettre à jour l'interface
                if (UI && typeof UI.updateUI === 'function') {
                    UI.updateUI();
                }
                
                // 7. Émettre un événement de reprise
                this.emit('processingResumed', {
                    timestamp: Date.now(),
                    source: 'manual'
                });
                
                return true;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la reprise du traitement:", error);
                return false;
            }
        },

        /**
         * Récupère l'état de santé détaillé des composants
         * @returns {Object} État de santé des composants
         */
        getComponentHealth() {
            const health = {
                state: {
                    isEnabled: StateManager.isEnabled(),
                    isPaused: StateManager.isPaused(),
                    errorCount: StateManager.getErrorCount(),
                    kudosCount: StateManager.getKudosCount(),
                    isProcessing: StateManager.isProcessing()
                },
                network: {
                    isAvailable: NetworkManager.connectionCache.isAvailable,
                    lastCheck: NetworkManager.connectionCache.timestamp,
                    cacheAge: Date.now() - NetworkManager.connectionCache.timestamp
                },
                observers: {
                    state: !!this.observers.state,
                    mutation: !!this.observers.mutation
                },
                timers: {
                    mutationObserverRetry: !!this.timers.mutationObserverRetry,
                    delayOptimization: !!this.timers.delayOptimization
                },
                storage: {
                    processedEntries: StateManager.state.processedEntries.size,
                    maxProcessedEntries: StateManager.state.maxProcessedEntries
                },
                performance: {
                    kudosStats: StateManager.getKudosStats(),
                    delays: StateManager.getDelays()
                }
            };

            // Calculer l'état global
            health.globalStatus = this.calculateGlobalHealth(health);
            
            return health;
        },

        /**
         * Calcule l'état de santé global
         * @param {Object} health - État de santé des composants
         * @returns {string} État global ('healthy', 'warning', 'error')
         */
        calculateGlobalHealth(health) {
            // Vérifier les erreurs critiques
            if (health.state.errorCount > 5 || 
                health.state.isPaused || 
                !health.network.isAvailable) {
                return 'error';
            }

            // Vérifier les avertissements
            if (health.state.errorCount > 0 || 
                health.network.cacheAge > 30000 || // Plus de 30 secondes
                health.storage.processedEntries > health.storage.maxProcessedEntries * 0.8) {
                return 'warning';
            }

            return 'healthy';
        },

        async loadModules() {
            const moduleOrder = [
                'config',
                'logger',
                'storage',
                'domManager',
                'stateManager',
                'entryProcessor', // Charger EntryProcessor avant KudosManager
                'kudosManager',
                'ui',
                'templates'
            ];

            for (const moduleName of moduleOrder) {
                try {
                    await this.loadModule(moduleName);
                } catch (error) {
                    console.error(`[Strava Auto Kudos] Erreur lors du chargement du module ${moduleName}:`, error);
                }
            }
        }
    };
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.App;
}

// Fonction d'initialisation de l'application
function initializeApp() {
    console.log("[Strava Auto Kudos] Configuration de l'initialisation...");
    
    try {
        // Vérifier si le document est complètement chargé
        if (document.readyState === 'complete') {
            console.log("[Strava Auto Kudos] Document chargé, démarrage de l'initialisation...");
            initializeWithRetry();
        } else {
            console.log("[Strava Auto Kudos] En attente du chargement complet...");
            window.addEventListener('load', () => {
                console.log("[Strava Auto Kudos] Document chargé, démarrage de l'initialisation...");
                initializeWithRetry();
            });
        }
    } catch (error) {
        console.error("[Strava Auto Kudos] Erreur lors de l'initialisation:", error);
    }
}

/**
 * Initialise l'application avec mécanisme de retry
 * @param {number} retryCount - Nombre de tentatives déjà effectuées
 */
function initializeWithRetry(retryCount = 0) {
    try {
        console.log(`[Strava Auto Kudos] Tentative d'initialisation (${retryCount + 1}/3)...`);
        window.App.init();
    } catch (error) {
        console.error("[Strava Auto Kudos] Erreur d'initialisation:", error);
        if (retryCount < 2) { // Jusqu'à 3 tentatives (0, 1, 2)
            const delay = Math.pow(2, retryCount) * 1000; // Délai exponentiel: 1s, 2s, 4s
            console.log(`[Strava Auto Kudos] Nouvelle tentative dans ${delay/1000}s...`);
            setTimeout(() => initializeWithRetry(retryCount + 1), delay);
        } else {
            console.error("[Strava Auto Kudos] Échec après 3 tentatives, tentative de récupération d'urgence");
            // Tentative de récupération d'urgence
            try {
                // Nettoyer les ressources existantes
                if (window.App.cleanup) {
                    window.App.cleanup();
                }
                // Réinitialiser les états globaux
                if (window.StateManager && window.StateManager.reset) {
                    window.StateManager.reset();
                }
                // Réessayer une dernière fois après nettoyage
                setTimeout(() => {
                    try {
                        window.App.init();
                    } catch (finalError) {
                        console.error("[Strava Auto Kudos] Échec de la récupération d'urgence:", finalError);
                    }
                }, 5000);
            } catch (recoveryError) {
                console.error("[Strava Auto Kudos] Échec de la tentative de récupération:", recoveryError);
            }
        }
    }
}

// Démarrer l'initialisation
initializeApp();

// Gestionnaire d'événements pour le bouton d'activation
async function setupToggleButton() {
    // Vérifier que les dépendances sont chargées
    if (!window.StateManager || !window.UI) {
        console.log("[Strava Auto Kudos] Dépendances non disponibles, attente...");
        setTimeout(setupToggleButton, 1000);
        return;
    }

    const container = document.getElementById('strava-auto-kudos-container');
    if (!container) {
        console.log("[Strava Auto Kudos] Conteneur non trouvé, nouvelle tentative dans 1 seconde");
        setTimeout(setupToggleButton, 1000);
        return;
    }

    const toggleButton = container.querySelector('.social_assistant_button');
    if (!toggleButton) {
        console.log("[Strava Auto Kudos] Bouton non trouvé, nouvelle tentative dans 1 seconde");
        setTimeout(setupToggleButton, 1000);
        return;
    }

    console.log("[Strava Auto Kudos] Bouton trouvé, configuration des événements");
    toggleButton.addEventListener('click', async () => {
        const isEnabled = StateManager.isEnabled();
        if (isEnabled) {
            await StateManager.disable();
            UI.updateBubbleStatus(false);
        } else {
            await StateManager.enable();
            UI.updateBubbleStatus(true);
        }
    });
}

// Démarrer la configuration du bouton
setupToggleButton();
