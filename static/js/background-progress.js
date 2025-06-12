class BackgroundProgress {
    constructor() {
        console.log("BackgroundProgress constructor wywołany!");
        this.currentLevel = 0; 
        this.maxLevel = 15;
        this.init();
    }

    init() {
        this.updateBackground();
    }

        async onSudokuComplete() {
    console.log("onSudokuComplete wywołane!");
    
    try {
        const response = await fetch('/api/user_stats');
        const stats = await response.json();
        
        console.log("Otrzymane statystyki:", stats); 
        
        const totalCompleted = stats.completed_games || 0;
        
        console.log(`Ukończone gry: ${totalCompleted}, obecny poziom: ${this.currentLevel}`);
        
        const newLevel = Math.min(totalCompleted, this.maxLevel);
        
        if (newLevel > this.currentLevel) {
            console.log(`Odblokowuję poziom ${newLevel}!`);
            this.currentLevel = newLevel;
            this.updateBackground();
        }
        
    } catch (error) {
        console.error('Błąd podczas pobierania statystyk:', error);
    }
}

    updateBackground() {
        console.log(`Aktualizuję tło do poziomu ${this.currentLevel}`);
        
        // Pokaż wszystkie elementy do aktualnego poziomu
        for (let i = 1; i <= this.maxLevel; i++) {
            const element = document.querySelector(`[data-unlock="${i}"]`);
            console.log(`Element ${i}:`, element);
            
            if (element) {
                if (i <= this.currentLevel) {
                    console.log(`Pokazuję element poziom ${i}`);
                    element.classList.add('show');
                    if (i === this.currentLevel) {
                        element.classList.add('just-unlocked');
                        setTimeout(() => {
                            element.classList.remove('just-unlocked');
                        }, 2500);
                    }
                } else {
                    element.classList.remove('show');
                }
            }
        }
    }
}

console.log("Tworzę backgroundProgress...");
const backgroundProgress = new BackgroundProgress();

console.log("Ustawiam window.backgroundProgress...");
window.backgroundProgress = backgroundProgress;

console.log("Gotowe!");