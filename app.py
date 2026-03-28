import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__)
CORS(app) 

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/', methods=['GET'])
def home():
    return "Сервер MediaStudio запущен и готов к работе! 🚀", 200

# --- РЕГИСТРАЦИЯ ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    try:
        res = supabase.auth.sign_up({
            "email": data.get('email'),
            "password": data.get('password'),
            "options": {"data": {"username": data.get('username'), "role": "user"}}
        })
        return jsonify({"success": True, "message": "Регистрация успешна!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- ВХОД (НОВОЕ!) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        # Пытаемся войти через Supabase
        res = supabase.auth.sign_in_with_password({
            "email": data.get('email'),
            "password": data.get('password')
        })
        # Возвращаем данные пользователя и токен
        return jsonify({
            "success": True, 
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "username": res.user.user_metadata.get('username')
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Неверный логин или пароль"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
