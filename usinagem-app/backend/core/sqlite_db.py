from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Caminho do arquivo SQLite (na pasta backend/)
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'app.sqlite3')
DB_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

# Para SQLite + threads no FastAPI
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependência para FastAPI

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
