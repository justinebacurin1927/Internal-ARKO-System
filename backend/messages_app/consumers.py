import json
from datetime import datetime

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

from .models import Conversation, ConversationParticipant, Message
from .serializers import MessageSerializer

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time messaging.

    Clients connect with ?token=<jwt> in the URL query string.
    On connect, the user is added to all their conversation room groups.
    """

    async def connect(self):
        self.user = await self._authenticate()
        if self.user is None:
            await self.close(code=4001)
            return

        self.conversation_ids = await self._get_conversation_ids()
        for cid in self.conversation_ids:
            await self.channel_layer.group_add(f'chat_{cid}', self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'conversation_ids'):
            for cid in self.conversation_ids:
                await self.channel_layer.group_discard(f'chat_{cid}', self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages (typing indicators, etc.)."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get('action')
        conv_id = data.get('conversation_id')

        if action == 'typing' and conv_id:
            await self.channel_layer.group_send(
                f'chat_{conv_id}',
                {
                    'type': 'user.typing',
                    'user_id': str(self.user.id),
                    'user_name': self.user.name or self.user.email,
                    'conversation_id': conv_id,
                },
            )

    async def chat_message(self, event):
        """Receive a new-message event from the channel layer and forward to WS."""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message'],
            'conversation_id': event['conversation_id'],
        }))

    async def user_typing(self, event):
        """Forward typing indicators."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'conversation_id': event['conversation_id'],
        }))

    async def _authenticate(self):
        """Validate JWT token from query string."""
        token_str = None
        qs = self.scope.get('query_string', b'').decode()
        for part in qs.split('&'):
            if part.startswith('token='):
                token_str = part[6:]
                break

        if not token_str:
            return None

        try:
            access = AccessToken(token_str)
            user_id = access.payload.get('user_id')
            return await database_sync_to_async(User.objects.get)(id=user_id)
        except Exception:
            return None

    @database_sync_to_async
    def _get_conversation_ids(self):
        return list(
            ConversationParticipant.objects
            .filter(user=self.user)
            .values_list('conversation_id', flat=True)
        )


def broadcast_new_message(message: Message):
    """Called from the REST view after creating a message.

    Sends the serialized message to the conversation's WebSocket group
    so all connected clients receive it in real time.
    """
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    serializer = MessageSerializer(message)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'chat_{message.conversation_id}',
        {
            'type': 'chat.message',
            'message': serializer.data,
            'conversation_id': str(message.conversation_id),
        },
    )
