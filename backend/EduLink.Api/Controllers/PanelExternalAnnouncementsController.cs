using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/panel/external-announcements")]
[Authorize(Roles = "SchoolAdmin,Admin,PlatformAdmin")]
public class PanelExternalAnnouncementsController : ControllerBase
{
    private const string CacheKeyPrefix = "panel:external-announcements:";
    private const string DefaultMebSource = "https://www.meb.gov.tr/meb_duyuruindex.php?dil=tr";
    private const string SourceName = "MEB Duyurulari";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
    private static readonly Regex AnchorRegex = new(
        "<a[^>]+href\\s*=\\s*[\"'](?<href>[^\"']+)[\"'][^>]*>(?<text>.*?)</a>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex TagRegex = new("<.*?>", RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(
        "\\b(?<date>\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4})\\b",
        RegexOptions.Compiled);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PanelExternalAnnouncementsController> _logger;
    private readonly IConfiguration _configuration;

    public PanelExternalAnnouncementsController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<PanelExternalAnnouncementsController> logger,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int limit = 6, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 12);

        var sourceUrl = _configuration["PanelAnnouncements:MebSourceUrl"];
        if (string.IsNullOrWhiteSpace(sourceUrl))
        {
            sourceUrl = DefaultMebSource;
        }

        var cacheKey = $"{CacheKeyPrefix}{sourceUrl}:{limit}";
        var cached = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await FetchAnnouncementsAsync(sourceUrl!, limit, cancellationToken);
        });

        return Ok(cached ?? BuildFallbackResponse(sourceUrl!, limit));
    }

    private async Task<ExternalAnnouncementsResponse> FetchAnnouncementsAsync(string sourceUrl, int limit, CancellationToken cancellationToken)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(8));

            var client = _httpClientFactory.CreateClient(nameof(PanelExternalAnnouncementsController));
            client.DefaultRequestHeaders.UserAgent.ParseAdd("NotioPanel/1.0 (+https://notioedu.com)");
            client.Timeout = TimeSpan.FromSeconds(10);

            var html = await client.GetStringAsync(sourceUrl, cts.Token);

            if (string.IsNullOrWhiteSpace(html))
            {
                return BuildFallbackResponse(sourceUrl, limit);
            }

            var items = ParseHtml(sourceUrl, html, limit);
            if (items.Count == 0)
            {
                return BuildFallbackResponse(sourceUrl, limit);
            }

            return new ExternalAnnouncementsResponse(
                SourceName,
                sourceUrl,
                DateTime.UtcNow,
                false,
                items);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Dis duyuru akisi okunamadi. Kaynak: {SourceUrl}",
                sourceUrl);
            return BuildFallbackResponse(sourceUrl, limit);
        }
    }

    private static ExternalAnnouncementsResponse BuildFallbackResponse(string sourceUrl, int limit)
    {
        var now = DateTime.UtcNow;
        var items = new List<ExternalAnnouncementDto>
        {
            new(
                "MEB duyurularina su an ulasilamadi. Biraz sonra tekrar deneyebilirsiniz.",
                sourceUrl,
                now,
                SourceName)
        };

        while (items.Count < Math.Max(1, Math.Min(limit, 3)))
        {
            items.Add(new ExternalAnnouncementDto(
                "Guncel duyurular acildiginda bu alan otomatik yenilenir.",
                sourceUrl,
                now,
                SourceName));
        }

        return new ExternalAnnouncementsResponse(
            SourceName,
            sourceUrl,
            now,
            true,
            items);
    }

    private static List<ExternalAnnouncementDto> ParseHtml(string sourceUrl, string html, int limit)
    {
        var sourceUri = Uri.TryCreate(sourceUrl, UriKind.Absolute, out var parsedSourceUri)
            ? parsedSourceUri
            : null;

        var results = new List<ExternalAnnouncementDto>();
        var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in AnchorRegex.Matches(html))
        {
            var title = NormalizeText(match.Groups["text"].Value);
            if (!IsLikelyAnnouncementTitle(title))
            {
                continue;
            }

            if (!seenTitles.Add(title))
            {
                continue;
            }

            var href = match.Groups["href"].Value.Trim();
            var absoluteUrl = BuildAbsoluteUrl(sourceUri, href);
            var publishedAt = ExtractDate(title);

            results.Add(new ExternalAnnouncementDto(
                title,
                absoluteUrl,
                publishedAt,
                SourceName));

            if (results.Count >= limit)
            {
                break;
            }
        }

        return results;
    }

    private static string BuildAbsoluteUrl(Uri? sourceUri, string href)
    {
        if (string.IsNullOrWhiteSpace(href))
        {
            return sourceUri?.ToString() ?? DefaultMebSource;
        }

        if (Uri.TryCreate(href, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        if (sourceUri is not null && Uri.TryCreate(sourceUri, href, out var resolved))
        {
            return resolved.ToString();
        }

        return href;
    }

    private static string NormalizeText(string value)
    {
        var noTags = TagRegex.Replace(value, " ");
        var decoded = WebUtility.HtmlDecode(noTags);
        return Regex.Replace(decoded ?? string.Empty, "\\s+", " ").Trim();
    }

    private static bool IsLikelyAnnouncementTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return false;
        }

        if (title.Length < 18 || title.Length > 260)
        {
            return false;
        }

        var normalized = title.ToLowerInvariant();
        var blocked = new[]
        {
            "ana sayfa",
            "iletisim",
            "site haritasi",
            "duyurular arsivi",
            "tum duyurular",
            "giris",
            "ebys",
            "mebbis",
            "eba",
            "oba",
            "tiklayin"
        };

        return !blocked.Any(keyword => normalized.Contains(keyword));
    }

    private static DateTime? ExtractDate(string title)
    {
        var match = DateRegex.Match(title);
        if (!match.Success)
        {
            return null;
        }

        var raw = match.Groups["date"].Value;
        var formats = new[] { "dd.MM.yyyy", "d.M.yyyy", "dd-MM-yyyy", "d-M-yyyy", "dd/MM/yyyy", "d/M/yyyy", "dd.MM.yy" };
        if (DateTime.TryParseExact(raw, formats, CultureInfo.GetCultureInfo("tr-TR"), DateTimeStyles.AssumeLocal, out var parsed))
        {
            return parsed.ToUniversalTime();
        }

        return null;
    }
}

public record ExternalAnnouncementsResponse(
    string Source,
    string SourceUrl,
    DateTime FetchedAt,
    bool IsFallback,
    IReadOnlyList<ExternalAnnouncementDto> Items
);

public record ExternalAnnouncementDto(
    string Title,
    string Url,
    DateTime? PublishedAt,
    string Source
);
