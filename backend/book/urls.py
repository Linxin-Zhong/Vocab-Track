from rest_framework_nested import routers
from .views import BookViewSet, BookWordViewSet

# level 1 router：book
router = routers.SimpleRouter()
router.register(r"", BookViewSet, basename="book")

# level 2 router：book/{book_id}/word
book_router = routers.NestedSimpleRouter(router, r"", lookup="book")
book_router.register(r"word", BookWordViewSet, basename="book-word")

urlpatterns = router.urls + book_router.urls
