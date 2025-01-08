import psycopg2

# Database connection parameters
db_params = {
    'dbname': 'college_enrollment',
    'user': 'your_username',
    'password': 'your_password',
    'host': 'localhost',
    'port': '5432'
}

# Connect to the PostgreSQL database
try:
    connection = psycopg2.connect(**db_params)
    cursor = connection.cursor()
    print("Database connection successful")

    # Example query to create a table
    create_table_query = '''
    CREATE TABLE IF NOT EXISTS students (
        student_id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        enrollment_date DATE NOT NULL
    );
    '''
    cursor.execute(create_table_query)
    connection.commit()
    print("Table created successfully")

    # Example query to insert a new student
    insert_student_query = '''
    INSERT INTO students (first_name, last_name, enrollment_date)
    VALUES ('John', 'Doe', '2023-01-01');
    '''
    cursor.execute(insert_student_query)
    connection.commit()
    print("Student inserted successfully")

except Exception as error:
    print(f"Error connecting to database: {error}")

finally:
    if connection:
        cursor.close()
        connection.close()
        print("Database connection closed")