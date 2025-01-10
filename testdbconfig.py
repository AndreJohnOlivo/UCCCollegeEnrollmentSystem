from configparser import ConfigParser
import psycopg2

def config(filename="database.ini", section="postgresql"):
    # Create parser
    parser = ConfigParser()
    # To be able to read config file
    parser.read(filename)
    print(f"Reading config file: {filename}")

    db = {}
    if parser.has_section(section):
        print(f"Section '{section}' found")
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception(f"Section '{section}' is not found in the {filename} file.")
    
    print("Database configuration parameters:", db)  # Debug print
    return db

def connect():
    try:
        # Read connection parameters
        params = config()
        
        # Connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        connection = psycopg2.connect(**params)
        
        # Create a cursor
        cursor = connection.cursor()
        
        # Execute a statement
        print('PostgreSQL database version:')
        cursor.execute('SELECT version()')
        
        # Display the PostgreSQL database server version
        db_version = cursor.fetchone()
        print(db_version)
        
        # Keeping the connection open
        print("Database connection is open. You can now perform database operations.")
        
        return connection, cursor
    
    except Exception as error:
        print(f"Error: {error}")
        if connection is not None:
            connection.close()
            print("Database connection closed.")

# Run the connect function and keep the connection open
connection, cursor = connect()

# You can perform further database operations here
# For example, fetching data from a table
# Replace 'your_table_name' with your actual table name
try:
    cursor.execute('SELECT * FROM your_table_name')
    rows = cursor.fetchall()
    print("Data from your_table_name:")
    for row in rows:
        print(row)
except Exception as error:
    print(f"Error while fetching data: {error}")

# Note: The connection and cursor will remain open until you explicitly close them
# To close them, use the following lines:
# cursor.close()
# connection.close()
# print("Database connection closed.")