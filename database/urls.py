"""Select the installed Psycopg 3 driver for common PostgreSQL connection URLs."""
def normalize_database_url(value):
    if value.startswith("postgres://"):
        return "postgresql+psycopg://" + value[len("postgres://"):]
    if value.startswith("postgresql://"):
        return "postgresql+psycopg://" + value[len("postgresql://"):]
    return value
