from rest_framework import serializers
from .models import Book, BookWord


class BookSerializer(serializers.ModelSerializer):
    is_default = serializers.ReadOnlyField()

    class Meta:
        model = Book
        fields = ["id", "book_name", "is_default"]


class BookWordSerializer(serializers.ModelSerializer):
    word_text = serializers.CharField(source="word.word_text", read_only=True)

    class Meta:
        model = BookWord
        fields = [
            "id",
            "word_text",
            "meaning",
            "example",
            "difficulty",
        ]


class BookWordCreateSerializer(serializers.Serializer):
    word_text = serializers.CharField(max_length=50)
    meaning = serializers.CharField(max_length=255)
    example = serializers.CharField(required=False, allow_blank=True)
    difficulty = serializers.IntegerField(min_value=1, max_value=3, default=1)

    def validate_word_text(self, value):
        return value.strip().lower()


class BookWordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookWord
        fields = ["meaning", "example", "difficulty"]
