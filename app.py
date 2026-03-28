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

# --- ПОЛЬЗОВАТЕЛИ ---
@app.route('/api/users', methods=['GET'])
def get_users():
    res = supabase.table('profiles').select('*').execute()
    return jsonify(res.data)

# --- ПОСТЫ (CRUD) ---
@app.route('/api/posts', methods=['GET'])
def get_posts():
    # Новые посты сверху (по дате создания)
    res = supabase.table('posts').select('*').order('created_at', desc=True).execute()
    return jsonify(res.data)

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    res = supabase.table('posts').insert(data).execute()
    return jsonify({"success": True, "data": res.data})

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.json
    # Обновляем данные, не меняя created_at (пост останется на своем старом месте)
    res = supabase.table('posts').update(data).eq('id', post_id).execute()
    return jsonify({"success": True})

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    supabase.table('posts').delete().eq('id', post_id).execute()
    return jsonify({"success": True})

# --- ОСТАЛЬНЫЕ РОУТЫ (LOGIN/REGISTER/PROMOTE) ---
# [Код авторизации остается из прошлого шага, он работает исправно]
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_val = str(data.get('login_input')).strip().lower()
    try:
        res = supabase.auth.sign_in_with_password({"email": login_val, "password": data.get('password')})
        profile = supabase.table('profiles').select('*').eq('id', res.user.id).single().execute()
        return jsonify({"success": True, "user": profile.data}), 200
    except:
        return jsonify({"success": False, "error": "Ошибка входа"}), 400

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    try:
        auth_res = supabase.auth.sign_up({"email": data['email'], "password": data['password']})
        role = 'assistant_manager' if data['username'].lower() == 'wnsuuu' else 'user'
        supabase.table('profiles').insert({
            "id": auth_res.user.id, "username": data['username'].lower(),
            "first_name": data['first_name'], "last_name": data['last_name'], "role": role
        }).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
