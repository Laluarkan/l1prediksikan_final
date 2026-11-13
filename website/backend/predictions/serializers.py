from rest_framework import serializers
from .models import (League, Team, MatchHistory, UpcomingFixture, ParlayTicket, 
                    BroadcastNotification, SavedPrediction, FeatureSuggestion, Article)

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
    league_logo = serializers.URLField(source='league.logo_url', read_only=True)
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
    league_logo = serializers.URLField(source='league.logo_url', read_only=True)
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

            if ' vs ' in match_title:
                parts = match_title.split(' vs ')
                item.setdefault('home_team', parts[0].strip())
                item.setdefault('away_team', parts[1].strip())
            
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

class FeatureSuggestionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    votes_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = FeatureSuggestion
        fields = [
            'id', 'title', 'description', 'category', 'icon', 
            'created_by', 'created_by_username', 'votes_count', 
            'has_voted', 'is_approved', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_by', 'created_by_username', 'votes_count', 
            'has_voted', 'is_approved', 'created_at', 'updated_at'
        ]

    def get_created_by_username(self, obj):
        if obj.created_by:
            return obj.created_by.first_name or obj.created_by.username
        return 'Admin'

    def get_votes_count(self, obj):
        voters_cnt = getattr(obj, 'voters_count', None)
        if voters_cnt is None:
            voters_cnt = obj.voters.count()
        return (obj.base_votes or 0) + voters_cnt

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        if hasattr(obj, 'user_has_voted'):
            return obj.user_has_voted
        return obj.voters.filter(id=request.user.id).exists()

class ArticleListSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    home_team_name = serializers.CharField(source='fixture.home_team.name', read_only=True, default=None)
    away_team_name = serializers.CharField(source='fixture.away_team.name', read_only=True, default=None)
    home_team_logo = serializers.CharField(source='fixture.home_team.logo_url', read_only=True, default=None)
    away_team_logo = serializers.CharField(source='fixture.away_team.logo_url', read_only=True, default=None)
    league_name = serializers.CharField(source='fixture.league.name', read_only=True, default=None)
    match_date = serializers.SerializerMethodField()
    week_key = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'excerpt', 'category', 'category_display',
            'tags', 'featured_image', 'reading_time', 'views_count',
            'created_at', 'updated_at',
            'home_team_name', 'away_team_name', 'home_team_logo', 'away_team_logo', 'league_name',
            'match_date', 'week_key'
        ]

    def get_match_date(self, obj):
        if obj.fixture and obj.fixture.date:
            return obj.fixture.date.isoformat()
        if obj.parlay_ticket and obj.parlay_ticket.date:
            return obj.parlay_ticket.date.isoformat()
        return obj.created_at.isoformat()

    def get_week_key(self, obj):
        if obj.fixture and obj.fixture.date:
            iso = obj.fixture.date.isocalendar()
            return f"{iso[0]}-W{iso[1]:02d}"
        iso = obj.created_at.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"

class ArticleDetailSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    fixture_details = serializers.SerializerMethodField()
    parlays_data = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content', 'category', 'category_display',
            'tags', 'featured_image', 'meta_title', 'meta_description',
            'reading_time', 'views_count', 'created_at', 'updated_at',
            'fixture', 'fixture_details', 'parlay_ticket', 'parlays_data'
        ]

    def get_parlays_data(self, obj):
        if obj.category != 'parlay':
            return None
        from .models import ParlayTicket
        tickets = ParlayTicket.objects.filter(is_historical=False).order_by('-total_prob', '-date')[:10]
        return ParlayTicketSerializer(tickets, many=True).data

    def get_fixture_details(self, obj):
        if not obj.fixture:
            return None
        f = obj.fixture
        return {
            'id': f.id,
            'date': f.date,
            'league_name': f.league.name,
            'league_code': f.league.code,
            'league_logo': f.league.logo_url,
            'home_team_name': f.home_team.name,
            'home_team_logo': f.home_team.logo_url,
            'away_team_name': f.away_team.name,
            'away_team_logo': f.away_team.logo_url,
            'prob_ftr_h': f.prob_ftr_h,
            'prob_ftr_d': f.prob_ftr_d,
            'prob_ftr_a': f.prob_ftr_a,
            'prob_ou25_over': f.prob_ou25_over,
            'prob_ou25_under': f.prob_ou25_under,
            'avg_h': f.avg_h,
            'avg_d': f.avg_d,
            'avg_a': f.avg_a,
            'avg_over_25': f.avg_over_25,
            'avg_under_25': f.avg_under_25,
            'has_value_bet': f.has_value_bet,
            'rl_pick_ftr': f.rl_pick_ftr,
            'has_value_bet_ou': f.has_value_bet_ou,
            'rl_pick_ou': f.rl_pick_ou,
            'extended_features': extract_curated_features(f.extended_features)
        }
