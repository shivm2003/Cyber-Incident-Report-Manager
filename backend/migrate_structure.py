import argparse
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from database import engine
import models


def get_existing_columns(inspector, table_name):
    return {col["name"] for col in inspector.get_columns(table_name)}


def compile_column_type(column):
    return column.type.compile(engine.dialect)


def add_missing_column(conn, table_name, column):
    sql_type = compile_column_type(column)
    # Use NULLable addition to avoid blocking existing rows.
    sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {sql_type} NULL'
    if column.server_default is not None:
        default_expr = str(column.server_default.arg)
        sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {sql_type} DEFAULT {default_expr} NULL'
    conn.execute(text(sql))


def migrate_structure(dry_run=False, verbose=False):
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in models.Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            print(f"[+] Table '{table.name}' does not exist and will be created.")
            if not dry_run:
                try:
                    table.create(bind=engine)
                    print(f"    Created table '{table.name}'.")
                except SQLAlchemyError as err:
                    print(f"    [X] Failed to create table '{table.name}': {err}")
        else:
            if verbose:
                print(f"[*] Table '{table.name}' already exists. Checking columns...")
            existing_columns = get_existing_columns(inspector, table.name)
            for column in table.columns:
                if column.name not in existing_columns:
                    print(f"[+] Column '{column.name}' is missing from table '{table.name}'.")
                    if not dry_run:
                        try:
                            with engine.begin() as conn:
                                add_missing_column(conn, table.name, column)
                            print(f"    Added column '{column.name}' to '{table.name}'.")
                        except SQLAlchemyError as err:
                            print(f"    [X] Failed to add column '{column.name}' to '{table.name}': {err}")
                elif verbose:
                    print(f"    Column '{column.name}' exists in '{table.name}'.")

    if not dry_run:
        print("[+] DB structure migration complete.")
    else:
        print("[+] Dry run complete. No changes were applied.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate the database structure only: create missing tables and columns.")
    parser.add_argument("--dry-run", action="store_true", help="Show structure changes without applying them.")
    parser.add_argument("--verbose", action="store_true", help="Print detailed table/column checks.")
    args = parser.parse_args()

    migrate_structure(dry_run=args.dry_run, verbose=args.verbose)
