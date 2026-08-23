from rest_framework import serializers
from .models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket

class LeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = '__all__'

class TeamSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    
    class Meta:
        model = Team
        fields = '__all__'

class MatchHistorySerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)

    class Meta:
        model = MatchHistory
        fields = '__all__'

class UpcomingFixtureSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)

    class Meta:
        model = UpcomingFixture
        fields = '__all__'

class ParlayTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParlayTicket
        fields = '__all__'