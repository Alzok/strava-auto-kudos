/**
 * Module pour l'interface utilisateur
 */
const UI = {
    /**
     * Crée la bulle d'assistant social
     * @returns {HTMLElement} - L'élément de bulle créé
     */
    createBulle: () => {
        Logger.debug('Création de la bulle d\'assistant');
        
        try {
            const bulle = document.createElement('div');
            bulle.className = CONFIG.classes.bulle;
            
            // Utiliser l'icône appropriée selon l'état actif/pause
            const isEnabled = CONFIG.state.isEnabled;
            const icon = isEnabled ? CONFIG.icons.pause : CONFIG.icons.thumbsUp;
            
            bulle.innerHTML = `
                ${icon}
                <span>Auto Kudos</span>
                <div class="${CONFIG.classes.run}"></div>
            `;
            
            // Ajouter la classe active si l'extension est activée
            if (isEnabled) {
                bulle.classList.add(CONFIG.classes.run);
            }
            
            document.body.appendChild(bulle);
            
            // Ajout d'un event listener pour déclencher l'action
            bulle.addEventListener('click', KudosManager.toggleAutoKudos);
            
            // Charger le compteur de kudos depuis le stockage local
            CONFIG.state.kudosCount = Storage.load(CONFIG.storage.kudosCount, 0);
            
            // Créer le compteur de kudos
            UI.updateKudosCounter();
            
            Logger.debug('Bulle créée et ajoutée au DOM');
            return bulle;
        } catch (error) {
            Logger.error('Erreur lors de la création de la bulle', error);
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
     * Met à jour l'état visuel de la bulle
     * @param {boolean} isEnabled - Si l'auto-kudos est actif
     */
    updateBulleStatus: (isEnabled) => {
        const bulle = UI.ensureBulleExists();
        
        // Mettre à jour la classe active
        if (isEnabled) {
            bulle.classList.add(CONFIG.classes.run);
        } else {
            bulle.classList.remove(CONFIG.classes.run);
        }
        
        // Changer l'icône
        const svgContainer = bulle.querySelector('svg').parentNode;
        const icon = isEnabled ? CONFIG.icons.pause : CONFIG.icons.thumbsUp;
        
        // Préserver le compteur existant
        const existingSpan = svgContainer.querySelector('span')?.outerHTML || '<span>Auto Kudos</span>';
        svgContainer.innerHTML = icon + existingSpan;
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
        CONFIG.state.kudosCount++;
        UI.updateKudosCounter();
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
        try {
            // Position du bouton kudos
            const rect = kudosButton.getBoundingClientRect();
            
            // Position près du bouton
            const x = rect.left + rect.width / 2;
            const y = rect.top;
            
            UI.createFloatingNotification(true, x, y);
        } catch (error) {
            Logger.error('Erreur lors de l\'affichage de la notification de succès', error);
        }
    },
    
    /**
     * Affiche une notification d'erreur à proximité du bouton kudos problématique
     * @param {HTMLElement} kudosButton - Le bouton kudos qui a échoué
     */
    showErrorNotification: (kudosButton) => {
        try {
            // Position du bouton kudos
            const rect = kudosButton.getBoundingClientRect();
            
            // Position près du bouton
            const x = rect.left + rect.width / 2;
            const y = rect.top;
            
            UI.createFloatingNotification(false, x, y);
        } catch (error) {
            Logger.error('Erreur lors de l\'affichage de la notification d\'erreur', error);
        }
    }
};

// Exporter le module d'interface utilisateur
if (typeof module !== 'undefined') {
    module.exports = UI;
}
