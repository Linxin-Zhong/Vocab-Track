from rest_framework import serializers
from .models import ReviewSession, ReviewItem, UserWord


class ReviewStartSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    limit = serializers.IntegerField(
        default=5
    )  # limit the number of words to review in one session


class ReviewWordSerializer(serializers.Serializer):
    user_word_id = serializers.IntegerField()
    word_text = serializers.CharField()
    meaning = serializers.CharField()


class ReviewAnswerSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    user_word_id = serializers.IntegerField()
    is_correct = serializers.BooleanField()


class ReviewEndSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
