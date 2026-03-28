import os
import uuid
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from supabase import create_client, Client

app = Flask(__name__, template_folder='templates')
CORS(app)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def home():
    return render_template('index.html')

# --- ЗАГРУЗКА ФАЙЛОВ (Скрепка) ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Нет файла"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "Файл не выбран"}), 400
    
    try:
        # Генерируем уникальное имя файла, чтобы они не перезаписывали друг друга
        ext = file.filename.split('.')[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        
        # Читаем байты и загружаем в бакет 'media'
        file_bytes = file.read()
        supabase.storage.from_('media').upload(filename, file_bytes, {"content-type": file.content_type})
        
        # Получаем публичную ссылку
        public_url = supabase.storage.from_('media').get_public_url(filename)
        return jsonify({"success": True, "url": public_url}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- ПОЛЬЗОВАТЕЛИ (Для списков) ---
@app.route('/api/users', methods=['GET'])
def get_users():
    res = supabase.table('profiles').select('*').execute()
    return jsonify({"success": True, "users": res.data}), 200

# --- ПОСТЫ (CRUD) ---
@app.route('/api/posts', methods=['GET'])
def get_posts():
    res = supabase.table('posts').select('*').order('created_at', desc=True).execute()
    return jsonify({"success": True, "posts": res.data}), 200

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    res = supabase.table('posts').insert(data).execute()
    return jsonify({"success": True, "data": res.data}), 200

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.json
    res = supabase.table('posts').update(data).eq('id', post_id).execute()
    return jsonify({"success": True}), 200

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    supabase.table('posts').delete().eq('id', post_id).execute()
    return jsonify({"success": True}), 200

# --- ВХОД И РЕГИСТРАЦИЯ ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_val = str(data.get('login_input')).strip().lower()
    try:
        email_to_auth = login_val
        if '@' not in login_val:
            user_data = supabase.table('profiles').select('id').eq('username', login_val).execute()
            if not user_data.data:
                return jsonify({"success": False, "error": "Ник не найден"}), 404
                
        res = supabase.auth.sign_in_with_password({"email": email_to_auth, "password": data.get('password')})
        profile = supabase.table('profiles').select('*').eq('id', res.user.id).single().execute()
        return jsonify({"success": True, "user": profile.data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": "Неверный пароль"}), 400

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = str(data.get('username')).strip().lower()
    email = str(data.get('email')).strip().lower()
    
    try:
        auth_res = supabase.auth.sign_up({"email": email, "password": data['password'], "options": {"data": {"username": username}}})
        if auth_res.user:
            role = 'assistant_manager' if username == 'wnsuuu' else 'user'
            supabase.table('profiles').insert({
                "id": auth_res.user.id, "username": username,
                "first_name": data.get('first_name'), "last_name": data.get('last_name'), "role": role
            }).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# --- НАЗНАЧЕНИЕ РУКОВОДИТЕЛЯ ---
@app.route('/api/promote', methods=['POST'])
def promote():
    target = request.json.get('target').strip().lower()
    supabase.table('profiles').update({"role": "manager"}).eq('username', target).execute()
    return jsonify({"success": True, "message": f"{target} назначен руководителем"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
