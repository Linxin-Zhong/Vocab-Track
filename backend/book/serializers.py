from rest_framework import serializers
import csv
import io
from datetime import timedelta
from django.db.models import Count, Q
from django.utils import timezone
from review.models import ReviewItem, ReviewSession, UserWord
from .models import Book, BookWord


class BookSerializer(serializers.ModelSerializer):
    book_id = serializers.IntegerField(source="id", read_only=True)
    is_default = serializers.ReadOnlyField()
    words_num = serializers.SerializerMethodField()
    words_rw_count = serializers.SerializerMethodField()
    days_active = serializers.SerializerMethodField()
    avg_accuracy = serializers.SerializerMethodField()
    rw_trend = serializers.SerializerMethodField()
    rw_words = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "book_id",
            "book_name",
            "is_default",
            "words_num",
            "words_rw_count",
            "days_active",
            "avg_accuracy",
            "rw_trend",
            "rw_words",
        ]

    def get_words_num(self, obj):
        return BookWord.objects.filter(book=obj).count()

    def _get_book_stats(self, obj):
        if not hasattr(self, "_book_stats_cache"):
            self._book_stats_cache = {}

        if obj.id in self._book_stats_cache:
            return self._book_stats_cache[obj.id]

        request = self.context.get("request")
        user = getattr(request, "user", None)

        empty_stats = {
            "words_rw_count": 0,
            "days_active": 0,
            "avg_accuracy": 0.0,
            "rw_trend": [],
            "rw_words": [],
        }

        if not user or not user.is_authenticated:
            self._book_stats_cache[obj.id] = empty_stats
            return empty_stats

        # Words reviewed at least once in this book by current user.
        reviewed_user_words = UserWord.objects.filter(
            user=user,
            book_word__book=obj,
        ).filter(Q(correct_times__gt=0) | Q(wrong_times__gt=0))

        words_rw_count = reviewed_user_words.count()

        rw_words = []
        for uw in reviewed_user_words.select_related("book_word__word"):
            total_reviews = uw.correct_times + uw.wrong_times
            accuracy = uw.correct_times / total_reviews if total_reviews else 0.0
            rw_words.append(
                {
                    "book_word_id": uw.book_word.id,
                    "word_text": uw.book_word.word.word_text,
                    "accuracy": round(accuracy, 4),
                    "times_reviewed": total_reviews,
                    "difficulty": uw.book_word.difficulty,
                }
            )

        # Days active based on unique session dates for this user and book.
        days_active = (
            ReviewSession.objects.filter(user=user, book=obj, start_time__isnull=False)
            .values("start_time__date")
            .distinct()
            .count()
        )

        # Weighted average accuracy from review items.
        review_items_qs = ReviewItem.objects.filter(
            session__user=user,
            session__book=obj,
        )
        total_reviews = review_items_qs.count()
        total_correct = review_items_qs.filter(is_correct=True).count()
        avg_accuracy = (total_correct / total_reviews) if total_reviews else 0.0

        # Build fixed 7-day window [today-6, today].
        today = timezone.localdate()
        start_day = today - timedelta(days=6)
        days = [start_day + timedelta(days=offset) for offset in range(7)]

        # Trend 1: reviewed words by day (count distinct words reviewed each day).
        reviewed_rows = (
            review_items_qs.filter(
                create_time__date__gte=start_day, create_time__date__lte=today
            )
            .values("create_time__date")
            .annotate(unique_words=Count("user_word_id", distinct=True))
        )
        reviewed_count_by_day = {
            row["create_time__date"]: row["unique_words"] for row in reviewed_rows
        }
        # Trend 2: daily accuracy by review items.
        accuracy_rows = (
            review_items_qs.filter(
                create_time__date__gte=start_day, create_time__date__lte=today
            )
            .values("create_time__date")
            .annotate(
                total=Count("id"),
                correct=Count("id", filter=Q(is_correct=True)),
            )
        )
        accuracy_by_day = {}
        for row in accuracy_rows:
            total = row["total"]
            accuracy_by_day[row["create_time__date"]] = (
                row["correct"] / total if total else 0.0
            )

        rw_trend = [
            {
                "date": day.isoformat(),
                "count": reviewed_count_by_day.get(day, 0),
                "accuracy": round(accuracy_by_day.get(day, 0.0), 4),
            }
            for day in days
        ]

        stats = {
            "words_rw_count": words_rw_count,
            "days_active": days_active,
            "avg_accuracy": round(avg_accuracy, 4),
            "rw_trend": rw_trend,
            "rw_words": rw_words,
        }
        self._book_stats_cache[obj.id] = stats
        return stats

    def get_words_rw_count(self, obj):
        return self._get_book_stats(obj)["words_rw_count"]

    def get_days_active(self, obj):
        return self._get_book_stats(obj)["days_active"]

    def get_avg_accuracy(self, obj):
        return self._get_book_stats(obj)["avg_accuracy"]

    def get_rw_trend(self, obj):
        return self._get_book_stats(obj)["rw_trend"]

    def get_rw_words(self, obj):
        return self._get_book_stats(obj)["rw_words"]


class BookBasicSerializer(serializers.ModelSerializer):
    """Lightweight serializer for book creation, updates, and list view."""

    book_id = serializers.IntegerField(source="id", read_only=True)
    is_default = serializers.ReadOnlyField()
    words_num = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ["book_id", "book_name", "is_default", "words_num"]

    def get_words_num(self, obj):
        return BookWord.objects.filter(book=obj).count()


class BookWordSerializer(serializers.ModelSerializer):
    book_word_id = serializers.IntegerField(source="id", read_only=True)
    word_text = serializers.CharField(source="word.word_text", read_only=True)

    class Meta:
        model = BookWord
        fields = [
            "book_word_id",
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


class ReviewHistoryItemSerializer(serializers.Serializer):
    date = serializers.DateField()
    result = serializers.ChoiceField(choices=["correct", "incorrect"])


class BookWordDetailSerializer(serializers.ModelSerializer):
    book_id = serializers.IntegerField(source="book.id", read_only=True)
    book_name = serializers.CharField(source="book.book_name", read_only=True)
    book_word_id = serializers.IntegerField(source="id", read_only=True)
    word_text = serializers.CharField(source="word.word_text", read_only=True)
    times_reviewed = serializers.SerializerMethodField()
    correct_times = serializers.SerializerMethodField()
    incorrect_times = serializers.SerializerMethodField()
    accuracy = serializers.SerializerMethodField()
    review_history = serializers.SerializerMethodField()

    class Meta:
        model = BookWord
        fields = [
            "book_id",
            "book_name",
            "book_word_id",
            "word_text",
            "meaning",
            "example",
            "difficulty",
            "times_reviewed",
            "correct_times",
            "incorrect_times",
            "accuracy",
            "review_history",
        ]

    def _get_detail_stats(self, obj):
        if not hasattr(self, "_detail_stats_cache"):
            self._detail_stats_cache = {}

        if obj.id in self._detail_stats_cache:
            return self._detail_stats_cache[obj.id]

        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            stats = {
                "times_reviewed": 0,
                "correct_times": 0,
                "incorrect_times": 0,
                "accuracy": 0.0,
                "review_history": [],
            }
            self._detail_stats_cache[obj.id] = stats
            return stats

        user_word = UserWord.objects.filter(user=user, book_word=obj).first()
        if not user_word:
            stats = {
                "times_reviewed": 0,
                "correct_times": 0,
                "incorrect_times": 0,
                "accuracy": 0.0,
                "review_history": [],
            }
            self._detail_stats_cache[obj.id] = stats
            return stats

        correct_times = user_word.correct_times
        incorrect_times = user_word.wrong_times
        times_reviewed = correct_times + incorrect_times
        accuracy = (correct_times / times_reviewed) if times_reviewed else 0.0

        review_items = ReviewItem.objects.filter(
            user_word=user_word,
            session__user=user,
            session__book=obj.book,
        ).order_by("create_time")
        review_history = [
            {
                "date": item.create_time.date().isoformat(),
                "result": "correct" if item.is_correct else "incorrect",
            }
            for item in review_items
        ]

        stats = {
            "times_reviewed": times_reviewed,
            "correct_times": correct_times,
            "incorrect_times": incorrect_times,
            "accuracy": round(accuracy, 4),
            "review_history": ReviewHistoryItemSerializer(
                review_history, many=True
            ).data,
        }
        self._detail_stats_cache[obj.id] = stats
        return stats

    def get_times_reviewed(self, obj):
        return self._get_detail_stats(obj)["times_reviewed"]

    def get_correct_times(self, obj):
        return self._get_detail_stats(obj)["correct_times"]

    def get_incorrect_times(self, obj):
        return self._get_detail_stats(obj)["incorrect_times"]

    def get_accuracy(self, obj):
        return self._get_detail_stats(obj)["accuracy"]

    def get_review_history(self, obj):
        return self._get_detail_stats(obj)["review_history"]


class FileUploadSerializer(serializers.Serializer):
    """Serializer to handle CSV/TXT file uploads for word lists."""

    file = serializers.FileField()

    def validate_file(self, value):
        """Validate file extension and format."""
        file_name = value.name.lower()
        if not (file_name.endswith(".csv") or file_name.endswith(".txt")):
            raise serializers.ValidationError("Only CSV and TXT files are supported.")

        # Try parsing the file to validate content and cache the result
        try:
            self._cached_words_data = self._parse_file_content(value)
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(f"Error processing file: {str(e)}")
        finally:
            # Reset file pointer to beginning for subsequent reads
            value.seek(0)

        return value

    def _parse_file_content(self, uploaded_file):
        """Internal method to parse and validate file content.

        Expected CSV format (no header row):
        word_text,meaning[,example][,difficulty]

        - word_text (required)
        - meaning (required)
        - example (optional)
        - difficulty (optional, values 1–3, default 1)

        Returns:
            list: List of validated rows (each row is a list of strings)
        """
        try:
            # Decode file content
            file_content = uploaded_file.read().decode("utf-8")
            file_io = io.StringIO(file_content)

            # Parse CSV without header
            reader = csv.reader(file_io)

            # Parse rows
            words_data = []
            for row_num, row in enumerate(reader, start=1):
                # Skip empty rows
                if not row or not any(cell.strip() for cell in row):
                    continue

                # Check minimum required fields
                if len(row) < 2:
                    raise serializers.ValidationError(
                        f"Row {row_num}: Each line must have at least 'word_text' and 'meaning' separated by a comma."
                    )

                word_text = row[0].strip()
                meaning = row[1].strip()

                if not word_text or not meaning:
                    raise serializers.ValidationError(
                        f"Row {row_num}: 'word_text' and 'meaning' cannot be empty."
                    )

                words_data.append(row)

            if not words_data:
                raise serializers.ValidationError("File contains no word entries.")

            return words_data

        except UnicodeDecodeError:
            raise serializers.ValidationError(
                "File encoding error. Please use UTF-8 encoding."
            )
        except csv.Error as e:
            raise serializers.ValidationError(f"CSV parsing error: {str(e)}")

    def parse_file(self):
        """Parse the uploaded file and return list of word data.

        Expected format (no header row required):
        Resilient,Able to recover quickly,She was resilient in adversity.,2
        Ephemeral,Lasting for a very short time,The ephemeral beauty of cherry blossoms.,3

        Each line should have: word_text,meaning[,example][,difficulty]
        - word_text (required)
        - meaning (required)
        - example (optional)
        - difficulty (optional, values 1–3, default 1)

        Returns:
            list: List of dictionaries with word data
        """
        # Reuse cached data from validation if available
        if hasattr(self, "_cached_words_data"):
            raw_rows = self._cached_words_data
        else:
            # Fallback: parse the file if not cached
            uploaded_file = self.validated_data["file"]
            uploaded_file.seek(0)  # Reset file pointer to beginning
            file_content = uploaded_file.read().decode("utf-8")
            file_io = io.StringIO(file_content)
            reader = csv.reader(file_io)

            raw_rows = []
            for row in reader:
                if not row or not any(cell.strip() for cell in row):
                    continue
                raw_rows.append(row)

        # Transform raw rows into structured word data
        words_data = []
        for row in raw_rows:
            word_text = row[0].strip()
            meaning = row[1].strip()
            example = row[2].strip() if len(row) > 2 else ""

            # Parse difficulty if provided, default to 1
            difficulty = 1
            if len(row) > 3:
                try:
                    difficulty = int(row[3].strip())
                    if difficulty < 1 or difficulty > 3:
                        difficulty = 1  # Silently default to 1 if invalid
                except (ValueError, AttributeError):
                    difficulty = 1  # Silently default to 1 if not a valid integer

            word_data = {
                "word_text": word_text,
                "meaning": meaning,
                "example": example,
                "difficulty": difficulty,
            }

            words_data.append(word_data)

        return words_data
