from flask import Flask, request, render_template
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
    connection = None  # Initialize the connection variable
    cursor = None  # Initialize the cursor variable
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
        return None, None  # Return None if there's an error

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    student_number = request.form['studentNumber']
    student_name = request.form['studentName']
    email = request.form['email']
    phone = request.form['phone']
    home_address = request.form['homeAddress']
    
    connection, cursor = connect()
    if connection is None or cursor is None:
        return "Database connection failed."
    
    try:
        cursor.execute(
            "INSERT INTO ucccollegerepository (student_number, student_name, email_address, phone_number, home_address) VALUES (%s, %s, %s, %s, %s)",
            (student_number, student_name, email, phone, home_address)
        )
        connection.commit()
        return f"Data submitted: {student_number}, {student_name}, {email}, {phone}, {home_address}"
    except Exception as error:
        return f"Error while inserting data: {error}"
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
        print("Database connection closed.")

if __name__ == '__main__':
    app.run(debug=True)
