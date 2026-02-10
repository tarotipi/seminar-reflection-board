// ========================================
// ゼミ振り返り＆成長可視化ボード
// Main React Application with Supabase Backend
// ========================================

const { useState, useEffect, useCallback, useMemo } = React;

// ========================================
// Supabase Configuration
// ========================================

// Supabase project credentials
const SUPABASE_URL = 'https://xmqnkxeuksgqgiscpioy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wKMZNDdzh761z9KfSU1uhw_n4BdeR5y';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// Constants & Configuration
// ========================================

const CATEGORIES = {
  learning: { label: '学び', emoji: '💡', description: '今日わかったこと、論点の結論' },
  impression: { label: '感想', emoji: '💭', description: '授業やゼミでの感想、気づき' },
  question: { label: '疑問/未解決', emoji: '❓', description: 'まだわからないこと、新たに生まれた問い' }
};

const REACTIONS = [
  { id: 'understand', emoji: '🤝', label: 'わかる！' },
  { id: 'niceThought', emoji: '🎉', label: 'いい感想！' },
  { id: 'goodQuestion', emoji: '🔥', label: 'いい疑問！' },
  { id: 'helpful', emoji: '💪', label: '参考になる！' }
];

const POINTS = {
  post: 10,
  postQuestion: 20,  // 2x bonus for questions
  sendReaction: 2,
  receiveReaction: 2,  // Uniform reaction points
  comment: 5,
  reply: 3
};

const RANKS = [
  { name: 'Starter', minPoints: 0, class: '' },
  { name: 'Bronze', minPoints: 100, class: 'rank-bronze' },
  { name: 'Silver', minPoints: 300, class: 'rank-silver' },
  { name: 'Gold', minPoints: 500, class: 'rank-gold' }
];

const ANIMAL_AVATARS = ['🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦄', '🐲', '🦋', '🐢', '🦀', '🐙', '🦈', '🐬'];

const NICKNAMES = ['キツネ', 'クマ', 'パンダ', 'コアラ', 'ライオン', 'トラ', 'ウシ', 'ブタ', 'カエル', 'サル', 'ニワトリ', 'ペンギン', 'ユニコーン', 'ドラゴン', 'チョウ', 'カメ', 'カニ', 'タコ', 'サメ', 'イルカ'];

const MAX_CHARS = 140;

// ========================================
// Utility Functions
// ========================================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// User identity still uses localStorage (anonymous per-browser)
function getOrCreateUserId() {
  let userId = localStorage.getItem('seminar_user_id');
  if (!userId) {
    userId = 'user_' + generateId();
    localStorage.setItem('seminar_user_id', userId);

    // Assign random avatar and nickname
    const avatarIndex = Math.floor(Math.random() * ANIMAL_AVATARS.length);
    localStorage.setItem('seminar_user_avatar', ANIMAL_AVATARS[avatarIndex]);
    localStorage.setItem('seminar_user_nickname', NICKNAMES[avatarIndex]);
  }
  return userId;
}

function getUserAvatar() {
  return localStorage.getItem('seminar_user_avatar') || '🦊';
}

function getUserNickname() {
  return localStorage.getItem('seminar_user_nickname') || 'キツネ';
}

function getUserPoints() {
  return parseInt(localStorage.getItem('seminar_user_points') || '0', 10);
}

function addUserPoints(points) {
  const current = getUserPoints();
  const newTotal = current + points;
  localStorage.setItem('seminar_user_points', newTotal.toString());
  return newTotal;
}

function getUserRank(points) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

// ========================================
// Supabase Data Functions
// ========================================

async function getPostsFromDB(sessionId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
  return data.map(transformPostFromDB);
}

async function getAllPostsFromDB() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
  return data.map(transformPostFromDB);
}

async function savePostToDB(post) {
  const dbPost = transformPostToDB(post);
  const { data, error } = await supabase
    .from('posts')
    .upsert(dbPost, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error saving post:', error);
    return null;
  }
  return data[0] ? transformPostFromDB(data[0]) : null;
}

async function deletePostFromDB(postId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }
  return true;
}

async function getSessionsFromDB() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  return data.map(transformSessionFromDB);
}

async function saveSessionToDB(session) {
  const dbSession = transformSessionToDB(session);
  const { data, error } = await supabase
    .from('sessions')
    .upsert(dbSession, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error saving session:', error);
    return null;
  }
  return data[0] ? transformSessionFromDB(data[0]) : null;
}

async function deleteSessionFromDB(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    return false;
  }
  return true;
}

// Transform functions (DB format <-> App format)
function transformPostFromDB(dbPost) {
  return {
    id: dbPost.id,
    sessionId: dbPost.session_id,
    authorId: dbPost.author_id,
    authorAvatar: dbPost.author_avatar,
    authorNickname: dbPost.author_nickname,
    authorPoints: dbPost.author_points || 0,
    category: dbPost.category,
    content: dbPost.content,
    reactions: dbPost.reactions || {},
    reactedUsers: dbPost.reacted_users || {},
    comments: dbPost.comments || [],
    sortOrder: dbPost.sort_order,
    createdAt: new Date(dbPost.created_at).getTime(),
    editedAt: dbPost.edited_at ? new Date(dbPost.edited_at).getTime() : null
  };
}

function transformPostToDB(post) {
  return {
    id: post.id,
    session_id: post.sessionId,
    author_id: post.authorId,
    author_avatar: post.authorAvatar,
    author_nickname: post.authorNickname,
    author_points: post.authorPoints || 0,
    category: post.category,
    content: post.content,
    reactions: post.reactions || {},
    reacted_users: post.reactedUsers || {},
    comments: post.comments || [],
    sort_order: post.sortOrder || post.createdAt,
    created_at: new Date(post.createdAt).toISOString(),
    edited_at: post.editedAt ? new Date(post.editedAt).toISOString() : null
  };
}

function transformSessionFromDB(dbSession) {
  return {
    id: dbSession.id,
    name: dbSession.name,
    date: dbSession.date,
    createdAt: new Date(dbSession.created_at).getTime()
  };
}

function transformSessionToDB(session) {
  return {
    id: session.id,
    name: session.name,
    date: session.date
  };
}

// Legacy synchronous functions for backward compatibility
function getPosts(sessionId) {
  // This is now a placeholder - actual data comes from async functions
  return [];
}

function getAllPosts() {
  return [];
}

function savePosts(posts) {
  // No-op for sync calls - use async functions
}

function getSessions() {
  return [];
}

function saveSessions(sessions) {
  // No-op for sync calls - use async functions
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'たった今';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function getRandomRotation() {
  return (Math.random() * 6 - 3).toFixed(2);
}

// ========================================
// Components
// ========================================

// Toast Notification Component
function Toast({ message, points, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast">
      <span className="toast-icon">✨</span>
      <div className="toast-content">
        {message} <span className="toast-points">+{points} AP</span>
      </div>
    </div>
  );
}

// Reaction Bar Component
function ReactionBar({ post, onReact, currentUserId }) {
  const userReactions = post.userReactions || {};

  return (
    <div className="reaction-bar">
      {REACTIONS.map(reaction => {
        const count = post.reactions?.[reaction.id] || 0;
        const hasReacted = userReactions[currentUserId]?.includes(reaction.id);

        return (
          <button
            key={reaction.id}
            className={`reaction-btn ${hasReacted ? 'active' : ''}`}
            onClick={() => onReact(post.id, reaction.id)}
            title={reaction.label}
          >
            <span>{reaction.emoji}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Comment Component
function Comment({ comment, depth = 0, onReply, onToggleReplies, onEditComment, onDeleteComment, currentUserId }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 3;
  const isOwner = comment.authorId === currentUserId;

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (editContent.trim() && editContent !== comment.content) {
      onEditComment(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('このコメントを削除しますか？')) {
      onDeleteComment(comment.id);
    }
  };

  return (
    <div className={`comment ${depth > 0 ? 'comment-reply' : ''}`} style={{ marginLeft: `${Math.min(depth, maxDepth) * 16}px` }}>
      <div className="comment-header">
        <span className="comment-avatar">{comment.authorAvatar}</span>
        <span className="comment-author">{comment.authorNickname}</span>
        <span className="comment-time">{formatTime(comment.createdAt)}</span>
        {isOwner && (
          <div className="comment-owner-actions">
            <button
              className="comment-edit-btn"
              onClick={() => {
                setIsEditing(true);
                setEditContent(comment.content);
              }}
              title="編集"
            >
              ✏️
            </button>
            <button
              className="comment-delete-btn"
              onClick={handleDelete}
              title="削除"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form className="comment-edit-form" onSubmit={handleSubmitEdit}>
          <input
            type="text"
            className="comment-edit-input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={140}
            autoFocus
          />
          <div className="comment-edit-actions">
            <button type="submit" className="comment-save-btn" disabled={!editContent.trim()}>
              保存
            </button>
            <button type="button" className="comment-cancel-btn" onClick={() => setIsEditing(false)}>
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-content">{comment.content}</div>
      )}

      <div className="comment-actions">
        {depth < maxDepth && (
          <button
            className="comment-action-btn"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            💬 返信
          </button>
        )}
        {hasReplies && (
          <button
            className="comment-action-btn toggle-replies"
            onClick={() => onToggleReplies(comment.id)}
          >
            {comment.isExpanded ? '▼' : '▶'} {comment.replies.length}件の返信
          </button>
        )}
      </div>

      {showReplyForm && (
        <form className="reply-form" onSubmit={handleSubmitReply}>
          <input
            type="text"
            className="reply-input"
            placeholder="返信を入力..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            maxLength={100}
          />
          <button type="submit" className="reply-submit-btn" disabled={!replyContent.trim()}>
            送信
          </button>
          <button type="button" className="reply-cancel-btn" onClick={() => setShowReplyForm(false)}>
            キャンセル
          </button>
        </form>
      )}

      {hasReplies && comment.isExpanded && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onToggleReplies={onToggleReplies}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Comments Section Component
function CommentsSection({ post, onAddComment, onAddReply, onToggleReplies, onEditComment, onDeleteComment, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const comments = post.comments || [];
  const commentCount = countAllComments(comments);

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(post.id, newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="comments-section">
      <button
        className="comments-toggle-btn"
        onClick={() => setShowComments(!showComments)}
      >
        💬 コメント {commentCount > 0 && `(${commentCount})`}
        <span className="toggle-icon">{showComments ? '▲' : '▼'}</span>
      </button>

      {showComments && (
        <div className="comments-container">
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              className="comment-input"
              placeholder="コメントを追加... (+5 AP)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={140}
            />
            <button type="submit" className="comment-submit-btn" disabled={!newComment.trim()}>
              投稿
            </button>
          </form>

          {comments.length > 0 ? (
            <div className="comments-list">
              {comments.map(comment => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  onReply={(commentId, content) => onAddReply(post.id, commentId, content)}
                  onToggleReplies={(commentId) => onToggleReplies(post.id, commentId)}
                  onEditComment={(commentId, content) => onEditComment(post.id, commentId, content)}
                  onDeleteComment={(commentId) => onDeleteComment(post.id, commentId)}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          ) : (
            <div className="no-comments">まだコメントはありません</div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to count all comments including replies
function countAllComments(comments) {
  if (!comments) return 0;
  return comments.reduce((total, comment) => {
    return total + 1 + countAllComments(comment.replies);
  }, 0);
}

// Sticky Note Component
function StickyNote({ post, index, onReact, onAddComment, onAddReply, onToggleReplies, onEditComment, onDeleteComment, onEditPost, onDeletePost, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, currentUserId }) {
  const rank = getUserRank(post.authorPoints || 0);
  const rotation = useMemo(() => getRandomRotation(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const noteRef = React.useRef(null);

  const isOwnPost = post.authorId === currentUserId;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== post.content) {
      onEditPost(post.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart && onDragStart(index);
  };

  const handleDragEnd = (e) => {
    onDragEnd && onDragEnd();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver && onDragOver(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== index) {
      onDrop && onDrop(fromIndex, index);
    }
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${post.category} ${rank.class} ${isDragOver ? 'drag-over' : ''}`}
      style={{
        '--rotation': `${rotation}deg`
      }}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="push-pin"></div>
      <div className="drag-handle" title="ドラッグで移動">⋮⋮</div>
      {isOwnPost && !isEditing && (
        <div className="post-action-buttons">
          <button
            className="post-edit-btn"
            onClick={() => setIsEditing(true)}
            title="編集"
          >
            ✏️
          </button>
          <button
            className="post-delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
            title="削除"
          >
            🗑️
          </button>
        </div>
      )}
      <div className={`note-category ${post.category}`}>
        {CATEGORIES[post.category].emoji} {CATEGORIES[post.category].label}
      </div>
      {isEditing ? (
        <div className="post-edit-form">
          <textarea
            className="post-edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={MAX_CHARS}
            autoFocus
          />
          <div className="post-edit-actions">
            <span className="char-count">{editContent.length}/{MAX_CHARS}</span>
            <button className="post-edit-save-btn" onClick={handleSaveEdit} disabled={!editContent.trim()}>
              保存
            </button>
            <button className="post-edit-cancel-btn" onClick={handleCancelEdit}>
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="note-content">{post.content}</div>
      )}
      <div className="note-footer">
        <div className="note-author">
          <span>{post.authorAvatar}</span>
          <span>{post.authorNickname}</span>
        </div>
        <span className="note-time">
          {formatTime(post.createdAt)}
          {post.editedAt && ' (編集済み)'}
        </span>
      </div>
      <ReactionBar post={post} onReact={onReact} currentUserId={currentUserId} />
      <CommentsSection
        post={post}
        onAddComment={onAddComment}
        onAddReply={onAddReply}
        onToggleReplies={onToggleReplies}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
        currentUserId={currentUserId}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ 投稿の削除</h3>
            <p>本当に削除しますか？</p>
            <p className="modal-warning">この操作は取り消せません。</p>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                キャンセル
              </button>
              <button
                className="modal-delete-btn"
                onClick={() => {
                  onDeletePost(post.id);
                  setShowDeleteConfirm(false);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Post Form Component
function PostForm({ sessionId, onPost }) {
  const [category, setCategory] = useState('learning');
  const [content, setContent] = useState('');

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEmpty || isOverLimit) return;

    onPost({
      category,
      content: content.trim()
    });

    setContent('');
  };

  const pointsToEarn = category === 'question' ? POINTS.postQuestion : POINTS.post;

  return (
    <div className={`post-form-container category-selected-${category}`}>
      <div className="post-form-header">
        <span style={{ fontSize: '1.5rem' }}>📝</span>
        <h2>振り返りを投稿</h2>
      </div>

      <div className="category-tabs">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`category-tab ${key} ${category === key ? 'active' : ''}`}
            onClick={() => setCategory(key)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            {key === 'question' && (
              <span className="bonus-badge">2倍!</span>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          className={`post-textarea textarea-${category}`}
          placeholder={`${CATEGORIES[category].description}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CHARS + 10}
        />

        <div className="post-form-footer">
          <span className={`char-counter ${isOverLimit ? 'warning' : ''}`}>
            {charCount} / {MAX_CHARS}文字
          </span>
          <button
            type="submit"
            className="submit-btn"
            disabled={isEmpty || isOverLimit}
          >
            <span>投稿する</span>
            <span style={{ color: '#ffd700' }}>+{pointsToEarn} AP</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// Sidebar Component
function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  userPoints,
  userAvatar,
  userNickname,
  allPosts
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const userRank = getUserRank(userPoints);

  // Calculate rankings from current session posts only
  const rankings = useMemo(() => {
    const userMap = {};

    // Filter posts by current session
    const sessionPosts = allPosts.filter(post => post.sessionId === currentSessionId);

    sessionPosts.forEach(post => {
      if (!userMap[post.authorId]) {
        userMap[post.authorId] = {
          id: post.authorId,
          avatar: post.authorAvatar,
          nickname: post.authorNickname,
          points: 0
        };
      }
      // Sum up points based on post type and reactions
      const postPoints = post.category === 'question' ? POINTS.postQuestion : POINTS.post;
      const reactionPoints = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0) * POINTS.receiveReaction;
      userMap[post.authorId].points += postPoints + reactionPoints;
    });

    return Object.values(userMap)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [allPosts, currentSessionId]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="emoji-icon">📌</span>
        <h1>振り返りボード</h1>
      </div>

      <div className="user-profile">
        <span className="user-avatar">{userAvatar}</span>
        <div className="user-nickname">{userNickname}</div>
        <div className="user-points">
          {userPoints} <span>AP</span>
        </div>
        {userRank.name !== 'Starter' && (
          <div className={`rank-badge ${userRank.name.toLowerCase()}`}>
            {userRank.name}
          </div>
        )}
      </div>

      <div className="session-list">
        <h3>📚 セッション一覧</h3>
        {[...sessions].reverse().map((session) => {
          const originalIndex = sessions.findIndex(s => s.id === session.id);
          return (
            <div
              key={session.id}
              className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="session-number">第{originalIndex + 1}回</span>
              <div className="session-info">
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    className="session-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) {
                        onUpdateSession(session.id, editingName.trim());
                      }
                      setEditingSessionId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingName.trim()) {
                          onUpdateSession(session.id, editingName.trim());
                        }
                        setEditingSessionId(null);
                      } else if (e.key === 'Escape') {
                        setEditingSessionId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div
                    className="session-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.id);
                      setEditingName(session.name || `セッション ${originalIndex + 1}`);
                    }}
                    title="ダブルクリックで編集"
                  >
                    {session.name || `セッション ${originalIndex + 1}`}
                    <span className="edit-hint">✏️</span>
                  </div>
                )}
                <div className="session-date">{session.date}</div>
              </div>
              <button
                className="session-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(session.id);
                }}
                title="削除"
              >
                🗑️
              </button>
            </div>
          );
        })}
        <button className="add-session-btn" onClick={onAddSession}>
          + 新しいセッション
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ セッションの削除</h3>
            <p>本当に削除しますか？</p>
            <p className="modal-warning">この操作は取り消せません。</p>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setDeleteConfirmId(null)}
              >
                キャンセル
              </button>
              <button
                className="modal-delete-btn"
                onClick={() => {
                  onDeleteSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ranking-section">
        <h3>🏆 ランキング</h3>
        {rankings.length === 0 ? (
          <div style={{ color: '#888', fontSize: '0.85rem', padding: '10px 0' }}>
            まだ投稿がありません
          </div>
        ) : (
          rankings.map((user, index) => (
            <div key={user.id} className="ranking-item">
              <div className={`ranking-position ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : 'other'}`}>
                {index + 1}
              </div>
              <span className="ranking-avatar">{user.avatar}</span>
              <span className="ranking-name">{user.nickname}</span>
              <span className="ranking-points">{user.points}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Cork Board Component
function CorkBoard({ posts, onReact, onAddComment, onAddReply, onToggleReplies, onEditComment, onDeleteComment, onEditPost, onDeletePost, onSwapPositions, currentUserId }) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (index) => {
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (index) => {
    if (draggingIndex !== null && draggingIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (fromIndex, toIndex) => {
    if (onSwapPositions) {
      onSwapPositions(fromIndex, toIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  if (posts.length === 0) {
    return (
      <div className="cork-board">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>まだ投稿がありません</h3>
          <p>最初の振り返りを投稿してみましょう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cork-board">
      {posts.map((post, index) => (
        <StickyNote
          key={post.id}
          post={post}
          index={index}
          onReact={onReact}
          onAddComment={onAddComment}
          onAddReply={onAddReply}
          onToggleReplies={onToggleReplies}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onEditPost={onEditPost}
          onDeletePost={onDeletePost}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragOver={dragOverIndex === index}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

// Main App Component
function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = useMemo(() => getOrCreateUserId(), []);
  const userAvatar = useMemo(() => getUserAvatar(), []);
  const userNickname = useMemo(() => getUserNickname(), []);

  // Initialize - load data from Supabase
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        let storedSessions = await getSessionsFromDB();

        if (storedSessions.length === 0) {
          // Create initial session
          const initialSession = {
            id: 'session_' + generateId(),
            name: '第1回',
            date: new Date().toLocaleDateString('ja-JP')
          };
          await saveSessionToDB(initialSession);
          storedSessions = [initialSession];
        }

        setSessions(storedSessions);
        setCurrentSessionId(storedSessions[storedSessions.length - 1].id);

        const allPostsData = await getAllPostsFromDB();
        setAllPosts(allPostsData);
        setUserPoints(getUserPoints());
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    // Subscribe to posts changes
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async (payload) => {
          console.log('Realtime posts change:', payload);
          // Refresh all posts and current session posts
          const updatedPosts = await getAllPostsFromDB();
          setAllPosts(updatedPosts);
          if (currentSessionId) {
            const sessionPosts = await getPostsFromDB(currentSessionId);
            setPosts(sessionPosts);
          }
        }
      )
      .subscribe();

    // Subscribe to sessions changes
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        async (payload) => {
          console.log('Realtime sessions change:', payload);
          // Refresh sessions
          const updatedSessions = await getSessionsFromDB();
          setSessions(updatedSessions);
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [currentSessionId]);

  // Load posts for current session
  useEffect(() => {
    async function loadSessionPosts() {
      if (currentSessionId) {
        const sessionPosts = await getPostsFromDB(currentSessionId);
        setPosts(sessionPosts);
      }
    }
    loadSessionPosts();
  }, [currentSessionId]);

  // Handle new post
  const handlePost = useCallback(async (postData) => {
    const pointsEarned = postData.category === 'question' ? POINTS.postQuestion : POINTS.post;
    const newPoints = addUserPoints(pointsEarned);
    setUserPoints(newPoints);

    const newPost = {
      id: 'post_' + generateId(),
      sessionId: currentSessionId,
      authorId: userId,
      authorAvatar: userAvatar,
      authorNickname: userNickname,
      authorPoints: newPoints,
      category: postData.category,
      content: postData.content,
      reactions: {},
      reactedUsers: {},
      comments: [],
      createdAt: Date.now()
    };

    // Save to Supabase
    await savePostToDB(newPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);

    // Show toast
    const message = postData.category === 'question'
      ? '勇気ある疑問を投稿しました！'
      : '振り返りを投稿しました！';
    setToast({ message, points: pointsEarned });
  }, [currentSessionId, userId, userAvatar, userNickname]);

  // Handle reaction
  const handleReact = useCallback(async (postId, reactionId) => {
    // Find the post in current state
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const reactedUsers = post.reactedUsers || {};
    const userReactionList = reactedUsers[userId] || [];

    // Clone post for update
    const updatedPost = { ...post };
    updatedPost.reactions = { ...post.reactions };
    updatedPost.reactedUsers = { ...reactedUsers };

    // Check if already reacted with this reaction
    if (userReactionList.includes(reactionId)) {
      // Remove reaction - deduct points
      updatedPost.reactions[reactionId] = Math.max(0, (updatedPost.reactions[reactionId] || 0) - 1);
      updatedPost.reactedUsers[userId] = userReactionList.filter(r => r !== reactionId);

      // Deduct points
      const pointsToDeduct = POINTS.sendReaction;
      const currentPoints = getUserPoints();
      const newPoints = Math.max(0, currentPoints - pointsToDeduct);
      localStorage.setItem('seminar_user_points', newPoints.toString());
      setUserPoints(newPoints);
    } else {
      // Add reaction
      updatedPost.reactions[reactionId] = (updatedPost.reactions[reactionId] || 0) + 1;
      updatedPost.reactedUsers[userId] = [...userReactionList, reactionId];

      // Award points
      const pointsEarned = POINTS.sendReaction;
      const newPoints = addUserPoints(pointsEarned);
      setUserPoints(newPoints);

      setToast({ message: 'リアクションしました！', points: pointsEarned });
    }

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
  }, [userId, currentSessionId, allPosts]);

  // Handle add session
  const handleAddSession = useCallback(async () => {
    const newSession = {
      id: 'session_' + generateId(),
      name: `第${sessions.length + 1}回`,
      date: new Date().toLocaleDateString('ja-JP')
    };

    await saveSessionToDB(newSession);

    const updatedSessions = await getSessionsFromDB();
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
  }, [sessions]);

  // Handle add comment
  const handleAddComment = useCallback(async (postId, content) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post };
    updatedPost.comments = [...(post.comments || [])];

    const newComment = {
      id: 'comment_' + generateId(),
      authorId: userId,
      authorAvatar: userAvatar,
      authorNickname: userNickname,
      content: content,
      createdAt: new Date().toISOString(),
      replies: [],
      isExpanded: true
    };

    updatedPost.comments.unshift(newComment);

    // Award points
    const pointsEarned = POINTS.comment;
    const newPoints = addUserPoints(pointsEarned);
    setUserPoints(newPoints);

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);

    setToast({ message: 'コメントしました！', points: pointsEarned });
  }, [userId, userAvatar, userNickname, currentSessionId, allPosts]);

  // Handle add reply to comment
  const handleAddReply = useCallback(async (postId, commentId, content) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post };
    updatedPost.comments = JSON.parse(JSON.stringify(post.comments || []));

    // Helper to find and add reply to comment recursively
    const addReplyToComment = (comments, targetId) => {
      for (let comment of comments) {
        if (comment.id === targetId) {
          comment.replies = comment.replies || [];
          comment.replies.unshift({
            id: 'reply_' + generateId(),
            authorId: userId,
            authorAvatar: userAvatar,
            authorNickname: userNickname,
            content: content,
            createdAt: new Date().toISOString(),
            replies: [],
            isExpanded: true
          });
          comment.isExpanded = true;
          return true;
        }
        if (comment.replies && addReplyToComment(comment.replies, targetId)) {
          return true;
        }
      }
      return false;
    };

    if (updatedPost.comments) {
      addReplyToComment(updatedPost.comments, commentId);
    }

    // Award points
    const pointsEarned = POINTS.reply;
    const newPoints = addUserPoints(pointsEarned);
    setUserPoints(newPoints);

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);

    setToast({ message: '返信しました！', points: pointsEarned });
  }, [userId, userAvatar, userNickname, currentSessionId, allPosts]);

  // Handle toggle replies visibility
  const handleToggleReplies = useCallback(async (postId, commentId) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post };
    updatedPost.comments = JSON.parse(JSON.stringify(post.comments || []));

    // Helper to toggle isExpanded recursively
    const toggleComment = (comments, targetId) => {
      for (let comment of comments) {
        if (comment.id === targetId) {
          comment.isExpanded = !comment.isExpanded;
          return true;
        }
        if (comment.replies && toggleComment(comment.replies, targetId)) {
          return true;
        }
      }
      return false;
    };

    if (updatedPost.comments) {
      toggleComment(updatedPost.comments, commentId);
    }

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
  }, [currentSessionId, allPosts]);

  // Handle edit comment
  const handleEditComment = useCallback(async (postId, commentId, newContent) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post };
    updatedPost.comments = JSON.parse(JSON.stringify(post.comments || []));

    // Helper to find and edit comment recursively
    const editComment = (comments, targetId) => {
      for (let comment of comments) {
        if (comment.id === targetId) {
          comment.content = newContent;
          return true;
        }
        if (comment.replies && editComment(comment.replies, targetId)) {
          return true;
        }
      }
      return false;
    };

    if (updatedPost.comments) {
      editComment(updatedPost.comments, commentId);
    }

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
  }, [currentSessionId, allPosts]);

  // Handle edit post
  const handleEditPost = useCallback(async (postId, newContent) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = {
      ...post,
      content: newContent,
      editedAt: Date.now()
    };

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
    showToast('投稿を編集しました');
  }, [currentSessionId, allPosts]);

  // Handle delete post
  const handleDeletePost = useCallback(async (postId) => {
    await deletePostFromDB(postId);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
    showToast('投稿を削除しました');
  }, [currentSessionId]);

  // Handle delete comment
  const handleDeleteComment = useCallback(async (postId, commentId) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post };
    updatedPost.comments = JSON.parse(JSON.stringify(post.comments || []));

    // Helper to find and delete comment recursively
    const deleteComment = (comments, targetId) => {
      const index = comments.findIndex(c => c.id === targetId);
      if (index !== -1) {
        comments.splice(index, 1);
        return true;
      }
      for (let comment of comments) {
        if (comment.replies && deleteComment(comment.replies, targetId)) {
          return true;
        }
      }
      return false;
    };

    if (updatedPost.comments) {
      deleteComment(updatedPost.comments, commentId);
    }

    // Save to Supabase
    await savePostToDB(updatedPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
    const sessionPosts = await getPostsFromDB(currentSessionId);
    setPosts(sessionPosts);
  }, [currentSessionId, allPosts]);

  // Handle update session name
  const handleUpdateSession = useCallback(async (sessionId, newName) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updatedSession = { ...session, name: newName };
    await saveSessionToDB(updatedSession);

    const updatedSessions = await getSessionsFromDB();
    setSessions(updatedSessions);
  }, [sessions]);

  // Handle delete session
  const handleDeleteSession = useCallback(async (sessionId) => {
    // Delete session
    await deleteSessionFromDB(sessionId);

    // Refresh sessions
    const updatedSessions = await getSessionsFromDB();
    setSessions(updatedSessions);

    // Refresh posts
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);

    // If current session was deleted, select another session
    if (currentSessionId === sessionId) {
      const newSessionId = updatedSessions.length > 0 ? updatedSessions[updatedSessions.length - 1].id : null;
      setCurrentSessionId(newSessionId);
      if (newSessionId) {
        const newPosts = await getPostsFromDB(newSessionId);
        setPosts(newPosts);
      } else {
        setPosts([]);
      }
    }

    showToast('セッションを削除しました');
  }, [sessions, currentSessionId]);

  // Handle swap post positions (drag-and-drop grid swap)
  const handleSwapPositions = useCallback(async (fromIndex, toIndex) => {
    const sessionPosts = [...posts];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sessionPosts.length || toIndex >= sessionPosts.length) {
      return;
    }

    const fromPost = sessionPosts[fromIndex];
    const toPost = sessionPosts[toIndex];

    // Create sortOrder if not exist, then swap
    const now = Date.now();
    const fromOrder = fromPost.sortOrder ?? now - fromIndex;
    const toOrder = toPost.sortOrder ?? now - toIndex;

    const updatedFromPost = { ...fromPost, sortOrder: toOrder };
    const updatedToPost = { ...toPost, sortOrder: fromOrder };

    // Swap in local state immediately for visual feedback
    const newPosts = [...sessionPosts];
    newPosts[fromIndex] = updatedToPost;
    newPosts[toIndex] = updatedFromPost;
    setPosts(newPosts);

    // Save to Supabase
    await savePostToDB(updatedFromPost);
    await savePostToDB(updatedToPost);

    // Refresh data
    const updatedPosts = await getAllPostsFromDB();
    setAllPosts(updatedPosts);
  }, [posts]);

  // Current session info
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentSessionIndex = sessions.findIndex(s => s.id === currentSessionId);

  // Stats for current session
  const sessionStats = useMemo(() => {
    const sessionPosts = posts;
    return {
      total: sessionPosts.length,
      learning: sessionPosts.filter(p => p.category === 'learning').length,
      growth: sessionPosts.filter(p => p.category === 'growth').length,
      question: sessionPosts.filter(p => p.category === 'question').length
    };
  }, [posts]);

  return (
    <>
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onAddSession={handleAddSession}
        onUpdateSession={handleUpdateSession}
        onDeleteSession={handleDeleteSession}
        userPoints={userPoints}
        userAvatar={userAvatar}
        userNickname={userNickname}
        allPosts={allPosts}
      />

      <main className="main-content">
        <div className="board-header">
          <div className="board-title">
            📌 {currentSession?.name || 'セッション'} の振り返り
          </div>
          <div className="board-stats">
            <div className="stat-item">
              <div className="stat-value">{sessionStats.total}</div>
              <div className="stat-label">投稿数</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#f9a825' }}>{sessionStats.learning}</div>
              <div className="stat-label">💡 学び</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#43a047' }}>{sessionStats.growth}</div>
              <div className="stat-label">🌱 成長</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#8e24aa' }}>{sessionStats.question}</div>
              <div className="stat-label">❓ 疑問</div>
            </div>
          </div>
        </div>

        <PostForm sessionId={currentSessionId} onPost={handlePost} />

        <CorkBoard
          posts={posts}
          onReact={handleReact}
          onAddComment={handleAddComment}
          onAddReply={handleAddReply}
          onToggleReplies={handleToggleReplies}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onSwapPositions={handleSwapPositions}
          currentUserId={userId}
        />
      </main>

      {toast && (
        <Toast
          message={toast.message}
          points={toast.points}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);
