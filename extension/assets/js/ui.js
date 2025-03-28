/**
 * Module de gestion de l'interface utilisateur
 * @module UI
 */
console.log("[Strava Auto Kudos] UI module loading");

// Vérifier si UI est déjà défini
if (typeof window.UI === 'undefined') {
    window.UI = {
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

                // Attendre un peu plus longtemps pour s'assurer que tout est bien initialisé
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Vérifier si la bulle existe déjà
                let existingContainer = this.getElement('#strava-auto-kudos-container');
                if (existingContainer) {
                    console.log("[Strava Auto Kudos] Bulle déjà existante");
                    return existingContainer;
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
                document.body.appendChild(container.firstElementChild);
                
                // Attendre un peu que le DOM soit mis à jour
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Vérifier que la bulle a été créée correctement
                existingContainer = this.getElement('#strava-auto-kudos-container');
                if (!existingContainer) {
                    throw new Error('La bulle n\'a pas été créée correctement');
                }
                
                // Configurer les événements
                this.setupEventListeners(existingContainer);
                
                console.log("[Strava Auto Kudos] Bulle créée avec succès");
                return existingContainer;
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
            const button = container.querySelector('.social_assistant_button');
            const dropdown = container.querySelector('.dropdown');
            
            if (!button || !dropdown) {
                console.error("[Strava Auto Kudos] Éléments de la bulle non trouvés après création");
                throw new Error('Éléments de la bulle non trouvés');
            }

            // Gestionnaire du bouton principal
            button.addEventListener('click', () => {
                console.log("[Strava Auto Kudos] Clic sur le bouton");
                const isEnabled = StateManager.isEnabled();
                StateManager.setEnabled(!isEnabled);
                this.updateBubbleStatus(!isEnabled);
            });

            // Gestionnaire du dropdown
            dropdown.addEventListener('click', (e) => {
                console.log("[Strava Auto Kudos] Clic sur le dropdown");
                e.stopPropagation();
                
                // Fermer le dropdown si on clique en dehors
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target)) {
                        dropdown.classList.remove('active');
                    }
                }, { once: true });
            });

            // Gestionnaire des options du dropdown
            const dropdownOptions = dropdown.querySelectorAll('.dropdown-option');
            dropdownOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = option.dataset.action;
                    
                    switch(action) {
                        case 'pause':
                            StateManager.pause(300000); // 5 minutes
                            break;
                        case 'resume':
                            StateManager.resume();
                            break;
                        case 'reset':
                            StateManager.reset();
                            break;
                        default:
                            console.warn("[Strava Auto Kudos] Action inconnue:", action);
                    }
                    
                    dropdown.classList.remove('active');
                });
            });
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
                if (container) {
                    container.insertAdjacentHTML('beforeend', Templates.pauseTimer(timeString));
                }
            }
        },

        /**
         * Met à jour le compteur de kudos
         * @param {number} count - Le nombre de kudos
         */
        updateKudosCount(count) {
            console.log("[Strava Auto Kudos] Mise à jour du compteur:", count);
            const container = this.getElement('#strava-auto-kudos-container');
            if (!container) return;

            const counter = container.querySelector('.kudos-counter');
            if (counter) {
                counter.textContent = count;
                counter.title = `${count} kudos donnés`;
            }
        },

        /**
         * Nettoie l'interface
         */
        cleanup() {
            console.log("[Strava Auto Kudos] Nettoyage de l'interface");
            const container = this.getElement('#strava-auto-kudos-container');
            if (container) {
                // Nettoyer les événements
                const button = container.querySelector('.social_assistant_button');
                const dropdown = container.querySelector('.dropdown');
                if (button) {
                    button.replaceWith(button.cloneNode(true));
                }
                if (dropdown) {
                    dropdown.replaceWith(dropdown.cloneNode(true));
                }
                
                // Supprimer le conteneur
                container.remove();
            }
            
            const notifications = this.getElement('#strava-auto-kudos-notifications');
            if (notifications) {
                notifications.remove();
            }
        },

        /**
         * Initialise l'interface utilisateur
         */
        async init() {
            console.log("[Strava Auto Kudos] Initialisation de l'interface utilisateur");
            try {
                // Créer la bulle d'interface
                await this.createBubble();
                
                // Initialiser le compteur de kudos
                this.updateKudosCount(StateManager.getKudosCount());
                
                // Mettre à jour l'état du bouton
                this.updateBubbleStatus(StateManager.isEnabled());
                
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
    };
    console.log("[Strava Auto Kudos] Module UI initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.UI;
}