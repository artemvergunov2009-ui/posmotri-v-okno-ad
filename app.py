import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__)
# Разрешаем запросы с нашего HTML-фронтенда
CORS(app) 

# Получаем переменные окружения напрямую (Render подставит их сам)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Инициализируем подключение к базе данных (если ключи есть)
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("ВНИМАНИЕ: Переменные SUPABASE_URL или SUPABASE_KEY не заданы. Сервер работает в тестовом режиме.")

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "API работает отлично! Ждем запросов."}), 200

# --- 1. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ---
@app.route('/api/register', methods=['POST'])
def register():
    if not supabase:
        return jsonify({"success": False, "error": "База данных не подключена (нет ключей)"}), 500
        
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')

    try:
        # Регистрация через встроенную авторизацию Supabase
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "username": username,
                    "role": "user" # Выдаем базовую роль при регистрации
                }
            }
        })
        return jsonify({"success": True, "message": "Успешная регистрация!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- 2. ДОБАВЛЕНИЕ КОММЕНТАРИЯ ---
@app.route('/api/comments', methods=['POST'])
def add_comment():
    if not supabase:
        return jsonify({"success": False, "error": "База данных не подключена"}), 500
        
    data = request.json
    user_id = data.get('user_id') 
    content = data.get('content')

    try:
        res = supabase.table('comments').insert({
            "user_id": user_id,
            "content": content
        }).execute()
        return jsonify({"success": True, "message": "Комментарий добавлен!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- 3. ПОСТАВИТЬ ЛАЙК ---
@app.route('/api/likes', methods=['POST'])
def add_like():
    if not supabase:
        return jsonify({"success": False, "error": "База данных не подключена"}), 500
        
    data = request.json
    user_id = data.get('user_id')
    post_id = data.get('post_id') 

    try:
        res = supabase.table('likes').insert({
            "user_id": user_id,
            "post_id": post_id
        }).execute()
        return jsonify({"success": True, "message": "Лайк поставлен!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- 4. НАЗНАЧЕНИЕ РУКОВОДИТЕЛЕЙ (Смена ролей) ---
@app.route('/api/assign_role', methods=['POST'])
def assign_role():
    if not supabase:
        return jsonify({"success": False, "error": "База данных не подключена"}), 500
        
    data = request.json
    admin_id = data.get('admin_id') 
    target_user_id = data.get('target_user_id')
    new_role = data.get('new_role') 

    try:
        res = supabase.table('profiles').update({"role": new_role}).eq('id', target_user_id).execute()
        return jsonify({"success": True, "message": f"Пользователю назначена роль: {new_role}"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
