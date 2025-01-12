from flask import Flask, request, jsonify, render_template
import psycopg2
from configparser import ConfigParser

app = Flask(__name__)

def config(filename="database.ini", section="postgresql"):
    parser = ConfigParser()
    parser.read(filename)
    db = {}
    if parser.has_section(section):
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception(f"Section '{section}' is not found in the {filename} file.")
    return db

def connect():
    connection = None
    cursor = None
    try:
        params = config()
        print('Connecting to the PostgreSQL database...')
        connection = psycopg2.connect(**params)
        cursor = connection.cursor()
        print('PostgreSQL database version:')
        cursor.execute('SELECT version()')
        db_version = cursor.fetchone()
        print(db_version)
        print("Database connection is open. You can now perform database operations.")
        return connection, cursor
    except Exception as error:
        print(f"Error: {error}")
        if connection is not None:
            connection.close()
            print("Database connection closed.")
        return None, None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/students', methods=['POST'])
def add_student():
    data = request.json
    student_number = data.get('student_number')
    student_name = data.get('student_name')
    email = data.get('email')
    phone = data.get('phone')
    home_address = data.get('home_address')

    connection, cursor = connect()
    if connection is None or cursor is None:
        return jsonify({"error": "Database connection failed."}), 500

    try:
        cursor.execute(
            "INSERT INTO ucccollegerepository (student_number, student_name, email_address, phone_number, home_address) VALUES (%s, %s, %s, %s, %s)",
            (student_number, student_name, email, phone, home_address)
        )
        connection.commit()
        return jsonify({"message": "Added successfully!"}), 201
    except Exception as error:
        connection.rollback()
        return jsonify({"error": str(error)}), 400
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

@app.route('/students', methods=['GET'])
def get_students():
    connection, cursor = connect()
    if connection is None or cursor is None:
        return jsonify({"error": "Database connection failed."}), 500
    
    try:
        cursor.execute("SELECT * FROM ucccollegerepository ORDER BY student_name ASC")
        students = cursor.fetchall()
        return jsonify(students)
    finally:
        cursor.close()
        connection.close()

if __name__ == '__main__':
    from waitress import serve
    print("Serving Flask app on http://0.0.0.0:5000 or http://localhost:5000")
    serve(app, host='0.0.0.0', port=5000)
