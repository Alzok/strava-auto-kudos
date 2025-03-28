/**
 * Module de gestion des interactions DOM
 * @module DOMManager
 */
console.log("[Strava Auto Kudos] Initialisation du module DOMManager");

// Vérifier si DOMManager est déjà défini
if (typeof window.DOMManager === 'undefined') {
    window.DOMManager = {
        /**
         * Sélecteurs CSS pour les éléments de l'interface
         * @type {Object}
         * @description
         * - feedContainer: Conteneur principal du flux d'activités Strava
         * - feedEntry: Entrée individuelle dans le flux d'activités
         * - kudosButton: Bouton pour donner un kudos à une activité
         * - filledKudos: Indicateur visuel d'un kudos déjà donné
         * - counter: Compteur de kudos donnés
         * - bubble: Conteneur de la bulle d'assistant
         * - container: Conteneur principal de l'extension
         */
        selectors: CONFIG.selectors,

        /**
         * Classes CSS pour les éléments de l'interface
         * @type {Object}
         */
        classes: CONFIG.classes,

        /**
         * Configuration des performances
         * @type {Object}
         */
        performance: {
            maxRetries: 3,
            retryDelay: 1000,
            mutationThreshold: 1000, // ms
            selectorCache: new Map(),
            selectorCacheTimeout: 5000, // ms
            maxSelectorCacheSize: 100,
            performanceThresholds: {
                queryTime: 100, // ms
                mutationTime: 200, // ms
                errorRate: 0.2 // 20%
            }
        },

        /**
         * État des performances
         * @type {Object}
         */
        performanceState: {
            queryCount: 0,
            mutationCount: 0,
            errorCount: 0,
            totalQueryTime: 0,
            totalMutationTime: 0,
            lastOptimization: 0,
            optimizationInterval: 60000, // 1 minute
            history: [],
            maxHistorySize: 100
        },

        /**
         * Observateur de mutations
         * @type {MutationObserver|null}
         */
        mutationObserver: null,

        /**
         * Cache des éléments
         * @type {Map}
         */
        elementCache: new Map(),

        /**
         * Initialise le gestionnaire DOM
         */
        init() {
            this.setupMutationObserver();
            this.startPerformanceMonitoring();
        },

        /**
         * Configure l'observateur de mutations
         */
        setupMutationObserver() {
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }

            this.mutationObserver = new MutationObserver(this.handleMutations.bind(this));
            
            const config = {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            };

            const feedContainer = this.getFeedContainer();
            if (feedContainer) {
                this.mutationObserver.observe(feedContainer, config);
            }
        },

        /**
         * Gère les mutations du DOM
         * @param {MutationRecord[]} mutations - Les mutations observées
         */
        handleMutations(mutations) {
            const startTime = Date.now();
            
            try {
                mutations.forEach(mutation => {
                    this.performanceState.mutationCount++;
                    
                    // Vérifier les changements dans les entrées
                    if (mutation.type === 'childList') {
                        this.handleEntryChanges(mutation);
                    }
                    
                    // Vérifier les changements dans les boutons kudos
                    if (mutation.type === 'attributes' && mutation.target.matches(this.selectors.kudosButton)) {
                        this.handleKudosButtonChange(mutation);
                    }
                });

                // Mettre à jour les statistiques
                const processingTime = Date.now() - startTime;
                this.performanceState.totalMutationTime += processingTime;
                
                this.performanceState.history.push({
                    timestamp: Date.now(),
                    type: 'mutation',
                    count: mutations.length,
                    processingTime
                });

                // Nettoyer l'historique si nécessaire
                if (this.performanceState.history.length > this.performanceState.maxHistorySize) {
                    this.performanceState.history.shift();
                }

                // Optimiser si nécessaire
                if (Date.now() - this.performanceState.lastOptimization > this.performanceState.optimizationInterval) {
                    this.optimize();
                }
            } catch (error) {
                this.handleError(error, 'mutation handling');
            }
        },

        /**
         * Gère les changements dans les entrées
         * @param {MutationRecord} mutation - La mutation à traiter
         */
        handleEntryChanges(mutation) {
            const addedNodes = Array.from(mutation.addedNodes)
                .filter(node => node.nodeType === 1 && node.matches(this.selectors.feedEntry));
            
            const removedNodes = Array.from(mutation.removedNodes)
                .filter(node => node.nodeType === 1 && node.matches(this.selectors.feedEntry));

            if (addedNodes.length > 0) {
                this.handleNewEntries(addedNodes);
            }

            if (removedNodes.length > 0) {
                this.handleRemovedEntries(removedNodes);
            }
        },

        /**
         * Gère les nouvelles entrées
         * @param {Element[]} entries - Les nouvelles entrées
         */
        handleNewEntries(entries) {
            entries.forEach(entry => {
                const entryId = EntryProcessor.generateEntryId(entry);
                if (!StateManager.hasProcessed(entryId)) {
                    this.elementCache.set(entryId, {
                        element: entry,
                        timestamp: Date.now()
                    });
                }
            });
        },

        /**
         * Gère les entrées supprimées
         * @param {Element[]} entries - Les entrées supprimées
         */
        handleRemovedEntries(entries) {
            entries.forEach(entry => {
                const entryId = EntryProcessor.generateEntryId(entry);
                this.elementCache.delete(entryId);
            });
        },

        /**
         * Gère les changements dans les boutons kudos
         * @param {MutationRecord} mutation - La mutation à traiter
         */
        handleKudosButtonChange(mutation) {
            const button = mutation.target;
            const entry = button.closest(this.selectors.feedEntry);
            if (entry) {
                const entryId = EntryProcessor.generateEntryId(entry);
                const cachedEntry = this.elementCache.get(entryId);
                if (cachedEntry) {
                    cachedEntry.element = entry;
                    cachedEntry.timestamp = Date.now();
                }
            }
        },

        /**
         * Démarre le monitoring des performances
         */
        startPerformanceMonitoring() {
            setInterval(() => {
                this.optimize();
            }, this.performanceState.optimizationInterval);
        },

        /**
         * Optimise les performances
         */
        optimize() {
            const now = Date.now();
            if (now - this.performanceState.lastOptimization < this.performanceState.optimizationInterval) {
                return;
            }

            this.performanceState.lastOptimization = now;

            // Calculer les métriques
            const avgQueryTime = this.performanceState.totalQueryTime / this.performanceState.queryCount;
            const avgMutationTime = this.performanceState.totalMutationTime / this.performanceState.mutationCount;
            const errorRate = this.performanceState.errorCount / (this.performanceState.queryCount + this.performanceState.mutationCount);

            // Ajuster les seuils si nécessaire
            if (avgQueryTime > this.performance.performanceThresholds.queryTime) {
                this.performance.performanceThresholds.queryTime *= 1.2;
                Logger.warn('Seuil de temps de requête augmenté:', this.performance.performanceThresholds.queryTime);
            }

            if (avgMutationTime > this.performance.performanceThresholds.mutationTime) {
                this.performance.performanceThresholds.mutationTime *= 1.2;
                Logger.warn('Seuil de temps de mutation augmenté:', this.performance.performanceThresholds.mutationTime);
            }

            // Nettoyer le cache si nécessaire
            this.cleanupCache();

            // Réinitialiser les compteurs
            this.performanceState.queryCount = 0;
            this.performanceState.mutationCount = 0;
            this.performanceState.totalQueryTime = 0;
            this.performanceState.totalMutationTime = 0;
        },

        /**
         * Nettoie le cache
         */
        cleanupCache() {
            const now = Date.now();
            for (const [key, value] of this.elementCache.entries()) {
                if (now - value.timestamp > this.performance.selectorCacheTimeout) {
                    this.elementCache.delete(key);
                }
            }

            // Limiter la taille du cache
            if (this.elementCache.size > this.performance.maxSelectorCacheSize) {
                const entries = Array.from(this.elementCache.entries())
                    .sort((a, b) => b[1].timestamp - a[1].timestamp);
                
                for (let i = this.performance.maxSelectorCacheSize; i < entries.length; i++) {
                    this.elementCache.delete(entries[i][0]);
                }
            }
        },

        /**
         * Gère les erreurs
         * @param {Error} error - L'erreur à gérer
         * @param {string} context - Le contexte de l'erreur
         */
        handleError(error, context) {
            this.performanceState.errorCount++;
            Logger.error(`Erreur DOM dans ${context}:`, error);
            
            // Émettre un événement d'erreur
            App.emit('domError', {
                error,
                context,
                stats: this.getPerformanceStats()
            });
        },

        /**
         * Récupère les statistiques de performance
         * @returns {Object} Les statistiques
         */
        getPerformanceStats() {
            return {
                queryCount: this.performanceState.queryCount,
                mutationCount: this.performanceState.mutationCount,
                errorCount: this.performanceState.errorCount,
                avgQueryTime: this.performanceState.totalQueryTime / this.performanceState.queryCount,
                avgMutationTime: this.performanceState.totalMutationTime / this.performanceState.mutationCount,
                errorRate: this.performanceState.errorCount / (this.performanceState.queryCount + this.performanceState.mutationCount),
                cacheSize: this.elementCache.size,
                history: [...this.performanceState.history]
            };
        },

        /**
         * Récupère le conteneur du flux d'activités
         * @returns {Element|null} Le conteneur du flux ou null si non trouvé
         */
        getFeedContainer() {
            const startTime = Date.now();
            try {
                console.log("[Strava Auto Kudos] Recherche du conteneur du flux");
                
                // Essayer chaque sélecteur dans l'ordre
                const selectors = this.selectors.feedContainer.split(',').map(s => s.trim());
                let container = null;

                for (const selector of selectors) {
                    console.log(`[Strava Auto Kudos] Essai du sélecteur: ${selector}`);
                    container = document.querySelector(selector);
                    
                    if (container) {
                        console.log(`[Strava Auto Kudos] Conteneur trouvé avec le sélecteur: ${selector}`);
                        
                        // Vérifier si le conteneur est visible
                        const style = window.getComputedStyle(container);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                            console.log("[Strava Auto Kudos] Conteneur trouvé mais non visible, tentative suivante");
                            container = null;
                            continue;
                        }
                        
                        // Vérifier si le conteneur a des enfants
                        if (container.hasChildNodes()) {
                            console.log("[Strava Auto Kudos] Conteneur valide trouvé");
                            break;
                        }
                        
                        console.log("[Strava Auto Kudos] Conteneur trouvé mais sans enfants, tentative suivante");
                        container = null;
                    }
                }

                if (!container) {
                    console.warn("[Strava Auto Kudos] Conteneur du flux non trouvé");
                    // Afficher le HTML actuel pour le débogage
                    console.log("[Strava Auto Kudos] HTML actuel:", document.body.innerHTML);
                    return null;
                }

                const processingTime = Date.now() - startTime;
                this.performanceState.queryCount++;
                this.performanceState.totalQueryTime += processingTime;

                return container;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la recherche du conteneur du flux:", error);
                return null;
            }
        },

        /**
         * Récupère toutes les entrées du flux
         * @returns {NodeList} Liste des entrées du flux
         */
        getFeedEntries() {
            const startTime = Date.now();
            try {
                console.log("[Strava Auto Kudos] Recherche des entrées du flux");
                
                // Essayer chaque sélecteur individuellement
                const selectors = this.selectors.feedEntry.split(',').map(s => s.trim());
                let entries = null;
                
                for (const selector of selectors) {
                    console.log(`[Strava Auto Kudos] Essai du sélecteur: ${selector}`);
                    const foundEntries = document.querySelectorAll(selector);
                    
                    if (foundEntries.length > 0) {
                        console.log(`[Strava Auto Kudos] ${foundEntries.length} entrées trouvées avec le sélecteur: ${selector}`);
                        entries = foundEntries;
                        break;
                    }
                }
                
                if (!entries || entries.length === 0) {
                    console.log("[Strava Auto Kudos] Aucune entrée trouvée");
                    return document.querySelectorAll('*'); // Retourner une NodeList vide
                }

                const processingTime = Date.now() - startTime;
                this.performanceState.queryCount++;
                this.performanceState.totalQueryTime += processingTime;

                return entries;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la recherche des entrées:", error);
                // En cas d'erreur, retourner une NodeList vide
                return document.querySelectorAll('div[data-testid="web-feed-entry"]');
            }
        },

        /**
         * Récupère le bouton kudos d'une entrée
         * @param {Element} entry - L'entrée à analyser
         * @returns {Element|null} Le bouton kudos ou null
         */
        getKudosButton(entry) {
            console.log("[Strava Auto Kudos] Recherche du bouton kudos dans l'entrée");
            const kudosButton = entry.querySelector('button[data-testid="kudos_button"]');
            
            if (kudosButton) {
                console.log("[Strava Auto Kudos] Bouton kudos trouvé");
                console.log("[Strava Auto Kudos] Classes du bouton:", kudosButton.className);
                console.log("[Strava Auto Kudos] Attributs du bouton:", {
                    disabled: kudosButton.disabled,
                    title: kudosButton.getAttribute('title'),
                    dataTestId: kudosButton.getAttribute('data-testid')
                });
            } else {
                console.log("[Strava Auto Kudos] Aucun bouton kudos trouvé dans l'entrée");
            }
            
            return kudosButton;
        },

        /**
         * Vérifie si le kudos a déjà été donné
         * @param {Element} kudosButton - Le bouton kudos
         * @returns {boolean} true si le kudos a déjà été donné
         */
        isKudosFilled(kudosButton) {
            if (!kudosButton) {
                console.log("[Strava Auto Kudos] Pas de bouton kudos à vérifier");
                return false;
            }

            // Vérifier si l'icône est remplie
            const filledKudos = kudosButton.querySelector('svg[data-testid="filled_kudos"]');
            if (filledKudos) {
                console.log("[Strava Auto Kudos] Kudos déjà donné (icône remplie trouvée)");
                return true;
            }

            // Vérifier si le titre indique que les kudos ont été donnés
            const title = kudosButton.getAttribute('title');
            if (title && title.includes("Afficher tous les kudos")) {
                console.log("[Strava Auto Kudos] Kudos déjà donné (titre mis à jour)");
                return true;
            }

            console.log("[Strava Auto Kudos] Kudos non donné");
            return false;
        },

        /**
         * Récupère l'élément compteur de kudos
         * @returns {Element|null} L'élément compteur ou null si non trouvé
         * @throws {Error} Si l'élément est trouvé mais invalide
         */
        getKudosCounter() {
            console.log("[Strava Auto Kudos] Recherche du compteur de kudos");
            const counter = document.querySelector(this.selectors.counter);
            if (!counter) {
                console.log("[Strava Auto Kudos] Compteur de kudos non trouvé");
                return null;
            }
            console.log("[Strava Auto Kudos] Compteur de kudos trouvé");
            return counter;
        },

        /**
         * Met à jour le compteur de kudos
         * @param {number} count - Le nouveau nombre de kudos
         * @throws {Error} Si le compteur n'est pas trouvé
         */
        updateKudosCounter(count) {
            const counter = this.getKudosCounter();
            if (!counter) {
                throw new Error('Compteur de kudos non trouvé pour la mise à jour');
            }
            counter.textContent = count > 999 ? '999+' : count.toString();
        },

        /**
         * Récupère la bulle d'assistant
         * @returns {Element|null} La bulle d'assistant ou null si non trouvée
         * @throws {Error} Si l'élément est trouvé mais invalide
         */
        getBubble() {
            const bubble = document.querySelector(`#${this.classes.bulle}`);
            if (!bubble) {
                Logger.warn('Bulle d\'assistant non trouvée');
            }
            return bubble;
        },

        /**
         * Récupère le conteneur principal
         * @returns {HTMLElement|null} Le conteneur principal
         */
        getContainer() {
            console.log("[Strava Auto Kudos] Recherche du conteneur principal");
            const container = document.querySelector(this.selectors.container);
            if (!container) {
                console.log("[Strava Auto Kudos] Conteneur principal non trouvé");
                return null;
            }
            console.log("[Strava Auto Kudos] Conteneur principal trouvé");
            return container;
        },

        /**
         * Vérifie si un élément existe dans le DOM
         * @param {string} selector - Le sélecteur CSS
         * @returns {boolean} true si l'élément existe
         */
        exists(selector) {
            const element = document.querySelector(selector);
            if (!element) {
                Logger.warn(`Élément non trouvé pour le sélecteur: ${selector}`);
            }
            return element !== null;
        },

        /**
         * Attend qu'un élément soit présent dans le DOM
         * @param {string} selector - Le sélecteur CSS
         * @param {number} timeout - Le timeout en ms
         * @returns {Promise<Element>} L'élément trouvé
         * @throws {Error} Si l'élément n'est pas trouvé dans le délai imparti
         */
        waitForElement(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                
                const checkElement = () => {
                    const element = document.querySelector(selector);
                    if (element) {
                        Logger.debug(`Élément trouvé pour le sélecteur: ${selector}`);
                        resolve(element);
                        return;
                    }
                    
                    if (Date.now() - startTime >= timeout) {
                        const error = new Error(`Timeout waiting for element: ${selector}`);
                        Logger.error(error.message);
                        reject(error);
                        return;
                    }
                    
                    requestAnimationFrame(checkElement);
                };
                
                checkElement();
            });
        },

        /**
         * Récupère tous les boutons kudos non activés
         * @returns {NodeList} Liste des boutons kudos non activés
         */
        getUngivenKudosButtons() {
            const allKudosButtons = document.querySelectorAll(this.selectors.kudosButton);
            return Array.from(allKudosButtons).filter(button => !button.classList.contains('activated'));
        },

        /**
         * Vérifie si un élément est visible dans le viewport
         * @param {HTMLElement} element - L'élément à vérifier
         * @returns {boolean} true si l'élément est visible
         */
        isElementInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },

        /**
         * Crée un élément DOM avec des attributs
         * @param {string} tag - Tag HTML de l'élément
         * @param {Object} attributes - Attributs à ajouter
         * @returns {HTMLElement} L'élément créé
         */
        createElement(tag, attributes = {}) {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            return element;
        },

        /**
         * Ajoute un élément au DOM
         * @param {HTMLElement} parent - Élément parent
         * @param {HTMLElement} child - Élément à ajouter
         */
        appendChild(parent, child) {
            if (parent && child) {
                parent.appendChild(child);
            }
        },

        /**
         * Supprime un élément du DOM
         * @param {HTMLElement} element - Élément à supprimer
         */
        removeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    };

    console.log("[Strava Auto Kudos] Module DOMManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.DOMManager;
} 