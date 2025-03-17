/**
 * Module pour la gestion de l'interface utilisateur
 */
console.log("[Strava Auto Kudos] UI module loading");

const UI = {
    /**
     * Crée la bulle d'assistance flottante dans l'interface
     */
    createBulle: () => {
        console.log("[Strava Auto Kudos] Creating UI bubble");
        try {
            // Supprimer tous les conteneurs existants pour éviter les duplications
            const existingContainers = document.querySelectorAll('#strava-auto-kudos-container');
            existingContainers.forEach(container => {
                console.log("[Strava Auto Kudos] Removing existing container to avoid duplication");
                container.remove();
            });
            
            // Réinitialiser le compteur de kudos pour la session actuelle
            CONFIG.state.kudosCount = 0;
            console.log("[Strava Auto Kudos] Reset kudos count to 0 for current session");
            
            // Vérifier que le body existe
            if (!document.body) {
                console.error('[Strava Auto Kudos] document.body is not available yet!');
                // Réessayer après un délai
                setTimeout(UI.createBulle, 1000);
                return null;
            }
            
            // Créer le conteneur pour la bulle et le compteur
            const container = document.createElement('div');
            container.id = "strava-auto-kudos-container";
            
            // Créer la bulle 
            const bulle = document.createElement('div');
            bulle.className = CONFIG.classes.bulle;
            bulle.id = "strava-auto-kudos-bubble";
            
            // Ajouter l'icône à la bulle en fonction de l'état
            const iconDiv = document.createElement('div');
            iconDiv.className = "icon-container";
            iconDiv.innerHTML = CONFIG.state.isEnabled ? CONFIG.icons.pause : CONFIG.icons.thumbsUp;
            bulle.appendChild(iconDiv);
            
            // Ajouter la classe d'animation si activé
            if (CONFIG.state.isEnabled) {
                bulle.classList.add(CONFIG.classes.run);
            }
            
            // Ajouter l'événement de clic pour activer/désactiver
            bulle.addEventListener('click', () => {
                console.log("[Strava Auto Kudos] Bubble clicked, toggling auto kudos");
                KudosManager.toggleAutoKudos();
            });
            
            // Créer le compteur
            const counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            counter.textContent = CONFIG.state.kudosCount;
            console.log("[Strava Auto Kudos] New counter created with value:", CONFIG.state.kudosCount);
            
            // Créer une zone pour les notifications flottantes
            const notifArea = document.createElement('div');
            notifArea.id = "strava-auto-kudos-notifications";
            
            // Assembler les éléments
            container.appendChild(notifArea);  // Zone de notification au-dessus
            container.appendChild(counter);    // Compteur 
            container.appendChild(bulle);      // Bulle en dessous
            
            // Ajouter le conteneur au body
            document.body.appendChild(container);
            
            console.log("[Strava Auto Kudos] UI bubble created successfully and added to DOM");
            
            return bulle;
        } catch (error) {
            console.error('[Strava Auto Kudos] Error creating UI bubble:', error);
            return null;
        }
    },
    
    /**
     * Vérifie si la bulle existe et la crée si nécessaire
     * @returns {HTMLElement} - L'élément bulle
     */
    ensureBulleExists: () => {
        // Vérifier d'abord les duplications de conteneurs et les corriger
        const containers = document.querySelectorAll('#strava-auto-kudos-container');
        
        if (containers.length > 1) {
            console.warn('[Strava Auto Kudos] Multiple containers detected, cleaning up...');
            // Supprimer tous les conteneurs sauf le premier
            for (let i = 1; i < containers.length; i++) {
                containers[i].remove();
            }
        }
        
        // Rechercher la bulle
        let bulle = document.querySelector(`#strava-auto-kudos-bubble`);
        
        if (!bulle) {
            console.log('[Strava Auto Kudos] No bubble found, creating a new one');
            bulle = UI.createBulle();
        }
        
        return bulle;
    },

    /**
     * Met à jour le statut visuel de la bulle
     * @param {boolean} enabled - État d'activation
     */
    updateBulleStatus: (enabled) => {
        console.log(`[Strava Auto Kudos] Updating UI bubble status: ${enabled ? 'enabled' : 'disabled'}`);
        try {
            const bulle = UI.ensureBulleExists();
            
            if (!bulle) {
                console.error('[Strava Auto Kudos] Bulle not found for status update');
                return;
            }
            
            // Mettre à jour la classe active
            if (enabled) {
                bulle.classList.add(CONFIG.classes.run);
            } else {
                bulle.classList.remove(CONFIG.classes.run);
            }
            
            // Mettre à jour l'icône
            const iconDiv = bulle.querySelector('div:not(.' + CONFIG.classes.counter + ')');
            if (iconDiv) {
                iconDiv.innerHTML = enabled ? CONFIG.icons.pause : CONFIG.icons.thumbsUp;
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error updating UI bubble status:', error);
        }
    },
    
    /**
     * Crée ou met à jour le compteur de Kudos
     */
    updateKudosCounter: () => {
        const bulle = UI.ensureBulleExists();
        let counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
        
        if (!counter) {
            counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            const container = document.getElementById('strava-auto-kudos-container');
            if (container) {
                container.appendChild(counter);
            }
        }
        
        counter.textContent = CONFIG.state.kudosCount > 999 ? '999+' : CONFIG.state.kudosCount;
    },
    
    /**
     * Incrémente le compteur de kudos et met à jour l'interface
     */
    incrementKudosCount: () => {
        try {
            // Incrémenter le compteur pour cette session uniquement
            CONFIG.state.kudosCount += 1;
            
            console.log(`[Strava Auto Kudos] Incrementing kudos counter to:`, CONFIG.state.kudosCount);
            
            // Mettre à jour l'interface
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            if (counter) {
                // Forcer l'affichage de la nouvelle valeur
                const displayValue = CONFIG.state.kudosCount > 999 ? '999+' : CONFIG.state.kudosCount;
                counter.textContent = displayValue;
                console.log('[Strava Auto Kudos] Counter UI updated to:', displayValue);
            } else {
                console.error('[Strava Auto Kudos] Counter element not found, creating new bubble');
                // Si le compteur n'existe pas, recréer la bulle
                UI.createBulle();
            }
            
            // Ne pas sauvegarder le compteur dans localStorage pour qu'il soit réinitialisé à chaque session
        } catch (error) {
            console.error('[Strava Auto Kudos] Error incrementing kudos count:', error);
        }
    },
    
    /**
     * Crée une animation de kudos à partir d'un élément
     * @param {HTMLElement} element - Élément kudos depuis lequel l'animation démarre
     */
    createKudosAnimation: (element) => {
        try {
            // Toujours positionner l'animation au-dessus du bouton et du compteur
            const container = document.getElementById('strava-auto-kudos-container');
            let startX, startY;
            
            if (container) {
                const rect = container.getBoundingClientRect();
                // Position aléatoire horizontalement (décalage de -20px à +20px)
                const randomOffset = Math.random() * 40 - 20;
                startX = rect.left + rect.width / 2 + randomOffset;
                startY = rect.top - 20; // Positionnement au-dessus du conteneur
            } else {
                // Fallback si le conteneur n'est pas trouvé
                startX = window.innerWidth - 60;
                startY = window.innerHeight - 100;
            }
            
            // Créer l'élément de notification
            const notification = document.createElement('div');
            notification.className = `${CONFIG.classes.floatingNotification} ${CONFIG.classes.success}`;
            
            // Utiliser "+1" comme texte au lieu de l'icône
            notification.textContent = "+1";
            
            // Positionner la notification au point de départ
            notification.style.position = 'fixed';
            notification.style.left = `${startX}px`;
            notification.style.top = `${startY}px`;
            notification.style.transform = 'translateX(-50%)';
            
            // Ajouter au DOM
            document.body.appendChild(notification);
            
            // Supprimer après l'animation (augmentation du délai à 2500ms)
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 2500);
        } catch (error) {
            console.error('[Strava Auto Kudos] Error creating kudos animation:', error);
        }
    },
    
    /**
     * Crée une notification flottante
     * @param {boolean} isSuccess - True si succès, false si erreur
     * @param {number} x - Position horizontale
     * @param {number} y - Position verticale
     */
    createFloatingNotification: (isSuccess, x, y) => {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `${CONFIG.classes.floatingNotification} ${isSuccess ? CONFIG.classes.success : CONFIG.classes.error}`;
        
        // Ajouter l'icône appropriée
        notification.innerHTML = isSuccess ? CONFIG.icons.floatingSuccess : CONFIG.icons.floatingError;
        
        // Positionner la notification
        notification.style.left = `${x}px`;
        notification.style.top = `${y}px`;
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Supprimer après l'animation
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 1600); // Un peu plus que la durée de l'animation (1.5s)
    },

    /**
     * Fonction interne pour afficher une notification
     * @private
     * @param {string} type - Type de notification ('success' ou 'error')
     * @param {HTMLElement} [element] - Élément à partir duquel l'animation démarre (pour success)
     */
    _displayNotification: (type, element) => {
        try {
            if (type === 'success' && element) {
                // Animer un "+1" par kudos depuis le bouton 
                UI.createKudosAnimation(element);
                return;
            }
            
            // Pour les erreurs, ne rien afficher (suppression de l'icône d'erreur)
            if (type === 'error') {
                return;
            }
            
            // Fallback pour les autres cas
            const notificationArea = document.querySelector('#strava-auto-kudos-notifications');
            if (!notificationArea) return;
            
            if (type === 'success') {
                const notification = document.createElement('div');
                notification.className = `${CONFIG.classes.floatingNotification} ${CONFIG.classes.success}`;
                notification.textContent = "+1";
                
                notificationArea.appendChild(notification);
                
                // Supprimer après l'animation
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 2500);
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error displaying notification:', error);
        }
    },
    
    /**
     * Affiche une notification de succès
     * @param {HTMLElement} [kudosButton] - Le bouton kudos qui a été cliqué
     */
    showSuccessNotification: (kudosButton) => {
        UI._displayNotification('success', kudosButton);
    },
    
    /**
     * Affiche une notification d'erreur
     */
    showErrorNotification: () => {
        UI._displayNotification('error');
    },
    
    /**
     * Fonction pour réinitialiser le compteur de kudos de la session actuelle
     */
    resetSessionKudosCount: () => {
        CONFIG.state.kudosCount = 0;
    }
};

// Vérifions si le module est correctement défini
if (typeof UI !== 'undefined') {
    console.log("[Strava Auto Kudos] UI module loaded successfully");
} else {
    console.error("[Strava Auto Kudos] UI module not properly defined!");
}

// Exporter le module UI
if (typeof module !== 'undefined') {
    module.exports = UI;
}