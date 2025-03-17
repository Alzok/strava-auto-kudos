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
            // Vérifier si la bulle existe déjà
            let bulle = document.querySelector(`.${CONFIG.classes.bulle}`);
            
            if (bulle) {
                console.log("[Strava Auto Kudos] UI bubble already exists, updating it");
                // Mettre à jour la bulle existante
                UI.updateBulleStatus(CONFIG.state.isEnabled);
                return bulle;
            }
            
            // Créer la bulle
            bulle = document.createElement('div');
            bulle.className = CONFIG.classes.bulle;
            
            // Charger le compteur de kudos
            CONFIG.state.kudosCount = Storage.load(CONFIG.storage.kudosCount, 0);
            
            // Ajouter le compteur à la bulle
            const counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            counter.textContent = CONFIG.state.kudosCount;
            bulle.appendChild(counter);
            
            // Ajouter l'icône à la bulle en fonction de l'état
            const iconDiv = document.createElement('div');
            iconDiv.innerHTML = CONFIG.state.isEnabled ? CONFIG.icons.pause : CONFIG.icons.thumbsUp;
            bulle.appendChild(iconDiv);
            
            // Ajouter la classe d'animation si activé
            if (CONFIG.state.isEnabled) {
                bulle.classList.add(CONFIG.classes.run);
            }
            
            // Ajouter l'événement de clic pour activer/désactiver
            bulle.addEventListener('click', () => {
                KudosManager.toggleAutoKudos();
            });
            
            // Ajouter la bulle au body
            document.body.appendChild(bulle);
            
            console.log("[Strava Auto Kudos] UI bubble created successfully");
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
        let bulle = document.querySelector(`.${CONFIG.classes.bulle}`);
        
        if (!bulle) {
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
        let counter = bulle.querySelector(`.${CONFIG.classes.counter}`);
        
        if (!counter) {
            counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            bulle.appendChild(counter);
        }
        
        counter.textContent = CONFIG.state.kudosCount > 999 ? '999+' : CONFIG.state.kudosCount;
        
        // Sauvegarder le compteur dans le stockage local
        Storage.save(CONFIG.storage.kudosCount, CONFIG.state.kudosCount);
    },
    
    /**
     * Incrémente le compteur de kudos
     */
    incrementKudosCount: () => {
        try {
            CONFIG.state.kudosCount++;
            
            const counter = document.querySelector(`.${CONFIG.classes.bulle} .${CONFIG.classes.counter}`);
            if (counter) {
                counter.textContent = CONFIG.state.kudosCount;
            }
            
            Storage.save(CONFIG.storage.kudosCount, CONFIG.state.kudosCount);
        } catch (error) {
            console.error('[Strava Auto Kudos] Error incrementing kudos count:', error);
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
     * Affiche une notification de succès à proximité du bouton kudos cliqué
     * @param {HTMLElement} kudosButton - Le bouton kudos qui a été cliqué
     */
    showSuccessNotification: (kudosButton) => {
        UI.showNotification(kudosButton, CONFIG.icons.floatingSuccess, CONFIG.classes.success);
    },
    
    /**
     * Affiche une notification d'erreur à proximité du bouton kudos problématique
     * @param {HTMLElement} kudosButton - Le bouton kudos qui a échoué
     */
    showErrorNotification: (kudosButton) => {
        UI.showNotification(kudosButton, CONFIG.icons.floatingError, CONFIG.classes.error);
    },
    
    /**
     * Affiche une notification flottante près d'un élément
     * @param {HTMLElement} element - Élément à côté duquel afficher la notification
     * @param {string} icon - HTML de l'icône à afficher
     * @param {string} className - Classe CSS additionnelle
     */
    showNotification: (element, icon, className) => {
        try {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            
            const notification = document.createElement('div');
            notification.className = `${CONFIG.classes.floatingNotification} ${className}`;
            notification.style.top = `${window.scrollY + rect.top + rect.height / 2}px`;
            notification.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
            notification.innerHTML = icon;
            
            document.body.appendChild(notification);
            
            // Supprimer la notification après un délai
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 1500);
        } catch (error) {
            console.error('[Strava Auto Kudos] Error showing notification:', error);
        }
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
