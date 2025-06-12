// background-progress.js - CZYSTA WERSJA

class BackgroundProgress {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 15; // 15 elementów tła
        this.init();
    }

    init() {
        this.loadProgress();
        this.updateBackground();
    }

    loadProgress() {
        const saved = localStorage.getItem('backgroundLevel');
        this.currentLevel = saved ? parseInt(saved) : 1;
    }

    saveProgress() {
        localStorage.setItem('backgroundLevel', this.currentLevel.toString());
    }

    unlockNextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            this.saveProgress();
            this.updateBackground();
        }
    }

    updateBackground() {
        // Pokaż wszystkie elementy do aktualnego poziomu
        for (let i = 1; i <= this.maxLevel; i++) {
            const element = document.querySelector(`[data-unlock="${i}"]`);
            if (element) {
                if (i <= this.currentLevel) {
                    element.classList.add('show');
                    // Animacja tylko dla najnowszego elementu
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

// Inicjalizacja
const backgroundProgress = new BackgroundProgress();

// Export dla sudoku.js
window.backgroundProgress = backgroundProgress;