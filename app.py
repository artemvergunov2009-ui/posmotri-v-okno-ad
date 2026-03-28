import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__, template_folder='templates')
CORS(app)

# Подключение к Supabase через переменные окружения Render
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def home():
    return render_template('index.html')

# --- РЕГИСТРАЦИЯ ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = str(data.get('username')).strip().lower()
    email = str(data.get('email')).strip().lower()
    password = data.get('password')
    
    try:
        # Регистрация в Auth
        auth_res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"username": username}}
        })
        
        if auth_res.user:
            # Создание профиля. Если ник 'wnsuuu', даем спец. роль
            role = 'assistant_manager' if username == 'wnsuuu' else 'user'
            supabase.table('profiles').insert({
                "id": auth_res.user.id,
                "username": username,
                "first_name": data.get('first_name'),
                "last_name": data.get('last_name'),
                "role": role
            }).execute()
            
        return jsonify({"success": True, "message": "Аккаунт создан!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- ВХОД ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_val = str(data.get('login_input')).strip().lower()
    password = data.get('password')

    try:
        # Если ввели ник, ищем почту в профилях
        email_to_auth = login_val
        if '@' not in login_val:
            user_data = supabase.table('profiles').select('id').eq('username', login_val).execute()
            if not user_data.data:
                return jsonify({"success": False, "error": "Ник не найден"}), 404
            # В реальном приложении тут нужен вызов RPC, но для простоты просим войти по Email если ник не сработал
        
        res = supabase.auth.sign_in_with_password({"email": email_to_auth, "password": password})
        
        # Получаем роль из профиля
        profile = supabase.table('profiles').select('role, username').eq('id', res.user.id).single().execute()
        
        return jsonify({
            "success": True,
            "user": {
                "id": res.user.id,
                "username": profile.data['username'],
                "role": profile.data['role']
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Ошибка входа. Проверьте данные."}), 400

# --- ПОСТЫ ---
@app.route('/api/posts', methods=['GET'])
def get_posts():
    res = supabase.table('posts').select('*').order('created_at', desc=True).execute()
    return jsonify(res.data)

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    supabase.table('posts').insert(data).execute()
    return jsonify({"success": True})

# --- ЛАЙКИ ---
@app.route('/api/like', methods=['POST'])
def like_post():
    data = request.json
    try:
        supabase.table('likes').insert({"user_id": data['user_id'], "post_id": data['post_id']}).execute()
        return jsonify({"success": True})
    except:
        # Если уже лайкнуто, удаляем лайк
        supabase.table('likes').delete().match({"user_id": data['user_id'], "post_id": data['post_id']}).execute()
        return jsonify({"success": True, "removed": True})

# --- НАЗНАЧЕНИЕ РУКОВОДИТЕЛЯ ---
@app.route('/api/promote', methods=['POST'])
def promote():
    data = request.json
    target = data.get('target').strip().lower()
    supabase.table('profiles').update({"role": "manager"}).eq('username', target).execute()
    return jsonify({"success": True, "message": f"Пользователь {target} назначен руководителем"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
