from django.urls import path
from review.views import (
    ReviewStartView,
    ReviewAnswerView,
    ReviewEndView,
)

urlpatterns = [
    path("start/", ReviewStartView.as_view()),
    path("answer/", ReviewAnswerView.as_view()),
    path("end/", ReviewEndView.as_view()),
]
