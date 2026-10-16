from django.contrib import admin
from .models import CustomUser, UserProfile, League, Team, MatchHistory, UpcomingFixture, SavedPrediction, ParlayTicket, BroadcastNotification

admin.site.register(CustomUser)
admin.site.register(UserProfile)
admin.site.register(League)
admin.site.register(Team)
admin.site.register(SavedPrediction)

@admin.register(BroadcastNotification)
class BroadcastNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'notif_type', 'is_active', 'created_at')
    list_filter = ('notif_type', 'is_active', 'created_at')
    search_fields = ('title', 'message')
    ordering = ('-created_at',)

@admin.register(ParlayTicket)
class ParlayTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'date', 'total_odds', 'total_prob', 'is_won', 'is_historical', 'legs_details')
    list_filter = ('is_won', 'is_historical')
    search_fields = ('ticket_id',)
    ordering = ('-date',)

@admin.register(MatchHistory)
class MatchHistoryAdmin(admin.ModelAdmin):
    list_display = ('date', 'home_team', 'away_team', 'fthg', 'ftag', 'rl_pick_ftr', 'is_won_ftr', 'rl_pick_ou', 'is_won_ou', 'part_of_parlay')
    list_filter = ('league', 'part_of_parlay', 'is_won_ftr', 'is_won_ou')
    search_fields = ('home_team__name', 'away_team__name', 'parlay_ticket_info')
    date_hierarchy = 'date'
    ordering = ('-date',)

@admin.register(UpcomingFixture)
class UpcomingFixtureAdmin(admin.ModelAdmin):
    list_display = ('date', 'home_team', 'away_team', 'rl_pick_ftr', 'rl_pick_ou', 'part_of_parlay', 'is_processed')
    list_filter = ('league', 'part_of_parlay', 'is_processed')
    search_fields = ('home_team__name', 'away_team__name', 'parlay_ticket_info')
    date_hierarchy = 'date'
    ordering = ('date',)