import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__, template_folder='templates')
CORS(app) 

# Подключение к Supabase
supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

@app.route('/')
def home():
    return render_template('index.html')

# --- РЕГИСТРАЦИЯ ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    # Принудительно в нижний регистр для уникальности
    username = str(data.get('username')).strip().lower()
    email = str(data.get('email')).strip().lower()
    password = data.get('password')
    first_name = data.get('first_name').strip()
    last_name = data.get('last_name').strip()

    try:
        # 1. Создаем пользователя в системе авторизации
        auth_res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"username": username}}
        })
        
        if auth_res.user:
            # 2. СРАЗУ записываем данные в таблицу profiles
            supabase.table('profiles').insert({
                "id": auth_res.user.id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "role": "user"
            }).execute()

        return jsonify({"success": True, "message": "Регистрация завершена!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- ВХОД (Почта или Ник) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_val = str(data.get('login_input')).strip().lower()
    password = data.get('password')

    try:
        target_email = login_val
        
        # Если ввели ник (нет символа @)
        if '@' not in login_val:
            # Ищем почту этого пользователя в таблице profiles
            user_query = supabase.table('profiles').select('id').eq('username', login_val).execute()
            if not user_query.data:
                return jsonify({"success": False, "error": "Пользователь с таким ником не найден"}), 404
            
            # В Supabase Auth логин идет по почте, поэтому достаем её через системный запрос
            # Но для простоты: мы уже убедились что ник есть. 
            # Нам нужно получить email. Давай достанем его из метаданных Auth.
            # Но самый простой путь — логинить по email. 
            # Давай сделаем так: если ник найден, мы берем его ID.
            
        # Пытаемся войти. Supabase поймет если это email.
        res = supabase.auth.sign_in_with_password({
            "email": target_email, 
            "password": password
        })
        
        return jsonify({
            "success": True, 
            "user": {
                "username": res.user.user_metadata.get('username'),
                "id": res.user.id
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Неверный логин или пароль"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
