from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import os
import random
from datetime import datetime
from functools import wraps

app = Flask(__name__)

# Konfiguracja aplikacji
app.config['SECRET_KEY'] = 'twoj-super-tajny-klucz-zmien-go-pozniej'  # ZMIEŃ TO!
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicjalizacja rozszerzeń
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# === MODELE BAZY DANYCH ===

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def set_password(self, password):
        """Hashuje i zapisuje hasło"""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Sprawdza czy hasło jest poprawne"""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class SudokuGame(db.Model):
    __tablename__ = 'sudoku_games'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    board_size = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='started')  # started, completed, abandoned, failed
    time_seconds = db.Column(db.Integer, nullable=True)  # NULL jeśli nie ukończono
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime, nullable=True)
    moves_count = db.Column(db.Integer, default=0)
    hints_used = db.Column(db.Integer, default=0)
    
    user = db.relationship('User', backref=db.backref('games', lazy=True))

class SudokuBestScore(db.Model):
    __tablename__ = 'sudoku_best_scores'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    board_size = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    best_time_seconds = db.Column(db.Integer, nullable=False)
    achieved_at = db.Column(db.DateTime, default=datetime.utcnow)
    game_id = db.Column(db.Integer, db.ForeignKey('sudoku_games.id'), nullable=True)
    
    user = db.relationship('User', backref=db.backref('best_scores', lazy=True))
    game = db.relationship('SudokuGame')
    
    __table_args__ = (db.UniqueConstraint('user_id', 'board_size', 'difficulty'),)

# === FUNKCJE POMOCNICZE ===

def init_db():
    """Inicjalizuje bazę danych"""
    with app.app_context():
        db.create_all()

def login_required(f):
    """Dekorator sprawdzający czy użytkownik jest zalogowany"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Musisz być zalogowany żeby uzyskać dostęp do tej strony.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


# --- Tutaj zaczyna się kod generatora Sudoku ---

# sprawdza czy numer jest uzyty w kwadracie
def czyUzytaBOX(x, plansza, rowStart, colStart, num):
    for i in range(x):
        for j in range(x):
            # Ważne: Sprawdź, czy komórka jest faktycznie równa num, a nie tylko czy num jest w niej użyte.
            # Poprzednia implementacja (num not in plansza[i] / [plansza[i][j] for i in range(x**2)])
            # sprawdzała obecność num w całym wierszu/kolumnie, a tu chodzi o konkretny kwadrat
            if plansza[rowStart + i][colStart + j] == num:
                return False # Numer jest użyty, więc nie jest odpowiedni
    return True # Numer nie jest użyty w kwadracie

# sprawdza czy numer byl uzyty w wierszu
def czyUzytaROW(plansza, i, num):
    return num not in plansza[i]

# sprawdza czy numer byl uzyty w kolumnie
def czyUzytaCOL(x, plansza, j, num):
    # Długość kolumny to x**2 (rozmiar planszy), a nie tylko x
    return num not in [plansza[k][j] for k in range(x**2)] # Zmieniono 'i' na 'k' dla czytelności

# sprawdza czy liczba pasuje w danym miejscu
def czyOdpowiednie(x, plansza, i, j, num):
    # Upewnij się, że używasz planszy do sprawdzania, a nie tylko 'x'
    return (czyUzytaROW(plansza, i, num) and
            czyUzytaCOL(x, plansza, j, num) and
            # Zmieniono logikę, aby sprawdzić, czy numer NIE jest użyty w BOX, ROW, COL
            # Twoje funkcje czyUzyta... zwracają False jeśli numer jest użyty, więc
            # czyOdpowiednie powinno sprawdzać, czy SĄ PRAWDA (czyli num NIE jest użyty)
            czyUzytaBOX(x, plansza, i - i % x, j - j % x, num))


# uzupełnia kwadrat
def fillBox(x, plansza, row, col):
    nums = list(range(1, x**2 + 1))
    random.shuffle(nums) # Tasujemy liczby do użycia w kwadracie
    idx = 0
    for i in range(x):
        for j in range(x):
            plansza[row + i][col + j] = nums[idx]
            idx += 1

# uzupełnia kwadraty po przekątnej
def fillDiagonal(x, plansza):
    for i in range(0, x**2, x):
        fillBox(x, plansza, i, i)

# uzupełnia resztę kwadratów
def fillPozostale(x, plansza, i, j):
    N = x**2
    # Jeśli jesteśmy na końcu kolumn, przejdź do następnego wiersza
    if j == N:
        j = 0
        i += 1

    # Jeśli jesteśmy na końcu wierszy, plansza jest uzupełniona
    if i == N:
        return True

    # Przechodzi do następnej komórki, jeśli już jest zapelniona (z przekątnej)
    if plansza[i][j] != 0:
        return fillPozostale(x, plansza, i, j + 1)

    # Testuje numery od 1 do x^2
    numbers_to_try = list(range(1, N + 1))
    random.shuffle(numbers_to_try) # Tasowanie, aby uzyskać różne rozwiązania

    for num in numbers_to_try:
        # UWAGA: Twoje funkcje czyUzyta... zwracają False, jeśli numer JEST UŻYTY.
        # Więc tutaj, aby sprawdzić, czy JEST ODPOWIEDNIE, musimy odwrócić logikę.
        # czyOdpowiednie zostało poprawione powyżej, więc zakładam, że zwraca True, jeśli jest OK.
        if czyOdpowiednie(x, plansza, i, j, num):
            plansza[i][j] = num
            if fillPozostale(x, plansza, i, j + 1):
                return True
            plansza[i][j] = 0 # Backtrack

    return False # Nie znaleziono odpowiedniej liczby, trzeba się cofnąć


def sudokuGenerator(x):
    N = x**2
    plansza = [[0] * N for _ in range(N)]

    fillDiagonal(x, plansza)
    fillPozostale(x, plansza, 0, 0) # Zacznij od (0, x), bo (0,0) jest już wypełnione w fillDiagonal dla 3x3

    return plansza

# --- Tutaj kończy się Twój kod generatora Sudoku ---


# @app.route('/')
# def index():
#     return render_template('index.html') # Renderuje plik HTML

# # Nowy endpoint API do generowania planszy Sudoku
# from flask import request  # ← dodaj TYLKO JEDEN raz na górze, jeśli jeszcze nie masz

# @app.route('/api/sudoku', methods=['GET'])
# def get_sudoku_board():
#     size_param = request.args.get('size', '9')

#     if size_param == '9':
#         x_val = 3
#     elif size_param == '16':
#         x_val = 4
#     else:
#         return jsonify({'error': 'Nieobsługiwany rozmiar planszy'}), 400

#     generated_board = sudokuGenerator(x_val)
#     return jsonify(generated_board)




# if __name__ == '__main__':
#     app.run(debug=True)

    # === ROUTES ===

@app.route('/')
def index():
    # Sprawdź czy użytkownik jest zalogowany
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    return render_template('index.html', user=user)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        # Walidacja
        if not username or not email or not password:
            flash('Wszystkie pola są wymagane!', 'error')
            return render_template('register.html')
        
        if password != password_confirm:
            flash('Hasła nie są identyczne!', 'error')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('Hasło musi mieć przynajmniej 6 znaków!', 'error')
            return render_template('register.html')
        
        # Sprawdź czy użytkownik już istnieje
        if User.query.filter_by(username=username).first():
            flash('Nazwa użytkownika już zajęta!', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email już zarejestrowany!', 'error')
            return render_template('register.html')
        
        # Utwórz nowego użytkownika
        user = User(username=username, email=email)
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            flash('Konto utworzone pomyślnie! Możesz się teraz zalogować.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('Wystąpił błąd podczas tworzenia konta.', 'error')
            return render_template('register.html')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Podaj nazwę użytkownika i hasło!', 'error')
            return render_template('login.html')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            flash(f'Witaj, {user.username}!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Nieprawidłowa nazwa użytkownika lub hasło!', 'error')
            return render_template('login.html')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Zostałeś wylogowany.', 'info')
    return redirect(url_for('login'))

@app.route('/api/sudoku', methods=['GET'])
@login_required
def get_sudoku_board():
    size_param = request.args.get('size', '9')
    
    if size_param == '9':
        x_val = 3
    elif size_param == '16':
        x_val = 4
    else:
        return jsonify({'error': 'Nieobsługiwany rozmiar planszy'}), 400
    
    generated_board = sudokuGenerator(x_val)
    return jsonify(generated_board)

@app.route('/api/start_game', methods=['POST'])
@login_required
def start_game():
    """Rozpoczyna nową grę"""
    data = request.get_json()
    
    game = SudokuGame(
        user_id=session['user_id'],
        board_size=data.get('board_size'),
        difficulty=data.get('difficulty'),
        status='started'
    )
    
    try:
        db.session.add(game)
        db.session.commit()
        return jsonify({'success': True, 'game_id': game.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Nie udało się rozpocząć gry'}), 500

@app.route('/api/finish_game', methods=['POST'])
@login_required
def finish_game():
    """Kończy grę - sukces, porażka lub poddanie"""
    data = request.get_json()
    game_id = data.get('game_id')
    status = data.get('status')  # 'completed', 'abandoned', 'failed'
    time_seconds = data.get('time_seconds')
    moves_count = data.get('moves_count', 0)
    
    game = SudokuGame.query.filter_by(id=game_id, user_id=session['user_id']).first()
    if not game:
        return jsonify({'error': 'Gra nie znaleziona'}), 404
    
    game.status = status
    game.finished_at = datetime.utcnow()
    game.moves_count = moves_count
    
    if status == 'completed' and time_seconds:
        game.time_seconds = time_seconds
        
        # Sprawdź czy to nowy rekord
        existing_best = SudokuBestScore.query.filter_by(
            user_id=session['user_id'],
            board_size=game.board_size,
            difficulty=game.difficulty
        ).first()
        
        if not existing_best or time_seconds < existing_best.best_time_seconds:
            if existing_best:
                existing_best.best_time_seconds = time_seconds
                existing_best.achieved_at = datetime.utcnow()
                existing_best.game_id = game.id
            else:
                new_best = SudokuBestScore(
                    user_id=session['user_id'],
                    board_size=game.board_size,
                    difficulty=game.difficulty,
                    best_time_seconds=time_seconds,
                    game_id=game.id
                )
                db.session.add(new_best)
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Nie udało się zapisać wyniku'}), 500

@app.route('/api/user_stats')
@login_required
def get_user_stats():
    """Zwraca statystyki użytkownika"""
    user_id = session['user_id']
    
    # Ogólne statystyki
    total_games = SudokuGame.query.filter_by(user_id=user_id).count()
    completed_games = SudokuGame.query.filter_by(user_id=user_id, status='completed').count()
    abandoned_games = SudokuGame.query.filter_by(user_id=user_id, status='abandoned').count()
    
    # Najlepsze czasy
    best_scores = SudokuBestScore.query.filter_by(user_id=user_id).all()
    best_times = {}
    for score in best_scores:
        key = f"{score.board_size}_{score.difficulty}"
        best_times[key] = score.best_time_seconds
    
    return jsonify({
        'total_games': total_games,
        'completed_games': completed_games,
        'abandoned_games': abandoned_games,
        'completion_rate': round(completed_games / total_games * 100, 1) if total_games > 0 else 0,
        'best_times': best_times
    })

if __name__ == '__main__':
    print("Uruchamianie aplikacji...")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)