from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (LeagueViewSet, TeamViewSet, MatchHistoryViewSet, 
                    UpcomingFixtureViewSet, ParlayTicketViewSet, 
                    DatasetPreviewView, DatasetConfirmSaveView, 
                    PerformanceMetricsAPIView, LeagueStandingsAPIView,
                    CronTriggerAPIView, SyncUserView, CheckStaffView)

router = DefaultRouter()
router.register(r'leagues', LeagueViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'history', MatchHistoryViewSet)
router.register(r'fixtures', UpcomingFixtureViewSet)
router.register(r'parlays', ParlayTicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('upload-preview/', DatasetPreviewView.as_view(), name='dataset-upload-preview'),
    path('upload-save/', DatasetConfirmSaveView.as_view(), name='dataset-upload-save'),
    # URL diubah agar cocok dengan request Next.js
    path('performance-metrics/', PerformanceMetricsAPIView.as_view(), name='performance-metrics'),
    path('standings/', LeagueStandingsAPIView.as_view(), name='league-standings'),
    path('sync-user/', SyncUserView.as_view(), name='sync-user'),
    path('check-staff/', CheckStaffView.as_view(), name='check-staff'),
    path('cron-trigger/', CronTriggerAPIView.as_view(), name='cron-trigger'),
]