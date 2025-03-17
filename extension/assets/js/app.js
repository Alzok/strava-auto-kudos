/**
 * Module d'initialisation de l'application
 */
const App = {
    init: () => {
        Logger.info('Initialisation de l\'extension');
        
        try {
            // Vérifier si nous sommes sur une page du dashboard de Strava
            if (!Utils.isDashboardPage()) {
                Logger.info('Page non reconnue, extension non initialisée');
                return;
            }
            
            Logger.info('Page de dashboard Strava détectée');
            
            // Charger l'état enregistré (activé/désactivé)
            CONFIG.state.isEnabled = Storage.load(CONFIG.storage.enabled, false);
            Logger.info(`État de l'extension chargé: ${CONFIG.state.isEnabled ? 'actif' : 'inactif'}`);
            
            // Attendre que le DOM soit complètement chargé
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', App.onDOMLoaded);
            } else {
                App.onDOMLoaded();
            }
        } catch (error) {
            Logger.error('Erreur lors de l\'initialisation', error);
        }
    },
    
    onDOMLoaded: () => {
        Logger.debug('DOM chargé');
        
        try {
            // Créer la bulle d'assistant
            UI.createBulle();
            
            // Observer les changements dans le DOM pour détecter le chargement de nouvelles entrées
            App.setupMutationObserver();
            
            // Ajouter l'écouteur d'événement de défilement pour détecter le chargement de nouvelles entrées
            window.addEventListener('scroll', KudosManager.handleScroll);
            
            // Si l'extension est activée, lancer la boucle de kudos
            if (CONFIG.state.isEnabled) {
                KudosManager.loopKudos();
            }
            
            Logger.info('Extension initialisée avec succès');
        } catch (error) {
            Logger.error('Erreur lors du chargement du DOM', error);
        }
    },
    
    setupMutationObserver: () => {
        Logger.debug('Configuration de l\'observateur de mutations');
        
        try {
            // Trouver le conteneur du flux, soit par le sélecteur défini, soit en cherchant un élément probable
            const targetNode = document.querySelector(CONFIG.selectors.feedContainer) || 
                               document.querySelector('.feed-ui') ||
                               document.querySelector('[data-testid="web-feed-entry"]')?.parentNode?.parentNode;
            
            if (!targetNode) {
                Logger.debug('Élément conteneur du flux non trouvé');
                // Réessayer plus tard
                setTimeout(App.setupMutationObserver, 1000);
                return;
            }
            
            Logger.debug('Élément conteneur du flux trouvé', targetNode);
            
            const observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        Logger.debug('Nouvelles entrées détectées dans le flux via MutationObserver');
                        KudosManager.loopKudos();
                        break;
                    }
                }
            });
            
            observer.observe(targetNode, { childList: true, subtree: true });
            Logger.debug('Observateur de mutations configuré');
        } catch (error) {
            Logger.error('Erreur lors de la configuration de l\'observateur de mutations', error);
        }
    }
};

// Exporter le module d'application
if (typeof module !== 'undefined') {
    module.exports = App;
}
