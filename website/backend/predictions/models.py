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
    logo_url = models.URLField(max_length=500, null=True, blank=True)

    def __str__(self):
        return self.name

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name='teams')
    
    # Integrasi API-Football
    logo_url = models.URLField(max_length=500, null=True, blank=True)
    api_football_id = models.IntegerField(null=True, blank=True, unique=True)

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

    class Meta:
        ordering = ['-date']

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

    # Integrasi API-Football (Untuk ambil update skor/hasil live)
    api_football_fixture_id = models.IntegerField(null=True, blank=True)

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

class BroadcastNotification(models.Model):
    NOTIF_TYPES = (
        ('system', 'Pengumuman Sistem'),
        ('match', 'Info Jadwal & Match'),
        ('value_bet', 'Sinyal Value Bet'),
        ('parlay', 'Rekomendasi Parlay'),
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notif_type = models.CharField(max_length=20, choices=NOTIF_TYPES, default='system')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Siaran Notifikasi'
        verbose_name_plural = 'Siaran Notifikasi'

    def __str__(self):
        return f"[{self.notif_type}] {self.title}"

class FeatureSuggestion(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, default='Fitur Baru')
    icon = models.CharField(max_length=50, default='💡')
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_features')
    voters = models.ManyToManyField(CustomUser, related_name='voted_features', blank=True)
    base_votes = models.PositiveIntegerField(default=0)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Rekomendasi Fitur'
        verbose_name_plural = 'Rekomendasi Fitur'

    def __str__(self):
        return self.title

    @property
    def total_votes(self):
        return self.base_votes + self.voters.count()

class Article(models.Model):
    CATEGORY_CHOICES = (
        ('big_match', 'Big Match & Derby'),
        ('value_bet', 'Best Value Bet'),
        ('parlay', 'Rekomendasi Seluruh Parlay'),
        ('match_preview', 'Preview Pertandingan'),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    excerpt = models.TextField(blank=True, help_text="Ringkasan singkat untuk SEO meta description")
    content = models.TextField(help_text="Konten artikel lengkap dalam format Markdown")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='big_match', db_index=True)
    tags = models.JSONField(default=list, blank=True, help_text="Tag: ['Derby', 'Top 5', 'Value Bet', 'EPL']")
    
    # Relasi opsional ke fixture atau parlay ticket
    fixture = models.ForeignKey('UpcomingFixture', on_delete=models.SET_NULL, null=True, blank=True, related_name='articles')
    parlay_ticket = models.ForeignKey('ParlayTicket', on_delete=models.SET_NULL, null=True, blank=True, related_name='articles')
    
    # Metadata SEO & OpenGraph
    featured_image = models.URLField(max_length=500, blank=True, null=True)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    reading_time = models.CharField(max_length=20, default='3 menit')
    
    is_published = models.BooleanField(default=True, db_index=True)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Artikel Berita'
        verbose_name_plural = 'Artikel Berita'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        try:
            from django.core.cache import cache
            cache.delete(f"article_detail_{self.slug}")
            cache.delete("articles_rounds_list")
            cache.delete("articles_featured_list")
            cache.delete("articles_categories_list")
        except Exception:
            pass

    def delete(self, *args, **kwargs):
        slug = self.slug
        super().delete(*args, **kwargs)
        try:
            from django.core.cache import cache
            cache.delete(f"article_detail_{slug}")
            cache.delete("articles_rounds_list")
            cache.delete("articles_featured_list")
            cache.delete("articles_categories_list")
        except Exception:
            pass

