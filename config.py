from configparser import ConfigParser

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
