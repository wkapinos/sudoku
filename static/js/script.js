document.addEventListener('DOMContentLoaded', () => {
    const sudokuBoard = document.getElementById('sudoku-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const modal = document.getElementById('difficulty-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const gameInfo = document.getElementById('game-info');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    
    let currentBoard = [];
    let currentSize = 9;
    let currentDifficulty = 'medium';
    let highlightedValue = null; // Przechowuje aktualnie podświetlaną wartość

    // Definicje poziomów trudności
    const DIFFICULTY_LEVELS = {
        '9': {
            'easy': 0.55,      // 55% zakryte
            'medium': 0.60,    // 60% zakryte
            'hard': 0.70       // 70% zakryte
        },
        '16': {
            'easy': 0.50,      // 50% zakryte
            'medium': 0.55,    // 55% zakryte
            'hard': 0.65       // 65% zakryte
        }
    };

    // Pokaż modal po kliknięciu "Nowa Gra"
    newGameBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
    });

    // Zamknij modal
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Zamknij modal po kliknięciu w tło
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Obsługa przycisków wyboru trudności
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = parseInt(btn.dataset.size);
            const difficulty = btn.dataset.difficulty;
            
            currentSize = size;
            currentDifficulty = difficulty;
            
            modal.style.display = 'none';
            fetchSudokuBoard(difficulty, size);
        });
    });

    // --- Funkcja do pobierania planszy Sudoku z backendu ---
    async function fetchSudokuBoard(difficulty = 'medium', boardSize = 9) {
        try {
            const response = await fetch(`/api/sudoku?size=${boardSize}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const fullBoard = await response.json();
            
            // Stwórz puzzle z wybraną trudnością
            const puzzle = generatePuzzle(fullBoard, difficulty, boardSize);
            
            currentBoard = puzzle;
            displaySudokuBoard(puzzle, boardSize);
            updateGameInfo(difficulty, boardSize);
        } catch (error) {
            console.error('Błąd podczas pobierania planszy Sudoku:', error);
            alert('Nie udało się załadować planszy Sudoku. Spróbuj ponownie później.');
        }
    }

    
      // --- Funkcja do podświetlania komórek z tą samą wartością ---
    function highlightSameValues(targetValue) {
        const cells = sudokuBoard.querySelectorAll('.cell');
        
        // Usuń poprzednie podświetlenia
        cells.forEach(cell => {
            cell.classList.remove('highlighted');
        });
        
        // Jeśli kliknięto na tę samą wartość, wyłącz podświetlanie
        // if (highlightedValue === targetValue) {
        //     highlightedValue = null;
        //     return;
        // }
        
        // Podświetl komórki z tą samą wartością
        if (targetValue && targetValue !== '') {
            highlightedValue = targetValue;
            cells.forEach(cell => {
                if (cell.value === targetValue) {
                    cell.classList.add('highlighted');
                }
            });
        } else {
            highlightedValue = null;
        }
    }

    // --- Funkcja do dodawania event listenerów do komórek ---
    function addCellEventListeners() {
        const cells = sudokuBoard.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            // Event listener dla kliknięcia
            cell.addEventListener('click', (e) => {
                const value = e.target.value.trim();
                highlightSameValues(value);
            });
            
            // Event listener dla zmiany wartości (gdy użytkownik wpisuje)
            cell.addEventListener('input', (e) => {
                // Jeśli obecnie coś jest podświetlone, sprawdź czy nowa wartość pasuje
                if (highlightedValue) {
                    const newValue = e.target.value.trim();
                    if (newValue === highlightedValue) {
                        e.target.classList.add('highlighted');
                    } else {
                        e.target.classList.remove('highlighted');
                    }
                }
            });
            
            // Event listener dla focusa (gdy użytkownik kliknie w komórkę)
            cell.addEventListener('focus', (e) => {
                const value = e.target.value.trim();
                if (value) {
                    highlightSameValues(value);
                }
            });
        });
        
        // Kliknięcie poza planszą usuwa podświetlenie
        document.addEventListener('click', (e) => {
            if (!sudokuBoard.contains(e.target)) {
                highlightSameValues(null);
            }
        });
    }


    // --- Funkcja do wyświetlania planszy Sudoku na stronie ---
    function displaySudokuBoard(board, boardSize) {
    sudokuBoard.innerHTML = ''; // Wyczyść planszę
    sudokuBoard.className = `sudoku-board size-${boardSize}`;

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 2;  // dla 16x16 możesz mieć 2 znaki, dla 9x9 wystarczy 1
            cell.classList.add('cell');
            
            const value = board[r][c];
            if (value !== 0) {
                cell.value = value;
                cell.readOnly = true;  // pola wstępnie wypełnione są nieedytowalne
                cell.classList.add('given-number');
            } else {
                cell.value = '';
                cell.classList.add('empty-cell');
                cell.readOnly = false;
            }

            // Grubsze linie dla bloków
            const blockSize = boardSize === 9 ? 3 : 4;

            if ((r + 1) % blockSize === 0 && r !== boardSize - 1) {
                cell.style.borderBottom = '2px solid black';
            }
            if ((c + 1) % blockSize === 0 && c !== boardSize - 1) {
                cell.style.borderRight = '2px solid black';
            }
            if (r % blockSize === 0 && r !== 0) {
                cell.style.borderTop = '2px solid black';
            }
            if (c % blockSize === 0 && c !== 0) {
                cell.style.borderLeft = '2px solid black';
            }

            sudokuBoard.appendChild(cell);
        }
    }
    addCellEventListeners();
}


    // Aktualizuj informacje o grze
    function updateGameInfo(difficulty, boardSize) {
        const difficultyNames = {
            'easy': 'Łatwa',
            'medium': 'Średnia',
            'hard': 'Trudna'
        };
        
        const percentage = Math.round(DIFFICULTY_LEVELS[boardSize.toString()][difficulty] * 100);
        gameInfo.textContent = `Aktualna gra: ${difficultyNames[difficulty]} ${boardSize}x${boardSize}`;
    }

    /**
     * Główna funkcja do tworzenia puzzle z wyborem poziomu
     */
    function generatePuzzle(fullBoard, difficulty = 'medium', boardSize = 9) {
        const puzzle = fullBoard.map(row => [...row]);
        const hidePercentage = DIFFICULTY_LEVELS[boardSize.toString()][difficulty];
        
        if (!hidePercentage) {
            console.error(`Nieznany poziom trudności: ${difficulty} dla planszy ${boardSize}x${boardSize}`);
            return puzzle;
        }
        
        const totalCells = boardSize * boardSize;
        const cellsToHide = Math.floor(totalCells * hidePercentage);
        
        console.log(`Plansza ${boardSize}x${boardSize}, poziom: ${difficulty}`);
        console.log(`Zakrywam ${cellsToHide} z ${totalCells} pól (${Math.round(hidePercentage * 100)}%)`);
        
        // Stwórz listę wszystkich pozycji
        const positions = [];
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                positions.push({row, col});
            }
        }
        
        // Potasuj pozycje losowo
        shuffleArray(positions);
        
        // Zakryj pierwsze N pól
        for (let i = 0; i < cellsToHide; i++) {
            const {row, col} = positions[i];
            puzzle[row][col] = 0; // 0 = puste pole
        }
        
        return puzzle;
    }

    /**
     * Tasuje tablicę w miejscu (Fisher-Yates shuffle)
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});



