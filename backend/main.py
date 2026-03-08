from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RevConnect API")

# Configure CORS so our HTML frontend can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local development (not for prod)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Temporary function to seed some initial users and posts if DB is empty
def seed_database(db: Session):
    if not db.query(models.User).first():
        print("Seeding database...")
        # Create users
        alex = models.User(username="testuser", email="alex@example.com", full_name="Alex Rivera", avatar="https://i.pravatar.cc/150?img=11", hashed_password="fakehashedpassword")
        sarah = models.User(username="schen_dev", email="sarah@example.com", full_name="Sarah Chen", avatar="https://i.pravatar.cc/150?img=33", hashed_password="fakehashedpassword")
        marcus = models.User(username="marcus_j", email="marcus@example.com", full_name="Marcus Johnson", avatar="https://i.pravatar.cc/150?img=68", hashed_password="fakehashedpassword")
        
        db.add_all([alex, sarah, marcus])
        db.commit()

        # Create posts
        post1 = models.Post(
            content="Just finished building my first Next.js application! The Developer Experience is absolutely incredible. Server Components are the future of React. 🚀💻",
            image="https://picsum.photos/seed/tech/800/400",
            time="2 hours ago",
            likes=124, comments=28, retweets=15, is_liked=False,
            owner_id=sarah.id
        )
        post2 = models.Post(
            content="Anyone else love the new glassmorphism trends? Combining it with a dark theme just makes everything pop. I've been experimenting with backdrop-filter in CSS and it's so satisfying to get right. 🎨✨",
            image=None,
            time="5 hours ago",
            likes=342, comments=56, retweets=89, is_liked=True,
            owner_id=marcus.id
        )
        post3 = models.Post(
             content="Beautiful sunrise this morning. Sometimes you just have to step away from the keyboard and appreciate nature for a bit. ☕️🌅",
             image="https://picsum.photos/seed/nature/800/500",
             time="8 hours ago",
             likes=892, comments=104, retweets=45, is_liked=False,
             owner_id=sarah.id
        )

        db.add_all([post1, post2, post3])
        db.commit()
        print("Database seeded.")

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_database(db)
    db.close()


@app.get("/")
def read_root():
    return {"message": "Welcome to RevConnect API"}

@app.post("/api/login")
def login(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    return {"message": "Success", "user": {"id": user.id, "name": user.full_name, "handle": "@" + user.username, "avatar": user.avatar}}

@app.get("/api/posts", response_model=list[models.PostSchema])
def get_posts(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    # Get posts, descending order by ID (newest first)
    posts = db.query(models.Post).order_by(models.Post.id.desc()).offset(skip).limit(limit).all()
    return posts

@app.post("/api/posts", response_model=models.PostSchema)
def create_post(post: models.PostCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_post = models.Post(
        content=post.content,
        image=post.image,
        time=post.time,
        owner_id=user_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@app.post("/api/posts/{post_id}/like")
def toggle_like(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
         raise HTTPException(status_code=404, detail="Post not found")
    
    post.is_liked = not post.is_liked
    if post.is_liked:
        post.likes += 1
    else:
        post.likes -= 1
        
    db.commit()
    db.refresh(post)
    return {"likes": post.likes, "is_liked": post.is_liked}
