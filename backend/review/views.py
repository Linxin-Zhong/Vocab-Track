from django.db import transaction, IntegrityError
from django.db.models import Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from api.utils import format_serializer_errors

from review.models import UserWord, ReviewSession, ReviewItem
from book.models import BookWord, Book
from review.serializers import (
    ReviewStartSerializer,
    ReviewAnswerSerializer,
    ReviewEndSerializer,
)


class ReviewStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        book_id = serializer.validated_data["book_id"]
        limit = serializer.validated_data["limit"]
        user = request.user

        # verify book exists and belongs to user or is public
        try:
            book = Book.objects.get(
                Q(id=book_id),
                Q(user=user) | Q(user__isnull=True),
            )
        except Book.DoesNotExist:
            return Response({"message": "book not found"}, status=404)

        # verify book has words
        book_word = list(BookWord.objects.filter(book=book))
        if not book_word:
            return Response({"message": "book has no words"}, status=200)

        # create UserWord entries for all BookWords in the book if not exist
        with transaction.atomic():
            existing_book_word_ids = set(
                UserWord.objects.filter(
                    user=user,
                    book_word__book=book,
                ).values_list("book_word_id", flat=True)
            )

            new_user_words = [
                UserWord(
                    user=user,
                    book_word=bw,
                    # TODO ease_factor design
                    ease_factor=0,
                    correct_times=0,
                    wrong_times=0,
                    last_time=None,
                    # None means never reviewed, should be prioritized in review
                    next_review_time=None,
                )
                for bw in book_word
                if bw.id not in existing_book_word_ids
            ]
            if new_user_words:
                UserWord.objects.bulk_create(new_user_words, ignore_conflicts=True)

        # First try words that are due now; if none are due, fall back to the
        # earliest scheduled words so users can review again immediately.
        all_user_words = UserWord.objects.filter(
            user=user,
            book_word__book=book,
        ).select_related("book_word__word")

        if not all_user_words.exists():
            return Response({"message": "no words to review"}, status=200)

        due_user_words = all_user_words.filter(
            Q(next_review_time__lte=timezone.now()) | Q(next_review_time__isnull=True)
        ).order_by(F("next_review_time").asc(nulls_first=True), "id")[:limit]

        if due_user_words.exists():
            user_word = due_user_words
        else:
            user_word = all_user_words.order_by(
                F("next_review_time").asc(nulls_last=True), "id"
            )[:limit]

        session = ReviewSession.objects.create(
            user=user,
            book=book,
            start_time=timezone.now(),
            total_cnt=user_word.count(),
        )

        words = [
            {
                "user_word_id": uw.id,
                "word_text": uw.book_word.word.word_text,
                "meaning": uw.book_word.meaning,
            }
            for uw in user_word
        ]

        return Response(
            {
                "session_id": session.id,
                "words": words,
            },
            status=200,
        )


class ReviewAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        session_id = serializer.validated_data["session_id"]
        user_word_id = serializer.validated_data["user_word_id"]
        is_correct = serializer.validated_data["is_correct"]

        try:
            session = ReviewSession.objects.get(id=session_id, user=user)
        except ReviewSession.DoesNotExist:
            return Response(
                {"message": "session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            # Ensure the user word belongs to the same book as the review session.
            user_word = UserWord.objects.get(
                id=user_word_id,
                user=user,
                book_word__book=session.book,
            )
        except UserWord.DoesNotExist:
            return Response(
                {"message": "user word not found for this session"},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Prevent answering the same word multiple times in a single session.
        if ReviewItem.objects.filter(session=session, user_word=user_word).exists():
            return Response(
                {"message": "this word has already been answered in this session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        pre_ease_factor = user_word.ease_factor

        if is_correct:
            user_word.correct_times += 1
            user_word.ease_factor += 1
            next_review_time = now + timezone.timedelta(days=3)
        else:
            user_word.wrong_times += 1
            user_word.ease_factor -= 1
            if user_word.ease_factor < 0:
                user_word.ease_factor = 0
            next_review_time = now + timezone.timedelta(days=1)

        post_ease_factor = user_word.ease_factor
        user_word.last_time = now
        user_word.next_review_time = next_review_time

        try:
            with transaction.atomic():
                user_word.save()
                ReviewItem.objects.create(
                    session=session,
                    user_word=user_word,
                    is_correct=is_correct,
                    pre_ease_factor=pre_ease_factor,
                    post_ease_factor=post_ease_factor,
                )
        except IntegrityError:
            return Response(
                {"message": "this word has already been answered in this session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "user_word_id": user_word.id,
                "word_text": user_word.book_word.word.word_text,
                "is_correct": is_correct,
                "pre_ease_factor": pre_ease_factor,
                "post_ease_factor": post_ease_factor,
                "next_review_time": next_review_time,
            },
            status=200,
        )


class ReviewEndView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewEndSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = serializer.validated_data["session_id"]
        user = request.user

        try:
            session = ReviewSession.objects.get(id=session_id, user=user)
        except ReviewSession.DoesNotExist:
            return Response(
                {"message": "session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        items = ReviewItem.objects.filter(session=session)
        total_cnt = items.count()
        correct_cnt = items.filter(is_correct=True).count()

        # Prefer actual item counts to avoid stale totals.
        session.total_cnt = total_cnt
        session.correct_cnt = correct_cnt
        session.end_time = timezone.now()
        session.accuracy = correct_cnt / total_cnt if total_cnt else 0
        session.save()

        return Response(
            {
                "session_id": session.id,
                "duration_seconds": (
                    session.end_time - session.start_time
                ).total_seconds(),
                "total": total_cnt,
                "correct": correct_cnt,
                "accuracy": session.accuracy,
            },
            status=200,
        )
