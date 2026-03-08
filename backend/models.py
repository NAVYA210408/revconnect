from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from pydantic import BaseModel

# SQLAlchemy Models (Database)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    avatar = Column(String)
    hashed_password = Column(String)

    posts = relationship("Post", back_populates="owner")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    image = Column(String, nullable=True)
    time = Column(String)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    retweets = Column(Integer, default=0)
    is_liked = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="posts")


# Pydantic Models (Validation / API Schemas)
class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    avatar: str | None = None

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: int
    
    class Config:
        orm_mode = True

class PostBase(BaseModel):
    content: str
    image: str | None = None
    time: str

class PostCreate(PostBase):
    pass

class PostSchema(PostBase):
    id: int
    likes: int
    comments: int
    retweets: int
    is_liked: bool
    owner_id: int
    owner: UserSchema

    class Config:
        orm_mode = True
