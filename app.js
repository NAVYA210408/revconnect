// RevConnect Frontend Logic

const API_BASE_URL = 'http://localhost:8000/api';

// Current User State
let currentUser = null;
let currentPosts = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const feedContainer = document.getElementById('feed-container');
const postInput = document.getElementById('post-input');
const btnPost = document.getElementById('btn-post');
const navItems = document.querySelectorAll('.nav-item');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username').value;
        const btn = loginForm.querySelector('button');
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
        btn.disabled = true;
        
        try {
            const response = await fetch(`${API_BASE_URL}/login?username=${encodeURIComponent(usernameInput)}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                
                // Switch views
                authView.classList.add('hidden');
                appView.classList.remove('hidden');
                
                // Update profile visuals with logged in user data
                document.getElementById('mobile-profile-img').src = currentUser.avatar;
                const sidebarProfile = document.getElementById('user-profile-btn');
                sidebarProfile.querySelector('.avatar').src = currentUser.avatar;
                sidebarProfile.querySelector('.user-name').textContent = currentUser.name;
                sidebarProfile.querySelector('.user-handle').textContent = currentUser.handle;
                
                document.querySelector('.create-post-top .avatar').src = currentUser.avatar;
                
                // Fetch and render feed
                await loadPosts();
            } else {
                alert("Login failed! Try 'testuser', 'schen_dev', or 'marcus_j'");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Could not connect to backend server. Make sure it is running.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            navItems.forEach(n => n.classList.remove('active'));
            // Add to clicked
            item.classList.add('active');
            
            // Mock changing views
            const view = item.getAttribute('data-view');
            const headerTitle = document.querySelector('.page-header h2');
            headerTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
            
            // Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            if (view === 'home') {
                loadPosts();
            }
        });
    });

    // Post Creation Logic
    postInput.addEventListener('input', () => {
        if (postInput.value.trim().length > 0) {
            btnPost.removeAttribute('disabled');
        } else {
            btnPost.setAttribute('disabled', 'true');
        }
        
        // Auto-resize textarea
        postInput.style.height = 'auto';
        postInput.style.height = (postInput.scrollHeight) + 'px';
    });

    btnPost.addEventListener('click', async () => {
        if (!currentUser) return;
        
        const content = postInput.value.trim();
        if (!content) return;
        
        btnPost.disabled = true;
        btnPost.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
            const response = await fetch(`${API_BASE_URL}/posts?user_id=${currentUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    image: null,
                    time: "Just now"
                })
            });
            
            if (response.ok) {
                // Refresh feed
                await loadPosts();
                
                // Reset input
                postInput.value = '';
                postInput.style.height = '60px';
            }
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post.");
        } finally {
            btnPost.innerHTML = 'Post';
        }
    });
});

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (response.ok) {
            currentPosts = await response.json();
            renderFeed(currentPosts);
        }
    } catch (error) {
        console.error("Failed to fetch posts:", error);
    }
}

// Render Feed Logic
function renderFeed(posts) {
    feedContainer.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.className = 'glass-panel post-card';
        
        // Construct standard HTML for post
        let imageHtml = '';
        if (post.image) {
            imageHtml = `<img src="${post.image}" alt="Post attachment" class="post-image" loading="lazy">`;
        }
        
        const isLiked = post.is_liked; 
        const likeClass = isLiked ? 'stat-btn active like' : 'stat-btn like';
        const likeIcon = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${post.owner.avatar}" alt="${post.owner.full_name}" class="avatar">
                <div class="post-meta">
                    <span class="user-name">${post.owner.full_name} <span class="user-handle">@${post.owner.username}</span></span>
                    <span class="post-time">${post.time}</span>
                </div>
                <i class="fa-solid fa-ellipsis" style="margin-left: auto; color: var(--text-secondary); cursor: pointer;"></i>
            </div>
            
            <div class="post-content">
                ${escapeHTML(post.content)}
            </div>
            
            ${imageHtml}
            
            <div class="post-footer">
                <button class="stat-btn comment">
                    <i class="fa-regular fa-comment"></i>
                    <span>${post.comments}</span>
                </button>
                <button class="stat-btn retweet">
                    <i class="fa-solid fa-retweet"></i>
                    <span>${post.retweets}</span>
                </button>
                <button class="${likeClass}" data-id="${post.id}">
                    <i class="${likeIcon}"></i>
                    <span>${post.likes}</span>
                </button>
                <button class="stat-btn share">
                    <i class="fa-solid fa-arrow-up-from-bracket"></i>
                </button>
            </div>
        `;
        
        feedContainer.appendChild(postElement);
    });
    
    // Attach event listeners to new like buttons
    attachLikeEvents();
}

function attachLikeEvents() {
    const likeButtons = document.querySelectorAll('.stat-btn.like');
    
    likeButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const postId = parseInt(e.currentTarget.getAttribute('data-id'));
            
            // Optimistic UI update
             const icon = e.currentTarget.querySelector('i');
             const span = e.currentTarget.querySelector('span');
             let currentLikes = parseInt(span.textContent);
             let isActive = e.currentTarget.classList.contains('active');
             
             if (isActive) {
                 e.currentTarget.className = 'stat-btn like';
                 icon.className = 'fa-regular fa-heart';
                 span.textContent = currentLikes - 1;
             } else {
                 e.currentTarget.className = 'stat-btn active like';
                 icon.className = 'fa-solid fa-heart';
                 span.textContent = currentLikes + 1;
             }
            
            try {
                // Call API
                await fetch(`${API_BASE_URL}/posts/${postId}/like`, { method: 'POST' });
            } catch (error) {
                console.error("Failed to toggle like:", error);
                // In a real app we would revert the UI change here on failure
            }
        });
    });
}

// Security utility to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}
