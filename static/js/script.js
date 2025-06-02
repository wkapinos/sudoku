document.addEventListener('DOMContentLoaded', () => {
    const sudokuBoard = document.getElementById('sudoku-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const boardSize = 9; // Dla Sudoku 9x9

    let currentBoard = []; // Tu będziemy przechowywać aktualną planszę

    // --- Funkcja do pobierania planszy Sudoku z backendu ---
    // Zmodyfikuj funkcję fetchSudokuBoard:
async function fetchSudokuBoard(difficulty = 'medium', boardSize = 9) {
    try {
        const response = await fetch('/api/sudoku');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fullBoard = await response.json();
        
        // NOWE: Stwórz puzzle z wybraną trudnością
        const puzzle = generatePuzzle(fullBoard, difficulty, boardSize);
        
        currentBoard = puzzle; // Zapisz puzzle (nie pełną planszę!)
        displaySudokuBoard(puzzle);
    } catch (error) {
        console.error('Błąd podczas pobierania planszy Sudoku:', error);
        alert('Nie udało się załadować planszy Sudoku. Spróbuj ponownie później.');
    }
}

// Dodaj do HTML selektory poziomu trudności:
const difficultyHTML = `
<div class="difficulty-selector">
    <label for="difficulty">Poziom trudności:</label>
    <select id="difficulty">
        <option value="easy">Łatwy (55%)</option>
        <option value="medium" selected>Średni (65%)</option>
        <option value="hard">Trudny (75%)</option>
        <option value="extreme">Ekstremalny (85%)</option>
    </select>
    
    <label for="board-size">Rozmiar planszy:</label>
    <select id="board-size">
        <option value="9" selected>9x9</option>
        <option value="16">16x16</option>
    </select>
</div>
`;

// Zmodyfikuj event listener dla przycisku "Nowa Gra":
newGameBtn.addEventListener('click', () => {
    const difficulty = document.getElementById('difficulty').value;
    const boardSize = parseInt(document.getElementById('board-size').value);
    fetchSudokuBoard(difficulty, boardSize);
});

    // --- Funkcja do wyświetlania planszy Sudoku na stronie ---
    function displaySudokuBoard(board) {
        sudokuBoard.innerHTML = ''; // Wyczyść planszę przed ponownym rysowaniem

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                const value = board[r][c];

                if (value !== 0) { // Jeśli komórka nie jest pusta (0), wyświetl liczbę
                    cell.textContent = value;
                    cell.classList.add('given-number'); // Dodaj klasę dla wstępnie podanych liczb
                } else {
                    // Jeśli komórka jest pusta, będzie do uzupełnienia
                    cell.classList.add('empty-cell');
                    // Możesz dodać event listener do interakcji (np. kliknięcia, wpisywania)
                    // Na razie będzie pusta, ale gotowa na przyszłe funkcje wpisywania
                }

                // Dodaj klasy dla grubych linii (dla kwadratów 3x3)
                if ((r + 1) % 3 === 0 && r !== boardSize - 1) { // Dolna linia dla bloków
                    cell.style.borderBottom = '2px solid black';
                }
                if ((c + 1) % 3 === 0 && c !== boardSize - 1) { // Prawa linia dla bloków
                    cell.style.borderRight = '2px solid black';
                }
                // Usuń podwójne granice, jeśli jest już ustawiona przez CSS
                if (r % 3 === 0 && r !== 0) { // Górna linia dla bloków
                    cell.style.borderTop = '2px solid black';
                }
                 if (c % 3 === 0 && c !== 0) { // Lewa linia dla bloków
                    cell.style.borderLeft = '2px solid black';
                }
                // Resetuj border-top i border-left dla pierwszej komórki,
                // aby nie było podwójnych linii
                if (r === 0) cell.style.borderTop = '2px solid black';
                if (c === 0) cell.style.borderLeft = '2px solid black';


                sudokuBoard.appendChild(cell);
            }
        }
    }

    // --- Obsługa przycisku "Nowa Gra" ---
    newGameBtn.addEventListener('click', fetchSudokuBoard);

    // --- Inicjalizacja: załaduj planszę przy starcie strony ---
    fetchSudokuBoard();
});

// === SYSTEM POZIOMÓW TRUDNOŚCI ===

// Definicje poziomów trudności
const DIFFICULTY_LEVELS = {
    '9x9': {
        'easy': 0.55,      // 55% zakryte
        'medium': 0.65,    // 65% zakryte
        'hard': 0.75,      // 75% zakryte
        'extreme': 0.85    // 85% zakryte
    },
    '16x16': {
        'easy': 0.50,      // 50% zakryte
        'medium': 0.60,    // 60% zakryte
        'hard': 0.70,      // 70% zakryte
        'extreme': 0.80    // 80% zakryte
    }
};

/**
 * Tworzy puzzle z pełnej planszy poprzez zakrycie odpowiedniej ilości pól
 * @param {Array} fullBoard - Pełna, rozwiązana plansza sudoku
 * @param {string} difficulty - Poziom trudności: 'easy', 'medium', 'hard', 'extreme'
 * @param {number} boardSize - Rozmiar planszy (9 lub 16)
 * @returns {Array} Plansza z zakrytymi polami (0 = puste pole)
 */
function createPuzzle(fullBoard, difficulty = 'medium', boardSize = 9) {
    // Kopia planszy, żeby nie modyfikować oryginału
    const puzzle = fullBoard.map(row => [...row]);
    
    // Określ typ planszy dla poziomów trudności
    const boardType = boardSize === 16 ? '16x16' : '9x9';
    
    // Pobierz procent pól do zakrycia
    const hidePercentage = DIFFICULTY_LEVELS[boardType][difficulty];
    
    if (!hidePercentage) {
        console.error(`Nieznany poziom trudności: ${difficulty} dla planszy ${boardType}`);
        return puzzle;
    }
    
    // Oblicz ile pól zakryć
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
 * @param {Array} array - Tablica do potasowania
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Sprawdza czy plansza ma unikalne rozwiązanie (opcjonalne - dla zaawansowanych)
 * Na razie zwraca true, ale można rozbudować
 * @param {Array} puzzle - Plansza do sprawdzenia
 * @returns {boolean} Czy ma unikalne rozwiązanie
 */
function hasUniqueSolution(puzzle) {
    // TODO: Implementacja algorytmu sprawdzającego unikalność rozwiązania
    // Na razie zakładamy że tak
    return true;
}

/**
 * Główna funkcja do tworzenia puzzle z wyborem poziomu
 * @param {Array} fullBoard - Pełna plansza
 * @param {string} difficulty - Poziom trudności
 * @param {number} boardSize - Rozmiar planszy
 * @param {boolean} ensureUnique - Czy sprawdzać unikalność rozwiązania
 * @returns {Array} Gotowe puzzle
 */
function generatePuzzle(fullBoard, difficulty = 'medium', boardSize = 9, ensureUnique = false) {
    let puzzle;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        puzzle = createPuzzle(fullBoard, difficulty, boardSize);
        attempts++;
        
        if (!ensureUnique) break; // Jeśli nie sprawdzamy unikalności, kończymy
        
        if (hasUniqueSolution(puzzle)) {
            break;
        }
        
        if (attempts >= maxAttempts) {
            console.warn(`Nie udało się utworzyć puzzle z unikalnym rozwiązaniem po ${maxAttempts} próbach`);
            break;
        }
        
    } while (attempts < maxAttempts);
    
    return puzzle;
}