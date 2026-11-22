# Shelf API: Data Source Research

_Researched 2026-11-22. Phase 1 deliverable. No code yet._

## How this was verified (read first)

Direct page fetches were blocked by the build environment's network allowlist, so every
finding below comes from web-search results that quote the official pages. Each row has a
**Confidence** tag:

- **V**: verified. The official ToS or docs page was quoted directly.
- **P**: partial. The official page was quoted, but the snippet was incomplete or the
  page may be outdated.
- **U**: unverified. The finding comes only from third-party or community sources.

**Before launch, re-read every source you enable at its canonical URL** (linked in each
row). This document is a research aid, not legal advice. Terms change often.

### The one question that decides most of this table

Several key sources are **free only for non-commercial use** (TMDB, IMDb datasets, RAWG,
Watchmode, MangaDex). TMDB's FAQ defines commercial as a project whose _"primary purpose is
to create revenue for the benefit of the owner"_, and TMDB alone decides what counts. Being
published under an LLC doesn't automatically make the app commercial, but **ads, a paid tier,
IAP or a subscription almost certainly do.** The config will tag every source
`commercial_ok: true|false|conditional` so non-commercial sources can be switched off.

---

## Movies / TV

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [TMDB](https://www.themoviedb.org/api-terms-of-use) | Movies, TV, seasons, episodes, cast/crew, posters/backdrops/stills, genres, runtime, ratings, trending, upcoming, recommendations, external IDs (IMDb, TVDB, Wikidata), **watch providers** | API key / v4 bearer token | ~40–50 req/s per IP (no fixed quota, 429 on excess) | **No.** _"does not permit any commercial use"_ without a written agreement, which _"may be subject to… payment of fees"_ | TMDB logo + notice _"This product uses the TMDB API but is not endorsed or certified by TMDB"_ in About/Credits. Logo must be less prominent than the app's own. | Daily ID export files only (no metadata dump) | **Cache limit: 6 months max.** Purge everything if the license ends. Best coverage overall. | V |
| TMDB watch providers | Per-region flatrate/rent/buy/ads provider lists + logos | (TMDB) | (TMDB) | Same as TMDB | **"JustWatch Attribution Required."** TMDB _"will revoke access"_ if missing | No | Data comes from JustWatch. Gives no deep links to the title on each service. | V |
| [TVmaze](https://www.tvmaze.com/api) | Shows, full episode lists (airdates, numbers, summaries), schedules, cast, networks, images, external IDs (IMDb, TVDB) | None for the public API | ~20 calls / 10 s per IP | **Yes.** CC BY-SA data. Staff confirmed on the forum that commercial use is OK with attribution. | Credit TVmaze as the source (CC BY-SA). Per-image notices not needed. | No (full index paginable via `/shows?page=`) | ShareAlike: if you redistribute the data, it has to stay CC BY-SA. Some aggregators say commercial use needs a license. Confirm by email. | P |
| [TheTVDB](https://thetvdb.com/api-information) | Series, seasons, episodes (incl. alt. orderings: DVD/absolute), artwork, translations | API key (+ optional user PIN) | Not published | **Conditional.** Free under $50k/yr revenue (parent company), then $1k/yr up to $250k, $10k/yr up to $1M | _"Metadata provided by TheTVDB"_ + link | No | Useful for anime and absolute episode ordering. You self-declare the tier each year. | U (tiers), P (page) |
| [Trakt](https://developer.trakt.tv/docs/rate-limiting) | Trending/popular/anticipated, related, ratings, watch counts, calendars, IDs | OAuth client ID | GET ~1000/5 min (read actual values from the `X-Ratelimit` header) | **Likely yes** on the Standard tier (pending API-policy PR). Premium tier is paid. | Per its API use policy | No | Mainly for **trending and upcoming** signals. Policy recently revised. Re-check before enabling. | P |
| [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/) | TSV: titles, episodes (parent/season/ep #), ratings + vote counts, principals, crew | None (S3/HTTP download) | n/a | **No.** _"personal and non-commercial use"_. Data may not be _"repurposed into a database"_ except for personal use. | Required | **Yes** (daily TSV) | **Recommend excluding entirely.** Even a free app republishing ratings via an API is a stretch of "personal use". Store IMDb **IDs** only (via TMDB/Wikidata). | P |
| [OMDb](https://www.omdbapi.com/) | IMDb-derived ratings, RT/Metacritic scores, plot, awards | API key | Free: 1,000 req/day | **Unclear.** Sources conflict. | Credit OMDb | No | Data is largely IMDb-derived, so it inherits IMDb's licensing risk. **Exclude.** | U |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | Cross-IDs (P345 IMDb, P4947 TMDB movie, P4983 TMDB TV, P5794 IGDB, P648 OL, P436 MB release group, P8729 AniList…), dates, genres, cast | None. **A descriptive User-Agent is mandatory.** | WDQS: 60 s of query time per 60 s window, 30 error queries/min, 60 s timeout | **Yes.** Structured data is **CC0**. | Not required (courtesy credit suggested) | **Yes.** Weekly JSON dump + daily incremental dumps. | Clients without a proper User-Agent get blocked. **This is the ID hub.** | V |

## Books

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [Open Library API](https://openlibrary.org/developers/api) | Works, editions, ISBN lookup, authors, subjects, page counts, publish dates, covers (by ISBN/OLID) | None. Identified User-Agent with app name + email recommended. | 1 req/s anonymous, **3 req/s identified** | API is _"not meant to serve as a bulk data backend or high-traffic commercial infrastructure"_. **Use the dumps.** | Courtesy | — | Covers API: separate rate limits, no cover dump. Cache images or hotlink sparingly. | V |
| [Open Library dumps](https://openlibrary.org/developers/dumps) | Full works/editions/authors (JSON lines) | None | n/a | **Yes.** Data is CC0 (per the CC case study and mirrors). | Not required | **Yes, monthly** | Cover images not included and not covered by CC0 (publisher copyright). Confirm the dump-page wording. | P |
| [Google Books API](https://developers.google.com/books/terms) | Volumes, descriptions, categories, page counts, ISBNs, thumbnails, preview links | API key | Default ~1,000 req/day (Cloud console quota; confirm in console) | **Restricted.** _"You may not charge users for your application without a separate agreement"_. Not meant to _"replace commercial services"_. | **Required** wherever its results are shown, + link to Google Books | No | Caching terms unclear. Good descriptions. **Off if the app is ever paid.** | P |
| [Hardcover](https://hardcover.app/account/api) | Books, series, editions, community ratings (GraphQL) | Bearer token | ~60 req/min | **Unclear.** API in beta. ToS reportedly template boilerplate. | Not stated | No | Strong series data, but too legally unclear for an LLC. **Exclude for now.** | U |
| Wikidata | Series, ISBNs, author links, OL/Goodreads IDs | — | — | Yes (CC0) | — | Yes | (see above) | V |

## Video games

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [IGDB](https://api-docs.igdb.com/) | Games, platforms, release dates per platform/region, genres, themes, covers, screenshots, companies, ratings, similar games, external IDs, time-to-beat | Twitch client ID + app access token | **4 req/s, max 8 open requests** | **Via partnership.** _"commercial partnerships are offered for users looking to integrate the API in monetized products"_. Partnership asks for user-facing attribution. **No fee mentioned.** | Attribution to IGDB.com for commercial use | No | Best games source. Email partner@igdb.com before monetizing. Also bound by the Twitch Developer Services Agreement. | P |
| [RAWG](https://rawg.io/apidocs) | Games, platforms, stores, ratings, screenshots, playtime | API key | Free: **20,000 req/month** | **No** (current pricing page: "Non-commercial projects only"). Business plan is $149/mo. Older ToS allowed commercial use under 100k MAU, but the current page contradicts it. | Backlink to RAWG on every page that shows its data | No | Use only as a **non-commercial fallback**. | P |
| Wikidata | IGDB/Steam/MobyGames IDs, platforms, publishers | — | — | Yes (CC0) | — | Yes | Links IGDB to other IDs | V |

## Podcasts

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [Podcast Index](https://api.podcastindex.org/tos_accept) | Podcasts, episodes, feed URLs, artwork, categories, iTunes IDs, trending, value tags | API key + secret (SHA-1 auth header) | Unpublished, "reasonable use". **A specific User-Agent is required.** | **Yes.** _"free to use for any purpose, including commercial"_ | Per docs (ToS v2.0, re-check) | **Yes** (SQLite DB download) | Prohibited: re-exposing the API as your own public service, and bulk scraping (use the dump). Our server serves normalized data, not a proxy. Confirm that reading. | V |
| Raw RSS feeds | Authoritative episode list, enclosures, durations, show notes, artwork | None | Be polite: conditional GET (ETag/If-Modified-Since), ≤1 fetch/feed/hour | Feeds are published for syndication. Content belongs to each creator. | Show podcast/creator name | n/a | **Source of truth for episodes.** Store metadata, don't rehost audio. | — |
| [iTunes Search API](https://performance-partners.apple.com/search-api) | Podcast search, artwork, iTunes IDs, `feedUrl` | None | ~20 calls/min (403 when exceeded) | **Restricted.** Promo content _"only to promote store content"_, next to an Apple badge. | "Provided courtesy of iTunes" for previews | No (EPF for partners) | **Exclude.** Podcast Index already maps iTunes IDs. | P |

## Music (albums)

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [MusicBrainz](https://musicbrainz.org/doc/About/Data_License) | Artists, release groups (albums), releases, tracklists, durations, labels, barcodes, relationships, Wikidata links | None. **Meaningful User-Agent required.** | **1 req/s average** per IP (503 on excess) | **Core data: yes (CC0).** Supplementary data (tags, ratings) is CC BY-NC-SA, so **non-commercial only**. | Not required for CC0. Required for supplementary data. | **Yes** (twice-weekly full dumps). Live Data Feed requires MetaBrainz signup. | Import only the **CC0 core dump**. Skip tags/ratings if the app is ever commercial. MetaBrainz urges financial support for commercial users (not required). | V |
| [Cover Art Archive](https://musicbrainz.org/doc/Cover_Art_Archive) | Front/back album art by MBID (250/500/1200 px thumbnails) | None | **No rate limiting** currently | **No license is granted.** Images stay the labels' copyright. | Not specified | No | Album art is widely shown in apps on fair-use/promotional grounds, but nothing grants that right. **Licensing decision for you.** Hotlinking (not rehosting) is the lower-risk pattern. | P |
| [Discogs](https://support.discogs.com/hc/en-us/articles/360009334593) | Releases, masters, tracklists, labels, formats, genres/styles | Token (or OAuth) | 60/min with a token, 25/min without (moving 60 s window) | **CC0 data: yes.** **Restricted data (images, user content): no** without permission. | Required for API use per ToS | **Yes, monthly XML (CC0)**, without images | Good genres/styles. Don't store or show Discogs images. | P |
| Spotify Web API | — | — | — | Extended quota **only for organizations with 250k+ MAU** (since May 2025) | — | — | **Exclude.** Not reachable for a new app. | V |
| Deezer API | Albums, art, previews | — | — | Commercial use requires a commercial agreement | — | — | **Exclude.** | P |

## Anime / manga

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Bulk dump? | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|---|
| [AniList](https://docs.anilist.co/guide/terms-of-use) | Anime + manga, episodes/chapters counts, airing schedule, studios, staff, relations, recommendations, covers, MAL IDs | None for public queries (OAuth for user data) | 90 req/min normally. **Currently degraded to 30/min.** | Free under **$150/month revenue**, then a commercial license is needed. **BUT:** use is barred _"within competing noncomplementary services… including… Anime/Manga list/tracker services"_. Also no _"hoarding or mass collection"_ and no use as a _"backup or data storage service"_. | Per ToS | No | 🚩 **Shelf is a tracker, so this likely bars us**, and cache-first storage conflicts with the "no data storage" clause. **Exclude unless AniList approves in writing** (contact@anilist.co). | P |
| [Jikan](https://docs.api.jikan.moe/) | MyAnimeList data | None | ~3/s, 60/min | Jikan **scrapes MyAnimeList, which hasn't authorized it**. Bulk use breaches MAL's ToS. | — | No | ❌ **Excluded** under the scraping rule. | P |
| [Official MAL API](https://myanimelist.net/static/apiagreement.html) | Anime/manga metadata | OAuth client ID | Unpublished | Agreement defines "commercial applications" separately. Terms not fully read. | Per agreement | No | Candidate. Agreement needs a full read before use. | U |
| [Kitsu](https://kitsu.docs.apiary.io/) | Anime/manga, episodes, posters, mappings (MAL/AniList/TVDB IDs) | None for public reads | Unpublished | **Unknown.** No ToS found. | Unknown | No | **Exclude until terms are confirmed.** | U |
| [MangaDex](https://api.mangadex.org/docs/2-limitations) | Manga metadata | None | ~5 req/s | **No.** Ads and paid services forbidden. | Required | No | Non-commercial fallback only | P |
| TMDB / TVmaze / TheTVDB / Wikidata | Anime **series** as TV (seasons, episodes, art) | — | — | (see above) | — | — | **Primary anime path:** treat anime as TV/movies. | — |

## Streaming availability ("where to watch")

| Source | Data fields | Auth | Rate limits | Commercial use? | Attribution | Notes / risks | Conf. |
|---|---|---|---|---|---|---|---|
| TMDB watch providers | Provider + type per region, logos | TMDB key | TMDB | **Non-commercial** (TMDB terms) | **TMDB + JustWatch** | Only free option with broad coverage. No deep links. | V |
| [Streaming Availability API](https://github.com/movieofthenight/streaming-availability-api) (Movie of the Night) | Per-country services, **deep links**, leaving dates, prices | RapidAPI key | Free: **100 req/day** | Free-plan commercial status not confirmed | Per its terms | 100/day only works with aggressive caching. | U |
| [Watchmode](https://api.watchmode.com/tc) | Sources, deep links, regions | API key | Free dev plan (figures conflict: ~1,000–2,500/month) | Free tier reportedly **non-commercial** | Link + attribution depending on plan | — | U |
| JustWatch direct | — | — | — | Paid B2B only. **Scraping forbidden.** | — | ❌ | — |

---

## Recommended source per field

Two tracks: a **commercial-safe** default, plus extras that run only while `COMMERCIAL_MODE=false`.

| Field | Primary (commercial-safe) | Non-commercial extra / fallback |
|---|---|---|
| **Entity resolution / cross-IDs** | Wikidata weekly dump (CC0) | — |
| Movie/TV core metadata, posters, backdrops | Wikidata + TVmaze (TV) | **TMDB** (best quality overall; needs agreement if commercial) |
| **TV seasons + episode lists** | **TVmaze** (CC BY-SA) | TMDB; TheTVDB (free under $50k revenue) for alt. orderings |
| TV episode stills | TVmaze images | TMDB stills |
| Movie runtime, release dates | Wikidata | TMDB |
| Trending / upcoming movies & TV | Trakt (Standard) + TVmaze schedule | TMDB trending/upcoming |
| Related movies/TV | Wikidata (shared series/genre/creator) + Trakt related | TMDB recommendations |
| **Where to watch** | ⚠️ no commercial-safe free source (see Gaps) | TMDB watch providers (+ JustWatch credit) |
| **ISBN lookup, editions, page counts** | **Open Library dump** (+ API for misses) | Google Books |
| Book descriptions | Open Library | Google Books |
| Book covers | Open Library Covers API (hotlink/cache, rate-limited) | Google Books thumbnails |
| Game metadata, platforms, release dates, covers | **IGDB** (partnership email first) | RAWG |
| Game playtime | IGDB time-to-beat | RAWG `playtime` |
| **Podcast directory / search** | **Podcast Index** (API + SQLite dump) | — |
| **Podcast episodes** | **Raw RSS** (source of truth), Podcast Index as index | — |
| **Album / tracklist / durations** | **MusicBrainz CC0 core dump** | — |
| Album art | Cover Art Archive (hotlink) ⚠️ licensing decision | — |
| Music genres/styles | Discogs CC0 dump (no images) | MusicBrainz tags (CC BY-NC-SA) |
| Anime series (as TV) | TVmaze / Wikidata | TMDB, TheTVDB |
| Anime/manga-specific (chapters, studios) | Official MAL API (pending terms review) | MangaDex (manga); AniList **only with written approval** |
| Ratings | Own users' ratings (first-party) + Wikidata | TMDB vote avg; IGDB rating |

## Known gaps

1. **Commercial-grade movie/TV metadata + artwork at $0.** If the app is monetized,
   TMDB needs a written agreement that may carry fees. Fallback: TVmaze + Wikidata, which
   cover TV well but are thinner for **movies** (no high-quality posters).
   **Biggest open item.**
2. **Where-to-watch for a commercial app.** Every free option is non-commercial,
   unconfirmed, or 100 req/day. JustWatch can't be scraped. This stays a gap until there's a paid plan or
   a TMDB commercial agreement.
3. **Anime/manga tracking data.** AniList's ToS likely bars tracker apps, Jikan is
   unauthorized scraping, and Kitsu's terms are unknown. Only the official MAL API (terms
   need review) and TV-style data from TVmaze/TMDB remain. Manga chapter counts are the weakest area.
4. **IMDb ratings / vote counts.** Licensed for non-commercial use only, and scraping
   IMDb is forbidden. **Gap.** Show TMDB or first-party ratings instead.
5. **Goodreads / Letterboxd ratings and reviews.** Scraping is forbidden and there's no API. **Gap.**
6. **Album art licensing.** Cover Art Archive grants no rights to the images. Hotlinking is
   common practice but legally grey.
7. **Book covers at scale.** No cover dump, and the Covers API is rate-limited. Covers will load
   lazily and some will be missing.
8. **Game deep metadata if IGDB declines a partnership.** RAWG's free tier is
   non-commercial, leaving Wikidata only.
9. **Rotten Tomatoes / Metacritic scores.** No legal free source. **Gap.**

## Decisions needed from you (licensing / cost)

1. **Will the app make money?** (ads, subscription, IAP, paid upfront). This decides
   whether TMDB, Google Books, RAWG, MangaDex, MusicBrainz tags and TMDB watch providers can
   be enabled. Recommendation: build everything behind `commercial_ok` flags and **email TMDB
   now** about a commercial agreement, since it's the single most valuable source.
2. **IGDB:** OK to email partner@igdb.com for a (free) commercial partnership?
3. **AniList:** exclude by default, or email contact@anilist.co asking for an exemption from the tracker clause?
4. **Album art (Cover Art Archive):** accept the hotlink-only approach, or ship without art?
5. **TheTVDB:** OK to enable under the free under-$50k tier (requires an annual self-declared tier)?
6. **Excluded outright** (please confirm): IMDb datasets, OMDb, Jikan, Spotify, Deezer,
   iTunes Search, Hardcover, Kitsu (until terms are confirmed).
