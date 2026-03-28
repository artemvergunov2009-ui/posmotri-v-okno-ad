import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase import create_client, Client

# Настройка путей, чтобы Flask точно видел папку templates
base_dir = os.path.abspath(os.path.dirname(__file__))
template_dir = os.path.join(base_dir, 'templates')

app = Flask(__name__, template_folder=template_dir)
CORS(app) 

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Главная страница - должна отдавать index.html
@app.route('/')
def home():
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Ошибка: Файл index.html не найден в папке templates. Ошибка: {str(e)}", 404

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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.get('email'),
            "password": data.get('password')
        })
        return jsonify({
            "success": True, 
            "user": {"id": res.user.id, "email": res.user.email, "username": res.user.user_metadata.get('username')}
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Неверный логин или пароль"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
