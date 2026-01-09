import { Comment } from '@/lib/core/types';

interface CommentThreadProps {
  comments: Comment[];
}

export function CommentThread({ comments }: CommentThreadProps) {
  // Build comment tree
  const commentMap = new Map<string, Comment[]>();
  const rootComments: Comment[] = [];

  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      if (!commentMap.has(comment.parent_comment_id)) {
        commentMap.set(comment.parent_comment_id, []);
      }
      commentMap.get(comment.parent_comment_id)!.push(comment);
    } else {
      rootComments.push(comment);
    }
  });

  // Sort by timestamp
  rootComments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="space-y-3">
      {rootComments.map((comment) => (
        <CommentNode key={comment.comment_id} comment={comment} replies={commentMap.get(comment.comment_id) || []} commentMap={commentMap} />
      ))}
    </div>
  );
}

interface CommentNodeProps {
  comment: Comment;
  replies: Comment[];
  commentMap: Map<string, Comment[]>;
  depth?: number;
}

function CommentNode({ comment, replies, commentMap, depth = 0 }: CommentNodeProps) {
  const commentDate = new Date(comment.timestamp);
  const sortedReplies = [...replies].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const roleColors = {
    initial_response: 'border-l-blue-400',
    agreement: 'border-l-green-400',
    op_engagement: 'border-l-purple-400',
    addition: 'border-l-orange-400',
  };

  return (
    <div className={`${depth > 0 ? 'ml-8' : ''}`}>
      <div className={`border-l-4 ${roleColors[comment.metadata.role]} pl-4 py-2`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {comment.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">u/{comment.username}</p>
            <p className="text-xs text-gray-500">
              {commentDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              <span className="mx-1">•</span>
              <span className="capitalize">{comment.metadata.role.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>
        <p className="text-gray-800 text-sm leading-relaxed">{comment.comment_text}</p>
      </div>

      {sortedReplies.length > 0 && (
        <div className="mt-2">
          {sortedReplies.map((reply) => (
            <CommentNode
              key={reply.comment_id}
              comment={reply}
              replies={commentMap.get(reply.comment_id) || []}
              commentMap={commentMap}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
