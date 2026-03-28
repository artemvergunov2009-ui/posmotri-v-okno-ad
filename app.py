import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__)
# Разрешаем запросы с нашего красивого HTML-фронтенда
CORS(app) 

# Получаем переменные окружения напрямую (Render подставит их сам)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Защита от запуска без настроенных переменных
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("КРИТИЧЕСКАЯ ОШИБКА: Переменные окружения SUPABASE_URL или SUPABASE_KEY не заданы в Render!")

# Инициализируем подключение к базе данных
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "API работает отлично! Ждем запросов."}), 200

# --- 1. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ---
@app.route('/api/register', methods=['POST'])
def register():
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
    data = request.json
    user_id = data.get('user_id') 
    content = data.get('content')

    try:
        # Записываем комментарий в таблицу 'comments'
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
    data = request.json
    user_id = data.get('user_id')
    post_id = data.get('post_id') 

    try:
        # Записываем лайк в таблицу 'likes'
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
    data = request.json
    # В реальном проекте тут нужна проверка: действительно ли тот, кто делает запрос, имеет права админа
    admin_id = data.get('admin_id') 
    target_user_id = data.get('target_user_id')
    new_role = data.get('new_role') # Например: 'manager' или 'admin'

    try:
        # Обновляем роль пользователя в публичной таблице профилей
        res = supabase.table('profiles').update({"role": new_role}).eq('id', target_user_id).execute()
        return jsonify({"success": True, "message": f"Пользователю назначена роль: {new_role}"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    # Render использует свою переменную PORT, по умолчанию ставим 5000
    port = int(os.environ.get('PORT', 5000))
    # host='0.0.0.0' обязателен для работы на серверах Render
    app.run(host='0.0.0.0', port=port)
