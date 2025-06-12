-- Usuń starą tabelę tasks (jeśli istnieje)
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS sudoku_best_scores;
DROP TABLE IF EXISTS sudoku_games;
DROP TABLE IF EXISTS users;

-- Tabela użytkowników do systemu logowania
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Tabela gier Sudoku - wszystkie rozpoczęte gry
CREATE TABLE sudoku_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    board_size INTEGER NOT NULL,        -- 9 lub 16
    difficulty TEXT NOT NULL,           -- easy, medium, hard
    status TEXT NOT NULL DEFAULT 'started', -- started, completed, abandoned, failed
    time_seconds INTEGER,               -- NULL jeśli nie ukończono
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,              -- NULL jeśli nie ukończono
    moves_count INTEGER DEFAULT 0,      -- ile ruchów wykonano
    hints_used INTEGER DEFAULT 0,       -- ile podpowiedzi użyto (jeśli dodasz)
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela najlepszych wyników (tylko ukończone gry)
CREATE TABLE sudoku_best_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    board_size INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    best_time_seconds INTEGER NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_id INTEGER,                    -- link do konkretnej gry
    UNIQUE(user_id, board_size, difficulty), -- jeden rekord na kombinację
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES sudoku_games(id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX idx_sudoku_games_user_id ON sudoku_games(user_id);
CREATE INDEX idx_sudoku_games_status ON sudoku_games(status);
CREATE INDEX idx_sudoku_games_started_at ON sudoku_games(started_at);
CREATE INDEX idx_best_scores_user_id ON sudoku_best_scores(user_id);

-- Przykładowe dane testowe (opcjonalne)
INSERT INTO users (username, email, password_hash) VALUES 
('testuser', 'test@example.com', '$2b$12$example_hash');

-- Trigger do automatycznego ustawiania finished_at gdy status się zmieni
CREATE TRIGGER update