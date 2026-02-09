from rest_framework import serializers


class ReviewStartSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(min_value=1)
    limit = serializers.IntegerField(
        default=5, min_value=1, max_value=100
    )  # limit the number of words to review in one session


class ReviewAnswerSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    user_word_id = serializers.IntegerField()
    is_correct = serializers.BooleanField()


class ReviewEndSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
