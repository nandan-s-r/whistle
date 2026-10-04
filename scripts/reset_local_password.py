"""Local operator password reset. Passwords never enter shell arguments or logs."""
import argparse
import getpass
import os
from backend.config import load_runtime_config


def main():
    load_runtime_config()
    if os.getenv('ENVIRONMENT')=='production' or os.getenv('AUTH_PROVIDER')=='supabase':
        raise RuntimeError('Use Supabase account recovery for the production workspace.')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email');args=parser.parse_args()
    password=getpass.getpass('New private password: ')
    if password!=getpass.getpass('Confirm private password: '): raise ValueError('Passwords do not match.')
    from backend.api import validate_password_complexity
    from backend.auth import get_password_hash, retired_credential
    from database.db import SessionLocal
    from database.models import User
    validate_password_complexity(password)
    with SessionLocal() as db:
        user=db.query(User).filter(User.email==args.email).first()
        if not user: raise ValueError('Local account not found.')
        user.hashed_password=get_password_hash(password)
        if retired_credential(user): raise ValueError('The former shared password cannot be reused.')
        user.is_active=True;db.commit()
    print('Local password reset. Research and ownership were preserved.')


if __name__=='__main__':main()
