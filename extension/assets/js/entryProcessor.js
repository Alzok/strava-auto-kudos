/**
 * Module de traitement des entrées du flux
 * @module EntryProcessor
 */
console.log("[Strava Auto Kudos] EntryProcessor module loading");

// Créer le module EntryProcessor
const EntryProcessor = {
    /**
     * Configuration du processeur d'entrées
     * @type {Object}
     */
    config: {
        maxRetries: 3,
        retryDelay: 1000,
        validation: {
            maxContentLength: 1000,
            requiredAttributes: ['data-activity-id', 'data-testid'],
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
            requiredSelectors: ['.entry-content', '.kudos-button'],
            maxNestedLevel: 10,
            contentTypes: ['activity', 'challenge', 'group']
        }
    },

    /**
     * Compteur global pour la génération d'ID unique
     * @type {number}
     * @private
     */
    _idCounter: 0,

    /**
     * Initialise le processeur d'entrées
     */
    init() {
        Logger.info('EntryProcessor initialisé');
    },

    /**
     * Traite un bouton kudos
     * @param {Element} button - Le bouton kudos à traiter
     * @returns {Promise<boolean>} true si le traitement a réussi
     */
    async processEntry(button) {
        console.log("[Strava Auto Kudos] Début du traitement d'un bouton kudos");
        try {
            // Vérifier si l'extension est active et non en pause
            if (!StateManager.isEnabled() || StateManager.isPaused()) {
                console.log("[Strava Auto Kudos] Extension inactive ou en pause");
                return false;
            }

            // Vérifier si le bouton est valide
            if (!this.isButtonClickable(button)) {
                console.log("[Strava Auto Kudos] Bouton non cliquable");
                return false;
            }

            try {
                // Attendre un délai aléatoire entre les kudos
                const delays = StateManager.getDelays();
                const delay = Math.floor(Math.random() * (delays.max - delays.min + 1)) + delays.min;
                await new Promise(resolve => setTimeout(resolve, delay));

                // Cliquer sur le bouton
                await DOMManager.clickElement(button);
                console.log("[Strava Auto Kudos] Clic sur le bouton kudos");
                
                // Attendre la confirmation du kudos
                const confirmed = await this.waitForKudosConfirmation(button);
                if (!confirmed) {
                    console.log("[Strava Auto Kudos] Échec de la confirmation du kudos");
                    return false;
                }
                
                console.log("[Strava Auto Kudos] Kudos confirmé");
                
                // Incrémenter le compteur de kudos
                StateManager.incrementKudosCount();
                
                return true;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors du clic sur le bouton:", error);
                
                // Gérer les erreurs spécifiques
                if (this.isNetworkError(error)) {
                    await this.handleNetworkError();
                } else if (this.isStravaError(error)) {
                    await this.handleStravaError();
                }
                
                return false;
            }
        } catch (error) {
            console.error("[Strava Auto Kudos] Erreur lors du traitement du bouton:", error);
            return false;
        }
    },

    /**
     * Vérifie si une erreur est une erreur réseau
     * @param {Error} error - L'erreur à vérifier
     * @returns {boolean} true si c'est une erreur réseau
     */
    isNetworkError(error) {
        return error.message.includes('network') || 
               error.message.includes('timeout') ||
               error.message.includes('failed to fetch');
    },

    /**
     * Vérifie si une erreur est une erreur Strava
     * @param {Error} error - L'erreur à vérifier
     * @returns {boolean} true si c'est une erreur Strava
     */
    isStravaError(error) {
        return error.message.includes('Strava') ||
               error.message.includes('rate limit') ||
               error.message.includes('unauthorized');
    },

    /**
     * Gère une erreur réseau
     */
    async handleNetworkError() {
        Logger.warn('Erreur réseau détectée, pause temporaire');
        await StateManager.pause(10000); // Pause de 10 secondes
    },

    /**
     * Gère une erreur Strava
     */
    async handleStravaError() {
        Logger.warn('Erreur Strava détectée, pause prolongée');
        await StateManager.pause(30000); // Pause de 30 secondes
    },

    /**
     * Valide une entrée
     * @param {Element} entry - L'élément à valider
     * @returns {Object} Résultat de la validation
     */
    validateEntry(entry) {
        console.log("[Strava Auto Kudos] Début de la validation d'une entrée");
        
        // Log de la structure de l'entrée
        console.log("[Strava Auto Kudos] Structure de l'entrée:", {
            classes: entry.className,
            attributes: Array.from(entry.attributes).map(attr => `${attr.name}="${attr.value}"`),
            dataTestId: entry.getAttribute('data-testid'),
            innerHTML: entry.innerHTML.substring(0, 200) + '...' // Limité pour éviter les logs trop longs
        });

        // Vérifier que c'est une entrée d'activité valide
        const isActivityEntry = entry.classList.contains('feed-entry') || 
                              entry.classList.contains('web-feed-entry') ||
                              entry.classList.contains('activity-entry') ||
                              entry.getAttribute('data-testid')?.includes('feed-entry') ||
                              entry.getAttribute('data-testid')?.includes('activity-entry') ||
                              entry.querySelector('[data-testid="activity-entry"]') ||
                              entry.querySelector('.activity-entry') ||
                              entry.querySelector('.feed-entry') ||
                              entry.querySelector('.web-feed-entry');

        if (!isActivityEntry) {
            console.log("[Strava Auto Kudos] Entrée non reconnue comme activité");
            return {
                isValid: false,
                reason: 'NOT_AN_ACTIVITY_ENTRY'
            };
        }

        // Vérifier la structure de base
        const basicStructureCheck = this.validateBasicStructure(entry);
        if (!basicStructureCheck) {
            return {
                isValid: false,
                reason: 'INVALID_STRUCTURE'
            };
        }

        // Vérifier les attributs requis
        const attributeCheck = this.validateAttributes(entry);
        if (!attributeCheck.isValid) {
            return attributeCheck;
        }

        // Vérifier le contenu
        const contentCheck = this.validateContent(entry);
        if (!contentCheck.isValid) {
            return contentCheck;
        }

        // Vérifier l'âge
        const ageCheck = this.validateAge(entry);
        if (!ageCheck.isValid) {
            return ageCheck;
        }

        // Vérifier le bouton kudos
        const kudosCheck = this.validateKudosButton(entry);
        if (!kudosCheck.isValid) {
            return kudosCheck;
        }

        return {
            isValid: true,
            reason: null
        };
    },

    /**
     * Vérifie la structure de base d'une entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {boolean} true si la structure est valide
     */
    validateBasicStructure(entry) {
        if (!entry || !entry.nodeType || entry.nodeType !== 1) {
            return false;
        }

        let depth = 0;
        let current = entry;
        while (current.parentElement && depth < this.config.validation.maxNestedLevel) {
            current = current.parentElement;
            depth++;
        }
        return depth <= this.config.validation.maxNestedLevel;
    },

    /**
     * Vérifie les attributs requis
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateAttributes(entry) {
        const result = { isValid: true, reason: null };
        
        // Vérifier d'abord si l'ID d'activité est présent dans l'URL
        const activityUrl = entry.querySelector('a[href*="/activities/"]')?.href;
        if (activityUrl) {
            const urlId = activityUrl.match(/\/activities\/(\d+)/)?.[1];
            if (urlId) {
                return result;
            }
        }

        // Si pas d'ID dans l'URL, vérifier les attributs requis
        for (const attr of this.config.validation.requiredAttributes) {
            if (!entry.hasAttribute(attr)) {
                result.isValid = false;
                result.reason = 'MISSING_ATTRIBUTE';
                break;
            }
        }

        return result;
    },

    /**
     * Vérifie le contenu de l'entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateContent(entry) {
        const result = { isValid: true, reason: null };
        
        // Vérifier si l'entrée contient un bouton kudos
        const kudosButton = entry.querySelector('button[data-testid="kudos_button"]') || 
                          entry.querySelector('.kudos-button') ||
                          entry.querySelector('button[title*="kudos"]') ||
                          entry.querySelector('button[aria-label*="kudos"]');
        
        if (!kudosButton) {
            result.isValid = false;
            result.reason = 'NO_KUDOS_BUTTON';
            return result;
        }

        const content = entry.textContent || '';
        if (content.length > this.config.validation.maxContentLength) {
            result.isValid = false;
            result.reason = 'CONTENT_TOO_LONG';
            return result;
        }

        return result;
    },

    /**
     * Vérifie l'âge de l'entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateAge(entry) {
        const result = { isValid: true, reason: null };
        
        const timestamp = entry.getAttribute('data-timestamp');
        if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age > this.config.validation.maxAge) {
                result.isValid = false;
                result.reason = 'ENTRY_TOO_OLD';
            }
        }

        return result;
    },

    /**
     * Vérifie le bouton kudos
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateKudosButton(entry) {
        const kudosButton = entry.querySelector('button[data-testid="kudos_button"]') || 
                          entry.querySelector('.kudos-button') ||
                          entry.querySelector('button[title*="kudos"]') ||
                          entry.querySelector('button[aria-label*="kudos"]');
        
        if (!kudosButton) {
            return {
                isValid: false,
                reason: 'NO_KUDOS_BUTTON'
            };
        }

        // Vérifier si le bouton est déjà kudosé
        const filledKudos = kudosButton.querySelector('svg[data-testid="filled_kudos"]') ||
                          kudosButton.querySelector('.filled-kudos') ||
                          kudosButton.querySelector('.kudos-filled');
        if (filledKudos) {
            return {
                isValid: false,
                reason: 'KUDOS_ALREADY_GIVEN'
            };
        }

        // Vérifier si le bouton est cliquable
        if (!this.isButtonClickable(kudosButton)) {
            return {
                isValid: false,
                reason: 'BUTTON_NOT_CLICKABLE'
            };
        }

        return {
            isValid: true,
            reason: null
        };
    },

    /**
     * Vérifie si un bouton est cliquable
     * @param {Element} button - Le bouton à vérifier
     * @returns {boolean} true si le bouton est cliquable
     */
    isButtonClickable(button) {
        if (!button) {
            return false;
        }
        
        const style = window.getComputedStyle(button);
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0') {
            return false;
        }

        if (button.disabled || button.classList.contains('disabled')) {
            return false;
        }

        return true;
    },

    /**
     * Attend la confirmation du kudos avec MutationObserver et fallback timeout
     * @param {Element} button - Le bouton à vérifier
     * @returns {Promise<boolean>} true si le kudos est confirmé
     */
    async waitForKudosConfirmation(button) {
        const timeout = 5000; // Timeout de sécurité (5 secondes)
        
        if (!button) {
            return false;
        }
        
        return new Promise((resolve) => {
            let timeoutId = null;
            let observer = null;
            
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            };
            
            const checkConfirmation = () => {
                const filledKudos = button.querySelector('svg[data-testid="filled_kudos"]') ||
                                  button.querySelector('.filled-kudos') ||
                                  button.querySelector('.kudos-filled');
                if (filledKudos) {
                    cleanup();
                    resolve(true);
                    return true;
                }

                const title = button.getAttribute('title') || button.getAttribute('aria-label');
                if (title && (title.includes("Afficher tous les kudos") || title.includes("Show all kudos"))) {
                    cleanup();
                    resolve(true);
                    return true;
                }
                
                const disabled = button.disabled || button.classList.contains('disabled');
                if (disabled) {
                    cleanup();
                    resolve(true);
                    return true;
                }
                
                return false;
            };
            
            if (checkConfirmation()) {
                return;
            }
            
            observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' || 
                        (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
                        if (checkConfirmation()) {
                            return;
                        }
                    }
                }
            });
            
            observer.observe(button, {
                attributes: true,
                attributeFilter: ['title', 'class', 'disabled', 'aria-label'],
                childList: true,
                subtree: true
            });
            
            timeoutId = setTimeout(() => {
                if (!checkConfirmation()) {
                    cleanup();
                    resolve(true);
                }
            }, timeout);
        });
    }
};

// Exposer le module de manière sécurisée
(function() {
    if (typeof window !== 'undefined') {
        window.EntryProcessor = EntryProcessor;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EntryProcessor;
    }
})(); 