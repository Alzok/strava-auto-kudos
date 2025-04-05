/**
 * Module de gestion de l'état de l'extension
 * @module StateManager
 */
console.log("[Strava Auto Kudos] StateManager module loading");

// Vérifier si StateManager est déjà défini
if (typeof window.StateManager === 'undefined') {
    window.StateManager = {
        /**
         * État de l'extension
         * @type {Object}
         */
        state: {
            enabled: false,
            kudosCount: 0,
            processedEntries: new Set(),
            pauseUntil: null,
            errors: [],
            maxErrors: window.CONFIG.limits.maxErrors || 5,
            lastSync: null,
            delays: {
                min: 100,
                max: 200
            },
            kudosAttempts: 0,
            kudosSuccesses: 0,
            kudosErrors: 0,
            errorCount: 0,
            isProcessing: false,
            maxProcessedEntries: 1000
        },

        /**
         * Timer pour le debounce de saveState
         * @type {number|null}
         * @private
         */
        _saveStateTimer: null,

        /**
         * Délai pour le debounce de saveState en ms
         * @type {number}
         * @private
         */
        _saveStateDelay: 500,

        /**
         * Indique si une sauvegarde est en attente
         * @type {boolean}
         * @private
         */
        _saveStatePending: false,

        /**
         * Initialise le gestionnaire d'état
         */
        init() {
            console.log("[Strava Auto Kudos] Initialisation du StateManager");
            
            // Réinitialiser l'état aux valeurs par défaut
            this.resetToDefaults();
            
            // Charger l'état sauvegardé
            this.loadState();
            
            // Réinitialiser le compteur de kudos à 0
            this.state.kudosCount = 0;
            
            // Configurer l'écouteur de changements
            this.setupStorageListener();
            
            // Démarrer le nettoyage périodique
            this.startPeriodicCleanup();

            console.log("[Strava Auto Kudos] StateManager initialisé:", this.state);
        },

        /**
         * Réinitialise l'état aux valeurs par défaut
         * @private
         */
        resetToDefaults() {
            this.state = {
                enabled: false,
                kudosCount: 0,
                processedEntries: new Set(),
                pauseUntil: null,
                errors: [],
                maxErrors: window.CONFIG.limits.maxErrors || 5,
                lastSync: null,
                delays: {
                    min: 100,
                    max: 200
                },
                kudosAttempts: 0,
                kudosSuccesses: 0,
                kudosErrors: 0,
                errorCount: 0,
                isProcessing: false,
                maxProcessedEntries: 1000
            };
        },

        /**
         * Charge l'état depuis le stockage local
         */
        loadState() {
            if (!Storage.isAvailable()) {
                console.error("[Strava Auto Kudos] Le stockage local n'est pas disponible");
                return;
            }

            try {
                const savedState = Storage.get('state');
                if (savedState) {
                    // Préserver le compteur de kudos actuel
                    const currentKudosCount = this.state.kudosCount;
                    
                    // Charger l'état complet
                    if (savedState.processedEntries) {
                        // Convertir le tableau en Set pour processedEntries
                        savedState.processedEntries = new Set(savedState.processedEntries);
                    }
                    
                    // Fusionner avec l'état actuel
                    this.state = {
                        ...this.resetToDefaults(), // Valeurs par défaut
                        ...savedState,             // Valeurs sauvegardées
                        kudosCount: currentKudosCount // Préserver le compteur actuel
                    };
                    
                    console.log("[Strava Auto Kudos] État chargé:", this.state);
                } else {
                    console.log("[Strava Auto Kudos] Aucun état sauvegardé trouvé");
                }
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors du chargement de l'état:", error);
            }
        },

        /**
         * Configure l'écouteur de changements du stockage
         */
        setupStorageListener() {
            window.addEventListener('storage', (event) => {
                if (event.key === 'state') {
                    this.loadState();
                }
            });
        },

        /**
         * Démarre le nettoyage périodique des entrées traitées
         */
        startPeriodicCleanup() {
            setInterval(() => {
                this.cleanupProcessedEntries();
            }, window.CONFIG.delays.cleanup || 3600000); // Par défaut: 1 heure
        },

        /**
         * Nettoie les entrées traitées anciennes
         */
        cleanupProcessedEntries() {
            const maxEntries = window.CONFIG.limits.maxEntries || 1000;
            if (this.state.processedEntries.size > maxEntries) {
                const entries = Array.from(this.state.processedEntries);
                const toRemove = entries.slice(0, entries.length - maxEntries);
                toRemove.forEach(entry => {
                    this.state.processedEntries.delete(entry);
                });
                this.saveState();
            }
        },

        /**
         * Sauvegarde l'état dans le stockage local avec debounce
         */
        saveState() {
            // Marquer qu'une sauvegarde est en attente
            this._saveStatePending = true;
            
            // Annuler le timer existant s'il y en a un
            if (this._saveStateTimer) {
                clearTimeout(this._saveStateTimer);
            }
            
            // Créer un nouveau timer
            this._saveStateTimer = setTimeout(() => {
                this._actualSaveState();
                this._saveStatePending = false;
                this._saveStateTimer = null;
            }, this._saveStateDelay);
        },
        
        /**
         * Sauvegarde immédiate de l'état (sans debounce)
         */
        saveStateImmediate() {
            // Annuler le timer existant s'il y en a un
            if (this._saveStateTimer) {
                clearTimeout(this._saveStateTimer);
                this._saveStateTimer = null;
            }
            
            this._actualSaveState();
            this._saveStatePending = false;
        },
        
        /**
         * Implémentation réelle de la sauvegarde
         * @private
         */
        _actualSaveState() {
            if (!Storage.isAvailable()) {
                console.error("[Strava Auto Kudos] Le stockage local n'est pas disponible");
                this._tryAlternativeStorage();
                return;
            }
            
            try {
                // Créer une copie de l'état avec processedEntries converti en array
                const stateToSave = {
                    ...this.state,
                    processedEntries: Array.from(this.state.processedEntries),
                    lastSync: Date.now()
                };
                
                Storage.set('state', stateToSave);
                console.log("[Strava Auto Kudos] État sauvegardé");
                
                // Backup dans sessionStorage pour récupération en cas de problème
                try {
                    sessionStorage.setItem('state_backup', JSON.stringify(stateToSave));
                } catch (e) {
                    console.warn("[Strava Auto Kudos] Impossible de sauvegarder dans sessionStorage:", e);
                }
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la sauvegarde de l'état:", error);
                
                // Tentative de récupération
                try {
                    // Vérifier si l'erreur est due à la taille du stockage
                    const compressedState = JSON.stringify({
                        ...this.state,
                        // Ne garder que les entrées récentes (dernières 24h)
                        processedEntries: Array.from(this.state.processedEntries).slice(-100),
                        lastSync: Date.now()
                    });
                    
                    if (compressedState.length > 5242880) { // ~5MB limite de localStorage
                        console.warn("[Strava Auto Kudos] État trop volumineux, réduction de la taille");
                        // Réduire davantage si nécessaire
                        this.resetProcessedEntries();
                        this.saveState();
                    } else {
                        // Essayer de sauvegarder l'état compressé
                        Storage.set('state', JSON.parse(compressedState));
                        console.log("[Strava Auto Kudos] État sauvegardé (version compressée)");
                    }
                } catch (compressError) {
                    console.error("[Strava Auto Kudos] Erreur lors de la compression de l'état:", compressError);
                    this._tryAlternativeStorage();
                }
            }
        },
        
        /**
         * Tente d'utiliser des méthodes de stockage alternatives en cas d'échec
         * @private
         */
        _tryAlternativeStorage() {
            console.log("[Strava Auto Kudos] Tentative de stockage alternatif");
            
            try {
                // 1. Essayer sessionStorage (temporaire mais plus grand que localStorage)
                const minimalState = {
                    enabled: this.state.enabled,
                    kudosCount: this.state.kudosCount,
                    lastSync: Date.now()
                };
                
                sessionStorage.setItem('strava_auto_kudos_state', JSON.stringify(minimalState));
                console.log("[Strava Auto Kudos] État minimal sauvegardé dans sessionStorage");
                
                // 2. Rappeler que les données peuvent être perdues
                console.warn("[Strava Auto Kudos] Les données complètes n'ont pas pu être sauvegardées et pourraient être perdues à la fermeture du navigateur");
                
            } catch (error) {
                console.error("[Strava Auto Kudos] Échec de toutes les tentatives de sauvegarde:", error);
            }
        },

        /**
         * Active ou désactive l'extension
         * @param {boolean} enabled - Nouvel état
         */
        setEnabled(enabled) {
            this.state.enabled = enabled;
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
            console.log(`[Strava Auto Kudos] Extension ${enabled ? 'activée' : 'désactivée'}`);
        },

        /**
         * Vérifie si l'extension est activée
         * @returns {boolean} État d'activation
         */
        isEnabled() {
            return this.state.enabled;
        },

        /**
         * Incrémente le compteur de kudos
         */
        incrementKudosCount() {
            if (!this.state.enabled || this.isPaused()) {
                console.log("[Strava Auto Kudos] Extension désactivée ou en pause, pas d'incrémentation du compteur");
                return;
            }
            this.state.kudosCount++;
            this.saveState(); // Utilise le debounce
            console.log("[Strava Auto Kudos] Compteur de kudos incrémenté:", this.state.kudosCount);
            
            // Émettre un événement pour informer l'interface de la mise à jour
            if (window.App && typeof window.App.emit === 'function') {
                window.App.emit('kudosAdded', this.state.kudosCount);
            }
        },

        /**
         * Récupère le nombre de kudos donnés
         * @returns {number} Nombre de kudos
         */
        getKudosCount() {
            return this.state.kudosCount;
        },

        /**
         * Marque une entrée comme traitée
         * @param {string} entryId - Identifiant de l'entrée
         */
        markAsProcessed(entryId) {
            this.state.processedEntries.add(entryId);
            this.saveState(); // Utilise le debounce
        },

        /**
         * Vérifie si une entrée a été traitée
         * @param {string} entryId - Identifiant de l'entrée
         * @returns {boolean} true si l'entrée a été traitée
         */
        hasProcessed(entryId) {
            return this.state.processedEntries.has(entryId);
        },

        /**
         * Met l'extension en pause
         * @param {number} duration - Durée de la pause en millisecondes
         */
        async pause(duration) {
            console.log("[Strava Auto Kudos] Extension mise en pause pour", duration, "ms");
            this.state.pauseUntil = Date.now() + duration;
            this.state.isProcessing = false;
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
        },

        /**
         * Reprend après une pause
         */
        resume() {
            console.log("[Strava Auto Kudos] Reprise après pause");
            this.state.pauseUntil = null;
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
        },

        /**
         * Vérifie si l'extension est en pause
         * @returns {boolean} true si l'extension est en pause
         */
        isPaused() {
            if (!this.state.pauseUntil) return false;
            const isPaused = Date.now() < this.state.pauseUntil;
            if (!isPaused) {
                // Si la pause est terminée, réinitialiser l'état
                this.state.pauseUntil = null;
                this.saveState(); // Utilise le debounce
            }
            return isPaused;
        },

        /**
         * Gère une erreur
         * @param {Error} error - L'erreur à gérer
         * @param {string} context - Le contexte de l'erreur
         */
        handleError(error, context) {
            console.error(`[Strava Auto Kudos] Erreur dans ${context}:`, error);
            this.state.errorCount++;
            this.state.kudosErrors++;
            this.state.errors.push({
                message: error.message,
                context: context,
                timestamp: Date.now()
            });
            
            // Nettoyer les anciennes erreurs
            const oneHourAgo = Date.now() - 3600000;
            this.state.errors = this.state.errors.filter(e => e.timestamp > oneHourAgo);
            
            this.saveState(); // Utilise le debounce

            // Vérifier si on doit mettre en pause
            if (this.state.errorCount >= this.state.maxErrors) {
                this.pause(window.CONFIG.delays.pause || 30000);
            }
        },

        /**
         * Récupère les erreurs récentes
         * @returns {Array} Liste des erreurs
         */
        getErrors() {
            return [...this.state.errors];
        },

        /**
         * Réinitialise l'état
         */
        reset() {
            this.resetToDefaults();
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
            console.log("[Strava Auto Kudos] État réinitialisé");
        },

        /**
         * Récupère les délais actuels
         * @returns {Object} Les délais actuels
         */
        getDelays() {
            return this.state.delays;
        },

        /**
         * Met à jour les délais en fonction du taux de succès
         * @param {number} successRate - Le taux de succès
         */
        updateDelays(successRate) {
            const { min, max } = this.state.delays;
            const adjustment = successRate > 0.8 ? -0.1 : successRate < 0.5 ? 0.1 : 0;
            
            this.state.delays = {
                min: Math.max(100, Math.floor(min * (1 + adjustment))),
                max: Math.max(200, Math.floor(max * (1 + adjustment)))
            };
            this.saveState(); // Utilise le debounce
        },

        /**
         * Récupère les statistiques des kudos
         * @returns {Object} Les statistiques
         */
        getKudosStats() {
            return {
                total: this.state.kudosAttempts,
                success: this.state.kudosSuccesses,
                error: this.state.kudosErrors,
                successRate: this.state.kudosAttempts > 0 
                    ? this.state.kudosSuccesses / this.state.kudosAttempts 
                    : 0
            };
        },

        /**
         * Récupère le nombre de traitements pour une entrée
         * @param {string} entryId - L'ID de l'entrée
         * @returns {number} Le nombre de traitements
         */
        getProcessCount(entryId) {
            return this.state.processedEntries.get(entryId)?.count || 0;
        },

        /**
         * Vérifie si le traitement est en cours
         * @returns {boolean} true si le traitement est en cours
         */
        isProcessing() {
            return this.state.isProcessing;
        },

        /**
         * Définit l'état de traitement
         * @param {boolean} value - La valeur à définir
         */
        setProcessing(value) {
            this.state.isProcessing = value;
            this.saveState(); // Utilise le debounce
        },

        /**
         * Récupère le nombre maximum d'entrées traitées
         * @returns {number} Le nombre maximum
         */
        getMaxProcessedEntries() {
            return this.state.maxProcessedEntries;
        },

        /**
         * Incrémente le compteur d'erreurs
         */
        incrementErrorCount() {
            this.state.errorCount = (this.state.errorCount || 0) + 1;
            this.saveState(); // Utilise le debounce
        },

        /**
         * Récupère le nombre d'erreurs
         * @returns {number} Le nombre d'erreurs
         */
        getErrorCount() {
            return this.state.errorCount || 0;
        },

        /**
         * Réinitialise le compteur d'erreurs
         */
        resetErrorCount() {
            this.state.errorCount = 0;
            this.saveState(); // Utilise le debounce
        },

        /**
         * Réinitialise les entrées traitées
         */
        resetProcessedEntries() {
            console.log("[Strava Auto Kudos] Réinitialisation des entrées traitées");
            this.state.processedEntries.clear();
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
        },

        /**
         * Active l'extension
         */
        async enable() {
            console.log("[Strava Auto Kudos] Extension activée");
            this.state.enabled = true;
            this.state.pauseUntil = null; // Réinitialiser l'état de pause
            this.resetProcessedEntries(); // Réinitialiser les entrées traitées
            this.state.errorCount = 0; // Réinitialiser le compteur d'erreurs
            this.state.kudosAttempts = 0; // Réinitialiser les tentatives
            this.state.kudosSuccesses = 0; // Réinitialiser les succès
            this.state.kudosErrors = 0; // Réinitialiser les erreurs
            
            // Sauvegarder immédiatement ces changements importants
            this.saveStateImmediate();
            
            // Reprendre le traitement via KudosManager
            if (window.KudosManager) {
                console.log("[Strava Auto Kudos] Reprise du traitement via KudosManager");
                window.KudosManager.resume();
            }
            
            // Réinitialiser les observateurs
            if (window.App) {
                console.log("[Strava Auto Kudos] Réinitialisation des observateurs");
                window.App.resetComponent('observers');
            }
        },

        /**
         * Désactive l'extension
         */
        async disable() {
            console.log("[Strava Auto Kudos] Extension désactivée");
            this.state.enabled = false;
            this.state.pauseUntil = null;
            this.state.isProcessing = false;
            this.saveStateImmediate(); // Sauvegarde immédiate pour ce changement important
        }
    };

    console.log("[Strava Auto Kudos] Module StateManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.StateManager;
} 