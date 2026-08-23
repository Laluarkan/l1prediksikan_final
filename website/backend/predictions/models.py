from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    pass

class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    preferences = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.user.username

class League(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    country = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name='teams')

    def __str__(self):
        return self.name

class ParlayTicket(models.Model):
    ticket_id = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    total_odds = models.FloatField(default=1.0)
    total_prob = models.FloatField(default=0.0)
    is_won = models.BooleanField(null=True, blank=True)
    is_historical = models.BooleanField(default=False)
    legs_details = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.ticket_id} ({self.date})"

class BaseMatch(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    date = models.DateTimeField()
    home_team = models.ForeignKey(Team, related_name='%(class)s_home_matches', on_delete=models.CASCADE)
    away_team = models.ForeignKey(Team, related_name='%(class)s_away_matches', on_delete=models.CASCADE)
    
    avg_h = models.FloatField(null=True, blank=True)
    avg_d = models.FloatField(null=True, blank=True)
    avg_a = models.FloatField(null=True, blank=True)
    avg_over_25 = models.FloatField(null=True, blank=True)
    avg_under_25 = models.FloatField(null=True, blank=True)

    prob_ftr_h = models.FloatField(null=True, blank=True)
    prob_ftr_d = models.FloatField(null=True, blank=True)
    prob_ftr_a = models.FloatField(null=True, blank=True)
    prob_ou25_over = models.FloatField(null=True, blank=True)
    prob_ou25_under = models.FloatField(null=True, blank=True)

    has_value_bet = models.BooleanField(default=False)
    rl_pick_ftr = models.CharField(max_length=50, null=True, blank=True)
    rl_action_ftr = models.CharField(max_length=100, null=True, blank=True)
    rl_stake_ftr = models.FloatField(null=True, blank=True)
    is_won_ftr = models.BooleanField(null=True, blank=True)

    has_value_bet_ou = models.BooleanField(default=False)
    rl_pick_ou = models.CharField(max_length=50, null=True, blank=True)
    rl_action_ou = models.CharField(max_length=100, null=True, blank=True)
    rl_stake_ou = models.FloatField(null=True, blank=True)
    is_won_ou = models.BooleanField(null=True, blank=True)

    part_of_parlay = models.BooleanField(default=False)
    parlay_ticket_info = models.CharField(max_length=255, null=True, blank=True)

    extended_features = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True

class MatchHistory(BaseMatch):
    fthg = models.IntegerField(null=True, blank=True)
    ftag = models.IntegerField(null=True, blank=True)
    ftr = models.CharField(max_length=5, null=True, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} - {self.home_team} vs {self.away_team} ({self.fthg}-{self.ftag})"

class UpcomingFixture(BaseMatch):
    is_processed = models.BooleanField(default=False)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} - {self.home_team} vs {self.away_team}"

class SavedPrediction(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='saved_predictions')
    fixture = models.ForeignKey(UpcomingFixture, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'fixture')

    def __str__(self):
        return f"{self.user.username} saved {self.fixture}"