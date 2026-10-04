"""Copy a stopped local application into an empty PostgreSQL database; never delete source data."""
import os
from pathlib import Path
import sys
from sqlalchemy import create_engine, select, func, text, inspect

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database.models import Base
from database import workspace  # Register additive tables.
from database.urls import normalize_database_url


def copy_records(source, destination):
    if source.dialect.name != "sqlite" or destination.dialect.name != "postgresql":
        raise ValueError("Migration requires a SQLite source and PostgreSQL destination")
    Base.metadata.create_all(destination)
    counts = {}
    with source.connect() as source_conn, destination.begin() as dest_conn:
        for table in Base.metadata.sorted_tables:
            if dest_conn.scalar(select(func.count()).select_from(table)):
                raise ValueError("Destination must be empty. No existing records will be replaced.")
        source_tables = set(inspect(source).get_table_names())
        for table in Base.metadata.sorted_tables:
            count = 0
            if table.name in source_tables:
                results = source_conn.execute(select(table)).mappings()
                while batch := results.fetchmany(500):
                    dest_conn.execute(table.insert(), [dict(row) for row in batch])
                    count += len(batch)
            counts[table.name] = count
            if count != dest_conn.scalar(select(func.count()).select_from(table)):
                raise ValueError("Record-count verification failed; migration transaction rolled back")
            for column in table.primary_key.columns:
                if column.name == 'id' and str(column.type) == 'INTEGER':
                    sequence = dest_conn.scalar(text("SELECT pg_get_serial_sequence(:table_name, :column_name)"), {'table_name':table.name,'column_name':column.name})
                    if sequence:
                        maximum = dest_conn.scalar(select(func.max(column)))
                        dest_conn.execute(text("SELECT setval(CAST(:sequence AS regclass), :maximum, :has_rows)"),
                                          {'sequence':sequence,'maximum':maximum or 1,'has_rows':maximum is not None})
    return counts


if __name__ == '__main__':
    from backend.config import load_runtime_config
    load_runtime_config()
    destination_url = os.getenv('POSTGRES_MIGRATION_URL')
    if not destination_url:
        raise SystemExit('Set POSTGRES_MIGRATION_URL privately. Credentials are never printed or accepted as command arguments.')
    source_url = os.getenv('SQLITE_MIGRATION_URL', 'sqlite:///./antigravity.db')
    source_engine = create_engine(source_url)
    destination_engine = create_engine(normalize_database_url(destination_url), pool_pre_ping=True)
    try:
        counts = copy_records(source_engine, destination_engine)
        print('Migration committed after record-count verification. SQLite source preserved.')
        for name, count in counts.items():
            print(f'{name}: {count} records')
    except Exception:
        raise SystemExit('Migration did not complete. Existing data was not replaced. Check connectivity and use an empty destination.')
    finally:
        source_engine.dispose()
        destination_engine.dispose()
