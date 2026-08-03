create table if not exists public.champion_scores (
  player_id uuid primary key,
  player_name varchar(14) not null,
  score integer not null,
  correct_answers integer not null,
  incorrect_answers integer not null default 0,
  level_reached integer not null,
  game_mode text not null default 'arcade',
  difficulty text not null default 'normal',
  operation_mode text not null default 'multiplication',
  selected_character text not null default 'bifly',
  max_combo integer not null default 0,
  accuracy smallint not null default 0,
  play_time_ms integer not null default 0,
  time_limit_enabled boolean not null default true,
  game_version varchar(48) not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.champion_scores
  add column if not exists incorrect_answers integer not null default 0,
  add column if not exists game_mode text not null default 'arcade',
  add column if not exists operation_mode text not null default 'multiplication',
  add column if not exists selected_character text not null default 'bifly',
  add column if not exists max_combo integer not null default 0,
  add column if not exists accuracy smallint not null default 0,
  add column if not exists play_time_ms integer not null default 0,
  add column if not exists game_version varchar(48) not null default 'unknown';

alter table public.champion_scores drop constraint if exists champion_scores_score_check;
alter table public.champion_scores drop constraint if exists champion_scores_correct_answers_check;
alter table public.champion_scores drop constraint if exists champion_scores_level_reached_check;
alter table public.champion_scores drop constraint if exists champion_scores_difficulty_check;
alter table public.champion_scores drop constraint if exists champion_scores_incorrect_answers_check;
alter table public.champion_scores drop constraint if exists champion_scores_game_mode_check;
alter table public.champion_scores drop constraint if exists champion_scores_operation_mode_check;
alter table public.champion_scores drop constraint if exists champion_scores_selected_character_check;
alter table public.champion_scores drop constraint if exists champion_scores_max_combo_check;
alter table public.champion_scores drop constraint if exists champion_scores_accuracy_check;
alter table public.champion_scores drop constraint if exists champion_scores_play_time_ms_check;
alter table public.champion_scores drop constraint if exists champion_scores_player_name_check;

alter table public.champion_scores alter column correct_answers type integer;
alter table public.champion_scores alter column level_reached type integer;
alter table public.champion_scores alter column player_name type varchar(14) using left(player_name, 14);
alter table public.champion_scores alter column difficulty set default 'normal';
alter table public.champion_scores alter column time_limit_enabled set default true;

-- Keep this migration safe for installations that used the original four
-- English difficulty ids and did not record all of the newer telemetry yet.
update public.champion_scores
set difficulty = case difficulty
  when 'easy' then 'beginner'
  when 'medium' then 'normal'
  when 'hard' then 'advanced'
  when 'veryHard' then 'expert'
  else difficulty
end;

update public.champion_scores
set
  game_mode = case when game_mode in ('arcade', 'adventure') then game_mode else 'arcade' end,
  operation_mode = case when operation_mode in ('multiplication', 'mixed') then operation_mode else 'multiplication' end,
  selected_character = case when selected_character in ('bifly', 'nabatick') then selected_character else 'bifly' end,
  incorrect_answers = greatest(0, least(5000, coalesce(incorrect_answers, 0))),
  max_combo = greatest(0, least(correct_answers, coalesce(max_combo, 0))),
  accuracy = greatest(0, least(100, coalesce(accuracy, 0))),
  play_time_ms = greatest(100, least(43200000, coalesce(nullif(play_time_ms, 0), correct_answers * 100))),
  game_version = left(coalesce(nullif(game_version, ''), 'legacy'), 48);

delete from public.champion_scores
where score < 1
   or correct_answers < 1
   or correct_answers > 5000
   or level_reached < 1
   or level_reached > 200
   or difficulty not in ('beginner', 'normal', 'advanced', 'expert', 'legendary');

alter table public.champion_scores
  add constraint champion_scores_player_name_check check (
    player_name = btrim(player_name)
    and char_length(player_name) between 1 and 14
    and player_name !~ '[[:cntrl:]]'
  ),
  add constraint champion_scores_score_check check (score between 1 and 50000000),
  add constraint champion_scores_correct_answers_check check (correct_answers between 1 and 5000),
  add constraint champion_scores_incorrect_answers_check check (incorrect_answers between 0 and 5000),
  add constraint champion_scores_level_reached_check check (level_reached between 1 and 200),
  add constraint champion_scores_game_mode_check check (game_mode in ('arcade', 'adventure')),
  add constraint champion_scores_difficulty_check check (difficulty in ('beginner', 'normal', 'advanced', 'expert', 'legendary')),
  add constraint champion_scores_operation_mode_check check (operation_mode in ('multiplication', 'mixed')),
  add constraint champion_scores_selected_character_check check (selected_character in ('bifly', 'nabatick')),
  add constraint champion_scores_max_combo_check check (max_combo between 0 and correct_answers),
  add constraint champion_scores_accuracy_check check (accuracy between 0 and 100),
  add constraint champion_scores_play_time_ms_check check (play_time_ms between 100 and 43200000);

drop index if exists public.champion_scores_ranking_idx;
create index champion_scores_ranking_idx
  on public.champion_scores (score desc, correct_answers desc, updated_at asc);
create index if not exists champion_scores_category_idx
  on public.champion_scores (game_mode, difficulty, score desc, correct_answers desc, updated_at asc);

alter table public.champion_scores enable row level security;
revoke all on table public.champion_scores from public, anon, authenticated;
grant select, insert, update on table public.champion_scores to service_role;

drop function if exists public.submit_champion_score(uuid, text, integer, smallint, smallint, text, boolean);
drop function if exists public.submit_champion_score(uuid, text, integer, integer, integer, integer, text, text, text, text, integer, smallint, integer, boolean, text);

create or replace function public.submit_champion_score(
  p_player_id uuid,
  p_player_name text,
  p_score integer,
  p_correct_answers integer,
  p_incorrect_answers integer,
  p_level_reached integer,
  p_game_mode text,
  p_difficulty text,
  p_operation_mode text,
  p_selected_character text,
  p_max_combo integer,
  p_accuracy smallint,
  p_play_time_ms integer,
  p_time_limit_enabled boolean,
  p_game_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous public.champion_scores;
  saved public.champion_scores;
  score_improved boolean;
begin
  if p_player_name is null
    or char_length(btrim(p_player_name)) < 1
    or char_length(btrim(p_player_name)) > 14
    or p_player_name ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'invalid player name';
  end if;

  -- Serialize submissions for the same anonymous player so two end-of-game
  -- requests cannot race between the initial lookup and first insert.
  perform pg_advisory_xact_lock(hashtextextended(p_player_id::text, 0));
  select * into previous from public.champion_scores where player_id = p_player_id for update;
  score_improved := previous.player_id is null
    or p_score > previous.score
    or (p_score = previous.score and p_correct_answers > previous.correct_answers);

  if previous.player_id is null then
    insert into public.champion_scores (
      player_id, player_name, score, correct_answers, incorrect_answers, level_reached,
      game_mode, difficulty, operation_mode, selected_character, max_combo, accuracy,
      play_time_ms, time_limit_enabled, game_version
    ) values (
      p_player_id, trim(p_player_name), p_score, p_correct_answers, p_incorrect_answers, p_level_reached,
      p_game_mode, p_difficulty, p_operation_mode, p_selected_character, p_max_combo, p_accuracy,
      p_play_time_ms, p_time_limit_enabled, left(p_game_version, 48)
    ) returning * into saved;
  elsif score_improved then
    update public.champion_scores set
      player_name = trim(p_player_name),
      score = p_score,
      correct_answers = p_correct_answers,
      incorrect_answers = p_incorrect_answers,
      level_reached = p_level_reached,
      game_mode = p_game_mode,
      difficulty = p_difficulty,
      operation_mode = p_operation_mode,
      selected_character = p_selected_character,
      max_combo = p_max_combo,
      accuracy = p_accuracy,
      play_time_ms = p_play_time_ms,
      time_limit_enabled = p_time_limit_enabled,
      game_version = left(p_game_version, 48),
      updated_at = now()
    where player_id = p_player_id
    returning * into saved;
  else
    update public.champion_scores
      set player_name = trim(p_player_name)
      where player_id = p_player_id
      returning * into saved;
  end if;

  return jsonb_build_object(
    'improved', score_improved,
    'score', saved.score,
    'correctAnswers', saved.correct_answers,
    'levelReached', saved.level_reached
  );
end;
$$;

create or replace function public.get_champion_rank(p_player_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_score public.champion_scores;
  current_rank integer;
  total_players integer;
  score_above integer;
begin
  select * into current_score from public.champion_scores where player_id = p_player_id;
  select count(*)::integer into total_players from public.champion_scores;
  if current_score.player_id is null then
    return jsonb_build_object('rank', null, 'totalPlayers', total_players, 'score', 0, 'scoreToNextRank', null);
  end if;

  select 1 + count(*)::integer into current_rank
  from public.champion_scores candidate
  where candidate.score > current_score.score
     or (candidate.score = current_score.score and candidate.correct_answers > current_score.correct_answers)
     or (
       candidate.score = current_score.score
       and candidate.correct_answers = current_score.correct_answers
       and candidate.updated_at < current_score.updated_at
     );

  select candidate.score into score_above
  from public.champion_scores candidate
  where candidate.score > current_score.score
     or (candidate.score = current_score.score and candidate.correct_answers > current_score.correct_answers)
     or (
       candidate.score = current_score.score
       and candidate.correct_answers = current_score.correct_answers
       and candidate.updated_at < current_score.updated_at
     )
  order by candidate.score asc, candidate.correct_answers asc, candidate.updated_at desc
  limit 1;

  return jsonb_build_object(
    'rank', current_rank,
    'totalPlayers', total_players,
    'score', current_score.score,
    'scoreToNextRank', case when current_rank = 1 then 0 else greatest(1, coalesce(score_above, current_score.score) - current_score.score + 1) end,
    'playerName', current_score.player_name,
    'updatedAt', current_score.updated_at
  );
end;
$$;

revoke all on function public.submit_champion_score(uuid, text, integer, integer, integer, integer, text, text, text, text, integer, smallint, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_champion_score(uuid, text, integer, integer, integer, integer, text, text, text, text, integer, smallint, integer, boolean, text) to service_role;
revoke all on function public.get_champion_rank(uuid) from public, anon, authenticated;
grant execute on function public.get_champion_rank(uuid) to service_role;
