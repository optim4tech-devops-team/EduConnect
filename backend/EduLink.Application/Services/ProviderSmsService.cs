using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduLink.Application.Services;

public class ProviderSmsService : ISmsService
{
    private readonly HttpClient _httpClient;
    private readonly SmsOptions _options;
    private readonly ILogger<ProviderSmsService> _logger;

    public ProviderSmsService(
        HttpClient httpClient,
        IOptions<SmsOptions> options,
        ILogger<ProviderSmsService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendOtpAsync(string phone, string code)
    {
        if (string.IsNullOrWhiteSpace(_options.ProviderUrl))
            throw new InvalidOperationException("Sms:ProviderUrl is required when Sms:Mode is Provider.");

        var endpoint = BuildEndpoint();
        var message = (_options.MessageTemplate ?? "Notio dogrulama kodunuz: {code}")
            .Replace("{code}", code, StringComparison.Ordinal);

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            request.Headers.TryAddWithoutValidation(
                _options.ApiKeyHeaderName ?? "X-Api-Key",
                _options.ApiKey);
        }

        request.Content = JsonContent.Create(new Dictionary<string, string?>
        {
            ["phone"] = phone,
            ["message"] = message,
            ["sender"] = _options.Sender
        });

        var response = await _httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode)
            return;

        var body = await response.Content.ReadAsStringAsync();
        _logger.LogError(
            "SMS provider request failed with status {StatusCode}. Response: {ResponseBody}",
            (int)response.StatusCode,
            body);

        response.EnsureSuccessStatusCode();
    }

    private string BuildEndpoint()
    {
        var providerUri = new Uri(_options.ProviderUrl!, UriKind.Absolute);
        if (string.IsNullOrWhiteSpace(_options.SendPath))
            return providerUri.ToString();

        return new Uri(providerUri, _options.SendPath).ToString();
    }
}
