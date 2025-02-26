from flask import Flask, request, jsonify, render_template, url_for, redirect
from flask_cors import CORS
import psycopg2
from configparser import ConfigParser
import os

app = Flask(__name__, template_folder='UCCEnrollmentSystemTest/templates', static_folder='UCCEnrollmentSystemTest/static')
CORS(app)

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
    data = request.form
    firstname = data.get('firstname')
    middlename = data.get('middlename')
    surname = data.get('surname')
    suffix = data.get('suffix')
    dateofbirth = data.get('dateofbirth')
    homeaddress = data.get('homeaddress')
    studenttype = data.get('studenttype')
    sexatbirth = data.get('sexatbirth')
    civilstatus = data.get('civilstatus')

    # Debug: Log the received form data
    print("Received form data:")
    print(f"First Name: {firstname}, Middle Name: {middlename}, Surname: {surname}, Suffix: {suffix}")
    print(f"Date of Birth: {dateofbirth}, Home Address: {homeaddress}, Student Type: {studenttype}")
    print(f"Sex at Birth: {sexatbirth}, Civil Status: {civilstatus}")

    # Check if any required field is missing
    if not firstname or not surname or not dateofbirth or not homeaddress or not studenttype or not sexatbirth or not civilstatus:
        print("Error: Missing required fields!")
        return jsonify({"error": "All fields are required. Please fill in all the fields."}), 400

    connection, cursor = connect()
    if connection is None or cursor is None:
        return jsonify({"error": "Database connection failed."}), 500

    try:
        # Log the attempt to insert data
        print("Inserting data into the database...")

        cursor.execute(""" 
            INSERT INTO ucccollegerepository (firstname, middlename, surname, suffix, dateofbirth, homeaddress, studenttype, sexatbirth, civilstatus)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s ,%s)
        """, (firstname, middlename, surname, suffix, dateofbirth, homeaddress, studenttype, sexatbirth, civilstatus))
        
        connection.commit()

        print("Data inserted successfully. Redirecting to requirements page...")

        # Redirect to 'requirements.html' page once done
        return redirect(url_for('requirements'))
        
    except Exception as error:
        print(f"Error during database insert: {error}")
        connection.rollback()
        return jsonify({"error": str(error)}), 400
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
            print("Database connection closed.")

@app.route('/requirements')
def requirements():
    return render_template('requirements.html')

if __name__ == '__main__':
    from waitress import serve
    import socket

    hostname = socket.gethostname()
    host_ip = socket.gethostbyname(hostname)
    port = 5000

    print(f"Serving Flask app on http://{host_ip}:{port} (accessible locally and from other devices on the same network)")
    serve(app, host='0.0.0.0', port=port)
