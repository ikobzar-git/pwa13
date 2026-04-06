import { useApp } from '../../contexts/AppContext';
import ChatList from '../../components/ChatList';
import ChatView from '../../components/ChatView';

export default function ChatTab({ conversationId, onOpenConversation, onCloseConversation }) {
  const { user } = useApp();
  const currentUserId = user?.id;

  if (!conversationId) {
    return <ChatList onOpenChat={onOpenConversation} currentUserId={currentUserId} />;
  }
  return (
    <ChatView
      conversationId={conversationId}
      onBack={onCloseConversation}
      currentUserId={currentUserId}
    />
  );
}
