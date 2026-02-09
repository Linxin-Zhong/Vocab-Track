from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

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
        serializer.is_valid(raise_exception=True)

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
            return Response({"detail": "book not found"}, status=404)

        # verify book has words
        book_word = BookWord.objects.filter(book=book)
        if not book_word.exists():
            return Response({"detail": "book has no words"}, status=200)

        with transaction.atomic():
            for bw in book_word:
                UserWord.objects.get_or_create(
                    user=user,
                    book_word=bw,
                    defaults={
                        # TODO ease_factor design
                        "ease_factor": 0,
                        "correct_times": 0,
                        "wrong_times": 0,
                        "last_time": None,
                        "next_review_time": None,  # None means never reviewed, should be prioritized in review
                    },
                )
        # filter user words that are due for review
        user_word = (
            UserWord.objects.filter(
                user=user,
                book_word__book=book,
            )
            .filter(
                Q(next_review_time__lte=timezone.now())
                | Q(next_review_time__isnull=True)
            )
            .order_by("next_review_time", "id")[:limit]
        )

        if not user_word.exists():
            return Response({"detail": "no words to review"}, status=200)

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
        serializer.is_valid(raise_exception=True)

        user = request.user
        session_id = serializer.validated_data["session_id"]
        user_word_id = serializer.validated_data["user_word_id"]
        is_correct = serializer.validated_data["is_correct"]

        try:
            session = ReviewSession.objects.get(id=session_id, user=user)
            user_word = UserWord.objects.get(id=user_word_id, user=user)
        except (ReviewSession.DoesNotExist, UserWord.DoesNotExist):
            return Response(
                {"detail": "session or user word not found"},
                status=status.HTTP_404_NOT_FOUND,
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
            if user_word.ease_factor < 1:
                user_word.ease_factor = 1
            next_review_time = now + timezone.timedelta(days=1)

        post_ease_factor = user_word.ease_factor
        user_word.last_time = now
        user_word.next_review_time = next_review_time
        user_word.save()

        ReviewItem.objects.create(
            session=session,
            user_word=user_word,
            is_correct=is_correct,
            pre_ease_factor=pre_ease_factor,
            post_ease_factor=post_ease_factor,
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
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data["session_id"]
        user = request.user

        try:
            session = ReviewSession.objects.get(id=session_id, user=user)
        except ReviewSession.DoesNotExist:
            return Response(status=404)

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
