import { Post, Comment } from '@/lib/core/types';
import { CommentThread } from './comment-thread';

interface PostViewProps {
  post: Post;
  comments: Comment[];
}

export function PostView({ post, comments }: PostViewProps) {
  const postComments = comments.filter((c) => c.post_id === post.post_id);
  const postDate = new Date(post.timestamp);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            {post.author_username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">u/{post.author_username}</p>
            <p className="text-sm text-gray-500">
              {postDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
          {post.subreddit}
        </span>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
        {post.body && <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>}
      </div>

      {/* Post Metadata */}
      <div className="flex items-center gap-4 text-sm text-gray-500 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>{post.keyword_ids.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{postComments.length} comments</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="capitalize">{post.metadata.intent.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Comments */}
      {postComments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Comments ({postComments.length})
          </h4>
          <CommentThread comments={postComments} />
        </div>
      )}
    </div>
  );
}
