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
    let highlightedValue = null;
    
    // === ZMIENNE DO TRACKINGU GIER ===
    let currentGameId = null;
    let gameStartTime = null;
    let movesCount = 0;
    let gameTimer = null;
    let gameActive = false;

    // Definicje poziomów trudności
    const DIFFICULTY_LEVELS = {
        '9': {
            'easy': 0.10,      // 55% zakryte to zmienilam do prezentacji
            'medium': 0.20,    // 60% zakryte
            'hard': 0.70       // 70% zakryte
        },
        '16': {
            'easy': 0.50,      // 50% zakryte
            'medium': 0.55,    // 55% zakryte
            'hard': 0.65       // 65% zakryte
        }
    };

    // === FUNKCJE TRACKINGU GIER ===
    
    async function startGameTracking(boardSize, difficulty) {
        try {
            const response = await fetch('/api/start_game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    board_size: boardSize,
                    difficulty: difficulty
                })
            });
            
            const data = await response.json();
            if (data.success) {
                currentGameId = data.game_id;
                gameStartTime = Date.now();
                movesCount = 0;
                gameActive = true;
                startTimer();
                console.log(`Rozpoczęto grę ID: ${currentGameId}`);
            }
        } catch (error) {
            console.error('Błąd podczas rozpoczynania trackingu gry:', error);
        }
    }
    
    async function finishGameTracking(status, timeSeconds = null) {
        if (!currentGameId || !gameActive) return;
        
        try {
            const response = await fetch('/api/finish_game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id: currentGameId,
                    status: status,
                    time_seconds: timeSeconds,
                    moves_count: movesCount
                })
            });
            
            const data = await response.json();
            if (data.success) {
                gameActive = false;
                stopTimer();
                console.log(`Zakończono grę ze statusem: ${status}`);
                
                if (status === 'completed') {
                    showCompletionMessage(timeSeconds);
    
                    if (window.backgroundProgress) {
                        await window.backgroundProgress.onSudokuComplete();
                    }
                }
            }
        } catch (error) {
            console.error('Błąd podczas kończenia gry:', error);
        }
    }
    
    function startTimer() {
        stopTimer();
        gameTimer = setInterval(updateTimerDisplay, 1000);
    }
    
    function stopTimer() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }
    
    function updateTimerDisplay() {
        if (!gameStartTime || !gameActive) return;
        
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
    
        let timerElement = document.getElementById('game-timer');
        if (!timerElement) {
            timerElement = document.createElement('div');
            timerElement.id = 'game-timer';
            timerElement.style.cssText = 'position: absolute; top: 20px; left: 20px; background: rgba(255, 255, 255, 0); padding: 10px; border-radius: 5px; font-weight: bold;';
            document.body.appendChild(timerElement);
        }
        
        timerElement.textContent = `Czas: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    
    function showCompletionMessage(timeSeconds) {
        const minutes = Math.floor(timeSeconds / 60);
        const seconds = timeSeconds % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        alert(`Gratulacje! Ukończyłeś Sudoku w czasie: ${timeStr}!`);
    }
    
    function checkGameCompletion() {
        if (!gameActive) return;
        
        const cells = sudokuBoard.querySelectorAll('.cell');
        let allFilled = true;
        let isValid = true;
        
        // Sprawdź czy wszystkie pola są wypełnione
        cells.forEach(cell => {
            if (cell.value.trim() === '') {
                allFilled = false;
            }
        });
        
        if (!allFilled) return;
        
        // Sprawdź poprawność rozwiązania
        isValid = validateSudoku();
        
        if (isValid) {
            const timeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
            finishGameTracking('completed', timeSeconds);
        } else {
            // Opcjonalnie: możesz dodać info o błędzie
            console.log('Sudoku wypełnione ale niepoprawnie');
        }
    }
    
    function validateSudoku() {
        const cells = sudokuBoard.querySelectorAll('.cell');
        const board = [];
  
        for (let i = 0; i < currentSize; i++) {
            board[i] = [];
            for (let j = 0; j < currentSize; j++) {
                const cellIndex = i * currentSize + j;
                const value = parseInt(cells[cellIndex].value) || 0;
                board[i][j] = value;
            }
        }
        
        // Sprawdź wiersze, kolumny i bloki
        return isValidSudoku(board, currentSize);
    }
    
    function isValidSudoku(board, size) {
        const blockSize = size === 9 ? 3 : 4;
        
        // Sprawdź wiersze
        for (let row = 0; row < size; row++) {
            const seen = new Set();
            for (let col = 0; col < size; col++) {
                const val = board[row][col];
                if (val !== 0) {
                    if (seen.has(val)) return false;
                    seen.add(val);
                }
            }
        }
        
        // Sprawdź kolumny
        for (let col = 0; col < size; col++) {
            const seen = new Set();
            for (let row = 0; row < size; row++) {
                const val = board[row][col];
                if (val !== 0) {
                    if (seen.has(val)) return false;
                    seen.add(val);
                }
            }
        }
        
        // Sprawdź bloki
        for (let blockRow = 0; blockRow < size; blockRow += blockSize) {
            for (let blockCol = 0; blockCol < size; blockCol += blockSize) {
                const seen = new Set();
                for (let row = blockRow; row < blockRow + blockSize; row++) {
                    for (let col = blockCol; col < blockCol + blockSize; col++) {
                        const val = board[row][col];
                        if (val !== 0) {
                            if (seen.has(val)) return false;
                            seen.add(val);
                        }
                    }
                }
            }
        }
        
        return true;
    }


    function addPauseButton() {
    let pauseBtn = document.getElementById('pause-btn');
    if (!pauseBtn) {
        pauseBtn = document.createElement('button');
        pauseBtn.id = 'pause-btn';
        pauseBtn.textContent = '⏸';
        document.body.appendChild(pauseBtn);
        
        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay';
        overlay.innerHTML = '<div class="pause-message">Gra wstrzymana<br><br>Kliknij aby kontynuować</div>';
        document.body.appendChild(overlay);
        
        let isPaused = false;
        
        pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            if (isPaused) {
                pauseBtn.textContent = '▶';
                pauseBtn.classList.add('paused');
                overlay.classList.add('show');
                stopTimer();
            } else {
                pauseBtn.textContent = '⏸';
                pauseBtn.classList.remove('paused');
                overlay.classList.remove('show');
                startTimer();
            }
        });
        
        overlay.addEventListener('click', () => {
            if (isPaused) {
                isPaused = false;
                pauseBtn.textContent = '⏸';
                pauseBtn.classList.remove('paused');
                overlay.classList.remove('show');
                startTimer();
            }
        });
    }
    pauseBtn.style.display = gameActive ? 'block' : 'none';
}


    // === PRZYCISK PODDANIA SIĘ ===
    function addGiveUpButton() {
        let giveUpBtn = document.getElementById('give-up-btn');
        if (!giveUpBtn) {
            giveUpBtn = document.createElement('button');
            giveUpBtn.id = 'give-up-btn';
            giveUpBtn.textContent = 'Poddaj się';
            giveUpBtn.style.cssText = 'margin-left: 10px; background: #35522b; color: white; padding: 0px 15px; border: none; border-radius: 10px; cursor: pointer;';
            newGameBtn.parentNode.insertBefore(giveUpBtn, newGameBtn.nextSibling);
            
            giveUpBtn.addEventListener('click', () => {
                if (gameActive && confirm('Czy na pewno chcesz się poddać?')) {
                    finishGameTracking('abandoned');
                }
            });
        }
        giveUpBtn.style.display = gameActive ? 'inline-block' : 'none';
        addPauseButton();
    }

    


    newGameBtn.addEventListener('click', () => {
        if (gameActive) {
            if (confirm('Rozpocząć nową grę? Obecna gra zostanie przerwana.')) {
                finishGameTracking('abandoned');
            } else {
                return;
            }
        }
        
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });


    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });


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




    async function fetchSudokuBoard(difficulty = 'medium', boardSize = 9) {
        try {
            document.querySelector('.main-content').style.background = 'rgba(249, 221, 216, 0.19)';
            document.querySelector('.profile-btn').style.background = 'rgba(249, 221, 216, 0)';
            document.querySelector('.logout-btn').style.background = 'rgba(249, 221, 216, 0)';
            await startGameTracking(boardSize, difficulty);
            
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
            addGiveUpButton();
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
            cell.addEventListener('click', (e) => {
                const value = e.target.value.trim();
                highlightSameValues(value);
            });
            
            cell.addEventListener('input', (e) => {
                if (!e.target.readOnly && gameActive) {
                    movesCount++;
                }
                
                const maxValue = currentSize;
                const value = parseInt(e.target.value);
                
                if (e.target.value !== '' && (isNaN(value) || value < 1 || value > maxValue)) {
                    e.target.value = '';
                    return;
                }
                
                // Podświetlanie
                if (highlightedValue) {
                    const newValue = e.target.value.trim();
                    if (newValue === highlightedValue) {
                        e.target.classList.add('highlighted');
                    } else {
                        e.target.classList.remove('highlighted');
                    }
                }
                
                // Sprawdź czy gra została ukończona
                setTimeout(checkGameCompletion, 100);
            });
            
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
                cell.maxLength = 2;  // dla 16x16 mozna mieć 2 znaki, dla 9x9 wystarczy 1
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
        gameInfo.innerHTML = `
            <div>Aktualna gra: ${difficultyNames[difficulty]} ${boardSize}x${boardSize}</div>
            <div style="font-size: 0.9em; color: #666;">Ruchy: <span id="moves-counter">0</span></div>
        `;
        
        // Aktualizuj licznik ruchów co sekundę
        setInterval(() => {
            const movesCounter = document.getElementById('moves-counter');
            if (movesCounter) {
                movesCounter.textContent = movesCount;
            }
        }, 500);
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
    
    // === Obsługa zamykania/odświeżania strony ===
    window.addEventListener('beforeunload', (e) => {
        if (gameActive) {
            finishGameTracking('abandoned');
            e.preventDefault();
            e.returnValue = ''; // Pokaż ostrzeżenie o opuszczeniu strony
        }
    });
});