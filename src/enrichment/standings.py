import numpy as np
import pandas as pd


def build_standings_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').reset_index(drop=True)

    new_cols = [
        'home_league_pos', 'away_league_pos',
        'home_points', 'away_points',
        'home_gd', 'away_gd',
        'home_goals_scored_season', 'home_goals_conceded_season',
        'away_goals_scored_season', 'away_goals_conceded_season',
        'home_home_wins', 'home_home_draws', 'home_home_losses',
        'away_away_wins', 'away_away_draws', 'away_away_losses',
        'home_win_streak', 'away_win_streak',
        'home_unbeaten_streak', 'away_unbeaten_streak',
        'points_diff', 'pos_diff',
        'home_matches_played', 'away_matches_played',
        'home_ppg', 'away_ppg',
        'home_zone', 'away_zone',
        'home_days_rest', 'away_days_rest',
        'home_matches_last_14', 'away_matches_last_14',
    ]
    for col in new_cols:
        df[col] = np.nan

    standings: dict = {}
    last_match_date: dict = {}
    match_dates: dict = {}

    def get_standing(div, team, season):
        key = (div, season)
        if key not in standings:
            return {'pts': 0, 'gd': 0, 'gs': 0, 'gc': 0, 'mp': 0,
                    'hw': 0, 'hd': 0, 'hl': 0, 'aw': 0, 'ad': 0, 'al': 0,
                    'win_streak': 0, 'unbeaten_streak': 0}
        return standings[key].get(team, {
            'pts': 0, 'gd': 0, 'gs': 0, 'gc': 0, 'mp': 0,
            'hw': 0, 'hd': 0, 'hl': 0, 'aw': 0, 'ad': 0, 'al': 0,
            'win_streak': 0, 'unbeaten_streak': 0
        })

    def get_rank(div, season, team):
        key = (div, season)
        if key not in standings:
            return np.nan
        table = standings[key]
        ranked = sorted(table.keys(),
                        key=lambda t: (-table[t]['pts'], -table[t]['gd'], -table[t]['gs']))
        try:
            return ranked.index(team) + 1
        except ValueError:
            return np.nan

    def n_teams_in_div(div):
        counts = {'E0': 20, 'SP1': 20, 'I1': 20, 'D1': 18, 'F1': 18,
                  'N1': 18, 'B1': 16, 'P1': 18, 'T1': 20, 'G1': 16, 'SC0': 12}
        return counts.get(div, 18)

    def get_zone(pos, div):
        n = n_teams_in_div(div)
        if pos <= 1:
            return 1
        elif pos <= 4:
            return 2
        elif pos >= n - 2:
            return 5
        elif pos >= n - 5:
            return 4
        return 3

    def days_rest(div, team, current_date):
        last = last_match_date.get((div, team))
        if last is None:
            return np.nan
        delta = (current_date - last).days
        return float(delta)

    def matches_in_last_n_days(div, team, current_date, n=14):
        dates = match_dates.get((div, team), [])
        cutoff = current_date - pd.Timedelta(days=n)
        return sum(1 for d in dates if cutoff <= d < current_date)

    for idx, row in df.iterrows():
        div    = str(row.get('Div', 'UNK'))
        season = str(row.get('Season', 'UNK'))
        home   = row.get('HomeTeam', '')
        away   = row.get('AwayTeam', '')
        fthg   = row.get('FTHG', np.nan)
        ftag   = row.get('FTAG', np.nan)
        ftr    = str(row.get('FTR', ''))
        date   = row['Date']

        if not home or not away:
            continue

        h_st = get_standing(div, home, season)
        a_st = get_standing(div, away, season)

        h_pos = get_rank(div, season, home)
        a_pos = get_rank(div, season, away)

        df.at[idx, 'home_league_pos']          = h_pos
        df.at[idx, 'away_league_pos']          = a_pos
        df.at[idx, 'home_points']              = h_st['pts']
        df.at[idx, 'away_points']              = a_st['pts']
        df.at[idx, 'home_gd']                  = h_st['gd']
        df.at[idx, 'away_gd']                  = a_st['gd']
        df.at[idx, 'home_goals_scored_season'] = h_st['gs']
        df.at[idx, 'home_goals_conceded_season']= h_st['gc']
        df.at[idx, 'away_goals_scored_season'] = a_st['gs']
        df.at[idx, 'away_goals_conceded_season']= a_st['gc']
        df.at[idx, 'home_home_wins']           = h_st['hw']
        df.at[idx, 'home_home_draws']          = h_st['hd']
        df.at[idx, 'home_home_losses']         = h_st['hl']
        df.at[idx, 'away_away_wins']           = a_st['aw']
        df.at[idx, 'away_away_draws']          = a_st['ad']
        df.at[idx, 'away_away_losses']         = a_st['al']
        df.at[idx, 'home_win_streak']          = h_st['win_streak']
        df.at[idx, 'away_win_streak']          = a_st['win_streak']
        df.at[idx, 'home_unbeaten_streak']     = h_st['unbeaten_streak']
        df.at[idx, 'away_unbeaten_streak']     = a_st['unbeaten_streak']
        df.at[idx, 'home_matches_played']      = h_st['mp']
        df.at[idx, 'away_matches_played']      = a_st['mp']

        h_ppg = h_st['pts'] / max(h_st['mp'], 1)
        a_ppg = a_st['pts'] / max(a_st['mp'], 1)
        df.at[idx, 'home_ppg'] = h_ppg
        df.at[idx, 'away_ppg'] = a_ppg

        if not (np.isnan(h_pos) or np.isnan(a_pos)):
            df.at[idx, 'points_diff'] = h_st['pts'] - a_st['pts']
            df.at[idx, 'pos_diff']    = a_pos - h_pos
            df.at[idx, 'home_zone']   = get_zone(h_pos, div)
            df.at[idx, 'away_zone']   = get_zone(a_pos, div)

        if pd.notna(date):
            df.at[idx, 'home_days_rest']     = days_rest(div, home, date)
            df.at[idx, 'away_days_rest']     = days_rest(div, away, date)
            df.at[idx, 'home_matches_last_14'] = matches_in_last_n_days(div, home, date)
            df.at[idx, 'away_matches_last_14'] = matches_in_last_n_days(div, away, date)

        if pd.notna(fthg) and pd.notna(ftag) and ftr in ('H', 'D', 'A'):
            key = (div, season)
            if key not in standings:
                standings[key] = {}

            for team, gs, gc, is_home in [(home, fthg, ftag, True), (away, ftag, fthg, False)]:
                if team not in standings[key]:
                    standings[key][team] = {
                        'pts': 0, 'gd': 0, 'gs': 0, 'gc': 0, 'mp': 0,
                        'hw': 0, 'hd': 0, 'hl': 0, 'aw': 0, 'ad': 0, 'al': 0,
                        'win_streak': 0, 'unbeaten_streak': 0,
                        'last_results': []
                    }
                st = standings[key][team]
                st['gs'] += gs
                st['gc'] += gc
                st['gd'] += (gs - gc)
                st['mp'] += 1

                if (is_home and ftr == 'H') or (not is_home and ftr == 'A'):
                    result = 'W'
                    st['pts'] += 3
                    if is_home:
                        st['hw'] += 1
                    else:
                        st['aw'] += 1
                elif ftr == 'D':
                    result = 'D'
                    st['pts'] += 1
                    if is_home:
                        st['hd'] += 1
                    else:
                        st['ad'] += 1
                else:
                    result = 'L'
                    if is_home:
                        st['hl'] += 1
                    else:
                        st['al'] += 1

                st['last_results'].append(result)
                recent = st['last_results'][-5:]
                st['win_streak'] = 0
                for r in reversed(recent):
                    if r == 'W':
                        st['win_streak'] += 1
                    else:
                        break
                st['unbeaten_streak'] = 0
                for r in reversed(recent):
                    if r in ('W', 'D'):
                        st['unbeaten_streak'] += 1
                    else:
                        break

            if pd.notna(date):
                for team in [home, away]:
                    last_match_date[(div, team)] = date
                    if (div, team) not in match_dates:
                        match_dates[(div, team)] = []
                    match_dates[(div, team)].append(date)

    return df


STANDINGS_FEATURES = [
    'home_league_pos', 'away_league_pos',
    'home_points', 'away_points',
    'home_gd', 'away_gd',
    'home_ppg', 'away_ppg',
    'points_diff', 'pos_diff',
    'home_zone', 'away_zone',
    'home_win_streak', 'away_win_streak',
    'home_unbeaten_streak', 'away_unbeaten_streak',
    'home_home_wins', 'home_home_draws', 'home_home_losses',
    'away_away_wins', 'away_away_draws', 'away_away_losses',
    'home_days_rest', 'away_days_rest',
    'home_matches_last_14', 'away_matches_last_14',
    'home_goals_scored_season', 'home_goals_conceded_season',
    'away_goals_scored_season', 'away_goals_conceded_season',
]