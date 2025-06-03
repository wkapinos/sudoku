from flask import Flask, render_template, jsonify # Dodano jsonify
import random

app = Flask(__name__)

# --- Tutaj zaczyna się Twój kod generatora Sudoku ---

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


@app.route('/')
def index():
    return render_template('index.html') # Renderuje plik HTML

# Nowy endpoint API do generowania planszy Sudoku
from flask import request  # ← dodaj TYLKO JEDEN raz na górze, jeśli jeszcze nie masz

@app.route('/api/sudoku', methods=['GET'])
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




if __name__ == '__main__':
    app.run(debug=True)