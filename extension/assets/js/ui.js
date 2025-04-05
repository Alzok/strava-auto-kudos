/**
 * Module de gestion de l'interface utilisateur
 * @module UI
 */
console.log("[Strava Auto Kudos] UI module loading");

// Vérifier si UI est déjà défini
if (typeof window.UI === 'undefined') {
    window.UI = {
        /**
         * Classes CSS utilisées
         * @type {Object}
         */
        classes: {
            container: 'strava-auto-kudos-container',
            counter: 'strava-auto-kudos-counter',
            button: 'social_assistant_button',
            dropdown: 'dropdown',
            status: 'status'
        },
        
        /**
         * Référence aux gestionnaires d'événements pour pouvoir les nettoyer
         * @type {Object}
         * @private
         */
        _eventHandlers: {
            mainButton: null,
            dropdown: null,
            dropdownOptions: [],
            kudosAdded: null
        },
        
        /**
         * Indicateur d'initialisation
         * @type {boolean}
         * @private
         */
        _isInitialized: false,

        /**
         * Vérifie si un élément existe dans le DOM
         * @param {string} selector - Le sélecteur CSS
         * @returns {Element|null} L'élément trouvé ou null
         */
        getElement(selector) {
            let element = document.querySelector(selector);
            
            if (!element) {
                // Essayer de trouver l'élément dans tous les shadow DOM
                const getAllElements = (root) => {
                    const elements = Array.from(root.querySelectorAll('*'));
                    const shadowElements = elements
                        .filter(el => el.shadowRoot)
                        .map(el => Array.from(el.shadowRoot.querySelectorAll('*')))
                        .flat();
                    return [...elements, ...shadowElements];
                };
                
                const allElements = getAllElements(document.body);
                element = allElements.find(el => el.matches && el.matches(selector));
            }

            if (!element) {
                console.warn(`[Strava Auto Kudos] Élément non trouvé: ${selector}`);
            }
            
            return element;
        },

        /**
         * Crée la bulle d'interface
         * @returns {Promise<Element>} La bulle créée
         */
        async createBubble() {
            console.log("[Strava Auto Kudos] Début de la création de la bulle");
            try {
                // Attendre que le DOM soit complètement chargé
                if (document.readyState !== 'complete') {
                    console.log("[Strava Auto Kudos] DOM non prêt, attente du chargement complet...");
                    await new Promise(resolve => window.addEventListener('load', resolve));
                }
                console.log("[Strava Auto Kudos] DOM complètement chargé");

                // Vérifier si la bulle existe déjà
                let existingContainer = this.getElement('#strava-auto-kudos-container');
                if (existingContainer) {
                    console.log("[Strava Auto Kudos] Bulle déjà existante, nettoyage préalable");
                    this.cleanup();
                }

                // Vérifier que Templates est disponible
                if (!window.Templates || typeof window.Templates.bubble !== 'function') {
                    console.error("[Strava Auto Kudos] Templates non disponible");
                    throw new Error("Templates non disponible");
                }

                console.log("[Strava Auto Kudos] Création du conteneur avec le template");
                // Créer le conteneur avec le template
                const container = document.createElement('div');
                container.innerHTML = window.Templates.bubble();
                
                // Ajouter le conteneur au body
                const bubbleElement = container.firstElementChild;
                document.body.appendChild(bubbleElement);
                
                // Configurer les événements
                this.setupEventListeners(bubbleElement);
                
                console.log("[Strava Auto Kudos] Bulle créée avec succès");
                return bubbleElement;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de la création de la bulle:", error);
                if (window.StateManager) {
                    window.StateManager.handleError(error, 'création de la bulle');
                }
                throw error;
            }
        },

        /**
         * Configure les gestionnaires d'événements
         * @param {Element} container - Le conteneur de la bulle
         */
        setupEventListeners(container) {
            console.log("[Strava Auto Kudos] Configuration des événements");
            
            // Nettoyer les gestionnaires d'événements existants
            this.removeEventHandlers();
            
            const button = container.querySelector('.social_assistant_button');
            const dropdown = container.querySelector('.dropdown');
            
            if (!button || !dropdown) {
                console.error("[Strava Auto Kudos] Éléments de la bulle non trouvés après création");
                throw new Error('Éléments de la bulle non trouvés');
            }

            // Gestionnaire du bouton principal
            this._eventHandlers.mainButton = () => {
                console.log("[Strava Auto Kudos] Clic sur le bouton");
                const isEnabled = StateManager.isEnabled();
                if (isEnabled) {
                    // Si l'extension est activée, on la désactive
                    StateManager.disable();
                    this.updateBubbleStatus(false);
                } else {
                    // Si l'extension est désactivée, on l'active et on reprend le traitement
                    StateManager.enable();
                    this.updateBubbleStatus(true);
                }
            };
            button.addEventListener('click', this._eventHandlers.mainButton);

            // Gestionnaire du dropdown
            this._eventHandlers.dropdown = (e) => {
                console.log("[Strava Auto Kudos] Clic sur le dropdown");
                e.stopPropagation();
                
                // Fermer le dropdown si on clique en dehors
                const outsideClickHandler = (e) => {
                    if (!dropdown.contains(e.target)) {
                        dropdown.classList.remove('active');
                    }
                };
                
                document.addEventListener('click', outsideClickHandler, { once: true });
            };
            dropdown.addEventListener('click', this._eventHandlers.dropdown);

            // Gestionnaire des options du dropdown
            const dropdownOptions = dropdown.querySelectorAll('.dropdown-option');
            dropdownOptions.forEach(option => {
                const handler = (e) => {
                    e.stopPropagation();
                    const action = option.dataset.action;
                    
                    switch(action) {
                        case 'pause':
                            StateManager.pause(300000); // 5 minutes
                            break;
                        case 'resume':
                            // Utiliser la fonction unifiée de reprise si disponible
                            if (window.App && typeof window.App.resumeProcessing === 'function') {
                                window.App.resumeProcessing();
                            } else {
                                // Fallback: méthode traditionnelle
                                if (StateManager.resume) {
                                    StateManager.resume();
                                }
                                // S'assurer que KudosManager reprend aussi
                                if (window.KudosManager && window.KudosManager.resume) {
                                    window.KudosManager.resume();
                                }
                                // Réinitialiser les observateurs
                                if (window.App && window.App.resetComponent) {
                                    window.App.resetComponent('observers');
                                }
                            }
                            break;
                        case 'reset':
                            StateManager.reset();
                            break;
                        default:
                            console.warn("[Strava Auto Kudos] Action inconnue:", action);
                    }
                    
                    dropdown.classList.remove('active');
                    this.updateUI();
                };
                
                option.addEventListener('click', handler);
                this._eventHandlers.dropdownOptions.push({
                    element: option,
                    handler: handler
                });
            });
            
            // Configurer l'écouteur d'événement pour kudosAdded
            if (window.App) {
                this._eventHandlers.kudosAdded = (count) => {
                    this.updateKudosCounterUI(count);
                    this.showKudosAnimation();
                };
                window.App.on('kudosAdded', this._eventHandlers.kudosAdded);
            }
        },
        
        /**
         * Supprime les gestionnaires d'événements
         */
        removeEventHandlers() {
            console.log("[Strava Auto Kudos] Suppression des écouteurs d'événements");
            
            // Supprimer l'écouteur du bouton principal
            if (this._eventHandlers.mainButton) {
                const button = this.getElement('.social_assistant_button');
                if (button) {
                    button.removeEventListener('click', this._eventHandlers.mainButton);
                }
                this._eventHandlers.mainButton = null;
            }
            
            // Supprimer l'écouteur du dropdown
            if (this._eventHandlers.dropdown) {
                const dropdown = this.getElement('.dropdown');
                if (dropdown) {
                    dropdown.removeEventListener('click', this._eventHandlers.dropdown);
                }
                this._eventHandlers.dropdown = null;
            }
            
            // Supprimer les écouteurs des options du dropdown
            if (this._eventHandlers.dropdownOptions.length > 0) {
                this._eventHandlers.dropdownOptions.forEach(({element, handler}) => {
                    if (element) {
                        element.removeEventListener('click', handler);
                    }
                });
                this._eventHandlers.dropdownOptions = [];
            }
            
            // Supprimer l'écouteur de kudosAdded
            if (this._eventHandlers.kudosAdded && window.App) {
                window.App.off('kudosAdded', this._eventHandlers.kudosAdded);
                this._eventHandlers.kudosAdded = null;
            }
        },

        /**
         * Met à jour le statut de la bulle
         * @param {boolean} isEnabled - État d'activation
         */
        updateBubbleStatus(isEnabled) {
            console.log(`[Strava Auto Kudos] Mise à jour du statut: ${isEnabled ? 'activé' : 'désactivé'}`);
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) return;

            const button = container.querySelector('.social_assistant_button');
            const statusElement = container.querySelector('.status');
            
            if (button) {
                button.innerHTML = isEnabled ? '👍' : '⏸️';
                button.title = isEnabled ? 'Désactiver' : 'Activer';
            }
            
            if (statusElement) {
                statusElement.textContent = isEnabled ? 'Actif' : 'En pause';
                statusElement.className = `status ${isEnabled ? 'active' : 'paused'}`;
            }
        },

        /**
         * Met à jour les statistiques
         * @param {Object} stats - Statistiques à afficher
         */
        updateStats(stats) {
            console.log("[Strava Auto Kudos] Mise à jour des statistiques:", stats);
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) return;

            const successRate = container.querySelector('.success-rate');
            if (successRate && stats.attempts > 0) {
                const rate = (stats.successes / stats.attempts * 100).toFixed(1);
                successRate.textContent = `${rate}%`;
                successRate.title = `${stats.successes}/${stats.attempts} kudos réussis`;
            }
        },

        /**
         * Met à jour le timer de pause
         * @param {string} timeString - Temps restant formaté
         */
        updatePauseTimer(timeString) {
            console.log("[Strava Auto Kudos] Mise à jour du timer:", timeString);
            const timerElement = this.getElement('#strava-auto-kudos-timer');
            if (timerElement) {
                const timerValue = timerElement.querySelector('.timer-value');
                if (timerValue) {
                    timerValue.textContent = timeString;
                }
            } else {
                const container = this.getElement('#strava-auto-kudos-container');
                if (container && window.Templates && typeof window.Templates.pauseTimer === 'function') {
                    container.insertAdjacentHTML('beforeend', window.Templates.pauseTimer(timeString));
                }
            }
        },

        /**
         * Met à jour le compteur de kudos
         * @param {number} count - Le nombre de kudos
         */
        updateKudosCounterUI(count) {
            console.log("[Strava Auto Kudos] Mise à jour du compteur UI:", count);
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) {
                console.log("[Strava Auto Kudos] Conteneur non trouvé pour la mise à jour du compteur");
                return;
            }

            const counter = container.querySelector('.kudos-counter');
            if (!counter) {
                console.log("[Strava Auto Kudos] Compteur non trouvé");
                return;
            }

            counter.textContent = count;
            counter.title = `${count} kudos donnés`;
            
            // Ajouter une animation
            counter.classList.add('updated');
            setTimeout(() => {
                counter.classList.remove('updated');
            }, 500);
        },

        /**
         * Met à jour le compteur de kudos
         * @param {number} count - Le nombre de kudos
         * @deprecated Utiliser updateKudosCounterUI à la place
         */
        updateKudosCount(count) {
            console.log("[Strava Auto Kudos] updateKudosCount est déprécié, utiliser updateKudosCounterUI à la place");
            this.updateKudosCounterUI(count);
        },

        /**
         * Nettoie les ressources créées par l'UI
         */
        cleanup() {
            console.log("[Strava Auto Kudos] Nettoyage des ressources UI");
            
            // Supprimer les écouteurs d'événements
            this.removeEventHandlers();
            
            // Supprimer les éléments DOM
            const container = this.getElement('#strava-auto-kudos-container');
            if (container) {
                container.remove();
            }
            
            const notifications = this.getElement('#strava-auto-kudos-notifications');
            if (notifications) {
                notifications.remove();
            }
            
            this._isInitialized = false;
        },

        /**
         * Initialise l'interface utilisateur
         */
        async init() {
            console.log("[Strava Auto Kudos] Initialisation de l'interface utilisateur");
            
            // Éviter une double initialisation
            if (this._isInitialized) {
                console.log("[Strava Auto Kudos] L'interface est déjà initialisée, nettoyage préalable");
                this.cleanup();
            }
            
            try {
                // Créer la bulle d'interface
                await this.createBubble();
                
                // Initialiser le compteur de kudos
                this.updateKudosCounterUI(StateManager.getKudosCount());
                
                // Mettre à jour l'état du bouton
                this.updateBubbleStatus(StateManager.isEnabled());
                
                this._isInitialized = true;
                console.log("[Strava Auto Kudos] Interface utilisateur initialisée avec succès");
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors de l'initialisation de l'interface:", error);
                throw error;
            }
        },

        /**
         * Vérifie s'il y a une pause active et met à jour l'interface
         * @returns {boolean} true si une pause est active
         */
        checkForActivePause() {
            console.log("[Strava Auto Kudos] Vérification de la pause active");
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) return false;

            const timerElement = this.getElement('#strava-auto-kudos-timer');
            if (timerElement) {
                const timerValue = timerElement.querySelector('.timer-value');
                if (timerValue && timerValue.textContent !== '00:00') {
                    console.log("[Strava Auto Kudos] Pause active détectée");
                    return true;
                }
            }

            console.log("[Strava Auto Kudos] Aucune pause active");
            return false;
        },

        /**
         * Affiche l'animation +1 pour le kudos
         */
        showKudosAnimation() {
            console.log("[Strava Auto Kudos] Affichage de l'animation +1");
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) {
                console.log("[Strava Auto Kudos] Conteneur non trouvé pour l'animation");
                return;
            }

            const animation = document.createElement('div');
            animation.className = 'kudos-animation';
            animation.textContent = '+1';
            container.appendChild(animation);

            // Supprimer l'animation après 1 seconde
            setTimeout(() => {
                if (animation.parentNode) {
                    animation.remove();
                }
            }, 1000);
        },

        /**
         * Met à jour l'interface
         */
        updateUI() {
            console.log("[Strava Auto Kudos] Mise à jour de l'interface");
            const isEnabled = StateManager.isEnabled();
            this.updateBubbleStatus(isEnabled);
            this.updateKudosCounterUI(StateManager.getKudosCount());
        },

        /**
         * Gère le clic sur le bouton play
         */
        handlePlayClick() {
            console.log("[Strava Auto Kudos] Clic sur le bouton play");
            
            // Utiliser la fonction unifiée de reprise via App si disponible
            if (window.App && typeof window.App.resumeProcessing === 'function') {
                const success = window.App.resumeProcessing();
                
                if (!success) {
                    // Si échec de reprise, activer simplement l'extension
                    StateManager.enable();
                }
            } else {
                // Fallback: activer l'extension
                StateManager.enable();
            }
            
            // Mettre à jour l'interface 
            this.updateUI();
        }
    };
    console.log("[Strava Auto Kudos] Module UI initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.UI;
}