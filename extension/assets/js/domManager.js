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
         * Cache des éléments
         * @type {Map}
         */
        elementCache: new Map(),

        /**
         * Initialise le gestionnaire DOM
         */
        init() {
            this.startPerformanceMonitoring();
            this.startElementCacheCleanup();
        },

        /**
         * Démarre le nettoyage périodique du cache d'éléments
         */
        startElementCacheCleanup() {
            // Nettoyage toutes les 5 minutes
            setInterval(() => this.cleanupElementCache(), 300000);
        },

        /**
         * Nettoie le cache des éléments DOM basé sur l'âge et la taille
         */
        cleanupElementCache() {
            const now = Date.now();
            const maxAge = 3600000; // 1 heure
            const maxSize = 200; // Nombre maximum d'entrées dans le cache
            
            console.log(`[Strava Auto Kudos] Nettoyage du cache d'éléments (taille actuelle: ${this.elementCache.size})`);
            
            // 1. Supprimer les entrées basées sur l'âge
            let entriesRemoved = 0;
            for (const [id, entry] of this.elementCache.entries()) {
                if (now - entry.timestamp > maxAge) {
                    this.elementCache.delete(id);
                    entriesRemoved++;
                }
            }
            
            // 2. Si le cache est encore trop grand, supprimer les entrées les plus anciennes
            if (this.elementCache.size > maxSize) {
                const entries = Array.from(this.elementCache.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                const entriesToRemove = entries.slice(0, this.elementCache.size - maxSize);
                entriesToRemove.forEach(([id]) => {
                    this.elementCache.delete(id);
                    entriesRemoved++;
                });
            }
            
            console.log(`[Strava Auto Kudos] Nettoyage du cache terminé (${entriesRemoved} entrées supprimées, nouvelle taille: ${this.elementCache.size})`);
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
         * Recherche les boutons kudos valides
         * @returns {Array<Element>} Les boutons kudos valides
         */
        findFeedEntries() {
            console.log("[Strava Auto Kudos] Recherche des boutons kudos");
            
            // Trouver tous les boutons kudos
            const kudosButtons = document.querySelectorAll('button[data-testid="kudos_button"], .kudos-button, button[title*="kudos"], button[aria-label*="kudos"]');
            console.log("[Strava Auto Kudos] Boutons kudos trouvés:", kudosButtons.length);
            
            // Filtrer pour ne garder que les boutons valides
            const validButtons = Array.from(kudosButtons).filter(button => {
                // Vérifier si le bouton est déjà kudosé
                const isAlreadyKudosed = button.querySelector('svg[data-testid="filled_kudos"]') ||
                                       button.querySelector('svg[fill="#fc5200"]') ||
                                       button.querySelector('svg[class*="kudoed"]') ||
                                       button.querySelector('svg[class*="filled"]') ||
                                       button.querySelector('svg[class*="active"]') ||
                                       button.querySelector('svg[class*="liked"]');
                
                // Vérifier si le bouton est cliquable
                const isClickable = this.isButtonClickable(button);
                
                return !isAlreadyKudosed && isClickable;
            });
            
            console.log("[Strava Auto Kudos] Boutons kudos valides trouvés:", validButtons.length);
            return validButtons;
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
         * @param {Element} element - L'élément à vérifier
         * @returns {boolean} true si l'élément est visible
         */
        isElementVisible(element) {
            if (!element) return false;
            
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0'
            );
        },

        /**
         * Trouve le bouton kudos dans une entrée
         * @param {Element} entry - L'entrée à analyser
         * @returns {Element|null} Le bouton kudos ou null
         */
        findKudosButton(entry) {
            if (!entry) return null;
            
            // Essayer différents sélecteurs pour trouver le bouton kudos
            const selectors = [
                'button[data-testid="kudos_button"]',
                '.kudos-button',
                'button[title*="kudos"]',
                'button[aria-label*="kudos"]',
                'button[class*="kudos"]',
                'button[class*="like"]',
                'button[class*="give-kudos"]'
            ];
            
            for (const selector of selectors) {
                const button = entry.querySelector(selector);
                if (button && this.isButtonClickable(button)) {
                    return button;
                }
            }
            
            return null;
        },

        /**
         * Vérifie si un bouton est déjà kudosé
         * @param {Element} button - Le bouton à vérifier
         * @returns {boolean} true si le bouton est déjà kudosé
         */
        isAlreadyKudosed(button) {
            if (!button) {
                console.log("[Strava Auto Kudos] Pas de bouton à vérifier");
                return false;
            }

            // Vérifier l'icône remplie avec le sélecteur le plus stable
            const filledKudos = button.querySelector('svg[data-testid="filled_kudos"]');
            if (filledKudos) {
                console.log("[Strava Auto Kudos] Kudos déjà donné (icône remplie trouvée)");
                return true;
            }

            // Vérifier le titre du bouton
            const title = button.getAttribute('title');
            if (title && title.includes("Afficher tous les kudos")) {
                console.log("[Strava Auto Kudos] Kudos déjà donné (titre mis à jour)");
                return true;
            }

            console.log("[Strava Auto Kudos] Kudos non donné");
            return false;
        },

        /**
         * Vérifie si un bouton est cliquable
         * @param {Element} button - Le bouton à vérifier
         * @returns {boolean} true si le bouton est cliquable
         */
        isButtonClickable(button) {
            if (!button) return false;
            
            const style = window.getComputedStyle(button);
            
            // Vérifier la visibilité
            if (style.display === 'none' || 
                style.visibility === 'hidden' || 
                style.opacity === '0') {
                return false;
            }
            
            // Vérifier l'état du bouton
            if (button.disabled || 
                button.classList.contains('disabled') ||
                button.getAttribute('aria-disabled') === 'true') {
                return false;
            }
            
            return true;
        },

        /**
         * Fait défiler la page jusqu'à un élément
         * @param {Element} element - L'élément à rendre visible
         * @returns {Promise<void>}
         */
        async scrollToElement(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const scrollY = window.scrollY + rect.top - 100; // 100px de marge en haut
            
            window.scrollTo({
                top: scrollY,
                behavior: 'smooth'
            });
            
            // Attendre que le défilement soit terminé
            await new Promise(resolve => setTimeout(resolve, 500));
        },

        /**
         * Clique sur un élément
         * @param {Element} element - L'élément à cliquer
         * @returns {Promise<void>}
         */
        async clickElement(element) {
            if (!element || !this.isButtonClickable(element)) {
                throw new Error('Élément non cliquable');
            }
            
            element.click();
            await new Promise(resolve => setTimeout(resolve, 100));
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