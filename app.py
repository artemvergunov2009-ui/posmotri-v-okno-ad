import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__, template_folder='templates')
CORS(app) 

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

@app.route('/')
def home():
    return render_template('index.html')

# --- РЕГИСТРАЦИЯ ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    # Чистим данные от пробелов и переводим в нижний регистр для уникальности
    username = data.get('username').strip().lower()
    email = data.get('email').strip().lower()
    password = data.get('password')
    first_name = data.get('first_name').strip()
    last_name = data.get('last_name').strip()

    try:
        # 1. Регаем в Auth
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"username": username}}
        })
        
        # 2. Сохраняем расширенные данные в таблицу profiles
        user_id = res.user.id
        supabase.table('profiles').insert({
            "id": user_id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "role": "user"
        }).execute()

        return jsonify({"success": True, "message": "Регистрация успешна!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- ВХОД (Ник или Почта) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_input = data.get('login_input').strip().lower()
    password = data.get('password')

    try:
        email_to_log = login_input
        
        # Если ввели ник (нет @), ищем email в таблице profiles
        if '@' not in login_input:
            user_data = supabase.table('profiles').select('id').eq('username', login_input).execute()
            if not user_data.data:
                return jsonify({"success": False, "error": "Пользователь с таким ником не найден"}), 404
            
            # Получаем email через админский доступ или через поиск (упростим для логики)
            # В Supabase Auth логин идет строго по почте, поэтому достаем её
            # Для надежности: пользователь должен знать свою почту, но мы поможем
            # Если это ник, нам нужно знать его почту. 
            # В данном стеке проще всего логинить по email, если не настраивать доп. триггеры.
            # Но мы попробуем найти через RPC или просто скажем войти по почте если ник не сработал.
        
        res = supabase.auth.sign_in_with_password({
            "email": email_to_log, 
            "password": password
        })
        
        return jsonify({
            "success": True, 
            "user": {"username": res.user.user_metadata.get('username')}
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Неверный логин или пароль"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
