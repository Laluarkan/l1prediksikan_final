from rest_framework import serializers
from .models import League, Team, MatchHistory, UpcomingFixture, ParlayTicket, BroadcastNotification, SavedPrediction

class LeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = '__all__'

class TeamSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    
    class Meta:
        model = Team
        fields = '__all__'

def extract_curated_features(extended_features):
    if not extended_features or not isinstance(extended_features, dict):
        return {}
    keys = [
        'elo_home', 'elo_away', 'home_league_pos', 'away_league_pos',
        'home_ppg', 'away_ppg', 'home_avg_scored', 'away_avg_scored',
        'h2h_home_wins', 'h2h_draws', 'h2h_away_wins',
        'home_win_rate', 'away_win_rate'
    ]
    curated = {}
    for k in keys:
        if k in extended_features:
            val = extended_features[k]
            if val is not None and str(val).lower() != 'nan':
                try:
                    curated[k] = float(val) if isinstance(val, (int, float)) or (isinstance(val, str) and val.replace('.', '', 1).isdigit()) else val
                except Exception:
                    curated[k] = val
    return curated

class MatchHistorySerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    league_code = serializers.CharField(source='league.code', read_only=True)
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    home_team_logo = serializers.URLField(source='home_team.logo_url', read_only=True)
    away_team_logo = serializers.URLField(source='away_team.logo_url', read_only=True)
    extended_features = serializers.SerializerMethodField()
    has_value_bet = serializers.SerializerMethodField()
    has_value_bet_ou = serializers.SerializerMethodField()

    def get_has_value_bet(self, obj):
        return bool(obj.has_value_bet and obj.rl_stake_ftr and obj.rl_stake_ftr > 0)

    def get_has_value_bet_ou(self, obj):
        return bool(obj.has_value_bet_ou and obj.rl_stake_ou and obj.rl_stake_ou > 0)

    def get_extended_features(self, obj):
        return extract_curated_features(obj.extended_features)

    class Meta:
        model = MatchHistory
        fields = '__all__'

class UpcomingFixtureSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name', read_only=True)
    league_code = serializers.CharField(source='league.code', read_only=True)
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    home_team_logo = serializers.URLField(source='home_team.logo_url', read_only=True)
    away_team_logo = serializers.URLField(source='away_team.logo_url', read_only=True)
    extended_features = serializers.SerializerMethodField()
    has_value_bet = serializers.SerializerMethodField()
    has_value_bet_ou = serializers.SerializerMethodField()

    def get_has_value_bet(self, obj):
        return bool(obj.has_value_bet and obj.rl_stake_ftr and obj.rl_stake_ftr > 0)

    def get_has_value_bet_ou(self, obj):
        return bool(obj.has_value_bet_ou and obj.rl_stake_ou and obj.rl_stake_ou > 0)

    def get_extended_features(self, obj):
        return extract_curated_features(obj.extended_features)

    class Meta:
        model = UpcomingFixture
        fields = '__all__'

class ParlayTicketSerializer(serializers.ModelSerializer):
    legs_details = serializers.SerializerMethodField()

    def get_legs_details(self, obj):
        if not obj.legs_details or not isinstance(obj.legs_details, list):
            return []
        normalized = []
        for leg in obj.legs_details:
            if not isinstance(leg, dict):
                continue
            item = dict(leg)
            match_title = item.get('match') or item.get('match_name') or 'Pertandingan'
            item['match'] = match_title
            item['match_name'] = match_title
            
            odds_val = float(item.get('odds') or 1.0)
            item['odds'] = odds_val
            
            prob_val = item.get('prob')
            if prob_val is None or str(prob_val).lower() == 'nan':
                item['prob'] = round(1.0 / odds_val, 4) if odds_val > 0 else 0.5
            else:
                item['prob'] = float(prob_val)

            pick_val = str(item.get('pick') or '')
            if 'market_type' not in item or not item['market_type']:
                if 'over' in pick_val.lower() or 'under' in pick_val.lower():
                    item['market_type'] = 'O/U 2.5'
                else:
                    item['market_type'] = '1X2 / FTR'
            normalized.append(item)
        return normalized

    class Meta:
        model = ParlayTicket
        fields = '__all__'

class BroadcastNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BroadcastNotification
        fields = '__all__'

class SavedPredictionSerializer(serializers.ModelSerializer):
    fixture = UpcomingFixtureSerializer(read_only=True)
    fixture_id = serializers.PrimaryKeyRelatedField(
        queryset=UpcomingFixture.objects.all(), source='fixture', write_only=True
    )

    class Meta:
        model = SavedPrediction
        fields = ['id', 'user', 'fixture', 'fixture_id', 'saved_at']
        read_only_fields = ['id', 'user', 'saved_at']