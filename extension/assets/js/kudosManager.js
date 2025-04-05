/**
 * Module de gestion des kudos
 * @module KudosManager
 */
console.log("[Strava Auto Kudos] KudosManager module loading");

// Vérifier si KudosManager est déjà défini
if (typeof window.KudosManager === 'undefined') {
    window.KudosManager = {
        /**
         * Configuration du gestionnaire de kudos
         * @type {Object}
         */
        config: {
            retryDelay: 1000,
            domCheckInterval: 1000, // Intervalle de vérification du DOM
            maxDomChecks: 5, // Nombre maximum de vérifications du DOM
            errorHandling: {
                maxConsecutiveErrors: 5,
                errorCooldown: 30000, // 30 secondes
                errorTypes: {
                    DOM: 'DOM_ERROR',
                    NETWORK: 'NETWORK_ERROR',
                    RATE_LIMIT: 'RATE_LIMIT_ERROR',
                    SERVER: 'SERVER_ERROR',
                    UNKNOWN: 'UNKNOWN_ERROR'
                },
                errorSeverity: {
                    LOW: 1,
                    MEDIUM: 2,
                    HIGH: 3,
                    CRITICAL: 4
                }
            }
        },

        /**
         * État des erreurs
         * @type {Object}
         */
        errorState: {
            consecutiveErrors: 0,
            lastError: null,
            errorHistory: [],
            maxErrorHistory: 10
        },

        /**
         * Initialise le gestionnaire de kudos
         */
        async init() {
            console.log("[Strava Auto Kudos] Initialisation du gestionnaire de kudos");
            
            // Créer la bulle UI immédiatement
            UI.createBubble();
            
            // Attendre que le DOM soit chargé
            if (document.readyState === 'loading') {
                console.log("[Strava Auto Kudos] DOM en cours de chargement, attente...");
                await this.waitForDOM();
            } else {
                console.log("[Strava Auto Kudos] DOM déjà chargé, démarrage immédiat");
            }

            // Démarrer le traitement
            console.log("[Strava Auto Kudos] Démarrage du traitement");
            await this.startProcessing();
        },

        /**
         * Attend que le DOM soit chargé
         * @returns {Promise<void>}
         */
        waitForDOM() {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        },

        /**
         * Démarre le traitement des entrées
         */
        async startProcessing() {
            console.log("[Strava Auto Kudos] Démarrage du traitement des kudos");
            
            // Vérifier que l'extension est activée
            if (!StateManager.isEnabled()) {
                console.log("[Strava Auto Kudos] Extension désactivée, arrêt du traitement");
                return;
            }
            
            // Vérifier que l'extension n'est pas en pause
            if (StateManager.isPaused()) {
                console.log("[Strava Auto Kudos] Extension en pause, arrêt du traitement");
                return;
            }
            
            // Démarrer la boucle de traitement
            this.loopKudos();
        },

        /**
         * Gère une erreur
         * @param {Error} error - L'erreur à gérer
         * @param {string} context - Le contexte de l'erreur
         */
        handleError(error, context = 'unknown') {
            console.error("[Strava Auto Kudos] Erreur dans", context + ":", error);
            
            // Mettre à jour l'état des erreurs
            this.errorState.consecutiveErrors++;
            this.errorState.lastError = {
                timestamp: Date.now(),
                error: error,
                context: context
            };
            
            // Ajouter à l'historique
            this.errorState.errorHistory.push(this.errorState.lastError);
            if (this.errorState.errorHistory.length > this.errorState.maxErrorHistory) {
                this.errorState.errorHistory.shift();
            }
            
            // Gérer les erreurs consécutives
            if (this.errorState.consecutiveErrors >= this.config.errorHandling.maxConsecutiveErrors) {
                this.handleConsecutiveErrors();
            }
            
            // Logger l'erreur
            Logger.error(error, {
                type: this.config.errorHandling.errorTypes.UNKNOWN,
                severity: this.config.errorHandling.errorSeverity.MEDIUM,
                context: context,
                consecutiveErrors: this.errorState.consecutiveErrors
            });
        },

        /**
         * Gère les erreurs consécutives
         */
        handleConsecutiveErrors() {
            const now = Date.now();
            const lastErrorTime = this.errorState.lastError?.timestamp || 0;
            
            // Si on est dans la période de cooldown, on met en pause
            if (now - lastErrorTime < this.config.errorHandling.errorCooldown) {
                const pauseDuration = this.config.errorHandling.errorCooldown;
                StateManager.pause(pauseDuration);
                NotificationManager.showError(`Trop d'erreurs consécutives. Pause de ${Utils.formatDuration(pauseDuration)}`);
            }
        },

        /**
         * Boucle principale de traitement des kudos
         */
        async loopKudos() {
            console.log("[Strava Auto Kudos] Début de la boucle de traitement");
            
            try {
                // Vérifier que l'extension est toujours active et non en pause
                if (!StateManager.isEnabled() || StateManager.isPaused()) {
                    console.log("[Strava Auto Kudos] Extension désactivée ou en pause, arrêt de la boucle");
                    return;
                }
                
                // Trouver les entrées à traiter
                const entries = DOMManager.findFeedEntries();
                console.log("[Strava Auto Kudos] Entrées trouvées:", entries.length);
                
                if (entries.length === 0) {
                    console.log("[Strava Auto Kudos] Aucune entrée à traiter, nouvelle tentative dans", this.config.retryDelay, "ms");
                    setTimeout(() => this.loopKudos(), this.config.retryDelay);
                    return;
                }
                
                // Traiter chaque entrée
                let successCount = 0;
                for (const entry of entries) {
                    if (!StateManager.isEnabled() || StateManager.isPaused()) {
                        break;
                    }
                    
                    const success = await EntryProcessor.processEntry(entry);
                    if (success) {
                        successCount++;
                        this.errorState.consecutiveErrors = 0;
                    }
                }
                
                // Continuer la boucle même si aucune entrée n'a été traitée avec succès
                setTimeout(() => this.loopKudos(), this.config.retryDelay);
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur dans la boucle de traitement:", error);
                this.handleError(error);
                
                // Continuer la boucle même en cas d'erreur
                setTimeout(() => this.loopKudos(), this.config.retryDelay);
            }
        },

        /**
         * Reprend le traitement après une pause
         */
        resume() {
            console.log("[Strava Auto Kudos] Reprise du traitement");
            try {
                // Réinitialiser l'état de pause via StateManager
                if (typeof StateManager.resume === 'function') {
                    StateManager.resume();
                } else {
                    // Fallback si resume n'existe pas
                    StateManager.state.pauseUntil = null;
                    StateManager.saveStateImmediate();
                }
                
                // Réinitialiser les compteurs d'erreurs
                this.errorState.consecutiveErrors = 0;
                this.errorState.errorHistory = [];
                
                // Redémarrer le traitement
                this.startProcessing();
                
                console.log("[Strava Auto Kudos] Reprise du traitement effectuée avec succès");
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la reprise du traitement:", error);
                this.handleError(error, 'resume');
            }
        }
    };
    console.log("[Strava Auto Kudos] Module KudosManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.KudosManager;
}
